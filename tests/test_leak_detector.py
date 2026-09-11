"""Tests for leak-point detection engine."""

import pytest

from backend.models.schemas import EmissionResult, ActivityCategory
from backend.services.leak_detector import detect_leak_points, get_total_emissions


def _make_emission(key: str, co2e: float, category: ActivityCategory = ActivityCategory.FUEL) -> EmissionResult:
    """Helper to create a resolved EmissionResult."""
    return EmissionResult(
        raw_name=key,
        activity_key=key,
        category=category,
        quantity=1,
        unit="kg",
        scope="Scope 1",
        emission_factor=1.0,
        co2e_kg=co2e,
        status="resolved",
    )


class TestLeakDetection:
    """Test 8 — multi-activity leak detection with percentage verification."""

    def test_plastic_factory_scenario(self):
        """
        Plastic factory:
          - grid_electricity: 7700 kg CO2e
          - diesel_fuel: 1340 kg CO2e
          - virgin_hdpe_plastic: 9750 kg CO2e
        Total: 18790 kg CO2e

        Expected leak points: virgin_hdpe_plastic (51.89%) and grid_electricity (40.98%)
        """
        emissions = [
            _make_emission("grid_electricity", 7700, ActivityCategory.ENERGY),
            _make_emission("diesel_fuel", 1340, ActivityCategory.FUEL),
            _make_emission("virgin_hdpe_plastic", 9750, ActivityCategory.MATERIAL),
        ]

        result = detect_leak_points(emissions)

        assert len(result) == 3
        total = get_total_emissions(emissions)
        assert total == pytest.approx(18790.0)

        # Should be sorted by CO2e descending
        assert result[0].activity_key == "virgin_hdpe_plastic"
        assert result[1].activity_key == "grid_electricity"
        assert result[2].activity_key == "diesel_fuel"

        # Verify percentages
        assert result[0].share_percent == pytest.approx(51.89, abs=0.1)
        assert result[1].share_percent == pytest.approx(40.98, abs=0.1)
        assert result[2].share_percent == pytest.approx(7.13, abs=0.1)

        # Verify leak points
        assert result[0].is_leak_point is True   # 51.89% >= 30%
        assert result[1].is_leak_point is True    # 40.98% >= 30%
        assert result[2].is_leak_point is False   # 7.13% < 30%

    def test_percentages_sum_to_100(self):
        emissions = [
            _make_emission("a", 500),
            _make_emission("b", 300),
            _make_emission("c", 200),
        ]
        result = detect_leak_points(emissions)
        total_pct = sum(e.share_percent for e in result)
        assert total_pct == pytest.approx(100.0, abs=0.1)

    def test_single_activity_is_always_leak_point(self):
        emissions = [_make_emission("only_one", 1000)]
        result = detect_leak_points(emissions)
        assert len(result) == 1
        assert result[0].share_percent == pytest.approx(100.0)
        assert result[0].is_leak_point is True

    def test_empty_emissions(self):
        result = detect_leak_points([])
        assert result == []

    def test_unresolved_excluded_from_ranking(self):
        emissions = [
            _make_emission("good", 500),
            EmissionResult(
                raw_name="bad", activity_key="bad", category=ActivityCategory.UNKNOWN,
                quantity=1, unit="kg", scope="", emission_factor=0, co2e_kg=0,
                status="unresolved", warning="test",
            ),
        ]
        result = detect_leak_points(emissions)
        assert len(result) == 1
        assert result[0].activity_key == "good"
