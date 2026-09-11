"""
Entity mapper — resolves raw user-provided activity names to internal keys.

Resolution order:
  1. Negative constraint & lifecycle phase detection (guards against mapping waste/recycled to virgin)
  2. Word-boundary exact/alias dictionary matching
  3. Hugging Face category-constrained semantic similarity (if HF service available, threshold >= 0.75)
  4. Gemini LLM fallback (if Gemini service available, strict JSON schema)
  5. Unresolved flag (never invent or guess an unrelated key)
"""

from __future__ import annotations

import logging
import re
from typing import Optional, Tuple

from backend.models.schemas import ActivityCategory

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lifecycle Guardrails
# ---------------------------------------------------------------------------

WASTE_TOKENS = {"waste", "scrap", "reject", "discard", "effluent", "garbage", "trash", "sludge", "discharge", "offcut", "carton"}
RECYCLED_TOKENS = {"recycled", "rpet", "pcr", "regrind", "secondary", "post-consumer", "post-industrial", "scrap"}
VIRGIN_TOKENS = {"virgin", "raw", "primary", "fresh"}
WATER_TOKENS = {"water", "effluent", "wastewater", "sewage", "drainage", "borewell"}


def detect_lifecycle_hint(tokens: set[str]) -> Optional[ActivityCategory]:
    """Detect expected category from keyword indicators."""
    if tokens & WATER_TOKENS:
        return ActivityCategory.WATER
    if tokens & WASTE_TOKENS and not (tokens & RECYCLED_TOKENS):
        return ActivityCategory.WASTE
    if tokens & RECYCLED_TOKENS:
        return ActivityCategory.RECYCLED
    if tokens & VIRGIN_TOKENS:
        return ActivityCategory.MATERIAL
    return None


# ---------------------------------------------------------------------------
# Canonical Catalog
# ---------------------------------------------------------------------------

# Maps activity_key -> (ActivityCategory, list_of_aliases)
CATALOG: dict[str, tuple[ActivityCategory, list[str]]] = {
    # --- Fuels (Scope 1) ---
    "diesel_fuel": (ActivityCategory.FUEL, [
        "diesel", "diesel fuel", "hsd", "generator diesel", "diesel generator",
        "diesel genset", "dg set", "dg fuel", "high speed diesel",
    ]),
    "petrol": (ActivityCategory.FUEL, [
        "petrol", "gasoline", "motor spirit", "ms fuel", "mogas",
    ]),
    "lpg": (ActivityCategory.FUEL, [
        "lpg", "liquefied petroleum gas", "commercial lpg", "propane", "butane",
        "lpg cylinder", "cylinder gas", "lpg gas", "liquified petroleum gas",
    ]),
    "natural_gas": (ActivityCategory.FUEL, [
        "natural gas", "piped natural gas", "png", "cng", "compressed natural gas",
        "nat gas", "methane", "piped gas",
    ]),

    # --- Electricity (Scope 2) ---
    "grid_electricity": (ActivityCategory.ENERGY, [
        "grid electricity", "electricity", "grid power", "power", "mains electricity",
        "electric power", "kwh electricity", "mains power", "eb power",
    ]),

    # --- Virgin Materials (Scope 3 Cat 1) ---
    "virgin_hdpe_plastic": (ActivityCategory.MATERIAL, [
        "virgin hdpe", "virgin hdpe plastic", "hdpe resin", "raw hdpe",
        "virgin high density polyethylene", "raw hdpe granules", "hdpe granules",
    ]),
    "virgin_pet_plastic": (ActivityCategory.MATERIAL, [
        "virgin pet", "virgin pet plastic", "pet resin", "raw pet",
        "virgin polyethylene terephthalate", "raw pet granules", "pet granules",
    ]),
    "virgin_steel": (ActivityCategory.MATERIAL, [
        "virgin steel", "primary steel", "carbon steel", "mild steel",
        "raw steel", "steel billets", "blast furnace steel",
    ]),
    "virgin_aluminum": (ActivityCategory.MATERIAL, [
        "virgin aluminum", "virgin aluminium", "primary aluminum", "primary aluminium",
        "aluminum ingot", "aluminium ingot", "raw aluminum", "raw aluminium",
    ]),
    "virgin_plastic_pellets": (ActivityCategory.MATERIAL, [
        "virgin plastic pellets", "plastic pellets", "virgin plastic", "raw plastic pellets",
        "virgin polymer pellets", "virgin resin pellets", "plastic granules", "virgin polymer",
        "raw resin pellets", "plastic pellet", "virgin plastic pellet",
    ]),
    "color_additives": (ActivityCategory.MATERIAL, [
        "color additives", "color additive", "colorant", "colorants", "masterbatch",
        "pigment", "color masterbatch", "pigment additives", "plastic colorant",
        "dye additives", "additive masterbatch",
    ]),
    "packaging_material": (ActivityCategory.MATERIAL, [
        "packaging material", "packaging", "packing material", "secondary packaging",
        "carton packaging", "corrugated packaging", "packaging boxes", "carton packaging material",
        "packaging materials",
    ]),
    "virgin_pp_plastic": (ActivityCategory.MATERIAL, [
        "virgin pp", "polypropylene", "virgin polypropylene", "pp resin", "pp granules", "pp plastic",
    ]),
    "virgin_ldpe_plastic": (ActivityCategory.MATERIAL, [
        "virgin ldpe", "ldpe", "low density polyethylene", "ldpe resin", "ldpe film resin", "ldpe plastic",
    ]),
    "industrial_lubricant": (ActivityCategory.MATERIAL, [
        "lubricant", "lubricants", "industrial lubricant", "machine oil", "hydraulic oil",
    ]),
    "virgin_copper": (ActivityCategory.MATERIAL, [
        "copper", "virgin copper", "copper wire", "copper cathode",
    ]),
    "virgin_glass": (ActivityCategory.MATERIAL, [
        "glass", "virgin glass", "container glass", "flat glass",
    ]),
    "virgin_paper_kraft": (ActivityCategory.MATERIAL, [
        "kraft paper", "virgin kraft paper", "kraft liner",
    ]),

    # --- Recycled Materials (Scope 3 Cat 1 Circular Inputs) ---
    "recycled_hdpe_flakes": (ActivityCategory.RECYCLED, [
        "recycled hdpe", "recycled hdpe plastic", "recycled hdpe flakes",
        "pcr hdpe", "hdpe regrind", "post consumer hdpe",
    ]),
    "rpet_regrind": (ActivityCategory.RECYCLED, [
        "rpet", "recycled pet", "recycled pet plastic", "pcr pet",
        "rpet flakes", "rpet regrind", "post consumer pet", "recycled plastic",
        "recycled plastic flakes", "recycled plastic resin",
    ]),
    "recycled_plastic_pellets": (ActivityCategory.RECYCLED, [
        "recycled plastic pellets", "recycled polymer pellets", "pcr plastic pellets",
        "recycled plastic granules", "circular plastic pellets",
    ]),
    "bio_carrier_masterbatch": (ActivityCategory.RECYCLED, [
        "bio masterbatch", "bio carrier masterbatch", "recycled masterbatch",
        "sustainable colorant",
    ]),
    "recycled_corrugated_packaging": (ActivityCategory.RECYCLED, [
        "recycled packaging", "recycled corrugated packaging", "recycled boxes",
        "circular packaging",
    ]),
    "recycled_pp_granules": (ActivityCategory.RECYCLED, [
        "recycled pp", "recycled polypropylene", "recycled pp granules", "pcr pp",
    ]),
    "recycled_ldpe_pellets": (ActivityCategory.RECYCLED, [
        "recycled ldpe", "recycled ldpe pellets", "pcr ldpe",
    ]),
    "re_refined_lubricant": (ActivityCategory.RECYCLED, [
        "re-refined lubricant", "recycled lubricant", "recycled oil",
    ]),
    "recycled_scrap_copper": (ActivityCategory.RECYCLED, [
        "scrap copper", "recycled copper", "copper scrap",
    ]),
    "recycled_cullet_glass": (ActivityCategory.RECYCLED, [
        "cullet", "recycled glass", "glass cullet",
    ]),
    "recycled_kraft_paper": (ActivityCategory.RECYCLED, [
        "recycled kraft", "recycled kraft paper",
    ]),
    "recycled_scrap_steel": (ActivityCategory.RECYCLED, [
        "scrap steel", "recycled steel", "steel scrap", "eaf scrap steel",
        "shredded steel scrap", "recycled scrap steel",
    ]),
    "recycled_aluminum": (ActivityCategory.RECYCLED, [
        "recycled aluminum", "recycled aluminium", "secondary aluminum",
        "secondary aluminium", "aluminum scrap", "aluminium scrap", "scrap aluminum",
    ]),

    # --- Waste Streams (Scope 3 Cat 5) ---
    "waste_cardboard": (ActivityCategory.WASTE, [
        "cardboard waste", "waste cardboard", "waste carton", "occ scrap",
        "corrugated waste", "paper waste", "carton scrap", "cardboard scrap",
        "corrugated scrap", "box waste", "carton waste",
    ]),
    "waste_cardboard_recyc": (ActivityCategory.WASTE, [
        "recycled cardboard waste", "cardboard scrap for recycling",
    ]),
    "waste_plastic_mixed": (ActivityCategory.WASTE, [
        "plastic waste", "mixed plastic waste", "scrap plastic",
        "production plastic reject", "waste plastic", "plastic scrap",
        "plastic trim waste", "plastic purge",
    ]),
    "waste_plastic_incin": (ActivityCategory.WASTE, [
        "plastic waste incinerated", "incinerated plastic", "plastic incineration",
    ]),

    # --- Water & Wastewater Utilities (Scope 3) ---
    "water_supply": (ActivityCategory.WATER, [
        "water", "municipal water", "fresh water", "process water",
        "borewell water", "tap water", "utility water", "water consumption",
        "water supply", "industrial water", "raw water",
    ]),
    "wastewater_treatment": (ActivityCategory.WATER, [
        "wastewater", "effluent", "etp effluent", "etp discharge", "sewage",
        "trade effluent", "process wastewater", "wastewater treatment",
        "industrial effluent", "treated wastewater",
    ]),
}

# Build fast reverse lookup maps
_ALIAS_TO_KEY: dict[str, tuple[str, ActivityCategory]] = {}
for key, (category, aliases) in CATALOG.items():
    # Canonical key itself
    _ALIAS_TO_KEY[key.replace("_", " ")] = (key, category)
    _ALIAS_TO_KEY[key] = (key, category)
    for alias in aliases:
        _ALIAS_TO_KEY[alias.lower()] = (key, category)

_INTERNAL_KEYS = set(CATALOG.keys())

# ---------------------------------------------------------------------------
# Industry Smart Defaults
# ---------------------------------------------------------------------------

INDUSTRY_DEFAULTS: dict[str, dict] = {
    "Plastic Manufacturing": {
        "common_activities": [
            "grid_electricity", "diesel_fuel",
            "virgin_hdpe_plastic", "virgin_pet_plastic", "waste_plastic_mixed",
            "water_supply",
        ],
        "description": "Plastics extrusion, injection molding, blow molding",
    },
    "Textile": {
        "common_activities": [
            "grid_electricity", "natural_gas", "diesel_fuel",
            "water_supply", "wastewater_treatment",
        ],
        "description": "Textile processing, spinning, dyeing, and finishing",
    },
    "Food Processing": {
        "common_activities": [
            "grid_electricity", "natural_gas", "diesel_fuel", "lpg",
            "water_supply", "wastewater_treatment", "waste_cardboard",
        ],
        "description": "Food preparation, refrigeration, cooking, and canning",
    },
    "Steel Fabrication": {
        "common_activities": [
            "grid_electricity", "natural_gas", "diesel_fuel",
            "virgin_steel", "recycled_scrap_steel",
        ],
        "description": "Steel forging, cutting, rolling, welding, and fabrication",
    },
    "Packaging": {
        "common_activities": [
            "grid_electricity", "diesel_fuel", "virgin_hdpe_plastic",
            "virgin_pet_plastic", "waste_cardboard", "waste_plastic_mixed",
        ],
        "description": "Corrugated boxes, plastic containers, and films",
    },
    "Chemical": {
        "common_activities": [
            "grid_electricity", "natural_gas", "diesel_fuel",
            "water_supply", "wastewater_treatment",
        ],
        "description": "Specialty chemicals, polymers, and industrial synthesis",
    },
    "Other": {
        "common_activities": [
            "grid_electricity", "diesel_fuel", "water_supply",
        ],
        "description": "General industrial manufacturing",
    },
}


# ---------------------------------------------------------------------------
# Normalization & Helpers
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Normalize input text: lowercase, remove punctuation, collapse whitespace."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    # Remove common filler phrases
    text = re.sub(r"\b(use of|consumption of|consumption|purchase of|bought)\b", "", text)
    return text.strip()


def _is_guardrail_violated(candidate_key: str, hint: Optional[ActivityCategory]) -> bool:
    """Check if mapping candidate violates lifecycle guardrails."""
    if not hint:
        return False
    cat = CATALOG.get(candidate_key, (ActivityCategory.UNKNOWN, []))[0]
    
    # Waste cannot map to virgin material or fuel
    if hint == ActivityCategory.WASTE and cat in (ActivityCategory.MATERIAL, ActivityCategory.FUEL, ActivityCategory.ENERGY):
        return True
    # Recycled cannot map to virgin material
    if hint == ActivityCategory.RECYCLED and cat == ActivityCategory.MATERIAL:
        return True
    # Water cannot map to material or fuel
    if hint == ActivityCategory.WATER and cat in (ActivityCategory.MATERIAL, ActivityCategory.FUEL, ActivityCategory.ENERGY):
        return True
    # Virgin material cannot map to waste or water
    if hint == ActivityCategory.MATERIAL and cat in (ActivityCategory.WASTE, ActivityCategory.WATER):
        return True
        
    return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def resolve_activity(
    raw_name: str,
    hf_service=None,
    gemini_service=None,
) -> tuple[Optional[str], ActivityCategory, Optional[str]]:
    """
    Resolve a raw activity name to a verified internal key.

    Returns:
        (activity_key, category, warning)
        - activity_key is None if unresolvable
        - warning is set when resolution fails or requires caution
    """
    normalized = _normalize(raw_name)
    tokens = set(re.findall(r"\b\w+\b", normalized))
    lifecycle_hint = detect_lifecycle_hint(tokens)

    # 1. Exact match against canonical key
    internal_candidate = normalized.replace(" ", "_").replace("-", "_")
    if internal_candidate in _INTERNAL_KEYS:
        cat = CATALOG[internal_candidate][0]
        if not _is_guardrail_violated(internal_candidate, lifecycle_hint):
            return internal_candidate, cat, None

    # 2. Exact match in alias map
    if normalized in _ALIAS_TO_KEY:
        key, cat = _ALIAS_TO_KEY[normalized]
        if not _is_guardrail_violated(key, lifecycle_hint):
            return key, cat, None

    # 3. Regex word-boundary match (sorted by alias length descending for greedy match)
    sorted_aliases = sorted(_ALIAS_TO_KEY.keys(), key=len, reverse=True)
    for alias in sorted_aliases:
        pattern = rf"\b{re.escape(alias)}\b"
        if re.search(pattern, normalized):
            key, cat = _ALIAS_TO_KEY[alias]
            if not _is_guardrail_violated(key, lifecycle_hint):
                logger.debug("Word-boundary match: '%s' ≈ '%s' → '%s'", raw_name, alias, key)
                return key, cat, None

    # 4. Hugging Face semantic match (constrained by lifecycle hint & high threshold)
    if hf_service is not None and hf_service.is_configured():
        try:
            # Filter candidate pool to avoid false cross-category matches
            valid_candidates = []
            for alias, (key, cat) in _ALIAS_TO_KEY.items():
                if not _is_guardrail_violated(key, lifecycle_hint):
                    valid_candidates.append(alias)

            best_match = hf_service.semantic_match(normalized, valid_candidates, threshold=0.75)
            if best_match and best_match in _ALIAS_TO_KEY:
                key, cat = _ALIAS_TO_KEY[best_match]
                logger.info("HF semantic match: '%s' → '%s' → '%s'", raw_name, best_match, key)
                return key, cat, None
        except Exception as e:
            logger.warning("HF matching failed for '%s': %s", raw_name, e)

    # 5. Gemini fallback (structured prompt with allowed candidates)
    if gemini_service is not None and gemini_service.is_configured():
        try:
            allowed_keys = [
                k for k in _INTERNAL_KEYS
                if not _is_guardrail_violated(k, lifecycle_hint)
            ]
            result = gemini_service.resolve_entity(raw_name, allowed_keys)
            if result and result in _INTERNAL_KEYS:
                cat = CATALOG[result][0]
                if not _is_guardrail_violated(result, lifecycle_hint):
                    logger.info("Gemini match: '%s' → '%s'", raw_name, result)
                    return result, cat, None
        except Exception as e:
            logger.warning("Gemini matching failed for '%s': %s", raw_name, e)

    # 6. Unresolvable — explicitly fail safe
    hint_str = f" (detected hint: {lifecycle_hint.value})" if lifecycle_hint else ""
    warning = f"Could not map '{raw_name}' to a verified emission factor{hint_str}."
    logger.warning(warning)
    return None, ActivityCategory.UNKNOWN, warning


def get_industry_defaults(industry: str) -> dict:
    """Return smart defaults for a given industry."""
    return INDUSTRY_DEFAULTS.get(industry, INDUSTRY_DEFAULTS["Other"])
