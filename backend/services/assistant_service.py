"""
EcoBot Assistant Service — Project-Guarded Emission & Mathematical AI.

Strictly answers queries regarding:
  1. EcoLeak project features, methodology, circular carbon ecosystem, and SPCB/BRSR compliance.
  2. Industrial emission mathematics (Scope 1/2/3 formulas, grid factors, payback math, conversions).
  3. Facility consumption calculations and circular intervention modeling.

Politely declines queries unrelated to the project.
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

SYSTEM_PROMPT = """You are EcoBot, the industrial sustainability and carbon intelligence assistant for EcoLeak.

CORE DOMAINS — answer only these:
- Industrial Carbon Accounting: Scope 1 (direct combustion), Scope 2 (electricity), Scope 3 (supply chain). Provide emission factors and step-by-step calculations.
- ESG & Statutory Compliance: SEBI BRSR Core, GHG Protocol, ISO 14064, CPCB/SPCB categories, Section 135 Companies Act CSR mandate.
- Circular Economy: virgin vs. recycled polymer substitution, heat recovery, avoided-emission modeling, payback analysis.
- Emission Constants: CEA Grid = 0.716 kg CO2e/kWh | Diesel = 2.687 kg CO2e/L | LPG = 2.983 kg CO2e/kg.
- Financial Engineering Terms (IN SCOPE): CAPEX (Capital Expenditure), OPEX (Operating Expenditure), MSR (Minimum Statutory Reserve / Material Substitution Rate), ROI, IRR, NPV, WACC, Payback Period, Avoided Emissions, Carbon Credit, LCOE. Always answer definitions and calculations for these terms.

OUT-OF-SCOPE: Refuse academic physics, school chemistry, general math homework, or unrelated topics in one sentence.

FORMAT — MANDATORY:
- MAX 4-5 bullet points for any conceptual answer. Do NOT write paragraphs or essays.
- Each bullet: one clear, complete sentence. No sub-bullets unless critical.
- Math queries: formula line → calculation line → **bold result**. Done.
- No raw LaTeX. Plain text formulas only.
- End EVERY response with: ⚠️ AI can make mistakes. Verify critical calculations independently.
"""

# ---------------------------------------------------------------------------
# Local definitional lookup for key EcoLeak financial & sustainability terms
# (prevents LLM refusal on common acronym queries)
# ---------------------------------------------------------------------------
_TERM_DEFINITIONS: dict[str, str] = {
    "capex": (
        "### CAPEX — Capital Expenditure\n\n"
        "• **Definition:** One-time upfront investment in assets — machinery, solar panels, heat recovery systems, ETP upgrades.\n"
        "• **Role in EcoLeak:** CAPEX is used to calculate the Payback Period for green interventions.\n"
        "• **Formula:** Payback (Months) = (CAPEX / Annual OPEX Savings) × 12\n"
        "• **Example:** CAPEX = ₹50 L, Annual Savings = ₹10 L → Payback = **60 months (5 years)**\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "opex": (
        "### OPEX — Operating Expenditure\n\n"
        "• **Definition:** Recurring day-to-day costs — energy bills, fuel, maintenance, consumables.\n"
        "• **Role in EcoLeak:** OPEX savings from a green intervention drive the payback calculation.\n"
        "• **Formula:** Net Annual Saving = Baseline OPEX − Post-Intervention OPEX\n"
        "• **Tip:** Replacing diesel DG sets with grid power or solar reduces OPEX by 30–60% typically.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "msr": (
        "### MSR — Material Substitution Rate\n\n"
        "• **Definition:** The percentage of virgin material replaced by recycled/alternative feedstock in a production process.\n"
        "• **Formula:** MSR (%) = (Recycled Input / Total Input) × 100\n"
        "• **Emission Impact:** MSR directly reduces Scope 3 emissions — e.g. substituting 60% virgin HDPE with PCR-HDPE saves ~0.93 kg CO₂e per kg.\n"
        "• **EcoLeak Use:** MSR is a core KPI in the Circular Intervention dashboard.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "roi": (
        "### ROI — Return on Investment\n\n"
        "• **Definition:** Financial return earned relative to investment cost, expressed as a percentage.\n"
        "• **Formula:** ROI (%) = ((Net Benefit / CAPEX) × 100)\n"
        "• **Green ROI:** Includes both cost savings (OPEX) and carbon credit revenue from avoided emissions.\n"
        "• **Example:** ₹10 L savings on ₹50 L CAPEX = **ROI of 20% per year**.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "irr": (
        "### IRR — Internal Rate of Return\n\n"
        "• **Definition:** The discount rate at which a project's NPV equals zero — the break-even return rate.\n"
        "• **Rule of Thumb:** Green interventions with IRR > 15% are considered commercially viable in Indian industry.\n"
        "• **Usage:** Compare IRR against WACC; if IRR > WACC, the project creates value.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "npv": (
        "### NPV — Net Present Value\n\n"
        "• **Definition:** Present value of future cash flows (OPEX savings + carbon credits) minus CAPEX.\n"
        "• **Formula:** NPV = Σ [Cash Flow_t / (1 + r)^t] − CAPEX\n"
        "• **Decision Rule:** NPV > 0 → intervention is financially justified.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "wacc": (
        "### WACC — Weighted Average Cost of Capital\n\n"
        "• **Definition:** Blended cost of debt and equity used to discount future cash flows in a project appraisal.\n"
        "• **Typical Range:** 10–14% for Indian industrial sustainability projects.\n"
        "• **Usage:** IRR must exceed WACC for a green capex project to be approved by the CFO.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "carbon credit": (
        "### Carbon Credit\n\n"
        "• **Definition:** A tradeable certificate representing 1 tonne CO₂e of avoided or removed emissions.\n"
        "• **Indian Market:** Traded on the Indian Carbon Market (ICM) under BEE's PAT scheme; voluntary credits also traded via VERRA/VCS.\n"
        "• **Price Range:** ~₹800–2,500 per tonne CO₂e (varies by project type and vintage).\n"
        "• **EcoLeak:** Circular interventions generate avoided-emission credits claimable under Scope 3 reductions.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
    "avoided emissions": (
        "### Avoided Emissions\n\n"
        "• **Definition:** CO₂e reductions achieved by switching from a high-emission baseline to a lower-emission alternative.\n"
        "• **Formula:** Avoided Emissions = Quantity × (EF_virgin − EF_recycled)\n"
        "• **Example:** 60,000 kg HDPE switch → 60,000 × (2.05 − 0.52) = **91,800 kg CO₂e/month avoided**.\n"
        "• **Standard:** GHG Protocol Scope 3 Category 1 / 11 methodology.\n\n"
        "⚠️ AI can make mistakes. Verify critical calculations independently."
    ),
}


def _lookup_term(query: str) -> Optional[str]:
    """Check if query is a simple 'what is X' definition for a known EcoLeak term."""
    q = query.lower().strip()
    # Strip question prefixes
    for prefix in ("what is", "what's", "whats", "define", "explain", "tell me about", "meaning of", "what does", "mean"):
        q = q.replace(prefix, "").strip(" ?")
    q = q.strip(" ?")
    for term, definition in _TERM_DEFINITIONS.items():
        if term in q or q == term:
            return definition
    return None


def _solve_math_locally(query: str) -> Optional[str]:
    """
    Deterministic rule-based solver for standard emission math when offline or LLM unavailable.
    """
    q = query.lower()

    # Match kWh electricity math: e.g. "calculate 20000 kwh" or "emissions for 50000 kwh"
    kwh_match = re.search(r"(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:kwh|units|units of electricity)", q)
    if kwh_match:
        val_str = kwh_match.group(1).replace(",", "")
        try:
            kwh = float(val_str)
            co2e_kg = kwh * 0.716
            co2e_mt = co2e_kg / 1000.0
            return (
                f"### Scope 2 Electricity Calculation\n\n"
                f"• **Formula:** `Emissions = Consumption (kWh) × 0.716 (CEA India Factor)`\n"
                f"• **Calculation:** `{kwh:,.2f} kWh × 0.716` = **{co2e_kg:,.2f} kg CO₂e**\n"
                f"• **Result:** **{co2e_kg:,.2f} kg CO₂e** (~**{co2e_mt:,.3f} MT CO₂e**)\n\n"
                f"*Source: Central Electricity Authority (CEA) Baseline v19.*\n\n"
                f"⚠️ AI can make mistakes. Verify critical calculations independently."
            )
        except Exception:
            pass

    # Match Diesel math: e.g. "500 liters of diesel" or "diesel 1000 l"
    diesel_match = re.search(r"(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:l|liters|litres)?\s*(?:of\s*)?diesel", q)
    if diesel_match:
        val_str = diesel_match.group(1).replace(",", "")
        try:
            liters = float(val_str)
            co2e_kg = liters * 2.687
            co2e_mt = co2e_kg / 1000.0
            return (
                f"### Scope 1 Diesel Calculation\n\n"
                f"• **Formula:** `Emissions = Volume (L) × 2.687 kg CO₂e/L (IPCC Factor)`\n"
                f"• **Calculation:** `{liters:,.2f} L × 2.687` = **{co2e_kg:,.2f} kg CO₂e**\n"
                f"• **Result:** **{co2e_kg:,.2f} kg CO₂e** (~**{co2e_mt:,.3f} MT CO₂e**)\n\n"
                f"⚠️ AI can make mistakes. Verify critical calculations independently."
            )
        except Exception:
            pass

    # Payback period math: e.g. "capex 500000 opex 100000"
    if "payback" in q:
        capex_m = re.search(r"capex\D*(\d+(?:,\d+)*(?:\.\d+)?)", q)
        opex_m = re.search(r"(?:opex|savings)\D*(\d+(?:,\d+)*(?:\.\d+)?)", q)
        if capex_m and opex_m:
            capex = float(capex_m.group(1).replace(",", ""))
            opex = float(opex_m.group(1).replace(",", ""))
            if opex > 0:
                months = (capex / opex) * 12.0
                years = capex / opex
                return (
                    f"### Payback Period Calculation\n\n"
                    f"• **Formula:** `Payback (Months) = (CAPEX / Annual OPEX Savings) × 12`\n"
                    f"• **Calculation:** `(₹{capex:,.2f} / ₹{opex:,.2f}) × 12` = **{months:.1f} Months** ({years:.2f} Years)\n"
                    f"• **Verdict:** Payback under 18 months qualifies as **High Feasibility Fast Payback**.\n\n"
                    f"⚠️ AI can make mistakes. Verify critical calculations independently."
                )

    return None


def chat_with_assistant(
    message: str,
    history: list[dict] = None,
    context: dict = None,
) -> dict:
    """
    Handle user query with EcoBot, enforcing EcoLeak project & math guardrails.

    Args:
        message: User question string.
        history: Previous conversation history [{'role': 'user'|'assistant', 'content': '...'}]
        context: Optional active plant context (e.g. industry, emissions, recommendations)

    Returns:
        dict: {"response": str, "source": "groq"|"gemini"|"math_solver"|"fallback"}
    """
    if history is None:
        history = []

    # Quick local math solver check for immediate mathematical calculations
    math_ans = _solve_math_locally(message)
    if math_ans:
        return {"response": math_ans, "source": "math_solver"}

    # Local term definition lookup (CAPEX, MSR, OPEX, ROI, etc.)
    term_ans = _lookup_term(message)
    if term_ans:
        return {"response": term_ans, "source": "term_lookup"}

    # Guardrail check for academic physics or school homework
    q_low = message.lower().strip()
    physics_patterns = [
        r"\b(gravity|gravitational|acceleration|velocity|momentum|kinetic energy|potential energy|f\s*=\s*m\s*a|newtons?'?\s*(law|second|first|third|laws)|projectile|photoelectric|schrodinger|electromagnetism|centripetal|optics|lens formula|refraction|diffraction|quantum physics|physics problem|physics question|thermodynamics|entropy|ohm'?s law|coulomb|electromagnetic)\b"
    ]
    for pattern in physics_patterns:
        if re.search(pattern, q_low) and not any(k in q_low for k in ["carbon", "emission", "ecoleak", "scope 1", "scope 2", "scope 3", "waste", "boiler", "kilowatt", "kwh", "plant", "fuel"]):
            return {
                "response": "I am EcoBot, specialized exclusively in industrial emission accounting and environmental compliance for the EcoLeak platform. I do not answer general academic physics or school homework questions.",
                "source": "guardrail",
            }

    # Guardrail check for completely off-topic inputs
    off_topic_patterns = [
        r"\b(recipe|bake|cook|movie|hollywood|bollywood|cricket|football|fifa|minecraft|fortnite|joke|dating|horoscope)\b"
    ]
    for pattern in off_topic_patterns:
        if re.search(pattern, q_low) and not any(k in q_low for k in ["carbon", "emission", "ecoleak", "plant", "waste"]):
            return {
                "response": (
                    "This inquiry falls outside the operational scope of the EcoLeak platform.\n\n"
                    "EcoLeak Assistant is designated for:\n"
                    "• Industrial carbon accounting and emission calculations (Scope 1, Scope 2, Scope 3)\n"
                    "• Statutory compliance verification (CPCB/SPCB Consent to Operate, BRSR Core, ISO 14064)\n"
                    "• Financial payback and circular intervention modeling (CAPEX, OPEX savings, ROI)\n\n"
                    "Please submit an industrial emission query, fuel/energy consumption figure, or compliance inquiry to proceed."
                ),
                "source": "guardrail",
            }

    # Inject active plant context if available
    augmented_system_prompt = SYSTEM_PROMPT
    if context:
        ctx_parts = []
        if context.get("industry"):
            ctx_parts.append(f"Active Facility Industry: {context['industry']}")
        if context.get("total_emissions"):
            ctx_parts.append(f"Current Monthly Emissions: {context['total_emissions']:,} kg CO2e")
        if context.get("reg_category"):
            ctx_parts.append(f"SPCB Compliance Category: {context['reg_category']}")
        if context.get("location"):
            ctx_parts.append(f"Plant Location: {context['location']}")
        if ctx_parts:
            augmented_system_prompt += "\n\nCURRENT AUDIT CONTEXT:\n" + "\n".join(ctx_parts)

    # 1. Try Groq (openai/gpt-oss-120b or configured model)
    if groq_service.is_configured():
        try:
            client = groq_service._get_client()
            if client is not None:
                messages = [{"role": "system", "content": augmented_system_prompt}]
                # Append recent history (up to last 6 turns)
                for turn in history[-6:]:
                    r = turn.get("role", "user")
                    c = turn.get("content", "")
                    if r in {"user", "assistant"} and c:
                        messages.append({"role": r, "content": c})
                messages.append({"role": "user", "content": message})

                resp = client.chat.completions.create(
                    model=groq_service.get_model(),
                    messages=messages,
                    temperature=0.2,
                    max_tokens=600,
                )
                content = (resp.choices[0].message.content or "").strip()
                if content:
                    return {"response": content, "source": f"Groq ({groq_service.get_model()})"}
                else:
                    logger.warning("Groq returned empty content — falling back to Gemini")
        except Exception as groq_err:
            err_msg = str(groq_err)
            if "model output" in err_msg.lower() or "empty" in err_msg.lower() or "finish_reason" in err_msg.lower():
                logger.warning("Groq model returned empty output (likely content-filtered): %s — falling back to Gemini", err_msg)
            else:
                logger.warning("Groq EcoBot chat failed: %s — falling back to Gemini", groq_err)

    # 2. Try Gemini fallback
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
                    return {"response": g_resp.text.strip(), "source": "gemini"}
        except Exception as gemini_err:
            logger.warning("Gemini EcoBot chat failed: %s", gemini_err)

    # 3. Intelligent deterministic fallback if both LLMs are unconfigured or offline
    return {
        "response": (
            f"### Emission Assessment Guidance\n\n"
            f"Regarding **{message.strip()}**:\n\n"
            f"• **Scope 1 (Direct Fuel Combustion):** Calculated as $\\text{{Consumption}} \\times \\text{{EF}}$ (Diesel = 2.687 kg CO₂e/L, LPG = 2.983 kg CO₂e/kg).\n"
            f"• **Scope 2 (Indirect Electricity):** Calculated as $\\text{{kWh}} \\times 0.716\\text{{ kg CO}}_2\\text{{e}}$ (Central Electricity Authority Baseline v19).\n"
            f"• **Scope 3 (Polymers & Materials):** Virgin polymer (~2.10 kg CO₂e/kg) substitution with mechanically recycled PCR (~0.65 kg CO₂e/kg) delivers a **69% emissions reduction**.\n"
            f"• **Simple Payback Period:** $\\text{{Payback (Months)}} = (\\text{{CAPEX}} / \\text{{Annual OPEX Savings}}) \\times 12$.\n\n"
            f"Please specify numeric activity quantities to execute an exact facility calculation."
        ),
        "source": "deterministic_solver",
    }
