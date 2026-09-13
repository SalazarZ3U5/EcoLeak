"""
Supabase backend service for comprehensive parameter persistence.

Stores and manages:
  - Facilities (multi-plant records, capacity, grid region, location)
  - Assessments (Scope 1/2/3 calculations, compliance standards, full audit logs)
  - Assessment Activities (per-stream activity granularity, emission factors, hotspots)
  - Circular Recommendations (techno-economic models, CAPEX, OPEX savings, payback)
  - Chat Sessions & Chat Messages (EcoBot conversational prompts and math explanations)
  - Operator Profiles (role, SPCB registration, enterprise affiliation)

The LLM is NEVER involved in database operations — all persistence is
handled deterministically by this service layer.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = None
_init_attempted = False


# ---------------------------------------------------------------------------
# Initialization & Status
# ---------------------------------------------------------------------------

class _SupabaseRestTable:
    def __init__(self, base_url: str, apikey: str, table_name: str):
        self.base_url = base_url.rstrip("/")
        self.apikey = apikey
        self.table_name = table_name
        self.headers = {
            "apikey": apikey,
            "Authorization": f"Bearer {apikey}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._select_cols = "*"
        self._filters = []
        self._order_str = ""
        self._limit_val = None
        self._method = "GET"
        self._body = None
        self._on_conflict = None

    def select(self, cols: str = "*"):
        self._method = "GET"
        self._select_cols = cols
        return self

    def insert(self, data: Any):
        self._method = "POST"
        self._body = data
        return self

    def upsert(self, data: Any, on_conflict: str = "id"):
        self._method = "POST"
        self._body = data
        self._on_conflict = on_conflict
        return self

    def delete(self):
        self._method = "DELETE"
        return self

    def eq(self, col: str, val: Any):
        self._filters.append((col, "eq", str(val)))
        return self

    def order(self, col: str, desc: bool = False):
        direction = "desc" if desc else "asc"
        self._order_str = f"{col}.{direction}"
        return self

    def limit(self, count: int):
        self._limit_val = count
        return self

    def execute(self):
        import requests
        url = f"{self.base_url}/rest/v1/{self.table_name}"
        params = {}
        headers = dict(self.headers)

        if self._method == "GET":
            params["select"] = self._select_cols
            if self._order_str:
                params["order"] = self._order_str
            if self._limit_val is not None:
                params["limit"] = str(self._limit_val)
            for col, op, val in self._filters:
                params[col] = f"{op}.{val}"
            r = requests.get(url, headers=headers, params=params, timeout=12)

        elif self._method == "POST":
            if self._on_conflict:
                headers["Prefer"] = "return=representation,resolution=merge-duplicates"
                params["on_conflict"] = self._on_conflict
            r = requests.post(url, headers=headers, params=params, json=self._body, timeout=12)

        elif self._method == "DELETE":
            for col, op, val in self._filters:
                params[col] = f"{op}.{val}"
            r = requests.delete(url, headers=headers, params=params, timeout=12)

        class ExecResult:
            def __init__(self, resp):
                self.status_code = resp.status_code
                try:
                    self.data = resp.json() if resp.status_code in [200, 201] else []
                except Exception:
                    self.data = []

        return ExecResult(r)


class _SupabaseNativeRestClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key

    def table(self, table_name: str):
        return _SupabaseRestTable(self.url, self.key, table_name)


def _get_client():
    """Lazy-initialize the Supabase client with native REST fallback."""
    global _client, _init_attempted

    if _init_attempted and _client is not None:
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
        logger.info("Supabase official client initialized: %s", url)
        return _client
    except Exception as e:
        logger.info("Using native Supabase REST client: %s", url)
        _client = _SupabaseNativeRestClient(url, key)
        return _client


def is_configured() -> bool:
    """Check if Supabase backend credentials are available."""
    return bool(
        os.getenv("SUPABASE_URL", "").strip()
        and os.getenv("SUPABASE_KEY", "").strip()
    )


def _safe_uuid(val: Any) -> Optional[str]:
    """Return string UUID if valid, else None."""
    if not val:
        return None
    try:
        return str(uuid.UUID(str(val)))
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# 1. Facilities Persistence
# ---------------------------------------------------------------------------

async def save_facility(
    name: str,
    industry: str = "Plastic manufacturing",
    location: str = "Industrial Estate, India",
    annual_production_tonnes: float = 0.0,
    grid_region: str = "WEST",
    profile_id: Optional[str] = None,
    facility_id: Optional[str] = None,
) -> Optional[dict]:
    """
    Save or update a manufacturing facility in the Supabase `facilities` table.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        f_id = _safe_uuid(facility_id) or str(uuid.uuid4())
        p_id = _safe_uuid(profile_id)

        row = {
            "id": f_id,
            "profile_id": p_id,
            "name": name.strip(),
            "industry": industry.strip() or "Plastic manufacturing",
            "location": location.strip() or "Industrial Estate, India",
            "annual_production_tonnes": round(float(annual_production_tonnes or 0.0), 2),
            "grid_region": (grid_region.strip() or "WEST").upper(),
            "updated_at": now_iso,
        }

        # Check existing facility
        res = client.table("facilities").upsert(row, on_conflict="id").execute()
        if res.data:
            logger.info("Facility '%s' persisted to Supabase (id=%s)", name, f_id)
            return res.data[0]
        return row
    except Exception as e:
        logger.warning("Failed to save facility to Supabase: %s", e)
        return None


async def get_facilities(profile_id: Optional[str] = None, limit: int = 50) -> list[dict]:
    """Retrieve facilities from Supabase `facilities` table."""
    client = _get_client()
    if client is None:
        return []

    try:
        query = client.table("facilities").select("*").order("created_at", desc=True).limit(limit)
        p_id = _safe_uuid(profile_id)
        if p_id:
            query = query.eq("profile_id", p_id)
        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.warning("Failed to fetch facilities from Supabase: %s", e)
        return []


async def delete_facility(facility_id: str) -> bool:
    """Delete a facility from Supabase `facilities` table."""
    client = _get_client()
    if client is None or not facility_id:
        return False

    try:
        f_id = _safe_uuid(facility_id)
        if not f_id:
            return False
        res = client.table("facilities").delete().eq("id", f_id).execute()
        return True
    except Exception as e:
        logger.warning("Failed to delete facility from Supabase: %s", e)
        return False


# ---------------------------------------------------------------------------
# 2. Audit Assessments & Activity Streams Persistence
# ---------------------------------------------------------------------------

async def save_audit(
    user_id: str = "",
    user_email: str = "",
    industry: str = "Plastic manufacturing",
    total_co2e: float = 0.0,
    scope_breakdown: dict = None,
    leak_points: list[dict] = None,
    circular_recommendations: list[dict] = None,
    activities: list[dict] = None,
    data_quality_index: float = 100.0,
    facility_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    facility_name: Optional[str] = None,
    compliance_standard: str = "GHG Protocol Corporate Standard / SEBI BRSR Core",
    audit_notes: str = "Calculated via EcoLeak Deterministic Engine",
) -> Optional[dict]:
    """
    Save full audit assessment and child tables (activities, recommendations)
    to Supabase `assessments`, `assessment_activities`, and `circular_recommendations`.
    """
    client = _get_client()
    if client is None:
        return None

    if scope_breakdown is None:
        scope_breakdown = {}
    if leak_points is None:
        leak_points = []
    if circular_recommendations is None:
        circular_recommendations = []
    if activities is None:
        activities = []

    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        total_co2e_val = round(float(total_co2e), 2)
        s1 = round(float(scope_breakdown.get("scope_1_kg", 0.0)), 2)
        s2 = round(float(scope_breakdown.get("scope_2_kg", 0.0)), 2)
        s3 = round(float(scope_breakdown.get("scope_3_kg", 0.0)), 2)
        s1_pct = round(float(scope_breakdown.get("scope_1_pct", (s1 / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 1)
        s2_pct = round(float(scope_breakdown.get("scope_2_pct", (s2 / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 1)
        s3_pct = round(float(scope_breakdown.get("scope_3_pct", (s3 / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 1)

        f_id = _safe_uuid(facility_id)
        op_id = _safe_uuid(operator_id)
        ass_id = str(uuid.uuid4())

        title_name = facility_name or industry or "Industrial"
        title = f"{title_name} Carbon Audit"

        row = {
            "id": ass_id,
            "facility_id": f_id,
            "operator_id": op_id,
            "title": title,
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
            "compliance_standard": compliance_standard,
            "audit_notes": audit_notes,
            "raw_inputs": {
                "user_id": user_id,
                "user_email": user_email,
                "facility_name": facility_name,
                "activities_count": len(activities),
                "leak_points": leak_points,
                "recommendations": circular_recommendations,
                "activities": activities,
                "timestamp": now_iso
            },
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        result = client.table("assessments").insert(row).execute()
        if not result.data:
            logger.warning("Supabase insert into assessments returned no data")
            return None

        saved_item = result.data[0]
        saved_item["total_co2e_kg"] = saved_item.get("total_emissions_kg_co2e", total_co2e_val)
        saved_item["data_quality"] = saved_item.get("data_quality_index", 98.0)

        # Child 1: Persist activities into assessment_activities
        act_rows = []
        target_activities = activities if activities else leak_points
        for act in target_activities:
            if isinstance(act, dict):
                co2_val = round(float(act.get("co2e_kg") or act.get("emissions_kg_co2e") or 0.0), 2)
                share = round(float(act.get("share_percent") or act.get("percent_of_total") or ((co2_val / total_co2e_val * 100) if total_co2e_val > 0 else 0.0)), 2)
                is_leak = bool(act.get("is_leak_point", share >= 15.0))
                tier = act.get("hotspot_tier") or ("high" if is_leak else "low")
                if tier not in {"high", "medium", "low"}:
                    tier = "high" if is_leak else "low"

                cat = act.get("category") or "material"
                if hasattr(cat, "value"):
                    cat = cat.value
                scope_str = act.get("scope") or "Scope 1"

                act_rows.append({
                    "id": str(uuid.uuid4()),
                    "assessment_id": ass_id,
                    "raw_name": act.get("raw_name") or act.get("name") or act.get("activity_key") or "Stream",
                    "activity_key": act.get("activity_key") or act.get("name") or "stream",
                    "category": str(cat),
                    "quantity": round(float(act.get("quantity") or 0.0), 2),
                    "unit": act.get("unit") or "kg",
                    "normalized_quantity": round(float(act.get("normalized_quantity") or act.get("quantity") or 0.0), 2),
                    "normalized_unit": act.get("normalized_unit") or act.get("unit") or "kg",
                    "scope": scope_str,
                    "emission_factor": round(float(act.get("emission_factor") or 0.0), 4),
                    "co2e_kg": co2_val,
                    "share_percent": share,
                    "is_leak_point": is_leak,
                    "hotspot_tier": tier,
                    "status": "resolved",
                    "created_at": now_iso
                })

        if act_rows:
            try:
                client.table("assessment_activities").insert(act_rows).execute()
                logger.info("Saved %d assessment activities to Supabase", len(act_rows))
            except Exception as act_err:
                logger.warning("Assessment activities child insert note: %s", act_err)

        # Child 2: Persist circular recommendations into circular_recommendations
        rec_rows = []
        for rec in circular_recommendations:
            if isinstance(rec, dict):
                rec_rows.append({
                    "id": str(uuid.uuid4()),
                    "assessment_id": ass_id,
                    "target_activity": rec.get("target_activity") or "Virgin Material",
                    "alternative": rec.get("alternative") or "Circular Alternative",
                    "intervention_type": rec.get("intervention_type") or "material_substitution",
                    "quantity_kg": round(float(rec.get("quantity_kg") or 1000.0), 2),
                    "substitution_percent": round(float(rec.get("substitution_percent") or 50.0), 2),
                    "baseline_co2e_kg": round(float(rec.get("baseline_co2e_kg") or 0.0), 2),
                    "alternative_co2e_kg": round(float(rec.get("alternative_co2e_kg") or 0.0), 2),
                    "co2e_savings_kg": round(float(rec.get("co2e_savings_kg") or 0.0), 2),
                    "co2e_reduction_percent": round(float(rec.get("co2e_reduction_percent") or 0.0), 2),
                    "estimated_capex_inr": round(float(rec.get("estimated_capex_inr") or 0.0), 2),
                    "annual_opex_savings_inr": round(float(rec.get("annual_opex_savings_inr") or 0.0), 2),
                    "estimated_capex_usd": round(float(rec.get("estimated_capex_usd") or 0.0), 2),
                    "annual_opex_savings_usd": round(float(rec.get("annual_opex_savings_usd") or 0.0), 2),
                    "payback_months": round(float(rec.get("payback_months") or 12.0), 1),
                    "financial_basis": rec.get("financial_basis") or "Williams 0.65 Rule",
                    "financial_feasibility_note": rec.get("financial_feasibility_note") or "",
                    "feasibility_score": int(rec.get("feasibility_score") or 85),
                    "technical_difficulty": rec.get("technical_difficulty") or "Low",
                    "regulatory_readiness": rec.get("regulatory_readiness") or "Standard Compliance",
                    "confidence_score": round(float(rec.get("confidence_score") or 0.90), 2),
                    "implementation_status": "in_progress",
                    "created_at": now_iso
                })

        if rec_rows:
            try:
                client.table("circular_recommendations").insert(rec_rows).execute()
                logger.info("Saved %d circular recommendations to Supabase", len(rec_rows))
            except Exception as rec_err:
                logger.warning("Circular recommendations child insert note: %s", rec_err)

        logger.info("Saved audit assessment to Supabase: %.1f kg CO2e (%s)", total_co2e_val, title)
        return saved_item

    except Exception as e:
        logger.warning("Failed to save audit assessment to Supabase: %s", e)
        return None


async def get_user_audits(user_id: str = "", limit: int = 20) -> list[dict]:
    """Retrieve past audit history from Supabase `assessments` table."""
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


async def delete_audit(audit_id: str) -> bool:
    """Delete a specific audit record and cascaded items from Supabase."""
    client = _get_client()
    if client is None:
        return False

    try:
        # Child records
        client.table("assessment_activities").delete().eq("assessment_id", audit_id).execute()
        client.table("circular_recommendations").delete().eq("assessment_id", audit_id).execute()
        # Assessment row
        result = client.table("assessments").delete().eq("id", audit_id).execute()
        return bool(result.data)
    except Exception as e:
        logger.warning("Failed to delete audit from Supabase: %s", e)
        return False


# ---------------------------------------------------------------------------
# 3. Chat Sessions & Chat Messages Persistence
# ---------------------------------------------------------------------------

async def create_or_get_chat_session(
    session_id: Optional[str] = None,
    facility_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    title: Optional[str] = None,
) -> str:
    """Ensure a chat session exists in Supabase `chat_sessions` and return its UUID."""
    client = _get_client()
    s_id = _safe_uuid(session_id) or str(uuid.uuid4())
    if client is None:
        return s_id

    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        # Check if session exists
        existing = client.table("chat_sessions").select("id").eq("id", s_id).execute()
        if existing.data:
            return s_id

        f_id = _safe_uuid(facility_id)
        op_id = _safe_uuid(operator_id)
        session_title = title or f"EcoBot Session - {datetime.now(timezone.utc).strftime('%d %b %H:%M')}"

        row = {
            "id": s_id,
            "facility_id": f_id,
            "operator_id": op_id,
            "title": session_title,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        client.table("chat_sessions").insert(row).execute()
        logger.info("Chat session initialized in Supabase (id=%s)", s_id)
        return s_id
    except Exception as e:
        logger.warning("Failed to initialize chat session in Supabase: %s", e)
        return s_id


async def save_chat_message(
    content: str,
    sender: str = "user",
    session_id: Optional[str] = None,
    facility_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    title: Optional[str] = None,
    identified_activities: Optional[list] = None,
    citations: Optional[list] = None,
) -> Optional[dict]:
    """
    Save a user or assistant message to Supabase `chat_messages`
    linked to an active chat session.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        # Ensure parent session exists
        active_session_id = await create_or_get_chat_session(
            session_id=session_id,
            facility_id=facility_id,
            operator_id=operator_id,
            title=title,
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        msg_id = str(uuid.uuid4())
        msg_row = {
            "id": msg_id,
            "session_id": active_session_id,
            "sender": sender,
            "content": content,
            "identified_activities": identified_activities or [],
            "citations": citations or [],
            "created_at": now_iso,
        }

        res = client.table("chat_messages").insert(msg_row).execute()
        if res.data:
            saved = res.data[0]
            saved["session_id"] = active_session_id
            return saved
        return msg_row
    except Exception as e:
        logger.warning("Failed to save chat message to Supabase: %s", e)
        return None


async def get_chat_history(session_id: str, limit: int = 50) -> list[dict]:
    """Retrieve ordered chat messages for a specific session."""
    client = _get_client()
    if client is None:
        return []

    try:
        s_id = _safe_uuid(session_id)
        if not s_id:
            return []
        res = (
            client.table("chat_messages")
            .select("*")
            .eq("session_id", s_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.warning("Failed to fetch chat history: %s", e)
        return []


# ---------------------------------------------------------------------------
# 4. Profile & Account Management
# ---------------------------------------------------------------------------

async def sync_profile(
    auth_uid: str,
    email: str,
    name: str,
    role: str = "Plant Manager",
    facility_name: str = "",
    avatar_url: str = "",
) -> Optional[dict]:
    """Sync an operator profile to Supabase `profiles` table."""
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
            "updated_at": now_iso,
        }
        res = client.table("profiles").upsert(row, on_conflict="auth_uid").execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning("Failed to sync profile to Supabase: %s", e)
        return None


async def get_operator_profile(auth_uid: str) -> Optional[dict]:
    """Retrieve an operator profile by auth_uid from Supabase `profiles` table along with linked facilities."""
    client = _get_client()
    if client is None or not auth_uid:
        return None

    try:
        res = client.table("profiles").select("*").eq("auth_uid", auth_uid).execute()
        if res.data and len(res.data) > 0:
            profile = res.data[0]
            # Also fetch facilities linked to this profile
            profile_id = profile.get("id")
            facilities = await get_facilities(profile_id=profile_id)
            profile["plants"] = facilities
            return profile
        return None
    except Exception as e:
        logger.warning("Failed to get operator profile from Supabase: %s", e)
        return None


async def delete_operator_account(user_id: str, email: str = "") -> dict:
    """Permanently purge operator account, assessments, and profile from Supabase."""
    client = _get_client()
    deleted_counts = {
        "profiles_deleted": 0,
        "assessments_deleted": 0,
        "files_deleted": 0,
        "status": "success",
    }
    if client is None:
        return deleted_counts

    try:
        # Delete user assessments
        try:
            res_audits = client.table("assessments").delete().eq("raw_inputs->>user_id", user_id).execute()
            deleted_counts["assessments_deleted"] = len(res_audits.data) if res_audits.data else 0
        except Exception as e:
            logger.warning("Failed to delete assessments by user_id: %s", e)

        # Delete profile
        try:
            res_prof = client.table("profiles").delete().eq("auth_uid", user_id).execute()
            deleted_counts["profiles_deleted"] = len(res_prof.data) if res_prof.data else 0
        except Exception as e:
            logger.warning("Failed to delete profile from Supabase: %s", e)

        # Clean storage
        try:
            file_list = client.storage.from_("audit-documents").list(user_id)
            if file_list and isinstance(file_list, list):
                paths_to_del = [f"{user_id}/{f['name']}" for f in file_list if "name" in f]
                if paths_to_del:
                    client.storage.from_("audit-documents").remove(paths_to_del)
                    deleted_counts["files_deleted"] = len(paths_to_del)
        except Exception as e:
            logger.debug("Storage cleanup note: %s", e)

        return deleted_counts
    except Exception as e:
        logger.error("Failed to permanently delete operator account: %s", e)
        deleted_counts["status"] = "partial_error"
        deleted_counts["error"] = str(e)
        return deleted_counts


# ---------------------------------------------------------------------------
# 5. Live Storage Diagnostic & Verification Test
# ---------------------------------------------------------------------------

async def test_storage_connectivity() -> dict:
    """
    Perform a live, non-destructive write, read, and verification test
    across all primary Supabase tables: facilities, assessments,
    assessment_activities, circular_recommendations, chat_sessions,
    and chat_messages.
    """
    client = _get_client()
    if client is None:
        return {
            "status": "error",
            "supabase_configured": False,
            "message": "Supabase credentials not configured in environment.",
            "tables_tested": {},
            "summary": "Supabase unconfigured."
        }

    results = {}
    test_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # Track test IDs for cleanup
    cleanup_ids = {
        "facility_id": None,
        "assessment_id": None,
        "activity_id": None,
        "recommendation_id": None,
        "session_id": None,
        "message_id": None,
    }

    try:
        # A. Test Facilities Table
        fac_id = str(uuid.uuid4())
        cleanup_ids["facility_id"] = fac_id
        fac_row = {
            "id": fac_id,
            "name": f"Diagnostic Test Plant ({test_id[:8]})",
            "industry": "Plastic manufacturing",
            "location": "Diagnostic MIDC Hub, Pune",
            "annual_production_tonnes": 5000.0,
            "grid_region": "WEST",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        res_fac = client.table("facilities").insert(fac_row).execute()
        q_fac = client.table("facilities").select("id, name, location").eq("id", fac_id).execute()
        results["facilities"] = {
            "status": "stored_and_verified" if (q_fac.data and len(q_fac.data) > 0) else "failed",
            "record_id": fac_id,
            "name": fac_row["name"],
            "location": fac_row["location"],
        }

        # B. Test Assessments Table
        ass_id = str(uuid.uuid4())
        cleanup_ids["assessment_id"] = ass_id
        ass_row = {
            "id": ass_id,
            "facility_id": fac_id,
            "title": f"Diagnostic Audit #{test_id[:8]}",
            "industry": "Plastic manufacturing",
            "status": "completed",
            "total_emissions_kg_co2e": 125000.50,
            "scope_1_kg": 25000.0,
            "scope_2_kg": 85000.5,
            "scope_3_kg": 15000.0,
            "scope_1_pct": 20.0,
            "scope_2_pct": 68.0,
            "scope_3_pct": 12.0,
            "data_quality_index": 99.0,
            "compliance_standard": "GHG Protocol Corporate Standard / SEBI BRSR Core",
            "audit_notes": "Diagnostic automated connectivity verification",
            "raw_inputs": {"test": True, "diagnostic_id": test_id},
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        res_ass = client.table("assessments").insert(ass_row).execute()
        q_ass = client.table("assessments").select("id, title, total_emissions_kg_co2e").eq("id", ass_id).execute()
        results["assessments"] = {
            "status": "stored_and_verified" if (q_ass.data and len(q_ass.data) > 0) else "failed",
            "record_id": ass_id,
            "title": ass_row["title"],
            "total_emissions_kg_co2e": ass_row["total_emissions_kg_co2e"],
        }

        # C. Test Assessment Activities Table
        act_id = str(uuid.uuid4())
        cleanup_ids["activity_id"] = act_id
        act_row = {
            "id": act_id,
            "assessment_id": ass_id,
            "raw_name": "Diagnostic Grid Power",
            "activity_key": "grid_electricity",
            "category": "energy",
            "quantity": 103650.0,
            "unit": "kWh",
            "normalized_quantity": 103650.0,
            "normalized_unit": "kWh",
            "scope": "Scope 2",
            "emission_factor": 0.82,
            "co2e_kg": 85000.5,
            "share_percent": 68.0,
            "is_leak_point": True,
            "hotspot_tier": "high",
            "status": "resolved",
            "created_at": now_iso,
        }
        client.table("assessment_activities").insert(act_row).execute()
        q_act = client.table("assessment_activities").select("id, raw_name, co2e_kg").eq("id", act_id).execute()
        results["assessment_activities"] = {
            "status": "stored_and_verified" if (q_act.data and len(q_act.data) > 0) else "failed",
            "record_id": act_id,
            "raw_name": act_row["raw_name"],
            "co2e_kg": act_row["co2e_kg"],
        }

        # D. Test Circular Recommendations Table
        rec_id = str(uuid.uuid4())
        cleanup_ids["recommendation_id"] = rec_id
        rec_row = {
            "id": rec_id,
            "assessment_id": ass_id,
            "target_activity": "Virgin Resin",
            "alternative": "Recycled PCR Polymer",
            "intervention_type": "material_substitution",
            "quantity_kg": 20000.0,
            "substitution_percent": 50.0,
            "baseline_co2e_kg": 38000.0,
            "alternative_co2e_kg": 11000.0,
            "co2e_savings_kg": 27000.0,
            "co2e_reduction_percent": 71.05,
            "estimated_capex_inr": 350000.0,
            "annual_opex_savings_inr": 180000.0,
            "estimated_capex_usd": 3684.21,
            "annual_opex_savings_usd": 1894.74,
            "payback_months": 23.3,
            "financial_basis": "Williams 0.65 Rule",
            "financial_feasibility_note": "Diagnostic high-IRR test verification",
            "feasibility_score": 90,
            "technical_difficulty": "Low",
            "regulatory_readiness": "BIS & MoEFCC certified",
            "confidence_score": 0.95,
            "implementation_status": "in_progress",
            "created_at": now_iso,
        }
        client.table("circular_recommendations").insert(rec_row).execute()
        q_rec = client.table("circular_recommendations").select("id, alternative, co2e_savings_kg").eq("id", rec_id).execute()
        results["circular_recommendations"] = {
            "status": "stored_and_verified" if (q_rec.data and len(q_rec.data) > 0) else "failed",
            "record_id": rec_id,
            "alternative": rec_row["alternative"],
            "co2e_savings_kg": rec_row["co2e_savings_kg"],
        }

        # E. Test Chat Sessions Table
        sess_id = str(uuid.uuid4())
        cleanup_ids["session_id"] = sess_id
        sess_row = {
            "id": sess_id,
            "facility_id": fac_id,
            "title": f"Diagnostic EcoBot Thread #{test_id[:8]}",
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        client.table("chat_sessions").insert(sess_row).execute()
        q_sess = client.table("chat_sessions").select("id, title").eq("id", sess_id).execute()
        results["chat_sessions"] = {
            "status": "stored_and_verified" if (q_sess.data and len(q_sess.data) > 0) else "failed",
            "record_id": sess_id,
            "title": sess_row["title"],
        }

        # F. Test Chat Messages Table
        msg_id = str(uuid.uuid4())
        cleanup_ids["message_id"] = msg_id
        msg_row = {
            "id": msg_id,
            "session_id": sess_id,
            "sender": "user",
            "content": "Diagnostic query: verify Scope 1-3 math persistence.",
            "identified_activities": [{"name": "Diagnostic Electricity", "quantity": 1000}],
            "citations": [{"source": "EcoLeak Engine v2.0"}],
            "created_at": now_iso,
        }
        client.table("chat_messages").insert(msg_row).execute()
        q_msg = client.table("chat_messages").select("id, sender, content").eq("id", msg_id).execute()
        results["chat_messages"] = {
            "status": "stored_and_verified" if (q_msg.data and len(q_msg.data) > 0) else "failed",
            "record_id": msg_id,
            "sender": msg_row["sender"],
            "content": msg_row["content"],
        }

    finally:
        # Non-destructive test cleanup of temporary diagnostic rows
        if cleanup_ids["message_id"]:
            try:
                client.table("chat_messages").delete().eq("id", cleanup_ids["message_id"]).execute()
            except Exception:
                pass
        if cleanup_ids["session_id"]:
            try:
                client.table("chat_sessions").delete().eq("id", cleanup_ids["session_id"]).execute()
            except Exception:
                pass
        if cleanup_ids["recommendation_id"]:
            try:
                client.table("circular_recommendations").delete().eq("id", cleanup_ids["recommendation_id"]).execute()
            except Exception:
                pass
        if cleanup_ids["activity_id"]:
            try:
                client.table("assessment_activities").delete().eq("id", cleanup_ids["activity_id"]).execute()
            except Exception:
                pass
        if cleanup_ids["assessment_id"]:
            try:
                client.table("assessments").delete().eq("id", cleanup_ids["assessment_id"]).execute()
            except Exception:
                pass
        if cleanup_ids["facility_id"]:
            try:
                client.table("facilities").delete().eq("id", cleanup_ids["facility_id"]).execute()
            except Exception:
                pass

    all_passed = all(r.get("status") == "stored_and_verified" for r in results.values())

    return {
        "status": "success" if all_passed else "partial_success",
        "supabase_configured": True,
        "tables_tested": results,
        "summary": (
            "All parameters (facilities, assessments, assessment_activities, "
            "circular_recommendations, chat_sessions, chat_messages) successfully stored "
            "and verified in Supabase." if all_passed else "Some Supabase tables encountered warnings."
        )
    }
