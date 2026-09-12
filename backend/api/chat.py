from __future__ import annotations

import logging

from typing import Optional

from fastapi import APIRouter, Depends

from backend.models.schemas import (
    ChatRequest,
    AnalyzeResponse,
    FacilitySummary,
    AssistantChatRequest,
    AssistantChatResponse,
)
from backend.services import gemini_service, assistant_service
from backend.api.analyze import run_analysis_pipeline
from backend.services.auth_service import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Process-Data Chat Extraction Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/analyze/chat", response_model=AnalyzeResponse)
async def analyze_chat(
    request: ChatRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Analyze factory operations from natural language description.

    Uses Gemini to extract structured activities from the message,
    then runs the standard analysis pipeline.
    """
    warnings: list[str] = []

    # Extract activities using Gemini
    extraction = gemini_service.extract_activities(request.message)

    if extraction is None:
        warnings.append("Gemini unavailable; deterministic extraction used.")
        # Fallback: try basic parsing (very limited)
        return AnalyzeResponse(
            facility_summary=FacilitySummary(
                industry="Other",
                total_emissions_kg_co2e=0,
            ),
            warnings=warnings + [
                "Natural language processing requires Gemini. "
                "Please use the structured /api/analyze endpoint instead, "
                "or configure GEMINI_API_KEY."
            ],
        )

    industry = extraction.get("industry", "Other")
    activities = extraction.get("activities", [])

    if not activities:
        warnings.append("No activities could be extracted from the message.")
        return AnalyzeResponse(
            facility_summary=FacilitySummary(
                industry=industry,
                total_emissions_kg_co2e=0,
            ),
            warnings=warnings,
        )

    logger.info(
        "Chat extraction: industry='%s', %d activities",
        industry, len(activities),
    )

    result = run_analysis_pipeline(industry, activities)
    result.warnings = warnings + result.warnings
    return result


# ---------------------------------------------------------------------------
# EcoBot Project & Math Assistant Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(request: AssistantChatRequest):
    """
    EcoBot Conversational Assistant.

    Strictly answers queries regarding:
      1. EcoLeak project, architecture, circular economy, and SPCB compliance.
      2. Industrial emission mathematics (Scope 1/2/3 formulas, grid factors, payback math).
      3. Facility consumption calculations.

    Politely declines off-topic queries.
    """
    logger.info("EcoBot query received: '%s'", request.message[:80])
    res = assistant_service.chat_with_assistant(
        message=request.message,
        history=request.history,
        context=request.context,
    )
    return AssistantChatResponse(
        response=res.get("response", ""),
        source=res.get("source", "groq"),
    )

