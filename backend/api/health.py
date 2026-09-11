"""
Health and status API endpoints.
"""

from __future__ import annotations

import os
from fastapi import APIRouter

from backend.models.schemas import HealthResponse, DatabaseStatus
from backend.services import csv_loader, chroma_service, gemini_service, hf_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health():
    """Basic health check."""
    return HealthResponse(status="ok")


@router.get("/api/database/status", response_model=DatabaseStatus)
async def database_status():
    """Return status of all data sources and services."""
    # Emission factors
    try:
        ef_df = csv_loader.get_emission_factors()
        ef_loaded = True
        ef_count = len(ef_df)
    except Exception:
        ef_loaded = False
        ef_count = 0

    # Circular interventions
    try:
        ci_df = csv_loader.get_circular_interventions()
        ci_loaded = True
        ci_count = len(ci_df)
    except Exception:
        ci_loaded = False
        ci_count = 0

    return DatabaseStatus(
        emission_factors_loaded=ef_loaded,
        emission_factor_count=ef_count,
        circular_interventions_loaded=ci_loaded,
        circular_intervention_count=ci_count,
        chroma_ready=chroma_service.is_ready(),
        chroma_document_count=chroma_service.get_document_count(),
        gemini_configured=gemini_service.is_configured(),
        huggingface_configured=hf_service.is_configured(),
    )
