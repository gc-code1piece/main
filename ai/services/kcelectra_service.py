"""
KcELECTRA 기반 일기 분석 서비스 (v2 — M8 알고리즘 강화)

전략:
  - 사전 정의된 앵커 레이블을 최초 호출 시 임베딩하고 lru_cache 에 보관
  - 입력 문서 임베딩 vs 각 앵커 임베딩 코사인 유사도 → top-3 추출
  - 임계값(0.35) 이상만 결과에 포함

v2 (M8) 개선 포인트:
  1. 배치 임베딩 — `_embed_texts` 가 텍스트 목록을 단일 forward pass 로 처리
     (이전: for-loop 로 N회 추론 → 앵커 워밍업 시 67회 forward pass)
  2. 대극 페어(antonym pair) 모순 제거 — "아침형" 과 "저녁형" 이 동시에
     top-3 에 들어가지 않도록 점수 높은 쪽만 유지
  3. 카테고리 softmax confidence — argmax 만 사용하던 것을 softmax 분포로 변환해
     `category_confidence` 점수를 함께 반환 (디버깅·임계값 튜닝 활용)
  4. summary 보강 — 첫 문장이 너무 짧으면 두 번째 문장까지 합쳐 50자 채우기,
     종결어미 잘림 최소화

TODO(M9): fine-tuning 된 KcELECTRA-classifier 로 교체 시 이 모듈을 인터페이스로 교체
TODO(M9): summary 추출을 Extractive Summarization (KoBigBird 등)으로 업그레이드
TODO(품질): 앵커 임베딩 품질 평가 — 각 레이블의 분리도(silhouette score) 측정
"""
from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Any

import numpy as np
import torch

from config import KCELECTRA_MAX_LENGTH, MIN_CONTENT_LENGTH
from models import get_kcelectra
from schemas.messages import AnalysisResult, AnalysisTag

logger = logging.getLogger(__name__)

# ── 사전 정의 태그 앵커 레이블 ─────────────────────────────────────────────────

EMOTION_LABELS: list[str] = [
  "기쁨", "슬픔", "분노", "불안", "평온", "설렘", "외로움", "감사", "피로", "희망",
  "실망", "사랑", "그리움", "두려움", "안도", "자부심", "수치심", "놀람", "지루함",
  "편안함", "활력", "후회", "기대", "만족", "공허함",
]  # 25개

LIFESTYLE_LABELS: list[str] = [
  "아침형", "저녁형", "실내활동", "야외활동", "혼자 시간", "사교적",
  "정적", "활동적", "계획적", "즉흥적", "미식", "절제",
]  # 12개 6쌍

RELATIONSHIP_STYLE_LABELS: list[str] = [
  "배려심", "독립적", "친밀함", "거리감", "감정 표현", "논리 중시",
  "안정 추구", "모험 추구", "헌신적", "자유로움", "깊은 대화", "가벼운 대화",
  "공감 우선", "해결 우선", "신뢰 중시", "자율 중시", "함께하기", "개인 공간",
  "로맨틱", "실용적",
]  # 20개 10쌍

TONE_LABELS: list[str] = [
  "따뜻함", "차분함", "유머러스", "진지함", "감성적", "논리적",
  "밝음", "어두움", "솔직함", "신중함",
]  # 10개

CATEGORY_LABELS: list[str] = ["DAILY", "TRAVEL", "FOOD", "RELATIONSHIP", "WORK"]

# ── 대극 페어(antonym pair) 정의 ───────────────────────────────────────────────
# 각 그룹별로 양쪽 끝 레이블이 동시에 top-k 결과에 들어가는 모순을 막기 위한 매핑.
# key/value 양방향 모두 정의해 lookup 1회로 상대 레이블을 즉시 확인 가능.

LIFESTYLE_ANTONYMS: dict[str, str] = {
  "아침형": "저녁형", "저녁형": "아침형",
  "실내활동": "야외활동", "야외활동": "실내활동",
  "혼자 시간": "사교적", "사교적": "혼자 시간",
  "정적": "활동적", "활동적": "정적",
  "계획적": "즉흥적", "즉흥적": "계획적",
  "미식": "절제", "절제": "미식",
}

RELATIONSHIP_STYLE_ANTONYMS: dict[str, str] = {
  "친밀함": "거리감", "거리감": "친밀함",
  "감정 표현": "논리 중시", "논리 중시": "감정 표현",
  "안정 추구": "모험 추구", "모험 추구": "안정 추구",
  "헌신적": "자유로움", "자유로움": "헌신적",
  "깊은 대화": "가벼운 대화", "가벼운 대화": "깊은 대화",
  "공감 우선": "해결 우선", "해결 우선": "공감 우선",
  "신뢰 중시": "자율 중시", "자율 중시": "신뢰 중시",
  "함께하기": "개인 공간", "개인 공간": "함께하기",
  "로맨틱": "실용적", "실용적": "로맨틱",
}

TONE_ANTONYMS: dict[str, str] = {
  "밝음": "어두움", "어두움": "밝음",
  "감성적": "논리적", "논리적": "감성적",
}

# tag_type 별 대극 매핑 lookup
_ANTONYM_MAP: dict[str, dict[str, str]] = {
  "LIFESTYLE": LIFESTYLE_ANTONYMS,
  "RELATIONSHIP_STYLE": RELATIONSHIP_STYLE_ANTONYMS,
  "TONE": TONE_ANTONYMS,
  # EMOTION 은 페어 정의가 모호해 적용하지 않음
}

# top-k 및 임계값 상수
_TOP_K: int = 3
_SCORE_THRESHOLD: float = 0.35


# ── 임베딩 유틸 ───────────────────────────────────────────────────────────────

def _embed_texts(texts: list[str]) -> np.ndarray:
  """
  텍스트 리스트를 KcELECTRA [CLS] 토큰 임베딩 배열로 변환.

  v2 (M8): 단일 forward pass 로 일괄 처리 (이전: for-loop 로 N회 추론).
  - 가변 길이 입력은 padding=True 로 batch 내 longest 기준 패딩
  - max_length=512 truncate 는 동일 적용
  - [CLS] 토큰(index 0) 벡터를 문서 표현으로 사용

  반환 shape: (len(texts), hidden_dim)
  """
  if not texts:
    return np.zeros((0, 768), dtype=np.float32)

  tok, mdl = get_kcelectra()
  inputs = tok(
    texts,
    return_tensors="pt",
    truncation=True,
    max_length=KCELECTRA_MAX_LENGTH,
    padding=True,
  )
  with torch.no_grad():
    # last_hidden_state: (batch, seq_len, hidden) → [CLS]만 슬라이스: (batch, hidden)
    cls_vecs = mdl(**inputs).last_hidden_state[:, 0, :]
    # fp16 → float32 변환 후 numpy
    return cls_vecs.float().numpy()


def _cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
  """
  a: (1, d), b: (N, d)
  반환: (N,) 각 b 행과 a 사이의 코사인 유사도
  """
  a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-9)
  b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-9)
  # (1, d) @ (d, N) → (1, N) → (N,)
  return (a_norm @ b_norm.T).flatten()


def _softmax(scores: np.ndarray, temperature: float = 1.0) -> np.ndarray:
  """
  numpy 기반 softmax. 카테고리 confidence 계산용.
  temperature 가 낮을수록 분포가 sharp 해진다.
  """
  scaled = scores / max(temperature, 1e-6)
  shifted = scaled - np.max(scaled)
  exp = np.exp(shifted)
  return exp / (np.sum(exp) + 1e-9)


# ── 앵커 임베딩 lru_cache (모델 로드 직후 warm-up 호출로 선점) ───────────────

@lru_cache(maxsize=1)
def _get_anchor_embeddings() -> dict[str, np.ndarray]:
  """
  태그 종류별 앵커 임베딩을 최초 1회만 계산하고 캐시.
  v2 (M8): 모든 앵커를 단일 배치로 임베딩 후 그룹별 분할 — forward pass 1회로 단축.
  반환: {"EMOTION": ndarray(25, d), "LIFESTYLE": ..., ...}
  """
  groups: list[tuple[str, list[str]]] = [
    ("EMOTION", EMOTION_LABELS),
    ("LIFESTYLE", LIFESTYLE_LABELS),
    ("RELATIONSHIP_STYLE", RELATIONSHIP_STYLE_LABELS),
    ("TONE", TONE_LABELS),
    ("CATEGORY", CATEGORY_LABELS),
  ]

  # 모든 레이블을 한 번에 임베딩 (단일 forward pass)
  flat_labels: list[str] = [lbl for _, labels in groups for lbl in labels]
  flat_vecs = _embed_texts(flat_labels)  # (sum_N, d)

  # 그룹별로 슬라이스 복원
  result: dict[str, np.ndarray] = {}
  cursor = 0
  for name, labels in groups:
    n = len(labels)
    result[name] = flat_vecs[cursor : cursor + n]
    cursor += n
  return result


def warmup_anchors() -> None:
  """앱 lifespan 에서 호출해 앵커 임베딩을 미리 계산."""
  _get_anchor_embeddings()


# ── summary 추출 ─────────────────────────────────────────────────────────────

_SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?。])\s+")


def _extract_summary(content: str, max_chars: int = 50) -> str:
  """
  본문에서 요약 추출.

  v2 (M8) 개선:
    - 첫 문장이 너무 짧으면(예: 10자 미만) 두 번째 문장까지 합쳐 정보량 확보
    - max_chars 초과 시 마지막 종결 어미 직전(공백)에서 자르도록 시도

  TODO(M9): KoBigBird Extractive Summarization 으로 교체
  """
  trimmed = content.strip()
  if not trimmed:
    return ""

  sentences = _SENTENCE_SPLIT_PATTERN.split(trimmed)
  sentences = [s.strip() for s in sentences if s.strip()]
  if not sentences:
    return trimmed[:max_chars]

  # 첫 문장이 너무 짧으면 두 번째 문장까지 합치기
  candidate = sentences[0]
  if len(candidate) < 10 and len(sentences) > 1:
    candidate = f"{candidate} {sentences[1]}".strip()

  if len(candidate) <= max_chars:
    return candidate

  # max_chars 초과 시 직전 공백에서 자르기 시도
  cut = candidate[:max_chars]
  last_space = cut.rfind(" ")
  if last_space >= int(max_chars * 0.6):
    return cut[:last_space]
  return cut


# ── 대극 페어 모순 제거 ───────────────────────────────────────────────────────

def _filter_antonyms(
  scored_labels: list[tuple[str, float]],
  tag_type: str,
) -> list[tuple[str, float]]:
  """
  점수 내림차순 (label, score) 목록에서 대극 페어 모순을 제거한다.

  알고리즘:
    - 점수 높은 순서대로 순회
    - 이미 채택된 label 의 대극 label 이 후보로 등장하면 스킵
    - tag_type 에 antonym 매핑이 없으면 입력 그대로 반환

  :param scored_labels: 내림차순 정렬된 (label, score) 목록
  :param tag_type: 태그 타입 ("LIFESTYLE" / "RELATIONSHIP_STYLE" / "TONE" 등)
  :return: 모순 제거된 (label, score) 목록 (원래 순서 유지)
  """
  antonym_map = _ANTONYM_MAP.get(tag_type)
  if not antonym_map:
    return scored_labels

  selected: list[tuple[str, float]] = []
  blocked: set[str] = set()
  for label, score in scored_labels:
    if label in blocked:
      continue
    selected.append((label, score))
    # 이 레이블의 대극을 이후 후보에서 차단
    opponent = antonym_map.get(label)
    if opponent:
      blocked.add(opponent)
  return selected


# ── top-k 태그 선택 ──────────────────────────────────────────────────────────

def _select_top_tags(
  doc_vec: np.ndarray,
  anchor_embeddings: np.ndarray,
  labels: list[str],
  tag_type: str,
  top_k: int = _TOP_K,
  threshold: float = _SCORE_THRESHOLD,
) -> list[AnalysisTag]:
  """
  코사인 유사도 기준 top-k 태그 추출 후 threshold 필터링 + 대극 페어 모순 제거.

  v2 (M8) 알고리즘:
    1. 모든 후보의 코사인 점수 계산
    2. 내림차순 정렬 후 대극 페어 제거 (예: 아침형↔저녁형 동시 채택 방지)
    3. 상위 top_k 중 score >= threshold 만 선택
    4. 모두 threshold 미달이면 최고 점수 1개만 반환 (보장)
  """
  scores: np.ndarray = _cosine_similarity_matrix(
    doc_vec.reshape(1, -1), anchor_embeddings
  )

  # 모든 (label, score) 를 내림차순 정렬
  all_pairs: list[tuple[str, float]] = sorted(
    [(labels[i], float(scores[i])) for i in range(len(labels))],
    key=lambda x: x[1],
    reverse=True,
  )

  # 대극 페어 모순 제거
  filtered = _filter_antonyms(all_pairs, tag_type)

  # 상위 top_k 자르기 + threshold 필터
  tags: list[AnalysisTag] = []
  for label, score in filtered[:top_k]:
    if score >= threshold or not tags:
      tags.append(
        AnalysisTag(
          type=tag_type,  # type: ignore[arg-type]
          label=label,
          score=round(score, 4),
        )
      )
  return tags


# ── 메인 분석 함수 ────────────────────────────────────────────────────────────

async def analyze_diary(content: str) -> AnalysisResult:
  """
  일기 본문을 받아 6종 태그 + summary + category 를 추출해 반환.

  Steps:
    1. 본문 길이 < MIN_CONTENT_LENGTH 이면 ValueError
    2. KcELECTRA 토크나이저로 max_length=512 truncate
    3. [CLS] 토큰 기반 문서 임베딩 계산
    4. summary: 첫 1~2문장 50자 이내 (M8: 단문 보강 + 공백 컷 우선)
    5. category: CATEGORY_LABELS 앵커와 코사인 → softmax → argmax + confidence
    6. emotion / lifestyle / relationship_style / tone 각각 top-3
       (M8: 대극 페어 모순 제거 적용 — score >= 0.35)
    7. AnalysisResult 반환
  """
  # ── 1. 길이 검증 ──────────────────────────────────────────────────────────
  if len(content) < MIN_CONTENT_LENGTH:
    raise ValueError(
      f"일기 본문이 최소 글자 수({MIN_CONTENT_LENGTH}자)에 미달합니다. "
      f"현재 길이: {len(content)}자"
    )

  # ── 3. 문서 임베딩 계산 (단일 텍스트) ──────────────────────────────────────
  # _embed_texts 내부에서 max_length=512 truncate 처리
  doc_vec: np.ndarray = _embed_texts([content])[0]  # (hidden_dim,)

  # ── 앵커 임베딩 취득 (lru_cache 히트) ─────────────────────────────────────
  anchors = _get_anchor_embeddings()

  # ── 4. summary 추출 ───────────────────────────────────────────────────────
  summary = _extract_summary(content)

  # ── 5. category 결정 (M8: softmax 분포로 confidence 산출) ────────────────
  cat_scores = _cosine_similarity_matrix(
    doc_vec.reshape(1, -1), anchors["CATEGORY"]
  )
  category_idx = int(np.argmax(cat_scores))
  category = CATEGORY_LABELS[category_idx]
  # softmax confidence — 카테고리 임계값 튜닝과 디버깅 모니터링에 활용
  cat_softmax = _softmax(cat_scores, temperature=0.1)
  category_confidence = float(cat_softmax[category_idx])
  if category_confidence < 0.40:
    logger.info(
      "low_category_confidence | category=%s confidence=%.4f scores=%s",
      category,
      category_confidence,
      [round(float(s), 4) for s in cat_scores],
    )

  # ── 6. 4종 태그 추출 (대극 페어 모순 제거 포함) ──────────────────────────
  emotion_tags = _select_top_tags(
    doc_vec, anchors["EMOTION"], EMOTION_LABELS, "EMOTION"
  )
  lifestyle_tags = _select_top_tags(
    doc_vec, anchors["LIFESTYLE"], LIFESTYLE_LABELS, "LIFESTYLE"
  )
  relationship_style_tags = _select_top_tags(
    doc_vec,
    anchors["RELATIONSHIP_STYLE"],
    RELATIONSHIP_STYLE_LABELS,
    "RELATIONSHIP_STYLE",
  )
  tone_tags = _select_top_tags(
    doc_vec, anchors["TONE"], TONE_LABELS, "TONE"
  )

  all_tags = emotion_tags + lifestyle_tags + relationship_style_tags + tone_tags

  # ── 7. 결과 반환 ──────────────────────────────────────────────────────────
  return AnalysisResult(
    summary=summary,
    category=category,  # type: ignore[arg-type]
    tags=all_tags,
  )
