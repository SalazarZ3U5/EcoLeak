"""
Pydantic schemas for request/response models.

All data contracts for the API live here — input validation,
response shaping, and internal data transfer objects.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ActivityCategory(str, Enum):
    """Classification of an activity for routing to the correct engine."""
    FUEL = "fuel"
    ENERGY = "energy"
    MATERIAL = "material"
    RECYCLED = "recycled"
    WATER = "water"
    WASTE = "waste"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ActivityInput(BaseModel):
    """A single activity as provided by the user (raw, unmapped)."""
    name: str = Field(..., description="Raw activity name from user, e.g. 'diesel', 'grid electricity', 'cardboard waste'")
    quantity: float = Field(..., gt=0, description="Quantity of the activity")
    unit: str = Field(..., description="Unit of measurement, e.g. 'l', 'kWh', 'kg', 'm3'")


class AnalyzeRequest(BaseModel):
    """Structured analysis request with known activities."""
    industry: str = Field(default="Other", description="Industry type, e.g. 'Plastic Manufacturing'")
    activities: list[ActivityInput] = Field(..., min_length=1, description="List of activities to analyze")


class ChatRequest(BaseModel):
    """Natural language analysis request."""
    message: str = Field(..., min_length=1, description="Natural language description of factory operations")


class RecommendRequest(BaseModel):
    """Direct recommendation request for a specific material."""
    material_key: str = Field(..., description="Virgin material key, e.g. 'virgin_hdpe_plastic'")
    quantity_kg: float = Field(..., gt=0, description="Quantity in kilograms")
    substitution_percent: float = Field(default=100.0, ge=0, le=100, description="Percentage of material to substitute (0-100)")


# ---------------------------------------------------------------------------
# Response models — per-activity results
# ---------------------------------------------------------------------------

class EmissionResult(BaseModel):
    """Calculated emission for a single resolved activity."""
    instance_id: str = Field(default="", description="Unique activity instance identifier")
    raw_name: str = Field(..., description="Original user-provided name")
    activity_key: str = Field(..., description="Resolved internal activity key")
    category: ActivityCategory = Field(..., description="Activity category")
    quantity: float
    unit: str
    normalized_quantity: float = Field(default=0.0, description="Quantity converted to canonical unit")
    normalized_unit: str = Field(default="", description="Canonical unit used for calculation")
    scope: str = Field(default="", description="GHG Protocol scope (Scope 1, 2, or 3)")
    emission_factor: float = Field(..., description="CO2e per unit from local dataset")
    co2e_kg: float = Field(..., description="Calculated kg CO2e")
    share_percent: float = Field(default=0.0, description="Percentage of total facility emissions")
    is_leak_point: bool = Field(default=False, description="True if activity is a significant hotspot")
    hotspot_tier: str = Field(default="low", description="'high' (primary), 'medium' (secondary), or 'low'")
    audit_note: Optional[str] = Field(default=None, description="Conversion or audit trail explanation")
    status: str = Field(default="resolved", description="'resolved' or 'unresolved'")
    warning: Optional[str] = Field(default=None, description="Warning message if resolution failed")


class UnresolvedActivity(BaseModel):
    """An activity that could not be mapped or calculated."""
    raw_name: str
    quantity: float
    unit: str
    status: str = "unresolved"
    warning: str
    suggested_action: Optional[str] = Field(default=None, description="Guidance to resolve mapping")


# ---------------------------------------------------------------------------
# Response models — circular recommendations
# ---------------------------------------------------------------------------

class CircularRecommendation(BaseModel):
    """A circular economy alternative for a specific emission hotspot."""
    target_activity: str = Field(..., description="The virgin material key being replaced")
    alternative: str = Field(..., description="The circular alternative key")
    intervention_type: str = Field(default="material_substitution", description="Type of circular intervention")
    quantity_kg: float = Field(..., description="Quantity being substituted")
    substitution_percent: float = Field(default=100.0)
    baseline_co2e_kg: float = Field(..., description="CO2e with virgin material")
    alternative_co2e_kg: float = Field(..., description="CO2e with circular alternative")
    co2e_savings_kg: float = Field(..., description="Absolute savings in kg CO2e")
    co2e_reduction_percent: float = Field(..., description="Percentage reduction")
    estimated_capex_inr: Optional[float] = Field(default=None, description="Estimated retrofit CAPEX in Indian Rupees (INR)")
    annual_opex_savings_inr: Optional[float] = Field(default=None, description="Annual material cost savings in INR")
    estimated_capex_usd: Optional[float] = Field(default=None, description="Estimated CAPEX in USD for reference")
    annual_opex_savings_usd: Optional[float] = Field(default=None, description="Annual savings in USD for reference")
    currency: str = Field(default="INR", description="Financial currency code")
    currency_symbol: str = Field(default="₹", description="Currency display symbol")
    payback_months: Optional[float] = Field(default=None)
    financial_basis: str = Field(default="dynamic_scaling", description="'dynamic_scaling', 'dataset_based', or 'unavailable'")
    financial_feasibility_note: str = Field(default="")
    feasibility_score: int = Field(default=85, ge=0, le=100, description="Engineering & regulatory feasibility 0-100")
    technical_difficulty: str = Field(default="Low", description="'Low', 'Medium', or 'High'")
    regulatory_readiness: str = Field(default="Commercial ready")
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Response models — facility summary & full response
# ---------------------------------------------------------------------------

class ScopeBreakdown(BaseModel):
    """GHG Protocol Scope 1, 2, 3 breakdown."""
    scope_1_kg: float = 0.0
    scope_2_kg: float = 0.0
    scope_3_kg: float = 0.0
    scope_1_pct: float = 0.0
    scope_2_pct: float = 0.0
    scope_3_pct: float = 0.0


class FacilitySummary(BaseModel):
    """High-level summary of facility emissions with scope breakdown."""
    industry: str
    total_emissions_kg_co2e: float
    scope_breakdown: ScopeBreakdown = Field(default_factory=ScopeBreakdown)
    data_quality_index: float = Field(default=100.0, description="Percentage of resolved/verified activities")


class AnalyzeResponse(BaseModel):
    """Full analysis response including emissions, leak points, and recommendations."""
    facility_summary: FacilitySummary
    activities: list[EmissionResult] = Field(default_factory=list)
    unresolved_activities: list[UnresolvedActivity] = Field(default_factory=list)
    leak_points: list[EmissionResult] = Field(default_factory=list)
    circular_recommendations: list[CircularRecommendation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response models — health & status
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"


class DatabaseStatus(BaseModel):
    emission_factors_loaded: bool = False
    emission_factor_count: int = 0
    circular_interventions_loaded: bool = False
    circular_intervention_count: int = 0
    chroma_ready: bool = False
    chroma_document_count: int = 0
    gemini_configured: bool = False
    huggingface_configured: bool = False
