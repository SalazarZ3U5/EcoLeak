"""
Direct circular recommendation API endpoint.

POST /api/recommend — query a specific material for circular alternatives
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from backend.models.schemas import RecommendRequest, CircularRecommendation
from backend.services import circular_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.post("/recommend", response_model=CircularRecommendation)
async def recommend(request: RecommendRequest):
    """
    Get a circular economy recommendation for a specific virgin material.

    Returns the best circular alternative with CO2e savings and financial data.
    """
    rec = circular_engine.recommend(
        material_key=request.material_key,
        quantity_kg=request.quantity_kg,
        substitution_percent=request.substitution_percent,
    )

    if rec is None:
        raise HTTPException(
            status_code=404,
            detail=f"No circular alternative found for '{request.material_key}'.",
        )

    return rec
