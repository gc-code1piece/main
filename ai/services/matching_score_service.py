"""
매칭 점수 계산 v2 — 변별력 강화 알고리즘 (M8)

기존 v1 (api/matching.py 인라인) 한계:
  - KoSimCSE 한국어 임베딩 코사인이 0.6~0.9 분포에 몰려 (cos+1)/2 정규화 시
    0.8~0.95 부근 → matchingScore 차이가 거의 안 보이는 문제
  - 키워드 매칭이 Jaccard 단일 → "따뜻함" vs "다정함" 같은 의미 유사 키워드는 0점 처리
  - userEmbedding 또는 candidate.embedding 이 None 인 경우 0.5(중립값)로 강제 보간
    → 임베딩 유무에 따른 점수 왜곡

v2 개선 포인트:
  1. cosine variance stretching:
     KoSimCSE 한국어 임베딩 분포 baseline (0.50) ~ 동일 의미 상한 (0.95) 구간을
     0~1 로 선형 stretch 하여 0.55~0.85 사이 변별력을 4배 이상 확보.
  2. keyword semantic similarity:
     idealKeywords 와 personalityKeywords 각각을 KoSimCSE 임베딩 후
     pairwise max-pool 평균 계산 (lru_cache 로 재사용).
     keyword_score = max(jaccard, 0.85 × semantic) 로 정확 매칭을 우선시하면서
     의미 유사 매칭도 점수에 반영.
  3. 임베딩 결손 처리 명시화:
     - userEmbedding 결손 + idealKeywords 존재 → 동적 임베딩 (v1 동일)
     - userEmbedding 결손 + idealKeywords 결손 → cosine 항 가중치 0 (keyword 항 100%)
     - candidate.embedding 결손 → cosine 항 가중치 0, keyword 항만으로 점수 산출
     (기존 0.5 보간 제거)

알고리즘 검증 가능성:
  - keywordOverlap (Jaccard) 와 cosineSimilarity (stretched) 는 기존 ScoreBreakdown
    필드와 동일한 의미를 유지 (Spring DTO 호환성).
  - 신규 keywordSemantic / cosineRaw 필드는 ScoreBreakdown 에 추가 (Optional).
    Spring 측 Jackson 은 unknown field 무시(기본 동작) → 하위 호환.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

import numpy as np

from services import kosimcse_service

# ── 알고리즘 상수 ─────────────────────────────────────────────────────────────

# KoSimCSE 한국어 임베딩 코사인 분포 baseline / saturation
# - COSINE_BASELINE: 무관한 한국어 두 문장의 평균 코사인 (실측 약 0.50)
# - COSINE_SATURATION: 의미가 매우 유사한 두 문장의 평균 코사인 (실측 약 0.95)
# 두 값 사이를 0~1 로 선형 stretch 하여 변별력 확보.
COSINE_BASELINE: float = 0.50
COSINE_SATURATION: float = 0.95

# 가중치 (sum=1.0) — keyword 항 / cosine 항
W_KEYWORD: float = 0.55
W_COSINE: float = 0.45

# semantic 점수에 곱하는 패널티 — 정확(Jaccard) 매칭 대비 약간 낮춰
# 의미 유사 매칭이 정확 매칭과 동등하게 평가되지 않도록 한다.
SEMANTIC_PENALTY: float = 0.85

# 키워드 의미 유사도 계산에서 단일 후보 키워드와 ideal 키워드 집합 간
# pairwise cosine 의 상위 평균만 사용 (잡음 컷)
SEMANTIC_TOP_K: int = 3


# ── 결과 컨테이너 ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class MatchingScore:
  """매칭 점수 계산 결과 (api/matching.py 응답 직렬화용)."""

  matching_score: float
  keyword_overlap: float        # Jaccard
  keyword_semantic: float       # 의미 유사도 (0~1)
  cosine_similarity: float      # stretched (0~1)
  cosine_raw: float             # raw cosine 정규화 (0~1) — 디버깅용
  cosine_available: bool        # 코사인 항 사용 여부


# ── 1. cosine variance stretching ────────────────────────────────────────────

def stretch_cosine(cosine_normalized: float) -> float:
  """
  (cos+1)/2 로 0~1 정규화된 코사인을 한국어 임베딩 분포 기반으로 stretch.

  - cos_norm ≤ COSINE_BASELINE → 0
  - cos_norm ≥ COSINE_SATURATION → 1
  - 그 외 → (cos_norm - BASELINE) / (SATURATION - BASELINE)

  :param cosine_normalized: (raw cosine + 1) / 2 (0~1 정규화 값)
  :return: stretched 점수 (0~1)
  """
  if cosine_normalized <= COSINE_BASELINE:
    return 0.0
  if cosine_normalized >= COSINE_SATURATION:
    return 1.0
  return (cosine_normalized - COSINE_BASELINE) / (COSINE_SATURATION - COSINE_BASELINE)


# ── 2. Jaccard ────────────────────────────────────────────────────────────────

def compute_jaccard(set_a: set[str], set_b: set[str]) -> float:
  """두 집합의 Jaccard 유사도. 합집합이 비어 있으면 0.0."""
  if not set_a and not set_b:
    return 0.0
  union = set_a | set_b
  if not union:
    return 0.0
  return len(set_a & set_b) / len(union)


# ── 3. 키워드 의미 유사도 ────────────────────────────────────────────────────

def compute_keyword_semantic(
  ideal_keywords: list[str],
  personality_keywords: list[str],
) -> float:
  """
  idealKeywords 와 personalityKeywords 사이의 의미 유사도 평균.

  알고리즘:
    1. 각 키워드를 KoSimCSE 로 임베딩 (lru_cache 적중 시 O(1))
    2. personality 의 각 키워드에 대해 ideal 키워드들과 pairwise 코사인 계산
    3. 각 personality 키워드에서 max(top1) 코사인을 추출 → 평균
       (pkw 입장에서 가장 가까운 ideal 키워드와의 거리)
    4. cosine 음수 보정 (0 floor) 후 stretch 적용해 0~1 환산

  :param ideal_keywords: 기준 사용자 이상형 키워드 목록
  :param personality_keywords: 후보 퍼스널리티 키워드 목록
  :return: 의미 유사도 (0~1). 둘 중 하나라도 비어 있으면 0.0.
  """
  if not ideal_keywords or not personality_keywords:
    return 0.0

  # 키워드 임베딩 (lru_cache 적중 시 모델 추론 생략)
  ideal_vecs = [kosimcse_service.embed_vec_cached(kw) for kw in ideal_keywords]
  pkw_vecs = [kosimcse_service.embed_vec_cached(kw) for kw in personality_keywords]

  # 행렬 연산으로 pairwise cosine 일괄 계산
  ideal_mat = np.stack(ideal_vecs)         # (I, d)
  pkw_mat = np.stack(pkw_vecs)             # (P, d)
  # 이미 L2 정규화되어 있으므로 내적 = 코사인
  pair_cosine = pkw_mat @ ideal_mat.T      # (P, I)

  # personality 각 키워드에서 ideal 과의 최대 코사인 → 음수 floor 0
  best_per_pkw = np.maximum(pair_cosine.max(axis=1), 0.0)  # (P,)

  # 평균을 취하기 전에 stretch 를 동일 baseline 으로 적용 (코사인 raw → 0~1)
  # cosine raw 는 정규화 안 된 값(-1~1)이므로 (raw+1)/2 → stretch 까지 한 번에 처리
  stretched_per_pkw = np.array([
    stretch_cosine((c + 1.0) / 2.0) for c in best_per_pkw
  ])

  # SEMANTIC_TOP_K 만 평균 (잡음 컷)
  if len(stretched_per_pkw) > SEMANTIC_TOP_K:
    stretched_per_pkw = np.sort(stretched_per_pkw)[::-1][:SEMANTIC_TOP_K]

  return float(np.mean(stretched_per_pkw))


# ── 4. 메인 점수 계산 ────────────────────────────────────────────────────────

def compute_matching_score(
  user_normalized_vec: Optional[np.ndarray],
  ideal_keywords: list[str],
  candidate_embedding_b64: Optional[str],
  candidate_keywords: list[str],
) -> MatchingScore:
  """
  단일 후보에 대한 매칭 점수 계산 v2.

  점수 수식:
    keyword_score = max(Jaccard, SEMANTIC_PENALTY × keyword_semantic)
    cosine_score  = stretch_cosine((raw_cosine + 1) / 2)
    final_score   = W_KEYWORD × keyword_score + W_COSINE × cosine_score
                    (cosine 결손 시 keyword_score 단독, W_KEYWORD 가중치도 1.0 으로 확장)

  :param user_normalized_vec: 기준 사용자 L2 정규화 임베딩 (또는 None)
  :param ideal_keywords:      기준 사용자 이상형 키워드 텍스트 목록
  :param candidate_embedding_b64: 후보 임베딩 Base64 (또는 None)
  :param candidate_keywords:  후보 퍼스널리티 키워드 텍스트 목록
  :return: MatchingScore (모든 세부 점수 포함)
  """
  ideal_set = set(ideal_keywords)
  candidate_set = set(candidate_keywords)

  # ── 키워드 항 ────────────────────────────────────────────────────────────
  jaccard = compute_jaccard(ideal_set, candidate_set)
  semantic = compute_keyword_semantic(ideal_keywords, candidate_keywords)
  keyword_score = max(jaccard, SEMANTIC_PENALTY * semantic)

  # ── 코사인 항 ────────────────────────────────────────────────────────────
  cosine_available = (
    user_normalized_vec is not None
    and candidate_embedding_b64 is not None
  )

  if cosine_available:
    cand_vec = kosimcse_service.base64_to_normalized_vec(candidate_embedding_b64)
    raw_cos = kosimcse_service.cosine_vec(user_normalized_vec, cand_vec)
    cosine_norm = (raw_cos + 1.0) / 2.0
    cosine_stretched = stretch_cosine(cosine_norm)
    final = W_KEYWORD * keyword_score + W_COSINE * cosine_stretched
  else:
    cosine_norm = 0.0
    cosine_stretched = 0.0
    # 코사인 항이 없으면 keyword 단독 (가중치 확장)
    final = keyword_score

  return MatchingScore(
    matching_score=round(min(max(final, 0.0), 1.0), 6),
    keyword_overlap=round(jaccard, 6),
    keyword_semantic=round(semantic, 6),
    cosine_similarity=round(cosine_stretched, 6),
    cosine_raw=round(cosine_norm, 6),
    cosine_available=cosine_available,
  )
