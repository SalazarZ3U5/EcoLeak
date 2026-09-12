"""
Circular recommendation engine.

Generates engineering-grounded circular economy interventions for virgin material hotspots:
  - Technical substitution caps (preventing product failure / viscosity degradation)
  - Dynamic CAPEX scaling (Williams' 0.65 rule based on factory throughput) in INR (₹)
  - Raw material price delta & OPEX savings modeling in INR
  - Dynamic payback periods in months
  - Multi-criteria feasibility score (TRL, quality, regulatory)
"""

from __future__ import annotations

import logging
from typing import Optional

from backend.models.schemas import CircularRecommendation
from backend.models.schemas import CircularRecommendation, ActivityCategory, EmissionResult
from backend.services.chroma_service import query_alternatives
from backend.services.csv_loader import get_circular_interventions

logger = logging.getLogger(__name__)

USD_TO_INR = 95.0

# ---------------------------------------------------------------------------
# Industrial Material Parameters & Engineering Profiles (INR-grounded)
# ---------------------------------------------------------------------------

MATERIAL_PROFILES = {
    "virgin_hdpe_plastic": {
        "alternative_key": "recycled_hdpe_flakes",
        "virgin_ef": 1.95,
        "recycled_ef": 0.62,
        "virgin_price_inr_per_kg": 122.0,       # Market virgin HDPE ~₹122/kg
        "recycled_price_inr_per_kg": 96.0,      # Flakes ~₹96/kg (₹26/kg savings)
        "base_capex_inr": 336000.0,             # ₹3.36 Lakhs ($4,000 equivalent)
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 70.0,        # Mechanical stress cracking limit
        "feasibility": 88,
        "difficulty": "Low",
        "regulatory": "Industrial packaging & container certified; food-contact requires FDA LNO blend",
        "confidence": 0.92,
        "mechanism": "Closed-loop extrusion regrind recovers scrap and trims into feed lines without polymer chain degradation.",
    },
    "virgin_pet_plastic": {
        "alternative_key": "rpet_regrind",
        "virgin_ef": 2.15,
        "recycled_ef": 0.45,
        "virgin_price_inr_per_kg": 135.0,       # Virgin bottle-grade PET ~₹135/kg
        "recycled_price_inr_per_kg": 115.0,     # rPET flakes ~₹115/kg (₹20/kg savings)
        "base_capex_inr": 546000.0,             # ₹5.46 Lakhs ($6,500 equivalent)
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 60.0,        # Bottle-to-bottle IV drop limit
        "feasibility": 82,
        "difficulty": "Medium",
        "regulatory": "Bottle-to-bottle certified; compliant with EFSA/FDA food-grade standards",
        "confidence": 0.90,
        "mechanism": "Bottle-to-bottle solid-state polycondensation (SSP) restores intrinsic viscosity for food-grade reuse.",
    },
    "virgin_plastic_pellets": {
        "alternative_key": "recycled_plastic_pellets",
        "virgin_ef": 2.05,
        "recycled_ef": 0.52,
        "virgin_price_inr_per_kg": 125.0,       # General virgin polymer pellets ~₹125/kg
        "recycled_price_inr_per_kg": 98.0,      # Reprocessed PCR pellets ~₹98/kg (₹27/kg savings)
        "base_capex_inr": 294000.0,             # ₹2.94 Lakhs ($3,500 equivalent)
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 75.0,
        "feasibility": 86,
        "difficulty": "Low",
        "regulatory": "BIS / ASTM certified for secondary packaging, crates, and blow molding",
        "confidence": 0.92,
        "mechanism": "In-house closed-loop extrusion regrind recovers sprue and trimming scrap into feed lines.",
    },
    "color_additives": {
        "alternative_key": "bio_carrier_masterbatch",
        "virgin_ef": 2.80,
        "recycled_ef": 1.10,
        "virgin_price_inr_per_kg": 280.0,       # Standard pigment masterbatch ~₹280/kg
        "recycled_price_inr_per_kg": 210.0,     # Bio/optimized carrier ~₹210/kg (₹70/kg savings)
        "base_capex_inr": 100000.0,             # ₹1 Lakh gravimetric dosing retrofit
        "base_capacity_kg": 10000.0,
        "max_recommended_sub_pct": 80.0,
        "feasibility": 85,
        "difficulty": "Low",
        "regulatory": "RoHS & REACH compliant non-heavy-metal formulation",
        "confidence": 0.88,
        "mechanism": "Bio-based carrier masterbatch replaces heavy hydrocarbon carriers with plant-derived binders.",
    },
    "packaging_material": {
        "alternative_key": "recycled_corrugated_packaging",
        "virgin_ef": 0.95,
        "recycled_ef": 0.20,
        "virgin_price_inr_per_kg": 80.0,        # Virgin kraft carton ~₹80/kg
        "recycled_price_inr_per_kg": 55.0,      # 100% recycled carton ~₹55/kg (₹25/kg savings)
        "base_capex_inr": 126000.0,             # ₹1.26 Lakhs box-taper & supplier transition
        "base_capacity_kg": 25000.0,
        "max_recommended_sub_pct": 100.0,       # 100% recycled corrugated is standard
        "feasibility": 95,
        "difficulty": "Low",
        "regulatory": "FSC Recycled certified; 3-ply / 5-ply burst factor certified",
        "confidence": 0.94,
        "mechanism": "Biodegradable packaging loop replaces virgin EPS/bubble wrap with recycled paper pulp.",
    },
    "virgin_pp_plastic": {
        "alternative_key": "recycled_pp_granules",
        "virgin_ef": 1.95,
        "recycled_ef": 0.58,
        "virgin_price_inr_per_kg": 125.0,
        "recycled_price_inr_per_kg": 98.0,      # ₹27/kg savings
        "base_capex_inr": 252000.0,
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 70.0,
        "feasibility": 87,
        "difficulty": "Low",
        "regulatory": "Automotive battery casing & household container approved",
        "confidence": 0.91,
        "mechanism": "Recycled PP granules blended with virgin feed at 60-80% ratio maintains tensile properties.",
    },
    "virgin_ldpe_plastic": {
        "alternative_key": "recycled_ldpe_pellets",
        "virgin_ef": 2.08,
        "recycled_ef": 0.60,
        "virgin_price_inr_per_kg": 130.0,
        "recycled_price_inr_per_kg": 102.0,     # ₹28/kg savings
        "base_capex_inr": 235000.0,
        "base_capacity_kg": 40000.0,
        "max_recommended_sub_pct": 65.0,
        "feasibility": 84,
        "difficulty": "Medium",
        "regulatory": "Shrink film & agricultural mulch film certified",
        "confidence": 0.90,
        "mechanism": "Film edge trim granulator directly re-feeds blown film extruders without thermal degradation.",
    },
    "virgin_steel": {
        "alternative_key": "electric_arc_scrap_steel",
        "virgin_ef": 1.80,
        "recycled_ef": 0.43,
        "virgin_price_inr_per_kg": 70.0,        # Primary TMT/billet ~₹70/kg
        "recycled_price_inr_per_kg": 48.0,      # EAF melting scrap ~₹48/kg (₹22/kg savings)
        "base_capex_inr": 1260000.0,            # ₹12.6 Lakhs ($15,000 equivalent)
        "base_capacity_kg": 100000.0,
        "max_recommended_sub_pct": 100.0,       # EAF can operate on 100% scrap
        "feasibility": 94,
        "difficulty": "Low",
        "regulatory": "IS 1786 / ASTM A615 structural steel certified",
        "confidence": 0.95,
        "mechanism": "High-density scrap sorting system and induction pre-heating using exhaust stack heat.",
    },
    "virgin_aluminum": {
        "alternative_key": "recycled_scrap_aluminum",
        "virgin_ef": 11.50,
        "recycled_ef": 0.60,
        "virgin_price_inr_per_kg": 220.0,       # Primary ingot ~₹220/kg
        "recycled_price_inr_per_kg": 155.0,     # Secondary remelt ~₹155/kg (₹65/kg savings)
        "base_capex_inr": 1008000.0,            # ₹10.08 Lakhs ($12,000 equivalent)
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 90.0,
        "feasibility": 91,
        "difficulty": "Low",
        "regulatory": "IS 733 / ASTM B221 extrusion certified",
        "confidence": 0.94,
        "mechanism": "Secondary smelting consumes 95% less energy than primary electrolytic Hall-Héroult bauxite refining.",
    },
    "industrial_lubricant": {
        "alternative_key": "re_refined_lubricant",
        "virgin_ef": 1.20,
        "recycled_ef": 0.35,
        "virgin_price_inr_per_kg": 180.0,
        "recycled_price_inr_per_kg": 120.0,     # ₹60/kg savings
        "base_capex_inr": 67000.0,
        "base_capacity_kg": 10000.0,
        "max_recommended_sub_pct": 100.0,
        "feasibility": 92,
        "difficulty": "Low",
        "regulatory": "ISO VG 46/68 industrial machinery lubricant approved",
        "confidence": 0.89,
        "mechanism": "Thin-film vacuum distillation re-refines spent lube oil back to API Group II base oil standards.",
    },
    "virgin_copper": {
        "alternative_key": "recycled_scrap_copper",
        "virgin_ef": 4.10,
        "recycled_ef": 0.85,
        "virgin_price_inr_per_kg": 750.0,
        "recycled_price_inr_per_kg": 620.0,     # ₹130/kg savings
        "base_capex_inr": 1512000.0,
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 95.0,
        "feasibility": 93,
        "difficulty": "Medium",
        "regulatory": "ASTM B3 electrical busbar & wire certified",
        "confidence": 0.94,
        "mechanism": "Secondary fire-refining and electro-refining scrap copper consumes 85% less energy than copper ore smelting.",
    },
    "virgin_glass": {
        "alternative_key": "recycled_cullet_glass",
        "virgin_ef": 0.85,
        "recycled_ef": 0.32,
        "virgin_price_inr_per_kg": 25.0,
        "recycled_price_inr_per_kg": 15.0,      # ₹10/kg savings
        "base_capex_inr": 420000.0,
        "base_capacity_kg": 100000.0,
        "max_recommended_sub_pct": 80.0,
        "feasibility": 90,
        "difficulty": "Low",
        "regulatory": "Container glass circularity certified",
        "confidence": 0.92,
        "mechanism": "Cullet glass remelting lowers furnace operating temperatures by 150°C and reduces refractory wear.",
    },
    "virgin_paper_kraft": {
        "alternative_key": "recycled_kraft_paper",
        "virgin_ef": 1.10,
        "recycled_ef": 0.35,
        "virgin_price_inr_per_kg": 65.0,
        "recycled_price_inr_per_kg": 45.0,      # ₹20/kg savings
        "base_capex_inr": 336000.0,
        "base_capacity_kg": 50000.0,
        "max_recommended_sub_pct": 100.0,
        "feasibility": 94,
        "difficulty": "Low",
        "regulatory": "FSC packaging approved",
        "confidence": 0.93,
        "mechanism": "Pulp hydro-pulper closed recycling loop preserves fiber strength while slashing water intake.",
    },
    "waste_cardboard": {
        "alternative_key": "closed_loop_recycled_cardboard",
        "virgin_ef": 0.82,
        "recycled_ef": 0.065,
        "virgin_price_inr_per_kg": 25.0,
        "recycled_price_inr_per_kg": 15.0,      # ₹10/kg savings
        "base_capex_inr": 336000.0,
        "base_capacity_kg": 15000.0,
        "max_recommended_sub_pct": 100.0,
        "feasibility": 94,
        "difficulty": "Low",
        "regulatory": "FSC Recycled 100% Certification Aligned; CPCB EPR compliant",
        "confidence": 0.93,
        "mechanism": "Pulp hydro-pulper closed recycling loop preserves fiber strength while slashing water intake and diverts scrap from landfills.",
    },
}


def _format_inr(val: float) -> str:
    """Format numbers into Indian Rupee style (e.g. ₹16,20,000 or ₹89,500)."""
    val = round(val)
    s = str(abs(val))
    if len(s) <= 3:
        formatted = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        formatted = ",".join(groups) + "," + last3
    return f"₹{'-' if val < 0 else ''}{formatted}"


def recommend(
    material_key: str,
    quantity_kg: float,
    substitution_percent: float = 100.0,
) -> Optional[CircularRecommendation]:
    """
    Generate an engineering-grounded circular recommendation in INR (₹).

    Steps:
      1. Query ChromaDB or catalog for the circular pairing.
      2. Calculate CO2e savings from cradle-to-gate virgin vs recycled factors.
      3. Apply Williams' 0.65 power law for capacity-scaled CAPEX in INR.
      4. Compute annual OPEX delta and realistic payback in months.
      5. Return structured recommendation with feasibility scores and notes.
    """
    if substitution_percent <= 0 or substitution_percent > 100:
        substitution_percent = 100.0

    profile = MATERIAL_PROFILES.get(material_key)
    if not profile:
        alias_map = {
            "cardboard_waste": "waste_cardboard",
            "waste_paper_cardboard": "waste_cardboard",
            "scrap_cardboard": "waste_cardboard",
            "virgin_kraft_paper": "virgin_paper_kraft",
            "kraft_paper": "virgin_paper_kraft",
            "hdpe": "virgin_hdpe_plastic",
            "pet": "virgin_pet_plastic",
            "pp": "virgin_pp_plastic",
            "ldpe": "virgin_ldpe_plastic",
            "steel": "virgin_steel",
            "aluminum": "virgin_aluminum",
        }
        mapped_key = alias_map.get(material_key.lower())
        if mapped_key:
            profile = MATERIAL_PROFILES.get(mapped_key)

    # Fallback to ChromaDB query if not in hardcoded profiles
    if not profile:
        alternatives = query_alternatives(material_key, n_results=1)
        if not alternatives:
            row = _lookup_csv(material_key)
            if not row:
                logger.warning("No circular alternative found for '%s'", material_key)
                return None
            alt_key = row["circular_alternative_key"]
            virgin_ef = float(row["virgin_co2e_per_kg"])
            recycled_ef = float(row["recycled_co2e_per_kg"])
            capex_usd = float(row.get("avg_capex_usd", 5000.0))
            capex_inr = capex_usd * USD_TO_INR
            payback_static = float(row.get("payback_months", 12.0))
        else:
            meta = alternatives[0].get("metadata", {})
            alt_key = meta.get("circular_alternative_key", "recycled_alternative")
            virgin_ef = float(meta.get("virgin_co2e_per_kg", 2.0))
            recycled_ef = float(meta.get("recycled_co2e_per_kg", 0.5))
            capex_usd = float(meta.get("avg_capex_usd", 5000.0))
            capex_inr = capex_usd * USD_TO_INR
            payback_static = float(meta.get("payback_months", 12.0))

        sub_qty = quantity_kg * (substitution_percent / 100.0)
        baseline_co2e = round(quantity_kg * virgin_ef, 4)
        alt_co2e = round(sub_qty * recycled_ef + (quantity_kg - sub_qty) * virgin_ef, 4)
        savings = round(baseline_co2e - alt_co2e, 4)
        reduction_pct = round((savings / baseline_co2e) * 100, 2) if baseline_co2e > 0 else 0.0

        return CircularRecommendation(
            target_activity=material_key,
            alternative=alt_key,
            intervention_type="material_substitution",
            quantity_kg=sub_qty,
            substitution_percent=substitution_percent,
            baseline_co2e_kg=baseline_co2e,
            alternative_co2e_kg=alt_co2e,
            co2e_savings_kg=savings,
            co2e_reduction_percent=reduction_pct,
            estimated_capex_inr=round(capex_inr, 2),
            annual_opex_savings_inr=None,
            estimated_capex_usd=round(capex_usd, 2),
            annual_opex_savings_usd=None,
            currency="INR",
            currency_symbol="₹",
            payback_months=payback_static,
            financial_basis="dataset_based",
            financial_feasibility_note=f"Based on benchmark SME retrofit averages ({_format_inr(capex_inr)}).",
            feasibility_score=75,
            technical_difficulty="Medium",
            regulatory_readiness="Check local industrial standards",
            confidence_score=0.80,
            mechanism=f"Closed-loop recycling alternative replacing {material_key} with {alt_key}.",
        )

    # --- Rich Engineering Profile Calculation ---
    sub_pct = substitution_percent
    sub_qty = quantity_kg * (sub_pct / 100.0)

    # CO2e calculation
    baseline_co2e = round(quantity_kg * profile["virgin_ef"], 4)
    alt_co2e = round(sub_qty * profile["recycled_ef"] + (quantity_kg - sub_qty) * profile["virgin_ef"], 4)
    savings = round(baseline_co2e - alt_co2e, 4)
    reduction_pct = round((savings / baseline_co2e) * 100, 2) if baseline_co2e > 0 else 0.0

    # Capacity-scaled CAPEX in INR (Williams' Sixth-Tenths Factor Rule)
    capacity_ratio = max(0.05, sub_qty / profile["base_capacity_kg"])
    scaled_capex_inr = round(profile["base_capex_inr"] * (capacity_ratio ** 0.65), 2)
    scaled_capex_usd = round(scaled_capex_inr / USD_TO_INR, 2)

    # OPEX delta and Payback period in INR
    price_delta_inr = profile["virgin_price_inr_per_kg"] - profile["recycled_price_inr_per_kg"]
    annual_opex_savings_inr = round(sub_qty * price_delta_inr, 2)
    annual_opex_savings_usd = round(annual_opex_savings_inr / USD_TO_INR, 2)

    tech_limit_note = ""
    if sub_pct > profile["max_recommended_sub_pct"]:
        tech_limit_note = f" (Note: For high structural stress, ASTM recommends blending up to {profile['max_recommended_sub_pct']}% PCR)."

    if annual_opex_savings_inr > 0:
        payback_years = scaled_capex_inr / annual_opex_savings_inr
        payback_months = round(payback_years * 12.0, 1)
        fin_basis = "dynamic_scaling"
        fin_note = (f"Positive ROI: Annual material cost savings of {_format_inr(annual_opex_savings_inr)} "
                    f"offsets the {_format_inr(scaled_capex_inr)} retrofit investment in {payback_months} months.{tech_limit_note}")
    else:
        payback_months = None
        fin_basis = "green_premium"
        fin_note = f"Green Premium: Recycled feedstock cost is equal to or higher than virgin; justified via Scope 3 ESG targets.{tech_limit_note}"

    return CircularRecommendation(
        target_activity=material_key,
        alternative=profile["alternative_key"],
        intervention_type="material_substitution",
        quantity_kg=round(sub_qty, 2),
        substitution_percent=sub_pct,
        baseline_co2e_kg=baseline_co2e,
        alternative_co2e_kg=alt_co2e,
        co2e_savings_kg=savings,
        co2e_reduction_percent=reduction_pct,
        estimated_capex_inr=scaled_capex_inr,
        annual_opex_savings_inr=annual_opex_savings_inr,
        estimated_capex_usd=scaled_capex_usd,
        annual_opex_savings_usd=annual_opex_savings_usd,
        currency="INR",
        currency_symbol="₹",
        payback_months=payback_months,
        financial_basis=fin_basis,
        financial_feasibility_note=fin_note,
        feasibility_score=profile["feasibility"],
        technical_difficulty=profile["difficulty"],
        regulatory_readiness=profile["regulatory"],
        mechanism=profile.get("mechanism"),
        confidence_score=profile["confidence"],
    )


def recommend_energy(
    kwh: float,
    activity_key: str = "grid_electricity",
    raw_name: str = "Grid Electricity",
) -> CircularRecommendation:
    """
    Engineering-grounded renewable energy & motor optimization circular intervention.
    Williams' 0.65 rule dynamically scales CAPEX from baseline 20,000 kWh/month.
    """
    baseline_co2e = round(kwh * 0.82, 2)
    reduction_pct = 42.0
    co2e_savings = round(baseline_co2e * (reduction_pct / 100.0), 2)
    alt_co2e = round(baseline_co2e - co2e_savings, 2)

    capacity_ratio = max(0.05, kwh / 20000.0)
    scaled_capex_inr = round(350000.0 * (capacity_ratio ** 0.65), 2)
    scaled_capex_usd = round(scaled_capex_inr / USD_TO_INR, 2)

    # Saved power tariff difference ₹3.50/kWh across 12 months for 35% of power
    annual_opex_savings_inr = round(kwh * 3.5 * 12.0 * 0.35, 2)
    annual_opex_savings_usd = round(annual_opex_savings_inr / USD_TO_INR, 2)

    payback_years = scaled_capex_inr / annual_opex_savings_inr if annual_opex_savings_inr > 0 else 0.75
    payback_months = round(payback_years * 12.0, 1)

    return CircularRecommendation(
        target_activity=raw_name or activity_key,
        alternative="Solar Rooftop PPA + Variable Frequency Motor Staging",
        intervention_type="renewable_energy_efficiency",
        quantity_kg=kwh,
        substitution_percent=reduction_pct,
        baseline_co2e_kg=baseline_co2e,
        alternative_co2e_kg=alt_co2e,
        co2e_savings_kg=co2e_savings,
        co2e_reduction_percent=reduction_pct,
        estimated_capex_inr=scaled_capex_inr,
        annual_opex_savings_inr=annual_opex_savings_inr,
        estimated_capex_usd=scaled_capex_usd,
        annual_opex_savings_usd=annual_opex_savings_usd,
        currency="INR",
        currency_symbol="₹",
        payback_months=payback_months,
        financial_basis="dynamic_scaling",
        financial_feasibility_note=f"Positive ROI: Solar PPA and VFD optimization amortize within {payback_months} months with minimal upfront risk.",
        feasibility_score=95,
        technical_difficulty="Turnkey",
        regulatory_readiness="State Discom Net-Metering & Green Energy Open Access (GEOA)",
        mechanism="Captive solar wheeling coupled with automated motor frequency drives eliminates idle line friction and peak tariff surcharges.",
        confidence_score=0.95,
    )


def recommend_fuel(
    quantity: float,
    unit: str = "l",
    activity_key: str = "diesel_fuel",
    raw_name: str = "Diesel Fuel",
    ef: float = 2.68,
) -> CircularRecommendation:
    """
    Thermal waste heat recovery and biomass co-firing circular intervention.
    Williams' 0.65 rule scales CAPEX from baseline 500 units/month.
    """
    baseline_co2e = round(quantity * ef, 2)
    reduction_pct = 38.0
    co2e_savings = round(baseline_co2e * (reduction_pct / 100.0), 2)
    alt_co2e = round(baseline_co2e - co2e_savings, 2)

    capacity_ratio = max(0.05, quantity / 500.0)
    scaled_capex_inr = round(185000.0 * (capacity_ratio ** 0.65), 2)
    scaled_capex_usd = round(scaled_capex_inr / USD_TO_INR, 2)

    # Thermal recovery saves ~28% of fuel bill (estimated ₹45/unit)
    annual_opex_savings_inr = round(quantity * 45.0 * 12.0 * 0.28, 2)
    annual_opex_savings_usd = round(annual_opex_savings_inr / USD_TO_INR, 2)

    payback_years = scaled_capex_inr / annual_opex_savings_inr if annual_opex_savings_inr > 0 else 0.5
    payback_months = round(payback_years * 12.0, 1)

    return CircularRecommendation(
        target_activity=raw_name or activity_key,
        alternative="Waste Heat Recovery Economizer & Biomass Co-Firing",
        intervention_type="waste_heat_recovery",
        quantity_kg=quantity,
        substitution_percent=reduction_pct,
        baseline_co2e_kg=baseline_co2e,
        alternative_co2e_kg=alt_co2e,
        co2e_savings_kg=co2e_savings,
        co2e_reduction_percent=reduction_pct,
        estimated_capex_inr=scaled_capex_inr,
        annual_opex_savings_inr=annual_opex_savings_inr,
        estimated_capex_usd=scaled_capex_usd,
        annual_opex_savings_usd=annual_opex_savings_usd,
        currency="INR",
        currency_symbol="₹",
        payback_months=payback_months,
        financial_basis="dynamic_scaling",
        financial_feasibility_note=f"Positive ROI: Flue gas heat recapture reduces boiler fuel requirements by 28%, paying back in {payback_months} months.",
        feasibility_score=91,
        technical_difficulty="Low",
        regulatory_readiness="BEE (Bureau of Energy Efficiency) PAT Cycle Aligned",
        mechanism="Recaptures 180°C flue gas exhaust to preheat boiler feed water and raw stock, cutting thermal fuel consumption by 28%.",
        confidence_score=0.92,
    )


def recommend_for_activities(activities: list[EmissionResult]) -> list[CircularRecommendation]:
    """
    Generate multiple circular recommendations across all activity categories:
    Materials, Energy (Electricity), Fuels, and Waste streams.
    Preserves descending ranking order of original emissions.
    """
    recs: list[CircularRecommendation] = []
    seen_targets = set()

    for act in activities:
        key = act.activity_key.lower()
        raw = act.raw_name or act.activity_key
        cat = act.category

        if key in seen_targets:
            continue

        # 1. Material or Waste stream with engineering circular profile
        if cat in (ActivityCategory.MATERIAL, ActivityCategory.WASTE) or key.startswith("virgin_") or key in MATERIAL_PROFILES or "cardboard" in key:
            qty_kg = act.normalized_quantity if act.normalized_unit == "kg" and act.normalized_quantity > 0 else act.quantity
            rec = recommend(material_key=act.activity_key, quantity_kg=qty_kg)
            if rec is not None:
                recs.append(rec)
                seen_targets.add(key)
                continue

        # 2. Electricity stream
        if cat == ActivityCategory.ENERGY or "electricity" in key or "power" in key:
            kwh = act.normalized_quantity if act.normalized_unit == "kWh" and act.normalized_quantity > 0 else act.quantity
            if kwh > 0:
                rec = recommend_energy(kwh=kwh, activity_key=act.activity_key, raw_name=raw)
                recs.append(rec)
                seen_targets.add(key)
                continue

        # 3. Fuel stream
        if cat == ActivityCategory.FUEL or key in ("diesel_fuel", "lpg_fuel", "natural_gas", "coal_fuel", "heavy_fuel_oil", "petrol_fuel", "bio_diesel"):
            qty = act.normalized_quantity if act.normalized_quantity > 0 else act.quantity
            if qty > 0:
                rec = recommend_fuel(
                    quantity=qty,
                    unit=act.normalized_unit or act.unit,
                    activity_key=act.activity_key,
                    raw_name=raw,
                    ef=act.emission_factor,
                )
                recs.append(rec)
                seen_targets.add(key)
                continue

    return recs


def _lookup_csv(material_key: str) -> Optional[dict]:
    """Direct CSV lookup as fallback if ChromaDB metadata is incomplete."""
    df = get_circular_interventions()
    matches = df[df["virgin_material_key"] == material_key]
    if matches.empty:
        return None
    return matches.iloc[0].to_dict()
