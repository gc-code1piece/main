"""
Gemini API 기반 일기 주제 요약 서비스

입력: 일기 원문 (str)
출력: 50자 이내 한국어 주제 요약 (str)

사용 모델: gemini-2.0-flash (무료 티어)
Fallback: API 실패 시 기존 규칙 기반 요약(앞부분 자르기)으로 대체
"""
from __future__ import annotations

import logging
import re
import aiohttp

logger = logging.getLogger(__name__)

# ── Gemini API 설정 ──────────────────────────────────────────────────────────

GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"  # ← 여기에 실제 API 키 입력
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

SUMMARY_PROMPT_TEMPLATE = """다음 일기를 읽고, 핵심 주제를 50자 이내 한국어 한 문장으로 요약해줘.
- 반드시 50자 이내로 작성
- 따옴표, 설명, 부가 문구 없이 요약문만 출력
- 일기의 핵심 감정이나 사건을 포함

일기:
{content}"""

# ── Fallback: 규칙 기반 요약 ──────────────────────────────────────────────────

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?。])\s+")


def _fallback_summary(content: str, max_chars: int = 50) -> str:
    """Gemini API 실패 시 기존 방식 — 본문 앞부분 1~2문장 50자 이내 추출."""
    trimmed = content.strip()
    if not trimmed:
        return ""
    sentences = _SENTENCE_SPLIT.split(trimmed)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return trimmed[:max_chars]

    candidate = sentences[0]
    if len(candidate) < 10 and len(sentences) > 1:
        candidate = f"{candidate} {sentences[1]}".strip()

    if len(candidate) <= max_chars:
        return candidate

    cut = candidate[:max_chars]
    last_space = cut.rfind(" ")
    if last_space >= int(max_chars * 0.6):
        return cut[:last_space]
    return cut


# ── Gemini API 호출 ──────────────────────────────────────────────────────────

async def generate_summary(content: str, max_chars: int = 50) -> str:
    """
    Gemini API로 일기 주제 요약 생성.

    성공 시: Gemini가 생성한 50자 이내 요약문 반환
    실패 시: fallback(앞부분 자르기) 반환 — 서비스 중단 방지
    """
    try:
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SUMMARY_PROMPT_TEMPLATE.format(content=content)}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 100,
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                GEMINI_URL,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    logger.warning(
                        "Gemini API 호출 실패 — fallback 사용",
                        status=resp.status,
                        error=error_text[:200],
                    )
                    return _fallback_summary(content, max_chars)

                data = await resp.json()

        # 응답 파싱
        summary = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )

        # 따옴표 제거 및 길이 제한
        summary = summary.strip('"\'""''')
        if not summary:
            logger.warning("Gemini 응답이 비어있음 — fallback 사용")
            return _fallback_summary(content, max_chars)

        if len(summary) > max_chars:
            summary = summary[:max_chars]

        logger.info("Gemini 요약 생성 완료", summary_len=len(summary))
        return summary

    except Exception as exc:
        logger.warning(
            "Gemini API 예외 발생 — fallback 사용",
            error=str(exc),
        )
        return _fallback_summary(content, max_chars)
