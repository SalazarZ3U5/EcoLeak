"""
Storage & Facility Management API endpoints.

GET  /api/test/storage   — Live verification of write-and-read persistence across Supabase tables
GET  /api/facilities     — Retrieve saved facilities
POST /api/facilities     — Upsert a facility profile
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.models.schemas import FacilityInput, StorageTestResponse
from backend.services import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Storage & Facilities"])


@router.get("/test/storage", response_model=StorageTestResponse)
async def test_storage():
    """
    Test live database connectivity and table-by-table persistence.
    Verifies facilities, assessments, assessment_activities, circular_recommendations,
    chat_sessions, and chat_messages.
    """
    try:
        result = await supabase_service.test_storage_connectivity()
        return result
    except Exception as exc:
        logger.error("Storage connectivity test error: %s", exc)
        return {
            "status": "error",
            "supabase_configured": supabase_service.is_configured(),
            "tables_tested": {},
            "summary": f"Test failed with error: {str(exc)}",
        }


@router.get("/facilities")
async def get_facilities(user_id: Optional[str] = None):
    """
    Retrieve facilities stored in Supabase.
    """
    facilities = await supabase_service.get_facilities(user_id=user_id)
    return {"facilities": facilities, "count": len(facilities)}


@router.post("/facilities")
async def save_facility(facility: FacilityInput, user_id: Optional[str] = None):
    """
    Create or update a facility in Supabase.
    """
    result = await supabase_service.save_facility(
        name=facility.name,
        industry=facility.industry,
        location=facility.location,
        annual_production_tonnes=facility.annual_production_tonnes,
        grid_region=facility.grid_region,
        user_id=user_id,
        facility_id=facility.facility_id,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to save facility to database")
    return {"status": "success", "facility": result}
