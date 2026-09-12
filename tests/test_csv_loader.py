"""Tests for CSV data loading and validation."""

import pandas as pd
import pytest

from backend.services.csv_loader import (
    get_emission_factors,
    get_circular_interventions,
    get_circular_interventions_inr,
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
        assert row["co2e_per_unit"] == pytest.approx(0.710)
        assert row["unit"] == "kWh"


class TestCircularInterventionsLoading:
    """Test 2 — legacy circular_interventions.csv loading."""

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


class TestCircularInterventionsINRLoading:
    """Test 3 — circular_interventions_inr_template.csv loading and validation."""

    def test_loads_successfully(self):
        df = get_circular_interventions_inr()
        assert isinstance(df, pd.DataFrame)
        assert len(df) >= 20

    def test_has_required_inr_columns(self):
        df = get_circular_interventions_inr()
        required = [
            "virgin_material_key",
            "circular_alternative_key",
            "unit",
            "virgin_co2e_per_unit",
            "recycled_co2e_per_unit",
            "virgin_price_inr",
            "recycled_price_inr",
            "base_capex_inr",
            "base_capacity",
            "max_recommended_sub_pct",
            "payback_months",
            "feasibility_score",
            "technical_difficulty",
            "regulatory_standard",
        ]
        for col in required:
            assert col in df.columns, f"Missing INR column: {col}"

    def test_numeric_inr_columns(self):
        df = get_circular_interventions_inr()
        numeric_cols = [
            "virgin_co2e_per_unit",
            "recycled_co2e_per_unit",
            "virgin_price_inr",
            "recycled_price_inr",
            "base_capex_inr",
            "base_capacity",
            "max_recommended_sub_pct",
            "payback_months",
            "feasibility_score",
        ]
        for col in numeric_cols:
            assert pd.api.types.is_numeric_dtype(df[col]), f"Column {col} is not numeric"

    def test_inr_known_interventions(self):
        df = get_circular_interventions_inr()
        keys = df["virgin_material_key"].tolist()
        assert "virgin_hdpe_plastic" in keys
        assert "grid_electricity" in keys
        assert "diesel_fuel" in keys
        assert "water_supply" in keys
        assert "waste_plastic_incin" in keys

    def test_hdpe_inr_values(self):
        df = get_circular_interventions_inr()
        row = df[df["virgin_material_key"] == "virgin_hdpe_plastic"].iloc[0]
        assert row["circular_alternative_key"] == "recycled_hdpe_flakes"
        assert row["unit"] == "kg"
        assert row["virgin_co2e_per_unit"] == pytest.approx(3.093)
        assert row["recycled_co2e_per_unit"] == pytest.approx(1.768)
        assert row["virgin_price_inr"] == pytest.approx(112.0)
        assert row["recycled_price_inr"] == pytest.approx(68.0)
        assert row["base_capex_inr"] == pytest.approx(336000.0)
        assert row["base_capacity"] == pytest.approx(50000.0)
        assert row["payback_months"] == pytest.approx(8.0)
        assert row["feasibility_score"] == pytest.approx(88.0)
        assert row["technical_difficulty"] == "Low"

    def test_reload_data(self):
        reload_data()
        df = get_circular_interventions_inr()
        assert len(df) >= 20
