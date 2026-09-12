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
    Save an audit result to the Supabase `audits` table.

    Expected table schema:
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
        user_id         TEXT NOT NULL
        user_email      TEXT
        industry        TEXT
        total_co2e_kg   FLOAT
        scope_1_kg      FLOAT
        scope_2_kg      FLOAT
        scope_3_kg      FLOAT
        leak_points     JSONB
        recommendations JSONB
        data_quality    FLOAT
        created_at      TIMESTAMPTZ DEFAULT now()

    Returns the inserted row or None if Supabase is not configured.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        row = {
            "user_id": user_id,
            "user_email": user_email,
            "industry": industry,
            "total_co2e_kg": round(total_co2e, 2),
            "scope_1_kg": round(scope_breakdown.get("scope_1_kg", 0.0), 2),
            "scope_2_kg": round(scope_breakdown.get("scope_2_kg", 0.0), 2),
            "scope_3_kg": round(scope_breakdown.get("scope_3_kg", 0.0), 2),
            "leak_points": json.dumps(leak_points[:20]),  # Cap at 20 items to limit row size
            "recommendations": json.dumps(circular_recommendations[:10]),
            "data_quality": round(data_quality_index, 1),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        result = client.table("audits").insert(row).execute()

        if result.data:
            logger.info(
                "Audit saved for user %s: %.1f kg CO2e (%s)",
                user_id, total_co2e, industry,
            )
            return result.data[0]
        else:
            logger.warning("Supabase insert returned no data")
            return None

    except Exception as e:
        logger.warning("Failed to save audit to Supabase: %s", e)
        return None


async def get_user_audits(user_id: str, limit: int = 10) -> list[dict]:
    """
    Retrieve past audit history for a user from Supabase.

    Returns a list of audit records, most recent first.
    """
    client = _get_client()
    if client is None:
        return []

    try:
        result = (
            client.table("audits")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    except Exception as e:
        logger.warning("Failed to fetch audits from Supabase: %s", e)
        return []


async def delete_audit(audit_id: str, user_id: str) -> bool:
    """
    Delete a specific audit record (only if owned by the user).

    Returns True if deleted, False otherwise.
    """
    client = _get_client()
    if client is None:
        return False

    try:
        result = (
            client.table("audits")
            .delete()
            .eq("id", audit_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(result.data)

    except Exception as e:
        logger.warning("Failed to delete audit from Supabase: %s", e)
        return False
