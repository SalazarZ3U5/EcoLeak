"""Tests for the local emission engine calculations."""

import pytest

from backend.models.schemas import ActivityCategory
from backend.services.emission_engine import calculate_emission


class TestDieselEmission:
    """Test 2 — 500 L diesel = 1340 kg CO2e."""

    def test_diesel_500l(self):
        result = calculate_emission(
            activity_key="diesel_fuel",
            quantity=500,
            unit="l",
            raw_name="diesel",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(1340.0)
        assert result.emission_factor == pytest.approx(2.68)
        assert result.scope == "Scope 1"

    def test_diesel_unit_alias(self):
        result = calculate_emission(
            activity_key="diesel_fuel",
            quantity=500,
            unit="litre",
            raw_name="diesel",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(1340.0)


class TestElectricityEmission:
    """Test 3 — 20000 kWh electricity = 7700 kg CO2e."""

    def test_electricity_20000kwh(self):
        result = calculate_emission(
            activity_key="grid_electricity",
            quantity=20000,
            unit="kWh",
            raw_name="grid electricity",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(14200.0)
        assert result.emission_factor == pytest.approx(0.710)
        assert result.scope == "Scope 2"


class TestVirginHDPEEmission:
    """Test 4 — 5000 kg virgin HDPE = 9750 kg CO2e."""

    def test_virgin_hdpe_5000kg(self):
        result = calculate_emission(
            activity_key="virgin_hdpe_plastic",
            quantity=5000,
            unit="kg",
            raw_name="virgin HDPE",
            category=ActivityCategory.MATERIAL,
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(9750.0)
        assert result.emission_factor == pytest.approx(1.95)
        assert result.scope == "Scope 3"

    def test_virgin_hdpe_tonnes_conversion(self):
        """5 tonnes = 5000 kg, so same result."""
        result = calculate_emission(
            activity_key="virgin_hdpe_plastic",
            quantity=5,
            unit="tonnes",
            raw_name="virgin HDPE",
            category=ActivityCategory.MATERIAL,
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(9750.0)


class TestLPGAndWaterEmissions:
    """Test emissions for newly added LPG, water, and waste categories."""

    def test_lpg_direct_kg(self):
        result = calculate_emission(
            activity_key="lpg",
            quantity=100,
            unit="kg",
            raw_name="LPG",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(298.3)
        assert result.scope == "Scope 1"

    def test_lpg_volume_conversion(self):
        # 100 L LPG * 0.54 kg/L = 54 kg * 2.983 = 161.082 kg CO2e
        result = calculate_emission(
            activity_key="lpg",
            quantity=100,
            unit="l",
            raw_name="LPG",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(161.082, abs=0.1)
        assert result.audit_note is not None
        assert "density" in result.audit_note.lower()

    def test_water_liters_conversion(self):
        # 10000 L = 10 m3 * 0.149 = 1.49 kg CO2e
        result = calculate_emission(
            activity_key="water_supply",
            quantity=10000,
            unit="liters",
            raw_name="process water",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(1.49, abs=0.01)
        assert result.normalized_quantity == pytest.approx(10.0)
        assert result.normalized_unit == "m3"

    def test_petrol_mass_conversion(self):
        # 100 kg petrol / 0.74 kg/L = 135.135 L * 2.31 = 312.16 kg CO2e
        result = calculate_emission(
            activity_key="petrol",
            quantity=100,
            unit="kg",
            raw_name="petrol",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(312.16, abs=0.5)

    def test_natural_gas_kwh_conversion(self):
        # 1055 kWh natural gas / 10.55 kWh/m3 = 100 m3 * 2.02 = 202 kg CO2e
        result = calculate_emission(
            activity_key="natural_gas",
            quantity=1055,
            unit="kWh",
            raw_name="natural gas",
        )
        assert result.status == "resolved"
        assert result.co2e_kg == pytest.approx(202.0, abs=0.1)


class TestUnresolvedActivity:
    """Activities not in the local database or physically incompatible should be unresolved."""

    def test_unknown_activity(self):
        result = calculate_emission(
            activity_key="epoxy_resin",
            quantity=100,
            unit="kg",
            raw_name="epoxy resin",
        )
        assert result.status == "unresolved"
        assert result.warning is not None
        assert "epoxy_resin" in result.warning

    def test_truly_incompatible_unit(self):
        # Electricity cannot be measured in kg
        result = calculate_emission(
            activity_key="grid_electricity",
            quantity=500,
            unit="kg",
            raw_name="grid electricity",
        )
        assert result.status == "unresolved"
        assert "incompatible" in result.warning.lower()
