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

SYSTEM_PROMPT = """You are EcoBot, the senior concise industrial sustainability and carbon intelligence assistant for EcoLeak.

CORE DOMAINS:
- Corporate Sustainability & CSR (Section 135 Indian Companies Act 2% net profit mandate, Schedule VII environmental projects, CSR compliance).
- ESG & Statutory Frameworks (SEBI BRSR Core, GHG Protocol Scopes 1-3, ISO 14064, CPCB/SPCB Consent to Operate Red/Orange/Green/White categories).
- Industrial Decarbonization & Circular Economy (virgin vs recycled polymers, heat recovery, process optimization).
- Engineering Math (Payback Period = CAPEX / OPEX Savings * 12 months, CEA Grid Factor = 0.716 kg CO2e/kWh, Diesel = 2.687 kg CO2e/L).

CRITICAL CONCISENESS & FORMATTING RULES:
- BE STRICTLY CONCISE: Limit responses to 2–4 crisp bullet points or short sentences (under 100 words total).
- NEVER produce sprawling multi-table essays or overwhelming walls of text. Deliver immediate, high-impact value.
- For math questions: state the formula, substitute the numbers in one line, and give the final result clearly in bold.
- For conceptual questions: explain the core definition, legal/industry relevance, and practical application directly.
- Maintain a formal, enterprise-grade engineering tone.
"""


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
                f"### Scope 2 Electricity Emission Calculation\n\n"
                f"**Formula:**\n"
                f"$$\\text{{Emissions (kg CO}}_2\\text{{e)}} = \\text{{Consumption (kWh)}} \\times \\text{{Emission Factor (CEA India)}}$$\n\n"
                f"**Calculation:**\n"
                f"- Input Energy: **{kwh:,.2f} kWh**\n"
                f"- CEA Grid Factor: **0.716 kg CO₂e / kWh**\n"
                f"- Direct Math: `{kwh:,.2f} × 0.716` = **{co2e_kg:,.2f} kg CO₂e**\n\n"
                f"**Final Result:**\n"
                f"- **{co2e_kg:,.2f} kg CO₂e** (~**{co2e_mt:,.3f} Metric Tons CO₂e**)\n\n"
                f"*Note: Benchmark derived from Central Electricity Authority (CEA) CO₂ Baseline Database for the Indian Power Grid.*"
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
                f"### Scope 1 Diesel Combustion Calculation\n\n"
                f"**Formula:**\n"
                f"$$\\text{{Emissions (kg CO}}_2\\text{{e)}} = \\text{{Volume (Liters)}} \\times \\text{{Emission Factor (IPCC / DEFRA)}}$$\n\n"
                f"**Calculation:**\n"
                f"- Fuel Consumed: **{liters:,.2f} Liters of Diesel**\n"
                f"- Emission Factor: **2.687 kg CO₂e / Liter**\n"
                f"- Direct Math: `{liters:,.2f} × 2.687` = **{co2e_kg:,.2f} kg CO₂e**\n\n"
                f"**Final Result:**\n"
                f"- **{co2e_kg:,.2f} kg CO₂e** (~**{co2e_mt:,.3f} Metric Tons CO₂e**)"
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
                    f"### Circular Intervention Payback Period Calculation\n\n"
                    f"**Formula:**\n"
                    f"$$\\text{{Payback Period (Months)}} = \\left( \\frac{{\\text{{Capital Investment (CAPEX)}}}}{{\\text{{Annual Recurring Savings (OPEX)}}}} \\right) \\times 12$$\n\n"
                    f"**Calculation:**\n"
                    f"- Upfront CAPEX: **₹{capex:,.2f}**\n"
                    f"- Annual OPEX Savings: **₹{opex:,.2f} / year**\n"
                    f"- Payback in Years: `{capex:,.2f} / {opex:,.2f}` = **{years:.2f} Years**\n"
                    f"- Payback in Months: `{years:.2f} × 12` = **{months:.1f} Months**\n\n"
                    f"**Assessment:**\n"
                    f"Interventions with a payback period under **12–18 months** are classified as **High Feasibility / Fast-Payback Circular Projects**."
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

    # Guardrail check for completely off-topic inputs
    q_low = message.lower().strip()
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
                    max_tokens=280,
                )
                content = resp.choices[0].message.content.strip()
                if content:
                    return {"response": content, "source": f"Groq ({groq_service.get_model()})"}
        except Exception as groq_err:
            logger.warning("Groq EcoBot chat failed: %s, falling back to Gemini", groq_err)

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
