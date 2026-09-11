"""
Chat-based analysis API endpoint.

POST /api/analyze/chat — natural language input → Gemini extraction → analysis pipeline
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from backend.models.schemas import (
    ChatRequest,
    AnalyzeResponse,
    FacilitySummary,
)
from backend.services import gemini_service
from backend.api.analyze import run_analysis_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze")


@router.post("/chat", response_model=AnalyzeResponse)
async def analyze_chat(request: ChatRequest):
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
