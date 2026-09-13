"""
EcoBot Assistant Service — Direct LLM Pipeline with Rich Audit Context.

Directly invokes the LLM (Groq openai/gpt-oss-120b with Gemini fallback)
with complete plant facility profiles, calculated emissions, Pareto hotspot leaks,
and engineered circular interventions.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from backend.services import groq_service, gemini_service

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are EcoBot, the dedicated industrial sustainability, carbon accounting, and circular engineering AI assistant for the EcoLeak platform.

CRITICAL INVARIANT & STRICT DATA GROUNDING:
- When CURRENT FACILITY & AUDIT CONTEXT is provided, you MUST strictly reference, cite, and ground your answers in the exact calculated emissions, Pareto hotspot leaks, and circular recommendation financial figures (CAPEX, OPEX savings, payback months) from the EcoLeak deterministic engine.
- NEVER invent, hallucinate, or contradict the facility numbers, emission totals, or ROI figures provided in the context.
- If asked about facility status, leaks, decarbonization roadmaps, or ROI, explain the exact engineering logic, physical unit transformations, and regulatory compliance paths (e.g. SPCB Consent to Operate, CPCB Plastic Waste Management Rules, SEBI BRSR Core, CEA Grid Emission factors).

CORE DOMAINS:
- Industrial Carbon Accounting: Scope 1 (direct combustion), Scope 2 (grid electricity: CEA Baseline = 0.716 kg CO2e/kWh), Scope 3 (purchased goods & supply chain).
- ESG & Statutory Compliance: CPCB/SPCB categorizations (Red/Orange/Green), Consent to Operate (CTO) emission ceilings, ISO 14064, SEBI BRSR Core, Companies Act Section 135 CSR.
- Circular Economy & Industrial Symbiosis: Virgin polymer replacement (HDPE, PET, PP with PCR regrind), boiler economizers, organic waste biomethanation, avoided emission modeling.
- Financial Engineering: Upfront CAPEX, Annual OPEX savings, Simple Payback Period = (CAPEX / Annual OPEX Savings) * 12 months, ROI, IRR, and Carbon Credit potential.

RESPONSE FORMATTING:
- Crisp, professional, and directly actionable for plant managers and environmental engineers.
- Use clear bullet points and bold key figures (e.g. **₹4,50,000 INR**, **5.2 months**, **91.8 MT CO2e**).
- When explaining formulas or calculations, show: Formula -> Values -> **Bold Final Result**.
- Plain text formulas only (no raw unrendered LaTeX).
- End EVERY response with: ⚠️ AI can make mistakes. Verify critical calculations independently.
"""


def _format_audit_context(context: Optional[dict]) -> str:
    """
    Format facility metadata, calculated emission totals, hotspot leaks,
    and circular interventions into a structured markdown block for the LLM.
    """
    if not context or not isinstance(context, dict):
        return ""

    sections: list[str] = ["CURRENT FACILITY & AUDIT CONTEXT:"]

    # 1. Facility Profile
    facility_name = context.get("facility_name") or context.get("facilityName") or context.get("facility")
    location = context.get("location")
    industry = context.get("industry")
    reg_category = context.get("reg_category") or context.get("regCategory")
    reg_id = context.get("reg_id") or context.get("regId")
    capacity = context.get("capacity")
    emission_cap = context.get("emission_cap") or context.get("emissionCap")

    profile_lines = []
    if facility_name:
        profile_lines.append(f"- Facility Name: {facility_name}")
    if location:
        profile_lines.append(f"- Location: {location}")
    if industry:
        profile_lines.append(f"- Industry Sector: {industry}")
    if reg_category:
        profile_lines.append(f"- SPCB Regulatory Classification: {reg_category}")
    if reg_id:
        profile_lines.append(f"- Consent to Operate (CTO) ID: {reg_id}")
    if capacity:
        profile_lines.append(f"- Annual Production Capacity: {capacity}")
    if emission_cap:
        profile_lines.append(f"- Permissible SPCB Emission Cap: {emission_cap}")

    if profile_lines:
        sections.append("### Facility Profile\n" + "\n".join(profile_lines))

    # 2. Calculated Emissions (EcoLeak Deterministic Engine)
    tot_kg = context.get("total_emissions_kg_co2e") or context.get("total_emissions")
    s1 = context.get("scope_1_kg_co2e")
    s2 = context.get("scope_2_kg_co2e")
    s3 = context.get("scope_3_kg_co2e")

    emissions_lines = []
    if tot_kg is not None:
        try:
            tot_val = float(tot_kg)
            emissions_lines.append(f"- Total Emissions: {tot_val:,.1f} kg CO2e ({tot_val/1000.0:,.2f} Metric Tons CO2e)")
        except (ValueError, TypeError):
            emissions_lines.append(f"- Total Emissions: {tot_kg} kg CO2e")

    if s1 is not None:
        try:
            emissions_lines.append(f"- Scope 1 (Direct Fuel Combustion): {float(s1):,.1f} kg CO2e")
        except (ValueError, TypeError):
            emissions_lines.append(f"- Scope 1: {s1}")
    if s2 is not None:
        try:
            emissions_lines.append(f"- Scope 2 (Purchased Electricity): {float(s2):,.1f} kg CO2e")
        except (ValueError, TypeError):
            emissions_lines.append(f"- Scope 2: {s2}")
    if s3 is not None:
        try:
            emissions_lines.append(f"- Scope 3 (Raw Materials & Supply Chain): {float(s3):,.1f} kg CO2e")
        except (ValueError, TypeError):
            emissions_lines.append(f"- Scope 3: {s3}")

    activities = context.get("activities") or []
    if activities and isinstance(activities, list):
        act_lines = []
        for act in activities:
            if isinstance(act, dict):
                name = act.get("name", "Unknown Activity")
                qty = act.get("quantity")
                unit = act.get("unit", "")
                co2 = act.get("emissions_kg_co2e")
                scope = act.get("scope", "")
                act_desc = f"  * {name}: {qty} {unit}"
                if co2 is not None:
                    try:
                        act_desc += f" -> {float(co2):,.1f} kg CO2e"
                    except (ValueError, TypeError):
                        pass
                if scope:
                    act_desc += f" [{scope}]"
                act_lines.append(act_desc)
        if act_lines:
            emissions_lines.append("- Facility Input Streams:\n" + "\n".join(act_lines))

    if emissions_lines:
        sections.append("### Calculated Facility Emissions (EcoLeak Engine)\n" + "\n".join(emissions_lines))

    # 3. Pareto Hotspots & Leaks
    hotspots = context.get("hotspots") or context.get("leaks") or []
    if hotspots and isinstance(hotspots, list):
        hs_lines = []
        for idx, hs in enumerate(hotspots, 1):
            if isinstance(hs, dict):
                act_name = hs.get("activity") or hs.get("name", "Unknown Stream")
                co2 = hs.get("emissions_kg_co2e")
                pct = hs.get("percent_of_total")
                scope = hs.get("scope", "")
                desc = f"- Hotspot #{idx}: {act_name}"
                if co2 is not None:
                    try:
                        desc += f" | {float(co2):,.1f} kg CO2e"
                    except (ValueError, TypeError):
                        pass
                if pct is not None:
                    try:
                        desc += f" ({float(pct):.1f}% of total emissions)"
                    except (ValueError, TypeError):
                        pass
                if scope:
                    desc += f" [{scope}]"
                hs_lines.append(desc)
        if hs_lines:
            sections.append("### Identified Pareto Hotspots & Leaks (80/20 Analysis)\n" + "\n".join(hs_lines))

    # 4. Circular Recommendations & ROI
    recs = context.get("circular_recommendations") or context.get("recommendations") or []
    if recs and isinstance(recs, list):
        rec_lines = []
        for idx, r in enumerate(recs, 1):
            if isinstance(r, dict):
                target = r.get("target_activity", "Virgin Material")
                alt = r.get("alternative", "Circular Alternative")
                sub_pct = r.get("recommended_substitution_percent")
                red_kg = r.get("co2e_reduction_kg")
                red_pct = r.get("co2e_reduction_percent")
                capex = r.get("estimated_capex_inr")
                savings = r.get("annual_savings_inr")
                payback = r.get("payback_months")
                diff = r.get("difficulty_level")
                reg = r.get("regulatory_clearance")

                r_desc = [f"- Recommendation #{idx}: Replace {target} with {alt}"]
                if sub_pct is not None:
                    r_desc.append(f"  * Recommended Substitution: {sub_pct}%")
                if red_kg or red_pct:
                    kg_str = f"{float(red_kg):,.1f} kg CO2e" if red_kg else ""
                    pct_str = f"({float(red_pct):.1f}% reduction)" if red_pct else ""
                    r_desc.append(f"  * Avoided Emissions: {kg_str} {pct_str}".strip())
                if capex is not None:
                    try:
                        r_desc.append(f"  * Upfront CAPEX: ₹{float(capex):,.2f} INR")
                    except (ValueError, TypeError):
                        pass
                if savings is not None:
                    try:
                        r_desc.append(f"  * Annual OPEX Savings: ₹{float(savings):,.2f} INR")
                    except (ValueError, TypeError):
                        pass
                if payback is not None:
                    try:
                        r_desc.append(f"  * Simple Payback Period: {float(payback):.1f} months")
                    except (ValueError, TypeError):
                        pass
                if diff:
                    r_desc.append(f"  * Feasibility / Difficulty: {diff}")
                if reg:
                    r_desc.append(f"  * Regulatory Clearance: {reg}")
                rec_lines.append("\n".join(r_desc))
        if rec_lines:
            sections.append("### Recommended Circular Interventions & Financial ROI\n" + "\n\n".join(rec_lines))

    return "\n\n".join(sections)


def chat_with_assistant(
    message: str,
    history: list[dict] = None,
    context: dict = None,
) -> dict:
    """
    Handle user query with EcoBot.
    Directly invokes LLM (Groq openai/gpt-oss-120b with Gemini fallback)
    using the enriched plant audit context.
    """
    if history is None:
        history = []

    # Build system prompt augmented with rich live audit context
    augmented_system_prompt = SYSTEM_PROMPT
    context_str = _format_audit_context(context)
    if context_str:
        augmented_system_prompt += f"\n\n{context_str}"

    # 1. Direct LLM Call: Groq (openai/gpt-oss-120b from .env)
    if groq_service.is_configured():
        try:
            client = groq_service._get_client()
            if client is not None:
                messages = [{"role": "system", "content": augmented_system_prompt}]
                # Append rolling history
                for turn in history[-25:]:
                    r = turn.get("role", "user")
                    c = turn.get("content", "")
                    if r in {"user", "assistant"} and c:
                        messages.append({"role": r, "content": c})
                messages.append({"role": "user", "content": message})

                model_name = groq_service.get_model()
                logger.info("Dispatching EcoBot chat to Groq model: %s", model_name)
                resp = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.2,
                )
                content = (resp.choices[0].message.content or "").strip()
                if content:
                    return {
                        "response": content,
                        "source": f"Groq ({model_name})",
                    }
                else:
                    logger.warning("Groq returned empty content — attempting Gemini fallback")
        except Exception as groq_err:
            logger.warning("Groq EcoBot chat failed: %s — attempting Gemini fallback", groq_err)

    # 2. Secondary LLM Fallback: Gemini (if configured)
    if gemini_service.is_configured():
        try:
            g_client = gemini_service._get_client()
            if g_client is not None:
                full_prompt = (
                    f"{augmented_system_prompt}\n\n"
                    f"User Query:\n{message}\n\n"
                    f"Respond with step-by-step mathematical precision and clear explanations."
                )
                g_resp = g_client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=full_prompt,
                )
                if g_resp and g_resp.text:
                    return {
                        "response": g_resp.text.strip(),
                        "source": "gemini-3.6-flash",
                    }
        except Exception as gemini_err:
            logger.warning("Gemini EcoBot chat failed: %s", gemini_err)

    # 3. Graceful Offline Fallback
    return {
        "response": (
            "EcoBot AI assistant is temporarily unreachable. Please check your network connection or try again later.\n\n"
            "⚠️ AI can make mistakes. Verify critical calculations independently."
        ),
        "source": "offline_fallback",
    }
