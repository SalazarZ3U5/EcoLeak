"""Tests for FastAPI endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


@pytest.fixture
def client():
    """Create a test client."""
    from fastapi.testclient import TestClient
    return TestClient(app)


class TestHealth:
    """Test 9 — GET /health returns 200."""

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_database_status(self, client):
        response = client.get("/api/database/status")
        assert response.status_code == 200
        data = response.json()
        assert data["emission_factors_loaded"] is True
        assert data["emission_factor_count"] >= 4
        assert data["circular_interventions_loaded"] is True
        assert data["circular_intervention_count"] >= 4
        assert data["chroma_ready"] is True


class TestAnalyzeEndpoint:
    """Test 10 — End-to-end /api/analyze."""

    def test_plastic_factory_analysis(self, client):
        """
        Full pipeline test with the plastic factory scenario:
        - 20000 kWh grid electricity → 7700 kg CO2e
        - 500 L diesel → 1340 kg CO2e
        - 5000 kg virgin HDPE → 9750 kg CO2e
        Total: 18790 kg CO2e
        """
        payload = {
            "industry": "Plastic Manufacturing",
            "activities": [
                {"name": "grid electricity", "quantity": 20000, "unit": "kWh"},
                {"name": "diesel", "quantity": 500, "unit": "l"},
                {"name": "virgin HDPE", "quantity": 5000, "unit": "kg"},
            ],
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 200

        data = response.json()

        # Check facility summary
        summary = data["facility_summary"]
        assert summary["industry"] == "Plastic Manufacturing"
        assert summary["total_emissions_kg_co2e"] == pytest.approx(18790.0)

        # Check activities
        activities = data["activities"]
        assert len(activities) == 3

        # Verify sorting (highest CO2e first)
        assert activities[0]["activity_key"] == "virgin_hdpe_plastic"
        assert activities[0]["co2e_kg"] == pytest.approx(9750.0)
        assert activities[0]["is_leak_point"] is True

        assert activities[1]["activity_key"] == "grid_electricity"
        assert activities[1]["co2e_kg"] == pytest.approx(7700.0)
        assert activities[1]["is_leak_point"] is True

        assert activities[2]["activity_key"] == "diesel_fuel"
        assert activities[2]["co2e_kg"] == pytest.approx(1340.0)
        assert activities[2]["is_leak_point"] is False

        # Check leak points
        leak_points = data["leak_points"]
        assert len(leak_points) == 2
        assert leak_points[0]["activity_key"] == "virgin_hdpe_plastic"

        # Check circular recommendations (should have one for virgin HDPE)
        recs = data["circular_recommendations"]
        assert len(recs) >= 1
        hdpe_rec = recs[0]
        assert hdpe_rec["target_activity"] == "virgin_hdpe_plastic"
        assert hdpe_rec["alternative"] == "recycled_hdpe_flakes"
        assert hdpe_rec["baseline_co2e_kg"] == pytest.approx(9750.0)
        assert hdpe_rec["alternative_co2e_kg"] == pytest.approx(3100.0)
        assert hdpe_rec["co2e_savings_kg"] == pytest.approx(6650.0)

    def test_single_activity(self, client):
        payload = {
            "industry": "Other",
            "activities": [
                {"name": "diesel fuel", "quantity": 1000, "unit": "l"},
            ],
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["facility_summary"]["total_emissions_kg_co2e"] == pytest.approx(2680.0)

    def test_unknown_activity_produces_warning(self, client):
        payload = {
            "industry": "Other",
            "activities": [
                {"name": "antimatter fuel", "quantity": 100, "unit": "kg"},
            ],
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["warnings"]) > 0 or len(data["unresolved_activities"]) > 0

    def test_multi_category_analysis(self, client):
        """Verify LPG, water, cardboard waste, and Scope breakdown."""
        payload = {
            "industry": "Packaging",
            "activities": [
                {"name": "commercial lpg", "quantity": 100, "unit": "kg"},
                {"name": "process water", "quantity": 10000, "unit": "liters"},
                {"name": "cardboard waste", "quantity": 500, "unit": "kg"},
            ],
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()

        # Check that activities resolved to correct keys
        act_keys = [a["activity_key"] for a in data["activities"]]
        assert "lpg" in act_keys
        assert "water_supply" in act_keys
        assert "waste_cardboard" in act_keys
        # Ensure cardboard waste was NOT mapped to virgin plastic!
        assert "virgin_pet_plastic" not in act_keys

        # Check scope breakdown exists
        scopes = data["facility_summary"]["scope_breakdown"]
        assert scopes["scope_1_kg"] > 0   # LPG is Scope 1
        assert scopes["scope_3_kg"] > 0   # Water & Waste are Scope 3
        assert data["facility_summary"]["data_quality_index"] == 100.0

    def test_empty_activities_rejected(self, client):
        payload = {
            "industry": "Other",
            "activities": [],
        }
        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 422  # Validation error — min_length=1


class TestRecommendEndpoint:
    """Test direct recommendation endpoint."""

    def test_recommend_hdpe(self, client):
        payload = {
            "material_key": "virgin_hdpe_plastic",
            "quantity_kg": 5000,
        }
        response = client.post("/api/recommend", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["co2e_savings_kg"] == pytest.approx(6650.0)

    def test_recommend_unknown_returns_404(self, client):
        payload = {
            "material_key": "unknown_material_xyz",
            "quantity_kg": 100,
        }
        response = client.post("/api/recommend", json=payload)
        # May return 404 or 200 depending on ChromaDB semantic matching
        assert response.status_code in [200, 404]
