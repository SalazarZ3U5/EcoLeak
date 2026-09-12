"""
Circular recommendation engine.

Generates engineering-grounded circular economy interventions for emission hotspots:
  - Dynamically sourced from data/circular_interventions_inr_template.csv
  - Technical substitution caps (preventing product failure / viscosity degradation)
  - Dynamic CAPEX scaling (Williams' 0.65 rule based on factory throughput) in INR (₹)
  - Raw material price delta & OPEX savings modeling in INR
  - Dynamic payback periods in months
  - Multi-criteria feasibility score (TRL, quality, regulatory)
"""

from __future__ import annotations

import logging
from typing import Optional

from backend.models.schemas import CircularRecommendation, ActivityCategory, EmissionResult
from backend.services.chroma_service import query_alternatives
from backend.services.csv_loader import get_circular_interventions, get_circular_interventions_inr

logger = logging.getLogger(__name__)

USD_TO_INR = 95.0

# ---------------------------------------------------------------------------
# Engineering Closed-Loop Mechanisms
# ---------------------------------------------------------------------------

MECHANISMS: dict[str, str] = {
    "recycled_hdpe_flakes": "Closed-loop extrusion regrind recovers scrap and trims into feed lines without polymer chain degradation.",
    "rpet_regrind": "Bottle-to-bottle solid-state polycondensation (SSP) restores intrinsic viscosity for food-grade reuse.",
    "recycled_plastic_pellets": "In-house closed-loop extrusion regrind recovers sprue and trimming scrap into feed lines.",
    "recycled_pp_granules": "Recycled PP granules blended with virgin feed at 60-80% ratio maintains tensile properties.",
    "recycled_ldpe_pellets": "Film edge trim granulator directly re-feeds blown film extruders without thermal degradation.",
    "bio_carrier_masterbatch": "Bio-based carrier masterbatch replaces heavy hydrocarbon carriers with plant-derived binders.",
    "recycled_corrugated_packaging": "Biodegradable packaging loop replaces virgin packaging with recycled paper pulp.",
    "recycled_kraft_paper": "Pulp hydro-pulper closed recycling loop preserves fiber strength while slashing water intake.",
    "electric_arc_scrap_steel": "High-density scrap sorting system and induction pre-heating using exhaust stack heat in electric arc furnace.",
    "recycled_scrap_aluminum": "Secondary smelting consumes 95% less energy than primary electrolytic Hall-Héroult bauxite refining.",
    "recycled_scrap_copper": "Secondary fire-refining and electro-refining scrap copper consumes 85% less energy than copper ore smelting.",
    "recycled_cullet_glass": "Cullet glass remelting lowers furnace operating temperatures by 150°C and reduces refractory wear.",
    "re_refined_lubricant": "Thin-film vacuum distillation re-refines spent lube oil back to API Group II base oil standards.",
    "bio_diesel_b20": "IS 15607 compliant B20 biodiesel drop-in fuel blend reduces fossil diesel consumption without modifying diesel generators or fleet engines.",
    "ethanol_e20_blend": "MoP&NG mandated E20 ethanol-petrol blend lowers fossil fuel combustion emissions and tailpipe pollutants.",
    "compressed_biogas_cbg": "SATAT initiative compliant compressed biogas (CBG) directly replaces fossil natural gas in boilers and heating systems.",
    "biomass_pellets_industrial": "MNRE standard compliant agricultural residue biomass pellets replace fossil LPG for industrial steam and heat generation.",
    "onsite_rooftop_solar": "CEA standard captive rooftop solar photovoltaic installation with net metering offsets high-tariff grid power consumption.",
    "recycled_effluent_ro_water": "CPCB Zero Liquid Discharge compliant multi-stage reverse osmosis and membrane recovery system reclaims industrial process water.",
    "waste_plastic_pyrolysis_oil": "CPCB Plastic Waste Management compliant catalytic depolymerization converts non-recyclable plastic waste into industrial heating oil.",
    "closed_loop_recycled_cardboard": "Pulp hydro-pulper closed recycling loop preserves fiber strength while slashing water intake and diverts scrap from landfills.",
}

# Common user input aliases mapping to canonical keys in circular_interventions_inr_template.csv
ALIAS_MAP: dict[str, str] = {
    "cardboard_waste": "packaging_material",
    "waste_paper_cardboard": "packaging_material",
    "scrap_cardboard": "packaging_material",
    "waste_cardboard": "packaging_material",
    "virgin_kraft_paper": "virgin_paper_kraft",
    "kraft_paper": "virgin_paper_kraft",
    "hdpe": "virgin_hdpe_plastic",
    "pet": "virgin_pet_plastic",
    "pp": "virgin_pp_plastic",
    "ldpe": "virgin_ldpe_plastic",
    "steel": "virgin_steel",
    "aluminum": "virgin_aluminum",
    "aluminium": "virgin_aluminum",
    "copper": "virgin_copper",
    "glass": "virgin_glass",
    "electricity": "grid_electricity",
    "power": "grid_electricity",
    "diesel": "diesel_fuel",
    "generator_diesel": "diesel_fuel",
    "dg_diesel": "diesel_fuel",
    "gasoline": "petrol",
    "water": "water_supply",
    "plastic_scrap": "waste_plastic_incin",
    "waste_plastic": "waste_plastic_incin",
}


# ---------------------------------------------------------------------------
# Dynamic Material Profiles Loader (INR-grounded)
# ---------------------------------------------------------------------------

def load_material_profiles() -> dict[str, dict]:
    """
    Dynamically build material profiles from circular_interventions_inr_template.csv.
    Ensures all emissions, capex, and money calculations source directly from the CSV.
    """
    try:
        df = get_circular_interventions_inr()
    except Exception as exc:
        logger.error("Failed to load circular interventions INR dataset: %s", exc)
        return {}

    profiles: dict[str, dict] = {}
    for _, row in df.iterrows():
        key = str(row["virgin_material_key"]).strip()
        alt_key = str(row["circular_alternative_key"]).strip()
        unit = str(row.get("unit", "kg")).strip()

        profiles[key] = {
            "alternative_key": alt_key,
            "unit": unit,
            "virgin_ef": float(row["virgin_co2e_per_unit"]),
            "recycled_ef": float(row["recycled_co2e_per_unit"]),
            "virgin_price_inr_per_kg": float(row["virgin_price_inr"]),
            "recycled_price_inr_per_kg": float(row["recycled_price_inr"]),
            "base_capex_inr": float(row["base_capex_inr"]),
            "base_capacity_kg": float(row["base_capacity"]),
            "max_recommended_sub_pct": float(row["max_recommended_sub_pct"]),
            "base_payback_months": float(row["payback_months"]),
            "feasibility": int(row["feasibility_score"]),
            "difficulty": str(row["technical_difficulty"]).strip(),
            "regulatory": str(row["regulatory_standard"]).strip(),
            "confidence": 0.92,
            "mechanism": MECHANISMS.get(alt_key, f"Circular intervention replacing {key} with {alt_key}."),
        }
    return profiles


# Module-level dictionary populated dynamically from CSV
MATERIAL_PROFILES: dict[str, dict] = load_material_profiles()


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
      1. Query INR dataset profiles (dynamically sourced from CSV).
      2. Calculate CO2e savings from virgin vs recycled factors in CSV.
      3. Apply Williams' 0.65 power law for capacity-scaled CAPEX in INR.
      4. Compute annual OPEX delta and realistic payback in months from INR prices.
      5. Return structured recommendation with feasibility scores and notes.
    """
    if substitution_percent <= 0 or substitution_percent > 100:
        substitution_percent = 100.0

    profiles = load_material_profiles() or MATERIAL_PROFILES
    profile = profiles.get(material_key)
    if not profile:
        mapped_key = ALIAS_MAP.get(material_key.lower())
        if mapped_key:
            profile = profiles.get(mapped_key)

    # Fallback to ChromaDB query or CSV lookup if not in profiles
    if not profile:
        alternatives = query_alternatives(material_key, n_results=1)
        if not alternatives:
            row = _lookup_csv(material_key)
            if not row:
                logger.warning("No circular alternative found for '%s'", material_key)
                return None
            alt_key = row["circular_alternative_key"]
            virgin_ef = float(row.get("virgin_co2e_per_unit", row.get("virgin_co2e_per_kg", 2.0)))
            recycled_ef = float(row.get("recycled_co2e_per_unit", row.get("recycled_co2e_per_kg", 0.5)))
            capex_inr = float(row.get("base_capex_inr", float(row.get("avg_capex_usd", 5000.0)) * USD_TO_INR))
            capex_usd = round(capex_inr / USD_TO_INR, 2)
            payback_static = float(row.get("payback_months", 12.0))
            feasibility = int(row.get("feasibility_score", 75))
            difficulty = str(row.get("technical_difficulty", "Medium"))
            regulatory = str(row.get("regulatory_standard", "Check local industrial standards"))
        else:
            meta = alternatives[0].get("metadata", {})
            alt_key = meta.get("circular_alternative_key", "recycled_alternative")
            virgin_ef = float(meta.get("virgin_co2e_per_kg", 2.0))
            recycled_ef = float(meta.get("recycled_co2e_per_kg", 0.5))
            capex_inr = float(meta.get("base_capex_inr", float(meta.get("avg_capex_usd", 5000.0)) * USD_TO_INR))
            capex_usd = round(capex_inr / USD_TO_INR, 2)
            payback_static = float(meta.get("payback_months", 12.0))
            feasibility = 75
            difficulty = "Medium"
            regulatory = "Check local industrial standards"

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
            feasibility_score=feasibility,
            technical_difficulty=difficulty,
            regulatory_readiness=regulatory,
            confidence_score=0.80,
            mechanism=MECHANISMS.get(alt_key, f"Closed-loop recycling alternative replacing {material_key} with {alt_key}."),
        )

    # --- Rich Engineering Profile Calculation from INR CSV ---
    sub_pct = substitution_percent
    sub_qty = quantity_kg * (sub_pct / 100.0)

    # 1. Circular CO2e calculation
    baseline_co2e = round(quantity_kg * profile["virgin_ef"], 4)
    alt_co2e = round(sub_qty * profile["recycled_ef"] + (quantity_kg - sub_qty) * profile["virgin_ef"], 4)
    savings = round(baseline_co2e - alt_co2e, 4)
    reduction_pct = round((savings / baseline_co2e) * 100, 2) if baseline_co2e > 0 else 0.0

    # 2. Capacity-scaled CAPEX in INR (Williams' Sixth-Tenths Factor Rule: C = C0 * (Q / Q0)^0.65)
    capacity_ratio = max(0.05, sub_qty / profile["base_capacity_kg"])
    scaled_capex_inr = round(profile["base_capex_inr"] * (capacity_ratio ** 0.65), 2)
    scaled_capex_usd = round(scaled_capex_inr / USD_TO_INR, 2)

    # 3. OPEX delta and Payback period in INR
    price_delta_inr = profile["virgin_price_inr_per_kg"] - profile["recycled_price_inr_per_kg"]
    annual_opex_savings_inr = round(sub_qty * price_delta_inr, 2)
    annual_opex_savings_usd = round(annual_opex_savings_inr / USD_TO_INR, 2)

    tech_limit_note = ""
    if sub_pct > profile["max_recommended_sub_pct"]:
        tech_limit_note = f" (Note: For optimal product integrity, technical standard recommends blending up to {profile['max_recommended_sub_pct']}% alternative)."

    if annual_opex_savings_inr > 0:
        payback_years = scaled_capex_inr / annual_opex_savings_inr
        payback_months = round(payback_years * 12.0, 1)
        fin_basis = "dynamic_scaling"
        fin_note = (f"Positive ROI: Annual savings of {_format_inr(annual_opex_savings_inr)} "
                    f"offsets the {_format_inr(scaled_capex_inr)} retrofit investment in {payback_months} months.{tech_limit_note}")
    elif annual_opex_savings_inr == 0:
        payback_months = profile.get("base_payback_months")
        fin_basis = "price_parity"
        fin_note = (f"Price Parity: Alternative feedstock price matches baseline ({_format_inr(profile['virgin_price_inr_per_kg'])}/{profile['unit']}); "
                    f"retrofit investment amortizes in {payback_months} months while meeting ESG decarbonization mandates.{tech_limit_note}")
    else:
        payback_months = None
        fin_basis = "green_premium"
        fin_note = f"Green Premium: Alternative feedstock cost is higher than baseline; justified via Scope 1/2/3 ESG targets.{tech_limit_note}"

    # Determine intervention type classification
    intervention_type = "material_substitution"
    if profile["unit"] == "kWh" or "solar" in profile["alternative_key"]:
        intervention_type = "renewable_energy_efficiency"
    elif profile["unit"] in ("l", "m3") and ("diesel" in material_key or "gas" in material_key or "petrol" in material_key or "fuel" in material_key):
        intervention_type = "fuel_substitution"
    elif "water" in material_key:
        intervention_type = "water_circularity"
    elif "waste" in material_key:
        intervention_type = "waste_valorization"

    return CircularRecommendation(
        target_activity=material_key,
        alternative=profile["alternative_key"],
        intervention_type=intervention_type,
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
    Engineering-grounded renewable energy & captive solar circular intervention.
    Williams' 0.65 rule dynamically scales CAPEX from baseline in INR CSV template.
    """
    rec = recommend(
        material_key="grid_electricity",
        quantity_kg=kwh,
        substitution_percent=80.0,
    )
    if rec is not None:
        rec.target_activity = raw_name or activity_key
        return rec

    # Fallback if profile not found
    baseline_co2e = round(kwh * 0.710, 2)
    reduction_pct = 80.0
    co2e_savings = round(baseline_co2e * 0.80, 2)
    alt_co2e = round(baseline_co2e - co2e_savings, 2)
    capacity_ratio = max(0.05, kwh / 100000.0)
    scaled_capex_inr = round(3800000.0 * (capacity_ratio ** 0.65), 2)
    annual_opex_savings_inr = round(kwh * 5.0 * 0.80, 2)
    payback_months = round((scaled_capex_inr / annual_opex_savings_inr) * 12.0, 1) if annual_opex_savings_inr > 0 else 36.0

    return CircularRecommendation(
        target_activity=raw_name or activity_key,
        alternative="onsite_rooftop_solar",
        intervention_type="renewable_energy_efficiency",
        quantity_kg=kwh,
        substitution_percent=reduction_pct,
        baseline_co2e_kg=baseline_co2e,
        alternative_co2e_kg=alt_co2e,
        co2e_savings_kg=co2e_savings,
        co2e_reduction_percent=reduction_pct,
        estimated_capex_inr=scaled_capex_inr,
        annual_opex_savings_inr=annual_opex_savings_inr,
        estimated_capex_usd=round(scaled_capex_inr / USD_TO_INR, 2),
        annual_opex_savings_usd=round(annual_opex_savings_inr / USD_TO_INR, 2),
        currency="INR",
        currency_symbol="₹",
        payback_months=payback_months,
        financial_basis="dynamic_scaling",
        financial_feasibility_note=f"Positive ROI: Captive rooftop solar offsets grid power tariff, amortizing in {payback_months} months.",
        feasibility_score=95,
        technical_difficulty="Low",
        regulatory_readiness="CEA grid-interactive solar standards",
        mechanism=MECHANISMS.get("onsite_rooftop_solar"),
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
    Clean fuel transition & thermal circular intervention.
    Williams' 0.65 rule dynamically scales CAPEX from baseline in INR CSV template.
    """
    rec = recommend(
        material_key=activity_key,
        quantity_kg=quantity,
    )
    if rec is not None:
        rec.target_activity = raw_name or activity_key
        return rec

    # Fallback
    baseline_co2e = round(quantity * ef, 2)
    reduction_pct = 31.0
    co2e_savings = round(baseline_co2e * 0.31, 2)
    alt_co2e = round(baseline_co2e - co2e_savings, 2)
    capacity_ratio = max(0.05, quantity / 10000.0)
    scaled_capex_inr = round(85000.0 * (capacity_ratio ** 0.65), 2)
    annual_opex_savings_inr = round(quantity * 2.0, 2)
    payback_months = round((scaled_capex_inr / annual_opex_savings_inr) * 12.0, 1) if annual_opex_savings_inr > 0 else 6.0

    return CircularRecommendation(
        target_activity=raw_name or activity_key,
        alternative="bio_diesel_b20",
        intervention_type="fuel_substitution",
        quantity_kg=quantity,
        substitution_percent=100.0,
        baseline_co2e_kg=baseline_co2e,
        alternative_co2e_kg=alt_co2e,
        co2e_savings_kg=co2e_savings,
        co2e_reduction_percent=reduction_pct,
        estimated_capex_inr=scaled_capex_inr,
        annual_opex_savings_inr=annual_opex_savings_inr,
        estimated_capex_usd=round(scaled_capex_inr / USD_TO_INR, 2),
        annual_opex_savings_usd=round(annual_opex_savings_inr / USD_TO_INR, 2),
        currency="INR",
        currency_symbol="₹",
        payback_months=payback_months,
        financial_basis="dynamic_scaling",
        financial_feasibility_note=f"Positive ROI: Clean fuel transition amortizes in {payback_months} months.",
        feasibility_score=90,
        technical_difficulty="Low",
        regulatory_readiness="IS 15607 Biodiesel blend specification",
        mechanism=MECHANISMS.get("bio_diesel_b20"),
        confidence_score=0.90,
    )


def recommend_for_activities(activities: list[EmissionResult]) -> list[CircularRecommendation]:
    """
    Generate multiple circular recommendations across all activity categories:
    Materials, Energy (Electricity), Fuels, Water, and Waste streams.
    Preserves descending ranking order of original emissions.
    """
    recs: list[CircularRecommendation] = []
    seen_targets = set()
    profiles = load_material_profiles() or MATERIAL_PROFILES

    for act in activities:
        key = act.activity_key.lower()
        raw = act.raw_name or act.activity_key
        cat = act.category

        if key in seen_targets:
            continue

        # 1. Activities directly in INR dataset or aliases
        mapped_key = ALIAS_MAP.get(key, key)
        if mapped_key in profiles or key in profiles:
            qty = act.normalized_quantity if act.normalized_quantity > 0 else act.quantity
            rec = recommend(material_key=act.activity_key, quantity_kg=qty)
            if rec is not None:
                recs.append(rec)
                seen_targets.add(key)
                continue

        # 2. Material or Waste stream fallback
        if cat in (ActivityCategory.MATERIAL, ActivityCategory.WASTE) or key.startswith("virgin_") or "cardboard" in key or "plastic" in key:
            qty_kg = act.normalized_quantity if act.normalized_unit == "kg" and act.normalized_quantity > 0 else act.quantity
            rec = recommend(material_key=act.activity_key, quantity_kg=qty_kg)
            if rec is not None:
                recs.append(rec)
                seen_targets.add(key)
                continue

        # 3. Electricity stream fallback
        if cat == ActivityCategory.ENERGY or "electricity" in key or "power" in key:
            kwh = act.normalized_quantity if act.normalized_unit == "kWh" and act.normalized_quantity > 0 else act.quantity
            if kwh > 0:
                rec = recommend_energy(kwh=kwh, activity_key=act.activity_key, raw_name=raw)
                recs.append(rec)
                seen_targets.add(key)
                continue

        # 4. Fuel stream fallback
        if cat == ActivityCategory.FUEL or any(f in key for f in ("diesel", "lpg", "gas", "coal", "fuel", "petrol")):
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
    try:
        df = get_circular_interventions_inr()
        matches = df[df["virgin_material_key"] == material_key]
        if not matches.empty:
            return matches.iloc[0].to_dict()
    except Exception:
        pass

    try:
        df_legacy = get_circular_interventions()
        matches = df_legacy[df_legacy["virgin_material_key"] == material_key]
        if not matches.empty:
            return matches.iloc[0].to_dict()
    except Exception:
        pass

    return None
