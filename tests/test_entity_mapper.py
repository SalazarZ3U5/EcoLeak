"""
Tests for the enhanced entity classification and mapping engine.
Verifies negative constraint guardrails, alias matching, and unmapped flagging.
"""

import pytest

from backend.models.schemas import ActivityCategory
from backend.services.entity_mapper import resolve_activity


class TestEntityMapperGuardrails:
    """Ensure waste and recycled streams NEVER map to virgin materials."""

    def test_cardboard_waste_maps_to_waste(self):
        key, cat, warning = resolve_activity("cardboard waste")
        assert key == "waste_cardboard"
        assert cat == ActivityCategory.WASTE
        assert key != "virgin_pet_plastic"

    def test_plastic_waste_maps_to_waste(self):
        key, cat, warning = resolve_activity("plastic waste")
        assert key == "waste_plastic_mixed"
        assert cat == ActivityCategory.WASTE
        assert key != "virgin_pet_plastic"

    def test_recycled_plastic_maps_to_recycled(self):
        key, cat, warning = resolve_activity("recycled plastic")
        assert key == "rpet_regrind"
        assert cat == ActivityCategory.RECYCLED
        assert key != "virgin_pet_plastic"

    def test_rpet_regrind_maps_to_recycled(self):
        key, cat, warning = resolve_activity("rPET flakes")
        assert key == "rpet_regrind"
        assert cat == ActivityCategory.RECYCLED
        assert key != "virgin_pet_plastic"


class TestLPGAndWaterResolution:
    """Ensure LPG and water utilities are correctly identified."""

    def test_lpg_recognition(self):
        key, cat, warning = resolve_activity("LPG")
        assert key == "lpg"
        assert cat == ActivityCategory.FUEL

    def test_commercial_lpg_recognition(self):
        key, cat, warning = resolve_activity("commercial lpg cylinder")
        assert key == "lpg"
        assert cat == ActivityCategory.FUEL

    def test_water_supply_recognition(self):
        key, cat, warning = resolve_activity("water")
        assert key == "water_supply"
        assert cat == ActivityCategory.WATER

    def test_process_water_recognition(self):
        key, cat, warning = resolve_activity("process water")
        assert key == "water_supply"
        assert cat == ActivityCategory.WATER

    def test_effluent_wastewater_recognition(self):
        key, cat, warning = resolve_activity("effluent discharge")
        assert key == "wastewater_treatment"
        assert cat == ActivityCategory.WATER


class TestStandardFuelsAndMaterials:
    """Standard industrial inputs map accurately."""

    def test_diesel_mapping(self):
        key, cat, warning = resolve_activity("diesel fuel")
        assert key == "diesel_fuel"
        assert cat == ActivityCategory.FUEL

    def test_grid_electricity_mapping(self):
        key, cat, warning = resolve_activity("grid electricity")
        assert key == "grid_electricity"
        assert cat == ActivityCategory.ENERGY

    def test_virgin_hdpe_mapping(self):
        key, cat, warning = resolve_activity("virgin HDPE plastic")
        assert key == "virgin_hdpe_plastic"
        assert cat == ActivityCategory.MATERIAL

    def test_natural_gas_mapping(self):
        key, cat, warning = resolve_activity("piped natural gas")
        assert key == "natural_gas"
        assert cat == ActivityCategory.FUEL


class TestGreenPackMaterials:
    """Ensure previously unmapped GreenPack materials are mapped accurately."""

    def test_virgin_plastic_pellets(self):
        key, cat, warning = resolve_activity("Virgin Plastic Pellets")
        assert key == "virgin_plastic_pellets"
        assert cat == ActivityCategory.MATERIAL
        assert warning is None

    def test_color_additives(self):
        key, cat, warning = resolve_activity("Color Additives")
        assert key == "color_additives"
        assert cat == ActivityCategory.MATERIAL
        assert warning is None

    def test_packaging_material(self):
        key, cat, warning = resolve_activity("Packaging Material")
        assert key == "packaging_material"
        assert cat == ActivityCategory.MATERIAL
        assert warning is None



class TestUnresolvedFlagging:
    """Unknown or nonsense activities must be flagged as unresolved, never guessed."""

    def test_unresolvable_material(self):
        key, cat, warning = resolve_activity("quantum antimatter reactor coolant")
        assert key is None
        assert cat == ActivityCategory.UNKNOWN
        assert warning is not None
        assert "Could not map" in warning
