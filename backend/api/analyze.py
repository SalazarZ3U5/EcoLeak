"""
Core analysis API endpoints.

POST /api/analyze — structured activity input → full analysis pipeline
POST /api/analyze/document — file upload → Gemini extraction → same pipeline

All numerical calculations are performed by the local deterministic emission engine,
never by the LLM.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends

from backend.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    FacilitySummary,
    ScopeBreakdown,
    EmissionResult,
    UnresolvedActivity,
    ActivityCategory,
)
from backend.services import (
    entity_mapper,
    emission_engine,
    leak_detector,
    circular_engine,
    gemini_service,
    hf_service,
    supabase_service,
    sarvam_service,
)
from backend.services.auth_service import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Shared analysis pipeline
# ---------------------------------------------------------------------------

def run_analysis_pipeline(
    industry: str,
    activities: list[dict],
) -> AnalyzeResponse:
    """
    Core analysis pipeline shared by all input methods.

    Steps:
        1. Entity resolution (with negative guardrails & lifecycle constraints)
        2. Emission calculation (with automatic physical unit conversion)
        3. Pareto hotspot detection (80/20 cumulative emission analysis)
        4. Dynamic circular recommendations (scaled CAPEX & feasibility score)

    Args:
        industry: Industry classification string
        activities: List of {"name": str, "quantity": float, "unit": str}

    Returns:
        Complete AnalyzeResponse
    """
    warnings: list[str] = []
    emission_results: list[EmissionResult] = []
    unresolved: list[UnresolvedActivity] = []

    # Prepare optional services for entity resolution
    hf_svc = hf_service if hf_service.is_configured() else None
    gemini_svc = gemini_service if gemini_service.is_configured() else None

    # --- Step 1 & 2: Entity resolution + emission calculation ---
    for idx, activity in enumerate(activities):
        raw_name = str(activity["name"]).strip()
        quantity = float(activity["quantity"])
        unit = str(activity["unit"]).strip()
        instance_id = f"act-{idx+1}-{uuid.uuid4().hex[:6]}"

        # Resolve entity
        activity_key, category, resolve_warning = entity_mapper.resolve_activity(
            raw_name,
            hf_service=hf_svc,
            gemini_service=gemini_svc,
        )

        if resolve_warning:
            warnings.append(resolve_warning)

        if activity_key is None:
            # Provide actionable remediation advice
            suggestion = _generate_remediation_suggestion(raw_name, unit)
            unresolved.append(UnresolvedActivity(
                raw_name=raw_name,
                quantity=quantity,
                unit=unit,
                warning=resolve_warning or f"Could not map '{raw_name}' to a verified factor.",
                suggested_action=suggestion,
            ))
            continue

        # Calculate emissions with dimensional validation & unit conversion
        result = emission_engine.calculate_emission(
            activity_key=activity_key,
            quantity=quantity,
            unit=unit,
            raw_name=raw_name,
            category=category,
            instance_id=instance_id,
        )

        if result.status == "unresolved":
            if result.warning:
                warnings.append(result.warning)
            unresolved.append(UnresolvedActivity(
                raw_name=raw_name,
                quantity=quantity,
                unit=unit,
                warning=result.warning or f"No verified emission factor for '{activity_key}'.",
                suggested_action="Verify activity unit dimension or provide custom factor.",
            ))
        else:
            emission_results.append(result)

    # --- Step 3: Pareto Hotspot detection ---
    annotated = leak_detector.detect_leak_points(emission_results)
    total_co2e = leak_detector.get_total_emissions(emission_results)

    # --- Compute Scope 1, 2, 3 Breakdown ---
    s1 = sum(e.co2e_kg for e in annotated if "1" in e.scope)
    s2 = sum(e.co2e_kg for e in annotated if "2" in e.scope)
    s3 = sum(e.co2e_kg for e in annotated if "3" in e.scope)

    s1_pct = round((s1 / total_co2e) * 100, 1) if total_co2e > 0 else 0.0
    s2_pct = round((s2 / total_co2e) * 100, 1) if total_co2e > 0 else 0.0
    s3_pct = round((s3 / total_co2e) * 100, 1) if total_co2e > 0 else 0.0

    total_count = len(emission_results) + len(unresolved)
    dqi = round((len(emission_results) / total_count) * 100, 1) if total_count > 0 else 100.0

    # --- Step 4: Circular recommendations ---
    recommendations = []
    leak_points = [e for e in annotated if e.is_leak_point]
    recommendations = circular_engine.recommend_for_activities(annotated)
    if not recommendations and leak_points:
        for lp in leak_points:
            warnings.append(f"No circular alternative found for '{lp.activity_key}'.")

    # Only fallback to generate if not already recommended
    existing_targets = {r.target_activity for r in recommendations}
    for lp in leak_points:
        # Check if activity is a virgin material hotspot and not already recommended
        if (lp.category == ActivityCategory.MATERIAL or lp.activity_key.startswith("virgin_")) and lp.activity_key not in existing_targets:
            qty_kg = lp.normalized_quantity if lp.normalized_unit == "kg" else lp.quantity
            rec = circular_engine.recommend(
                material_key=lp.activity_key,
                quantity_kg=qty_kg,
            )
            if rec is not None:
                recommendations.append(rec)
                existing_targets.add(lp.activity_key)
            else:
                warnings.append(
                    f"No circular alternative found for '{lp.activity_key}'."
                )

    return AnalyzeResponse(
        facility_summary=FacilitySummary(
            industry=industry,
            total_emissions_kg_co2e=round(total_co2e, 2),
            scope_breakdown=ScopeBreakdown(
                scope_1_kg=round(s1, 2),
                scope_2_kg=round(s2, 2),
                scope_3_kg=round(s3, 2),
                scope_1_pct=s1_pct,
                scope_2_pct=s2_pct,
                scope_3_pct=s3_pct,
            ),
            data_quality_index=dqi,
        ),
        activities=annotated,
        unresolved_activities=unresolved,
        leak_points=leak_points,
        circular_recommendations=recommendations,
        warnings=warnings,
    )


def _generate_remediation_suggestion(raw_name: str, unit: str) -> str:
    """Generate smart user guidance for unresolved activities."""
    lowered = raw_name.lower()
    if "water" in lowered:
        return "Try 'water supply' (unit: m³ or liters) or 'wastewater treatment' (unit: m³)."
    elif "gas" in lowered or "cng" in lowered or "png" in lowered:
        return "Try 'natural gas' (unit: m³ or kWh) or 'lpg' (unit: kg or liters)."
    elif "waste" in lowered or "scrap" in lowered:
        return "Specify stream: 'cardboard waste', 'mixed plastic waste', or 'scrap steel' (unit: kg)."
    elif "plastic" in lowered:
        return "Specify type: 'virgin HDPE', 'virgin PET', or 'recycled HDPE flakes' (unit: kg)."
    return "Check spelling or use canonical industrial terms: diesel, petrol, LPG, grid electricity."


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Analyze structured factory activity data.

    Accepts a list of activities with name, quantity, and unit.
    Returns emissions, leak points, and circular recommendations.
    Optionally auto-saves audit history if user is authenticated.
    """
    activities = [
        {"name": a.name, "quantity": a.quantity, "unit": a.unit}
        for a in request.activities
    ]
    result = run_analysis_pipeline(request.industry, activities)

    # Auto-save audit if Supabase is configured
    if supabase_service.is_configured():
        try:
            uid = user["uid"] if user else "anonymous-operator"
            email = user.get("email", "") if user else ""
            await supabase_service.save_audit(
                user_id=uid,
                user_email=email,
                industry=request.industry,
                total_co2e=result.facility_summary.total_emissions_kg_co2e,
                scope_breakdown=result.facility_summary.scope_breakdown.model_dump(),
                leak_points=[lp.model_dump() for lp in result.leak_points],
                circular_recommendations=[r.model_dump() for r in result.circular_recommendations],
                activities=[a.model_dump() for a in result.activities],
                data_quality_index=result.facility_summary.data_quality_index,
                facility_id=request.facility_id,
                facility_name=request.facility_name,
                operator_id=user["uid"] if user else None,
            )
        except Exception as e:
            logger.warning("Auto-save audit failed (non-fatal): %s", e)

    return result


@router.post("/analyze/document", response_model=AnalyzeResponse)
async def analyze_document(
    file: UploadFile = File(...),
    industry: str = Form(default="Other"),
    language: Optional[str] = Form(default=None),
    sarvam_api_key: Optional[str] = Form(default=None),
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Analyze an uploaded document (utility bill, invoice, or consumption ledger).

    For Indian language documents (Hindi, Marathi, Gujarati, Tamil, Telugu, etc.),
    Sarvam AI's DocAgent (Sarvam Vision 1.5) is used for high-fidelity OCR and
    extraction. If Sarvam AI is unconfigured or encounters an error, PyMuPDF
    serves as the robust local multilingual fallback.
    """
    warnings: list[str] = []

    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    filename = file.filename or "document.pdf"
    extraction: Optional[dict] = None

    # Step 1: Detect if file contains Indian languages / scripts
    is_indic_doc = False
    detected_scripts: list[str] = []
    normalized_lang = (language or "").strip()
    if normalized_lang and normalized_lang in sarvam_service.INDIC_LANGUAGES and normalized_lang != "en-IN":
        is_indic_doc = True
    elif "pdf" in mime_type.lower():
        try:
            from backend.services.pdf_parser import has_indic_scripts
            is_indic_doc, detected_scripts = has_indic_scripts(file_bytes)
        except Exception as e:
            logger.debug("Indic script check error: %s", e)

    # Step 2: Try Sarvam AI DocAgent for Indian language documents
    if is_indic_doc or (normalized_lang and normalized_lang != "en-IN"):
        if sarvam_service.is_configured(sarvam_api_key):
            try:
                target_lang = normalized_lang or "hi-IN"
                extraction = sarvam_service.parse_with_sarvam_docagent(
                    file_bytes=file_bytes,
                    filename=filename,
                    mime_type=mime_type,
                    language=target_lang,
                    api_key=sarvam_api_key,
                )
                if extraction and extraction.get("activities"):
                    parser_name = extraction.get("parser", "Sarvam AI DocAgent")
                    warnings.append(f"Parsed with {parser_name} for Indian language document.")
                else:
                    warnings.append("Sarvam AI DocAgent did not extract activities; falling back to PyMuPDF.")
                    extraction = None
            except Exception as e:
                logger.warning("Sarvam DocAgent error: %s (falling back to PyMuPDF)", e)
                warnings.append("Sarvam DocAgent error; falling back to PyMuPDF.")
                extraction = None
        else:
            warnings.append("Indian language document detected; Sarvam AI DocAgent key not set (falling back to PyMuPDF).")

    # Step 3: Fallback to PyMuPDF if Sarvam DocAgent was not used or did not produce results
    if extraction is None:
        if "pdf" in mime_type.lower():
            try:
                from backend.services.pdf_parser import extract_pdf_content
                parsed_meta = extract_pdf_content(file_bytes)
                parser_label = parsed_meta.get("parser", "PyMuPDF (Multilingual)")
                pages = parsed_meta.get("page_count", 1)
                tables_count = len(parsed_meta.get("tables", []))
                scripts = ", ".join(parsed_meta.get("detected_scripts", [])) or "Latin/Multilingual"
                fb_tag = " (PyMuPDF fallback)" if is_indic_doc else ""
                warnings.append(f"Document parsed with {parser_label}{fb_tag} ({pages} page(s), {tables_count} table grid(s), scripts: {scripts}).")
            except Exception as e:
                logger.debug("PyMuPDF metadata check note: %s", e)

        # Use Groq / Gemini with PyMuPDF extracted text to extract activities
        extraction = gemini_service.analyze_document(file_bytes, mime_type)

    if extraction is None:
        warnings.append("Document extraction could not extract structured activities.")
        return AnalyzeResponse(
            facility_summary=FacilitySummary(
                industry=industry,
                total_emissions_kg_co2e=0,
            ),
            warnings=warnings + ["Could not extract data from document. Check file format or API keys."],
        )

    # Extract industry if found
    doc_industry = extraction.get("industry", industry)
    if doc_industry and doc_industry != "unknown":
        industry = doc_industry

    activities = extraction.get("activities", [])
    if not activities:
        warnings.append("No consumption data found in document.")
        return AnalyzeResponse(
            facility_summary=FacilitySummary(
                industry=industry,
                total_emissions_kg_co2e=0,
            ),
            warnings=warnings,
        )

    result = run_analysis_pipeline(industry, activities)
    result.warnings = warnings + result.warnings

    if supabase_service.is_configured():
        try:
            uid = user["uid"] if user else "anonymous-operator"
            email = user.get("email", "") if user else ""
            await supabase_service.save_audit(
                user_id=uid,
                user_email=email,
                industry=industry,
                total_co2e=result.facility_summary.total_emissions_kg_co2e,
                scope_breakdown=result.facility_summary.scope_breakdown.model_dump(),
                leak_points=[lp.model_dump() for lp in result.leak_points],
                circular_recommendations=[r.model_dump() for r in result.circular_recommendations],
                activities=[a.model_dump() for a in result.activities],
                data_quality_index=result.facility_summary.data_quality_index,
                facility_name=f"Document Audit ({filename})",
                operator_id=user["uid"] if user else None,
            )
        except Exception as e:
            logger.warning("Auto-save document audit note: %s", e)

    return result

