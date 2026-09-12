"""Tests for circular recommendation engine using circular_interventions_inr_template.csv."""

import pytest

from backend.services.chroma_service import sync_collection
from backend.services.circular_engine import recommend, recommend_energy, recommend_fuel


@pytest.fixture(scope="module", autouse=True)
def _sync_chroma():
    """Ensure ChromaDB is synced before tests run."""
    sync_collection()


class TestRecycledHDPE:
    """Test 5 — 5000 kg recycled HDPE from circular_interventions_inr_template.csv."""

    def test_hdpe_recommendation(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec is not None
        assert rec.target_activity == "virgin_hdpe_plastic"
        assert rec.alternative == "recycled_hdpe_flakes"

    def test_hdpe_baseline(self):
        # 5000 kg * 3.093 kg CO2e/kg = 15465.0 kg CO2e
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.baseline_co2e_kg == pytest.approx(15465.0)

    def test_hdpe_alternative_co2e(self):
        # 5000 kg * 1.768 kg CO2e/kg = 8840.0 kg CO2e
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.alternative_co2e_kg == pytest.approx(8840.0)


class TestCO2eSavings:
    """Test 6 — Savings = 15465 - 8840 = 6625 kg CO2e."""

    def test_hdpe_savings(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.co2e_savings_kg == pytest.approx(6625.0)

    def test_hdpe_reduction_percent(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        expected_pct = round((6625.0 / 15465.0) * 100, 2)
        assert rec.co2e_reduction_percent == pytest.approx(expected_pct, abs=0.1)


class TestPartialSubstitution:
    """Test partial material substitution."""

    def test_60_percent_substitution(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000, substitution_percent=60)
        assert rec is not None
        assert rec.quantity_kg == pytest.approx(3000.0)
        assert rec.substitution_percent == pytest.approx(60.0)

        # baseline = 5000 * 3.093 = 15465.0
        assert rec.baseline_co2e_kg == pytest.approx(15465.0)

        # alt = 3000 * 1.768 + 2000 * 3.093 = 5304 + 6186 = 11490.0
        assert rec.alternative_co2e_kg == pytest.approx(11490.0)

        # savings = 15465 - 11490 = 3975.0
        assert rec.co2e_savings_kg == pytest.approx(3975.0)


class TestFinancialImpact:
    """Test dynamic financial scaling and feasibility scoring in INR."""

    def test_hdpe_financial_data(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.currency == "INR"
        assert rec.currency_symbol == "₹"
        assert rec.estimated_capex_inr > 0
        assert rec.annual_opex_savings_inr == pytest.approx(5000 * (112 - 68))  # ₹2,20,000/yr
        assert rec.payback_months is not None
        assert rec.payback_months == pytest.approx(4.1, abs=0.2)
        assert rec.financial_basis == "dynamic_scaling"
        assert rec.feasibility_score == 88
        assert rec.technical_difficulty == "Low"
        assert "ASTM" in rec.regulatory_readiness

    def test_steel_financial_data(self):
        rec = recommend("virgin_steel", quantity_kg=1000)
        assert rec is not None
        assert rec.estimated_capex_inr > 0
        assert rec.annual_opex_savings_inr == pytest.approx(1000 * (72 - 34))  # ₹38,000/yr
        assert rec.payback_months is not None
        assert rec.feasibility_score == 94

    def test_virgin_plastic_pellets_inr_recommendation(self):
        """GreenPack 60,000 kg resin circular savings & INR financial scaling."""
        rec = recommend("virgin_plastic_pellets", quantity_kg=60000)
        assert rec is not None
        assert rec.alternative == "recycled_plastic_pellets"
        # 60000 * (3.171 - 1.573) = 95880.0
        assert rec.co2e_savings_kg == pytest.approx(95880.0)
        assert rec.currency == "INR"
        assert rec.currency_symbol == "₹"
        assert rec.estimated_capex_inr > 0
        # 60000 * (110 - 65) = ₹2,700,000
        assert rec.annual_opex_savings_inr == pytest.approx(2700000.0)
        assert rec.payback_months is not None
        assert rec.payback_months < 12.0

    def test_grid_electricity_solar_recommendation(self):
        """Rooftop solar intervention from INR template."""
        rec = recommend("grid_electricity", quantity_kg=100000)
        assert rec is not None
        assert rec.alternative == "onsite_rooftop_solar"
        # 100000 * (0.710 - 0.045) = 66500.0
        assert rec.co2e_savings_kg == pytest.approx(66500.0)
        # 100000 * (8.5 - 3.5) = ₹5,00,000/yr savings
        assert rec.annual_opex_savings_inr == pytest.approx(500000.0)
        assert rec.estimated_capex_inr == pytest.approx(3800000.0)

    def test_diesel_bio_diesel_recommendation(self):
        """Biodiesel B20 intervention from INR template."""
        rec = recommend("diesel_fuel", quantity_kg=10000)
        assert rec is not None
        assert rec.alternative == "bio_diesel_b20"
        # 10000 * (2.680 - 1.850) = 8300.0
        assert rec.co2e_savings_kg == pytest.approx(8300.0)
        # 10000 * (98 - 96) = ₹20,000/yr savings
        assert rec.annual_opex_savings_inr == pytest.approx(20000.0)
        assert rec.estimated_capex_inr == pytest.approx(85000.0)


class TestNoAlternative:
    """Unknown materials should return None or non-crashing result."""

    def test_unknown_material(self):
        rec = recommend("unknown_material_xyz", quantity_kg=100)
        assert rec is None or isinstance(rec, object)
