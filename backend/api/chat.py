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
from backend.services import gemini_service, assistant_service, supabase_service
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

    if supabase_service.is_configured():
        try:
            uid = user["uid"] if user else "anonymous-operator"
            email = user.get("email", "") if user else ""
            await supabase_service.save_audit(
                user_id=uid,
                user_email=email,
                industry=industry,
                total_co2e=result.facility_summary.total_emissions_kg_co2e,
                scope_breakdown=result.facility_summary.scope_breakdown.model_dump(),
                leak_points=[lp.model_dump() for lp in result.leak_points],
                circular_recommendations=[r.model_dump() for r in result.circular_recommendations],
                activities=[a.model_dump() for a in result.activities],
                data_quality_index=result.facility_summary.data_quality_index,
                facility_name="Natural Language Chat Audit",
                operator_id=user["uid"] if user else None,
            )
        except Exception as e:
            logger.warning("Auto-save chat analysis note: %s", e)

    return result


# ---------------------------------------------------------------------------
# EcoBot Project & Math Assistant Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    request: AssistantChatRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    EcoBot Conversational Assistant.

    Strictly answers queries regarding:
      1. EcoLeak project, architecture, circular economy, and SPCB compliance.
      2. Industrial emission mathematics (Scope 1/2/3 formulas, grid factors, payback math).
      3. Facility consumption calculations.

    Automatically persists message history and sessions to Supabase.
    """
    logger.info("EcoBot query received: '%s'", request.message[:80])
    res = assistant_service.chat_with_assistant(
        message=request.message,
        history=request.history,
        context=request.context,
    )

    session_id = request.session_id
    stored = False
    if supabase_service.is_configured():
        try:
            op_id = user["uid"] if user else None
            # 1. Save user prompt
            user_msg = await supabase_service.save_chat_message(
                content=request.message,
                sender="user",
                session_id=session_id,
                facility_id=request.facility_id,
                operator_id=op_id,
                title=f"EcoBot Session - {request.message[:40]}",
                identified_activities=request.context.get("activities", []) if request.context else [],
            )
            if user_msg and "session_id" in user_msg:
                session_id = user_msg["session_id"]

            # 2. Save assistant response
            if res.get("response"):
                await supabase_service.save_chat_message(
                    content=res["response"],
                    sender="assistant",
                    session_id=session_id,
                    facility_id=request.facility_id,
                    operator_id=op_id,
                    citations=[{"source": res.get("source", "groq")}],
                )
            stored = True
        except Exception as e:
            logger.warning("Supabase chat message persistence note: %s", e)

    return AssistantChatResponse(
        response=res.get("response", ""),
        source=res.get("source", "groq"),
        session_id=session_id,
        stored_in_supabase=stored,
    )

