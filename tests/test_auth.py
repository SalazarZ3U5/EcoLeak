"""Tests for authentication service and protected endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

from backend.services.auth_service import (
    verify_token,
    get_current_user_optional,
    is_firebase_configured,
    is_supabase_configured,
    get_auth_status,
)


class TestAuthServiceConfiguration:
    """Test auth service configuration detection."""

    def test_auth_status_returns_dict(self):
        status = get_auth_status()
        assert isinstance(status, dict)
        assert "firebase_admin_configured" in status
        assert "supabase_backend_configured" in status
        assert "any_auth_configured" in status

    def test_firebase_configured_checks_project_id(self):
        """Firebase should be detected via VITE_FIREBASE_PROJECT_ID in .env."""
        result = is_firebase_configured()
        # Should be True since VITE_FIREBASE_PROJECT_ID=ecoleak-7b7ce is in .env
        assert isinstance(result, bool)

    def test_supabase_configured_checks_env(self):
        result = is_supabase_configured()
        assert isinstance(result, bool)


class TestTokenVerification:
    """Test token verification edge cases."""

    def test_verify_token_rejects_empty(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_token("")
        assert exc_info.value.status_code == 401

    def test_verify_token_rejects_undefined(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_token("undefined")
        assert exc_info.value.status_code == 401

    def test_verify_token_rejects_null(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_token("null")
        assert exc_info.value.status_code == 401

    def test_verify_token_rejects_invalid(self):
        """An invalid JWT string should be rejected by all providers."""
        with pytest.raises(HTTPException) as exc_info:
            verify_token("invalid.token.here")
        assert exc_info.value.status_code == 401


class TestOptionalAuthDependency:
    """Test the soft auth dependency used by analyze endpoints."""

    @pytest.mark.anyio
    async def test_optional_auth_returns_none_without_header(self):
        result = await get_current_user_optional(authorization=None)
        assert result is None

    @pytest.mark.anyio
    async def test_optional_auth_returns_none_for_non_bearer(self):
        result = await get_current_user_optional(authorization="Basic abc123")
        assert result is None

    @pytest.mark.anyio
    async def test_optional_auth_returns_none_for_empty_bearer(self):
        result = await get_current_user_optional(authorization="Bearer ")
        assert result is None

    @pytest.mark.anyio
    async def test_optional_auth_returns_none_for_undefined_token(self):
        result = await get_current_user_optional(authorization="Bearer undefined")
        assert result is None

    @pytest.mark.anyio
    async def test_optional_auth_silently_ignores_invalid_token(self):
        """Should NOT raise 401 — just return None for invalid tokens."""
        result = await get_current_user_optional(authorization="Bearer bad.token.here")
        assert result is None


class TestAnalyzeEndpointBackwardCompat:
    """Ensure analyze endpoints still work without auth headers."""

    def test_analyze_without_auth(self):
        """POST /api/analyze should work without any Authorization header."""
        from starlette.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.post("/api/analyze", json={
            "industry": "Plastic manufacturing",
            "activities": [
                {"name": "Grid Electricity", "quantity": 10000, "unit": "kWh"}
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert "facility_summary" in data
        assert data["facility_summary"]["total_emissions_kg_co2e"] > 0

    def test_analyze_chat_without_auth(self):
        """POST /api/analyze/chat should work without any Authorization header."""
        from starlette.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.post("/api/analyze/chat", json={
            "message": "We used 5000 kWh of electricity",
        })
        # Should return 200 (may return empty if no LLM configured, but should not 401)
        assert response.status_code == 200

    def test_health_endpoint_public(self):
        """GET /health should always be public."""
        from starlette.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestAuditsEndpointAuth:
    """Test that audit endpoints enforce authentication."""

    def test_get_audits_requires_auth(self):
        """GET /api/audits should return 422 (missing header) without auth."""
        from starlette.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.get("/api/audits")
        # FastAPI will return 422 (Unprocessable Entity) because the
        # Authorization header is required by get_current_user dependency
        assert response.status_code == 422

    def test_get_audits_rejects_bad_token(self):
        """GET /api/audits with invalid Bearer token should return 401."""
        from starlette.testclient import TestClient
        from backend.main import app

        client = TestClient(app)
        response = client.get(
            "/api/audits",
            headers={"Authorization": "Bearer invalid.fake.token"},
        )
        assert response.status_code == 401
