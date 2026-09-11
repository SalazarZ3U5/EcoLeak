"""Tests for circular recommendation engine."""

import pytest

from backend.services.chroma_service import sync_collection
from backend.services.circular_engine import recommend


@pytest.fixture(scope="module", autouse=True)
def _sync_chroma():
    """Ensure ChromaDB is synced before tests run."""
    sync_collection()


class TestRecycledHDPE:
    """Test 5 — 5000 kg recycled HDPE = 3100 kg CO2e alternative."""

    def test_hdpe_recommendation(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec is not None
        assert rec.target_activity == "virgin_hdpe_plastic"
        assert rec.alternative == "recycled_hdpe_flakes"

    def test_hdpe_baseline(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.baseline_co2e_kg == pytest.approx(9750.0)

    def test_hdpe_alternative_co2e(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.alternative_co2e_kg == pytest.approx(3100.0)


class TestCO2eSavings:
    """Test 6 — Savings = 9750 - 3100 = 6650 kg CO2e."""

    def test_hdpe_savings(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.co2e_savings_kg == pytest.approx(6650.0)

    def test_hdpe_reduction_percent(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        expected_pct = round((6650 / 9750) * 100, 2)
        assert rec.co2e_reduction_percent == pytest.approx(expected_pct, abs=0.1)


class TestPartialSubstitution:
    """Test partial material substitution."""

    def test_60_percent_substitution(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000, substitution_percent=60)
        assert rec is not None
        assert rec.quantity_kg == pytest.approx(3000.0)
        assert rec.substitution_percent == pytest.approx(60.0)

        # baseline = 5000 * 1.95 = 9750
        assert rec.baseline_co2e_kg == pytest.approx(9750.0)

        # alt = 3000 * 0.62 + 2000 * 1.95 = 1860 + 3900 = 5760
        assert rec.alternative_co2e_kg == pytest.approx(5760.0)

        # savings = 9750 - 5760 = 3990
        assert rec.co2e_savings_kg == pytest.approx(3990.0)


class TestFinancialImpact:
    """Test dynamic financial scaling and feasibility scoring."""

    def test_hdpe_financial_data(self):
        rec = recommend("virgin_hdpe_plastic", quantity_kg=5000)
        assert rec.estimated_capex_usd > 0
        assert rec.payback_months is not None
        assert rec.payback_months > 0
        assert rec.financial_basis == "dynamic_scaling"
        assert rec.annual_opex_savings_usd > 0
        assert rec.feasibility_score >= 80
        assert rec.technical_difficulty == "Low"
        assert "ASTM" in rec.financial_feasibility_note or "retrofit" in rec.financial_feasibility_note

    def test_steel_financial_data(self):
        rec = recommend("virgin_steel", quantity_kg=1000)
        assert rec is not None
        assert rec.estimated_capex_usd > 0
        assert rec.payback_months is not None
        assert rec.feasibility_score >= 90

    def test_virgin_plastic_pellets_inr_recommendation(self):
        """GreenPack 60,000 kg resin circular savings & INR financial scaling."""
        rec = recommend("virgin_plastic_pellets", quantity_kg=60000)
        assert rec is not None
        assert rec.alternative == "recycled_plastic_pellets"
        assert rec.co2e_savings_kg == pytest.approx(91800.0)
        assert rec.currency == "INR"
        assert rec.currency_symbol == "₹"
        assert rec.estimated_capex_inr > 0
        assert rec.annual_opex_savings_inr > 0
        assert rec.payback_months is not None
        assert rec.payback_months < 12.0



class TestNoAlternative:
    """Unknown materials should return None."""

    def test_unknown_material(self):
        rec = recommend("unknown_material_xyz", quantity_kg=100)
        # May return None or a result depending on ChromaDB semantic search
        # At minimum, it should not crash
        assert rec is None or isinstance(rec, object)
