"""
Storage & Facility Management API endpoints.

GET    /api/test/storage          — Live verification of write-and-read persistence across Supabase tables
GET    /api/facilities            — Retrieve saved facilities
POST   /api/facilities            — Upsert a facility profile
DELETE /api/facilities/{fac_id}   — Delete a facility profile
GET    /api/profile/{auth_uid}    — Retrieve operator profile & associated facilities
POST   /api/profile               — Upsert operator profile
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.models.schemas import FacilityInput, StorageTestResponse
from backend.services import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Storage & Facilities"])


class ProfileInput(BaseModel):
    auth_uid: str = Field(..., description="Authentication UID")
    email: str = Field(default="", description="Operator email")
    full_name: str = Field(default="Plant Operator", description="Operator full name")
    role: str = Field(default="Plant Manager", description="Operator role")
    facility_name: str = Field(default="", description="Primary facility name")
    avatar_url: str = Field(default="pfp-ops-director", description="Avatar key or URL")


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
async def get_facilities(profile_id: Optional[str] = None):
    """
    Retrieve facilities stored in Supabase.
    """
    facilities = await supabase_service.get_facilities(profile_id=profile_id)
    return {"facilities": facilities, "count": len(facilities)}


@router.post("/facilities")
async def save_facility(facility: FacilityInput, profile_id: Optional[str] = None):
    """
    Create or update a facility in Supabase.
    """
    result = await supabase_service.save_facility(
        name=facility.name,
        industry=facility.industry,
        location=facility.location,
        annual_production_tonnes=facility.annual_production_tonnes,
        grid_region=facility.grid_region,
        profile_id=profile_id,
        facility_id=facility.facility_id,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to save facility to database")
    return {"status": "success", "facility": result}


@router.delete("/facilities/{facility_id}")
async def delete_facility(facility_id: str):
    """
    Delete a facility from Supabase.
    """
    success = await supabase_service.delete_facility(facility_id)
    if not success:
        raise HTTPException(status_code=404, detail="Facility not found or failed to delete")
    return {"status": "success", "message": f"Facility {facility_id} deleted"}


@router.get("/profile/{auth_uid}")
async def get_profile(auth_uid: str):
    """
    Retrieve operator profile and associated plants from Supabase.
    """
    profile = await supabase_service.get_operator_profile(auth_uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found in Supabase")
    return {"status": "success", "profile": profile}


@router.post("/profile")
async def save_profile(profile: ProfileInput):
    """
    Upsert operator profile in Supabase profiles table.
    """
    result = await supabase_service.sync_operator_profile(
        auth_uid=profile.auth_uid,
        email=profile.email,
        name=profile.full_name,
        role=profile.role,
        facility_name=profile.facility_name,
        avatar_url=profile.avatar_url,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to sync profile to database")
    return {"status": "success", "profile": result}
