"""Tests for CSV data loading and validation."""

import pandas as pd
import pytest

from backend.services.csv_loader import (
    get_emission_factors,
    get_circular_interventions,
    reload_data,
)


class TestEmissionFactorsLoading:
    """Test 1 — emission_factors.csv loading."""

    def test_loads_successfully(self):
        df = get_emission_factors()
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0

    def test_has_required_columns(self):
        df = get_emission_factors()
        required = ["activity_key", "unit", "co2e_per_unit", "scope"]
        for col in required:
            assert col in df.columns, f"Missing column: {col}"

    def test_no_bom_in_headers(self):
        df = get_emission_factors()
        for col in df.columns:
            assert "\ufeff" not in col, f"BOM found in column: {repr(col)}"

    def test_numeric_emission_factors(self):
        df = get_emission_factors()
        assert pd.api.types.is_numeric_dtype(df["co2e_per_unit"])

    def test_known_factors_present(self):
        df = get_emission_factors()
        keys = df["activity_key"].tolist()
        assert "diesel_fuel" in keys
        assert "natural_gas" in keys
        assert "petrol" in keys
        assert "grid_electricity" in keys

    def test_diesel_factor_value(self):
        df = get_emission_factors()
        row = df[df["activity_key"] == "diesel_fuel"].iloc[0]
        assert row["co2e_per_unit"] == pytest.approx(2.68)
        assert row["unit"] == "l"

    def test_electricity_factor_value(self):
        df = get_emission_factors()
        row = df[df["activity_key"] == "grid_electricity"].iloc[0]
        assert row["co2e_per_unit"] == pytest.approx(0.385)
        assert row["unit"] == "kWh"


class TestCircularInterventionsLoading:
    """Test 1 — circular_interventions.csv loading."""

    def test_loads_successfully(self):
        df = get_circular_interventions()
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0

    def test_has_required_columns(self):
        df = get_circular_interventions()
        required = [
            "virgin_material_key",
            "circular_alternative_key",
            "virgin_co2e_per_kg",
            "recycled_co2e_per_kg",
            "avg_capex_usd",
            "payback_months",
        ]
        for col in required:
            assert col in df.columns, f"Missing column: {col}"

    def test_numeric_columns(self):
        df = get_circular_interventions()
        for col in ["virgin_co2e_per_kg", "recycled_co2e_per_kg", "avg_capex_usd", "payback_months"]:
            assert pd.api.types.is_numeric_dtype(df[col]), f"Column {col} is not numeric"

    def test_known_interventions_present(self):
        df = get_circular_interventions()
        keys = df["virgin_material_key"].tolist()
        assert "virgin_hdpe_plastic" in keys
        assert "virgin_pet_plastic" in keys
        assert "virgin_steel" in keys
        assert "virgin_aluminum" in keys

    def test_hdpe_values(self):
        df = get_circular_interventions()
        row = df[df["virgin_material_key"] == "virgin_hdpe_plastic"].iloc[0]
        assert row["virgin_co2e_per_kg"] == pytest.approx(1.95)
        assert row["recycled_co2e_per_kg"] == pytest.approx(0.62)
        assert row["avg_capex_usd"] == pytest.approx(2500)
        assert row["payback_months"] == pytest.approx(8)
