"""
Audit history API endpoints.

GET  /api/audits     — Retrieve authenticated user's past audit history
POST /api/audits     — Save an audit result (typically called after analysis)
DELETE /api/audits/{id} — Delete a specific audit record

All endpoints require valid authentication via Firebase or Supabase JWT.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.services.auth_service import get_current_user
from backend.services import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SaveAuditRequest(BaseModel):
    """Request to save an audit result."""
    industry: str = Field(..., description="Industry classification")
    total_co2e_kg: float = Field(..., description="Total emissions in kg CO2e")
    scope_breakdown: dict = Field(default_factory=dict, description="Scope 1/2/3 breakdown")
    leak_points: list[dict] = Field(default_factory=list, description="Detected emission hotspots")
    circular_recommendations: list[dict] = Field(default_factory=list, description="Circular alternatives")
    data_quality_index: float = Field(default=100.0, description="Data quality percentage")


class AuditRecord(BaseModel):
    """A saved audit record."""
    id: Optional[str] = None
    user_id: str = ""
    user_email: str = ""
    industry: str = ""
    total_co2e_kg: float = 0.0
    scope_1_kg: float = 0.0
    scope_2_kg: float = 0.0
    scope_3_kg: float = 0.0
    data_quality: float = 100.0
    created_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/audits")
async def get_audits(
    limit: int = 10,
    user: dict = Depends(get_current_user),
):
    """
    Retrieve the authenticated user's past audit history.

    Returns most recent audits first, limited to the specified count.
    Requires a valid Firebase or Supabase Bearer token.
    """
    if not supabase_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Audit history storage is not configured. Set SUPABASE_URL and SUPABASE_KEY.",
        )

    audits = await supabase_service.get_user_audits(
        user_id=user["uid"],
        limit=min(limit, 50),  # Hard cap at 50
    )

    return {"audits": audits, "count": len(audits)}


@router.post("/audits")
async def save_audit(
    request: SaveAuditRequest,
    user: dict = Depends(get_current_user),
):
    """
    Save an audit result for the authenticated user.

    Persists the analysis results to Supabase PostgreSQL for future retrieval.
    Requires a valid Firebase or Supabase Bearer token.
    """
    if not supabase_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Audit history storage is not configured. Set SUPABASE_URL and SUPABASE_KEY.",
        )

    result = await supabase_service.save_audit(
        user_id=user["uid"],
        user_email=user.get("email", ""),
        industry=request.industry,
        total_co2e=request.total_co2e_kg,
        scope_breakdown=request.scope_breakdown,
        leak_points=request.leak_points,
        circular_recommendations=request.circular_recommendations,
        data_quality_index=request.data_quality_index,
    )

    if result is None:
        raise HTTPException(
            status_code=500,
            detail="Failed to save audit. Please try again.",
        )

    return {"status": "saved", "audit": result}


@router.delete("/audits/{audit_id}")
async def delete_audit(
    audit_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Delete a specific audit record owned by the authenticated user.

    Only the record owner can delete their own audits.
    """
    if not supabase_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Audit history storage is not configured.",
        )

    deleted = await supabase_service.delete_audit(
        audit_id=audit_id,
        user_id=user["uid"],
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Audit not found or you do not have permission to delete it.",
        )

    return {"status": "deleted", "audit_id": audit_id}
