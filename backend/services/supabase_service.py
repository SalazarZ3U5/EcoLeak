"""
Supabase backend service for audit history persistence.

Stores completed carbon audit results in Supabase PostgreSQL (if configured).
Gracefully degrades to no-ops when SUPABASE_URL or SUPABASE_KEY are not set.

The LLM is NEVER involved in database operations — all persistence is
handled by this deterministic service layer.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = None
_init_attempted = False


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

def _get_client():
    """Lazy-initialize the Supabase client."""
    global _client, _init_attempted

    if _init_attempted:
        return _client

    _init_attempted = True

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY", "").strip()

    if not url or not key:
        logger.info("Supabase backend not configured (SUPABASE_URL or SUPABASE_KEY missing)")
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        logger.info("Supabase backend client initialized: %s", url)
        return _client
    except Exception as e:
        logger.warning("Supabase client initialization failed: %s", e)
        return None


def is_configured() -> bool:
    """Check if Supabase backend credentials are available."""
    return bool(
        os.getenv("SUPABASE_URL", "").strip()
        and os.getenv("SUPABASE_KEY", "").strip()
    )


# ---------------------------------------------------------------------------
# Audit Persistence
# ---------------------------------------------------------------------------

import uuid

async def save_audit(
    user_id: str,
    user_email: str,
    industry: str,
    total_co2e: float,
    scope_breakdown: dict,
    leak_points: list[dict],
    circular_recommendations: list[dict],
    data_quality_index: float = 100.0,
) -> Optional[dict]:
    """
    Save an audit result to the Supabase `assessments` table.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        total_co2e_val = round(float(total_co2e), 2)
        s1 = round(float(scope_breakdown.get("scope_1_kg", 0.0)), 2)
        s2 = round(float(scope_breakdown.get("scope_2_kg", 0.0)), 2)
        s3 = round(float(scope_breakdown.get("scope_3_kg", 0.0)), 2)
        s1_pct = round(float(scope_breakdown.get("scope_1_pct", (s1 / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 1)
        s2_pct = round(float(scope_breakdown.get("scope_2_pct", (s2 / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 1)
        s3_pct = round(float(scope_breakdown.get("scope_3_pct", (s3 / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 1)

        row = {
            "id": str(uuid.uuid4()),
            "title": f"{industry} Carbon Audit",
            "industry": industry,
            "status": "completed",
            "total_emissions_kg_co2e": total_co2e_val,
            "scope_1_kg": s1,
            "scope_2_kg": s2,
            "scope_3_kg": s3,
            "scope_1_pct": s1_pct,
            "scope_2_pct": s2_pct,
            "scope_3_pct": s3_pct,
            "data_quality_index": round(float(data_quality_index), 1),
            "raw_inputs": {
                "user_id": user_id,
                "user_email": user_email,
                "leak_points": leak_points[:15] if leak_points else [],
                "recommendations": circular_recommendations[:10] if circular_recommendations else []
            },
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        result = client.table("assessments").insert(row).execute()

        if result.data:
            logger.info(
                "Audit assessment saved to Supabase: %.1f kg CO2e (%s)",
                total_co2e_val, industry,
            )
            saved_item = result.data[0]
            # Normalize field names for API compatibility
            saved_item["total_co2e_kg"] = saved_item.get("total_emissions_kg_co2e", total_co2e_val)
            saved_item["data_quality"] = saved_item.get("data_quality_index", 98.0)
            return saved_item
        else:
            logger.warning("Supabase insert into assessments returned no data")
            return None

    except Exception as e:
        logger.warning("Failed to save audit assessment to Supabase: %s", e)
        return None


async def get_user_audits(user_id: str, limit: int = 10) -> list[dict]:
    """
    Retrieve past audit history from Supabase assessments table.
    """
    client = _get_client()
    if client is None:
        return []

    try:
        result = (
            client.table("assessments")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        records = result.data or []
        for r in records:
            r["total_co2e_kg"] = r.get("total_emissions_kg_co2e", 0.0)
            r["data_quality"] = r.get("data_quality_index", 100.0)
        return records

    except Exception as e:
        logger.warning("Failed to fetch assessments from Supabase: %s", e)
        return []


async def sync_profile(auth_uid: str, email: str, name: str, role: str = "Plant Manager", facility_name: str = "", avatar_url: str = "") -> Optional[dict]:
    """Sync an operator profile to Supabase profiles table."""
    client = _get_client()
    if client is None:
        return None
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        row = {
            "auth_uid": auth_uid,
            "email": email,
            "full_name": name,
            "role": role,
            "facility_name": facility_name,
            "avatar_url": avatar_url,
            "updated_at": now_iso
        }
        res = client.table("profiles").upsert(row, on_conflict="auth_uid").execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning("Failed to sync profile to Supabase: %s", e)
        return None


async def delete_audit(audit_id: str, user_id: str) -> bool:
    """
    Delete a specific audit record from Supabase assessments.
    """
    client = _get_client()
    if client is None:
        return False

    try:
        result = (
            client.table("assessments")
            .delete()
            .eq("id", audit_id)
            .execute()
        )
        return bool(result.data)

    except Exception as e:
        logger.warning("Failed to delete audit from Supabase: %s", e)
        return False


async def delete_operator_account(user_id: str, email: str = "") -> dict:
    """
    Permanently purge operator account and all associated assessments and files from Supabase.
    """
    client = _get_client()
    deleted_counts = {
        "profiles_deleted": 0,
        "assessments_deleted": 0,
        "files_deleted": 0,
        "status": "success"
    }
    if client is None:
        return deleted_counts

    try:
        # 1. Delete all audit assessments linked to this user
        try:
            res_audits = client.table("assessments").delete().eq("raw_inputs->>user_id", user_id).execute()
            deleted_counts["assessments_deleted"] = len(res_audits.data) if res_audits.data else 0
        except Exception as e:
            logger.warning("Failed to delete assessments by user_id: %s", e)

        # Fallback check by email if available
        if email:
            try:
                client.table("assessments").delete().eq("raw_inputs->>operator_email", email).execute()
            except Exception as e:
                logger.debug("Secondary assessment deletion by email note: %s", e)

        # 2. Delete operator profile from profiles table
        try:
            res_prof = client.table("profiles").delete().eq("auth_uid", user_id).execute()
            deleted_counts["profiles_deleted"] = len(res_prof.data) if res_prof.data else 0
        except Exception as e:
            logger.warning("Failed to delete profile from Supabase: %s", e)

        # 3. Clean up uploaded storage files in audit-documents
        try:
            file_list = client.storage.from_("audit-documents").list(user_id)
            if file_list and isinstance(file_list, list):
                paths_to_del = [f"{user_id}/{f['name']}" for f in file_list if 'name' in f]
                if paths_to_del:
                    client.storage.from_("audit-documents").remove(paths_to_del)
                    deleted_counts["files_deleted"] = len(paths_to_del)
        except Exception as e:
            logger.debug("Storage cleanup note: %s", e)

        logger.info("Permanently deleted operator account %s from Supabase", user_id)
        return deleted_counts
    except Exception as e:
        logger.error("Failed to permanently delete operator account: %s", e)
        deleted_counts["status"] = "partial_error"
        deleted_counts["error"] = str(e)
        return deleted_counts
