"""
Local emission calculation engine with physical dimension validation and unit conversion.

All CO2e calculations are performed deterministically using verified local factors.
Supports:
  - Intra-dimensional scaling (t -> kg, MWh -> kWh, L -> m3)
  - Physical density cross-dimensional conversions (kg -> L for petrol/diesel, L -> kg for LPG)
  - Energy-to-volume conversions (kWh -> m3 for Natural Gas)
  - Full audit trail recording on all conversions
"""

from __future__ import annotations

import logging
from typing import Optional, Tuple
import uuid

from backend.models.schemas import ActivityCategory, EmissionResult
from backend.services.csv_loader import get_emission_factors, get_circular_interventions

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Physical constants & conversion factors
# ---------------------------------------------------------------------------

# Multipliers to base units (kg, L, m3, kWh)
MASS_TO_KG = {
    "kg": 1.0, "kilogram": 1.0, "kilograms": 1.0, "kilo": 1.0, "kilos": 1.0,
    "t": 1000.0, "tonne": 1000.0, "tonnes": 1000.0, "ton": 1000.0, "tons": 1000.0,
    "metric ton": 1000.0, "metric tons": 1000.0, "mt": 1000.0,
    "g": 0.001, "gram": 0.001, "grams": 0.001,
    "lb": 0.453592, "lbs": 0.453592, "pound": 0.453592, "pounds": 0.453592,
}

VOLUME_TO_L = {
    "l": 1.0, "litre": 1.0, "litres": 1.0, "liter": 1.0, "liters": 1.0,
    "ml": 0.001, "milliliter": 0.001, "millilitre": 0.001,
    "m3": 1000.0, "m³": 1000.0, "cubic meter": 1000.0, "cubic meters": 1000.0,
    "kl": 1000.0, "kiloliter": 1000.0, "kilolitre": 1000.0,
    "gal": 3.78541, "gallon": 3.78541, "gallons": 3.78541,
}

ENERGY_TO_KWH = {
    "kwh": 1.0, "kw/h": 1.0, "kilowatt-hour": 1.0, "kilowatt-hours": 1.0,
    "mwh": 1000.0, "megawatt-hour": 1000.0, "gwh": 1000000.0,
    "mj": 0.277778, "gj": 277.778,
}

# Physical properties for cross-dimensional conversions
FUEL_PROPERTIES = {
    "petrol": {"density_kg_per_l": 0.740, "dimension": "volume", "canonical_unit": "l"},
    "diesel_fuel": {"density_kg_per_l": 0.840, "dimension": "volume", "canonical_unit": "l"},
    "lpg": {"density_kg_per_l": 0.540, "dimension": "mass", "canonical_unit": "kg", "cylinder_kg": 19.0},
    "natural_gas": {"kwh_per_m3": 10.55, "density_kg_per_m3": 0.717, "dimension": "volume", "canonical_unit": "m3"},
    "water_supply": {"dimension": "volume", "canonical_unit": "m3"},
    "wastewater_treatment": {"dimension": "volume", "canonical_unit": "m3"},
    "grid_electricity": {"dimension": "energy", "canonical_unit": "kWh"},
}


def convert_units(
    activity_key: str,
    quantity: float,
    provided_unit: str,
    expected_unit: str,
) -> Tuple[Optional[float], Optional[str]]:
    """
    Standardize quantity into the expected canonical unit.

    Returns:
        (converted_quantity, audit_note)
        or (None, error_reason) if physically incompatible
    """
    u = provided_unit.strip().lower()
    exp = expected_unit.strip().lower()

    # Identical units
    if u == exp:
        return quantity, None

    props = FUEL_PROPERTIES.get(activity_key, {})

    # 1. Target is Liters (l) — liquid fuels like Petrol and Diesel
    if exp == "l":
        if u in VOLUME_TO_L:
            vol_l = quantity * VOLUME_TO_L[u]
            audit = f"Converted {quantity} {provided_unit} to {vol_l:.2f} L" if u != "l" else None
            return vol_l, audit
        elif u in MASS_TO_KG and "density_kg_per_l" in props:
            # mass (kg) / density (kg/L) = volume (L)
            mass_kg = quantity * MASS_TO_KG[u]
            vol_l = mass_kg / props["density_kg_per_l"]
            audit = (f"Converted {quantity} {provided_unit} to {vol_l:.2f} L "
                     f"using density {props['density_kg_per_l']} kg/L")
            return vol_l, audit

    # 2. Target is Cubic Meters (m3) — Natural Gas, Water, Wastewater
    if exp in ("m3", "m³"):
        if u in VOLUME_TO_L:
            # Volume to m3 (1 m3 = 1000 L)
            vol_m3 = (quantity * VOLUME_TO_L[u]) / 1000.0
            audit = f"Converted {quantity} {provided_unit} to {vol_m3:.3f} m³"
            return vol_m3, audit
        elif u in ENERGY_TO_KWH and "kwh_per_m3" in props:
            # Energy to volume: kWh / (10.55 kWh/m3) = m3
            kwh = quantity * ENERGY_TO_KWH[u]
            vol_m3 = kwh / props["kwh_per_m3"]
            audit = (f"Converted {quantity} {provided_unit} to {vol_m3:.2f} m³ "
                     f"using net calorific value {props['kwh_per_m3']} kWh/m³")
            return vol_m3, audit
        elif u in MASS_TO_KG and "density_kg_per_m3" in props:
            mass_kg = quantity * MASS_TO_KG[u]
            vol_m3 = mass_kg / props["density_kg_per_m3"]
            audit = (f"Converted {quantity} {provided_unit} to {vol_m3:.2f} m³ "
                     f"using standard gas density {props['density_kg_per_m3']} kg/m³")
            return vol_m3, audit

    # 3. Target is Kilograms (kg) — LPG, Materials, Waste
    if exp == "kg":
        if u in MASS_TO_KG:
            mass_kg = quantity * MASS_TO_KG[u]
            audit = f"Converted {quantity} {provided_unit} to {mass_kg:.2f} kg" if u != "kg" else None
            return mass_kg, audit
        elif u in VOLUME_TO_L and "density_kg_per_l" in props:
            # volume (L) * density (kg/L) = mass (kg)
            vol_l = quantity * VOLUME_TO_L[u]
            mass_kg = vol_l * props["density_kg_per_l"]
            audit = (f"Converted {quantity} {provided_unit} to {mass_kg:.2f} kg "
                     f"using liquid density {props['density_kg_per_l']} kg/L")
            return mass_kg, audit
        elif u in ("cylinder", "cylinders") and "cylinder_kg" in props:
            mass_kg = quantity * props["cylinder_kg"]
            audit = f"Converted {quantity} commercial cylinders to {mass_kg:.1f} kg (19 kg/cylinder)"
            return mass_kg, audit

    # 4. Target is Kilowatt-Hours (kWh) — Electricity
    if exp.lower() == "kwh":
        if u in ENERGY_TO_KWH:
            kwh = quantity * ENERGY_TO_KWH[u]
            audit = f"Converted {quantity} {provided_unit} to {kwh:.2f} kWh" if u != "kwh" else None
            return kwh, audit

    return None, f"Incompatible units: cannot convert '{provided_unit}' to required '{expected_unit}' for '{activity_key}'."


# ---------------------------------------------------------------------------
# Public Calculation Engine
# ---------------------------------------------------------------------------

def calculate_emission(
    activity_key: str,
    quantity: float,
    unit: str,
    raw_name: str = "",
    category: ActivityCategory = ActivityCategory.UNKNOWN,
    instance_id: str = "",
) -> EmissionResult:
    """
    Calculate CO2e for a single activity using local emission factors and automatic unit conversion.

    Returns an EmissionResult with status='resolved' or status='unresolved' with clear audit trail.
    """
    raw_name = raw_name or activity_key
    if not instance_id:
        instance_id = f"act-{uuid.uuid4().hex[:8]}"

    # --- 1. Lookup in emission_factors.csv ---
    df_ef = get_emission_factors()
    matches = df_ef[df_ef["activity_key"] == activity_key]

    if not matches.empty:
        row = matches.iloc[0]
        expected_unit = row["unit"]
        factor = float(row["co2e_per_unit"])
        scope = row.get("scope", "Scope 1")

        norm_qty, audit_note = convert_units(activity_key, quantity, unit, expected_unit)
        if norm_qty is None:
            return EmissionResult(
                instance_id=instance_id,
                raw_name=raw_name,
                activity_key=activity_key,
                category=category,
                quantity=quantity,
                unit=unit,
                normalized_quantity=0.0,
                normalized_unit=expected_unit,
                scope=scope,
                emission_factor=0.0,
                co2e_kg=0.0,
                status="unresolved",
                warning=audit_note,
            )

        co2e = round(norm_qty * factor, 4)
        return EmissionResult(
            instance_id=instance_id,
            raw_name=raw_name,
            activity_key=activity_key,
            category=category if category != ActivityCategory.UNKNOWN else _infer_category(scope),
            quantity=quantity,
            unit=unit,
            normalized_quantity=round(norm_qty, 3),
            normalized_unit=expected_unit,
            scope=scope,
            emission_factor=factor,
            co2e_kg=co2e,
            audit_note=audit_note,
            status="resolved",
        )

    # --- 2. Fallback: Lookup virgin material in circular_interventions.csv ---
    df_circ = get_circular_interventions()
    circ_matches = df_circ[df_circ["virgin_material_key"] == activity_key]
    if not circ_matches.empty:
        row = circ_matches.iloc[0]
        factor = float(row["virgin_co2e_per_kg"])
        norm_qty, audit_note = convert_units(activity_key, quantity, unit, "kg")
        if norm_qty is None:
            return EmissionResult(
                instance_id=instance_id,
                raw_name=raw_name,
                activity_key=activity_key,
                category=ActivityCategory.MATERIAL,
                quantity=quantity,
                unit=unit,
                normalized_quantity=0.0,
                normalized_unit="kg",
                scope="Scope 3",
                emission_factor=0.0,
                co2e_kg=0.0,
                status="unresolved",
                warning=audit_note,
            )

        co2e = round(norm_qty * factor, 4)
        return EmissionResult(
            instance_id=instance_id,
            raw_name=raw_name,
            activity_key=activity_key,
            category=ActivityCategory.MATERIAL,
            quantity=quantity,
            unit=unit,
            normalized_quantity=round(norm_qty, 3),
            normalized_unit="kg",
            scope="Scope 3",
            emission_factor=factor,
            co2e_kg=co2e,
            audit_note=audit_note,
            status="resolved",
        )

    # --- 3. Unresolved factor ---
    logger.warning("No local emission factor found for '%s'", activity_key)
    return EmissionResult(
        instance_id=instance_id,
        raw_name=raw_name,
        activity_key=activity_key,
        category=category,
        quantity=quantity,
        unit=unit,
        normalized_quantity=0.0,
        normalized_unit="",
        scope="",
        emission_factor=0.0,
        co2e_kg=0.0,
        status="unresolved",
        warning=f"No verified local emission factor found for '{activity_key}'.",
    )


def _infer_category(scope: str) -> ActivityCategory:
    """Infer activity category from GHG scope."""
    scope_lower = scope.strip().lower()
    if "1" in scope_lower:
        return ActivityCategory.FUEL
    elif "2" in scope_lower:
        return ActivityCategory.ENERGY
    elif "3" in scope_lower:
        return ActivityCategory.MATERIAL
    return ActivityCategory.UNKNOWN
