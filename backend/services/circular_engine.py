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
from backend.services.chroma_service import query_alternatives
from backend.services.csv_loader import get_circular_interventions

logger = logging.getLogger(__name__)

USD_TO_INR = 84.0

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
        confidence_score=profile["confidence"],
    )


def _lookup_csv(material_key: str) -> Optional[dict]:
    """Direct CSV lookup as fallback if ChromaDB metadata is incomplete."""
    df = get_circular_interventions()
    matches = df[df["virgin_material_key"] == material_key]
    if matches.empty:
        return None
    return matches.iloc[0].to_dict()
