"""
CSV data loader with validation.

Loads emission_factors.csv and circular_interventions.csv from the data/
directory. Handles tab-separated files, BOM stripping, header normalization,
required-column validation, and numeric coercion.

Usage:
    from backend.services.csv_loader import get_emission_factors, get_circular_interventions
"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths — resolve relative to project root (parent of backend/)
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _PROJECT_ROOT / "data"

_EMISSION_FACTORS_PATH = _DATA_DIR / "emission_factors.csv"
_CIRCULAR_INTERVENTIONS_PATH = _DATA_DIR / "circular_interventions.csv"
_CIRCULAR_INTERVENTIONS_INR_PATH = _DATA_DIR / "circular_interventions_inr_template.csv"
_CIRCULAR_INTERVENTIONS_INR_ALT_PATH = _DATA_DIR / "circular_interventions_inr.csv"

# ---------------------------------------------------------------------------
# Required columns
# ---------------------------------------------------------------------------

_EMISSION_FACTOR_COLUMNS = [
    "activity_key",
    "unit",
    "co2e_per_unit",
    "scope",
]

_CIRCULAR_INTERVENTION_COLUMNS = [
    "virgin_material_key",
    "circular_alternative_key",
    "virgin_co2e_per_kg",
    "recycled_co2e_per_kg",
    "avg_capex_usd",
    "payback_months",
]

_CIRCULAR_INR_COLUMNS = [
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

# ---------------------------------------------------------------------------
# Module-level cache
# ---------------------------------------------------------------------------

_emission_factors_df: pd.DataFrame | None = None
_circular_interventions_df: pd.DataFrame | None = None
_circular_interventions_inr_df: pd.DataFrame | None = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
    """Strip BOM, whitespace, and normalize column names."""
    df.columns = (
        df.columns
        .astype(str)
        .str.replace("\ufeff", "", regex=False)
        .str.strip()
    )
    return df


def _validate_columns(df: pd.DataFrame, required: list[str], file_name: str) -> None:
    """Raise ValueError if any required columns are missing."""
    actual = set(df.columns)
    missing = [col for col in required if col not in actual]
    if missing:
        raise ValueError(
            f"{file_name}: missing required columns {missing}. "
            f"Found columns: {sorted(actual)}"
        )


def _strip_string_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from all string/object columns."""
    str_cols = df.select_dtypes(include=["object", "string"]).columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip()
    return df


def _coerce_numeric(df: pd.DataFrame, columns: list[str], file_name: str) -> pd.DataFrame:
    """Convert columns to numeric, raising on invalid data."""
    for col in columns:
        original = df[col].copy()
        df[col] = pd.to_numeric(df[col], errors="coerce")
        bad_rows = df[col].isna() & original.notna()
        if bad_rows.any():
            bad_values = original[bad_rows].tolist()
            raise ValueError(
                f"{file_name}: column '{col}' contains non-numeric values: {bad_values}"
            )
    return df


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def _load_emission_factors() -> pd.DataFrame:
    """Load and validate emission_factors.csv."""
    path = _EMISSION_FACTORS_PATH
    if not path.exists():
        raise FileNotFoundError(f"Emission factors file not found: {path}")

    logger.info("Loading emission factors from %s", path)
    df = pd.read_csv(path, sep="\t")
    df = _normalize_headers(df)

    logger.debug("Emission factors columns: %s", [repr(c) for c in df.columns])
    _validate_columns(df, _EMISSION_FACTOR_COLUMNS, path.name)

    df = _strip_string_columns(df)
    df = _coerce_numeric(df, ["co2e_per_unit"], path.name)

    # Drop completely empty rows
    df = df.dropna(subset=["activity_key"]).reset_index(drop=True)

    logger.info("Loaded %d emission factors", len(df))
    return df


def _load_circular_interventions() -> pd.DataFrame:
    """Load and validate circular_interventions.csv."""
    path = _CIRCULAR_INTERVENTIONS_PATH
    if not path.exists():
        raise FileNotFoundError(f"Circular interventions file not found: {path}")

    logger.info("Loading circular interventions from %s", path)
    df = pd.read_csv(path, sep="\t")
    df = _normalize_headers(df)

    logger.debug("Circular interventions columns: %s", [repr(c) for c in df.columns])
    _validate_columns(df, _CIRCULAR_INTERVENTION_COLUMNS, path.name)

    df = _strip_string_columns(df)
    numeric_cols = ["virgin_co2e_per_kg", "recycled_co2e_per_kg", "avg_capex_usd", "payback_months"]
    df = _coerce_numeric(df, numeric_cols, path.name)

    # Drop completely empty rows
    df = df.dropna(subset=["virgin_material_key"]).reset_index(drop=True)

    logger.info("Loaded %d circular interventions", len(df))
    return df


def _load_circular_interventions_inr() -> pd.DataFrame:
    """Load and validate circular_interventions_inr_template.csv."""
    path = _CIRCULAR_INTERVENTIONS_INR_PATH
    if not path.exists():
        path = _CIRCULAR_INTERVENTIONS_INR_ALT_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Circular interventions INR file not found at {path} or {_CIRCULAR_INTERVENTIONS_INR_PATH}"
        )

    logger.info("Loading circular interventions INR from %s", path)
    df = pd.read_csv(path, sep="\t")
    df = _normalize_headers(df)

    logger.debug("Circular interventions INR columns: %s", [repr(c) for c in df.columns])
    _validate_columns(df, _CIRCULAR_INR_COLUMNS, path.name)

    df = _strip_string_columns(df)
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
    df = _coerce_numeric(df, numeric_cols, path.name)

    # Drop completely empty rows
    df = df.dropna(subset=["virgin_material_key"]).reset_index(drop=True)

    logger.info("Loaded %d circular interventions INR", len(df))
    return df


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_emission_factors() -> pd.DataFrame:
    """Return the emission factors DataFrame (cached after first load)."""
    global _emission_factors_df
    if _emission_factors_df is None:
        _emission_factors_df = _load_emission_factors()
    return _emission_factors_df


def get_circular_interventions() -> pd.DataFrame:
    """Return the legacy circular interventions DataFrame (cached after first load)."""
    global _circular_interventions_df
    if _circular_interventions_df is None:
        _circular_interventions_df = _load_circular_interventions()
    return _circular_interventions_df


def get_circular_interventions_inr() -> pd.DataFrame:
    """Return the circular interventions INR DataFrame (cached after first load)."""
    global _circular_interventions_inr_df
    if _circular_interventions_inr_df is None:
        _circular_interventions_inr_df = _load_circular_interventions_inr()
    return _circular_interventions_inr_df


def reload_data() -> None:
    """Force reload of all CSV data (useful for testing)."""
    global _emission_factors_df, _circular_interventions_df, _circular_interventions_inr_df
    _emission_factors_df = None
    _circular_interventions_df = None
    _circular_interventions_inr_df = None
    get_emission_factors()
    get_circular_interventions()
    get_circular_interventions_inr()
    logger.info("CSV data reloaded successfully")

