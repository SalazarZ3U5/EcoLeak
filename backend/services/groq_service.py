"""
Groq AI service powered by open-source LLMs (e.g. openai/gpt-oss-120b).

Handles:
  - Structured activity extraction from natural language descriptions
  - Document understanding (PDF / invoices / utility bills) via text extraction
  - Entity resolution fallback for disambiguating industrial inputs

Deterministic emission calculations and financial modeling are ALWAYS performed
by local Python engines, never by the LLM.
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = None
_DEFAULT_MODEL = "openai/gpt-oss-120b"


def get_model() -> str:
    """Return the configured Groq model or default."""
    return os.getenv("GROQ_MODEL", "").strip() or _DEFAULT_MODEL


def _get_client():
    """Lazy-initialize the Groq client."""
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.warning("GROQ_API_KEY not set — Groq features disabled")
        return None

    try:
        from groq import Groq
        _client = Groq(api_key=api_key)
        logger.info("Groq client initialized (model: %s)", get_model())
        return _client
    except Exception as e:
        logger.error("Failed to initialize Groq client: %s", e)
        return None


def is_configured() -> bool:
    """Check if Groq API key is available."""
    return bool(os.getenv("GROQ_API_KEY", "").strip())


def _parse_json_response(text: str) -> Optional[dict]:
    """Extract JSON from an LLM response that may contain markdown fences."""
    if not text:
        return None

    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fences
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding the first '{' and last '}'
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse JSON from Groq response: %s", text[:200])
    return None


# ---------------------------------------------------------------------------
# Natural language extraction
# ---------------------------------------------------------------------------

def extract_activities(message: str) -> Optional[dict]:
    """
    Extract structured activities from a natural language description using Groq.

    Returns:
        {
            "industry": "...",
            "activities": [
                {"name": "...", "quantity": ..., "unit": "..."},
                ...
            ]
        }
    or None if extraction fails.
    """
    client = _get_client()
    if client is None:
        return None

    system_prompt = """You are an industrial carbon emissions data extractor.
Your job is to extract structured consumption/activity data from the user's factory operational description.

INSTRUCTIONS:
- Identify the industry classification (e.g., "Plastic manufacturing", "Packaging", "Metal fabrication", "Chemicals", "Textile", "Food processing", or "Other").
- Extract each resource, fuel, energy, or material activity mentioned.
- For each activity, extract:
  - "name": Canonical common industrial name (e.g., "Grid Electricity", "Diesel Fuel", "LPG", "Natural Gas", "Virgin Plastic Pellets", "Virgin HDPE", "Water Supply", "Cardboard Waste").
  - "quantity": Numerical quantity (float/int).
  - "unit": Standard physical unit:
    - "kWh" or "MWh" for electricity
    - "liters" for diesel, petrol, lubricants
    - "kg" or "tonnes" for solid materials, plastics, metals, chemicals, or LPG
    - "m3" for natural gas, water supply, or wastewater
- If quantities are in tonnes, keep the unit as "tonnes" or convert to "kg" (1 tonne = 1000 kg).
- Do NOT calculate emissions or invent factors. Only extract raw activity data.

Return ONLY a valid JSON object in this exact schema:
{
    "industry": "<industry name>",
    "activities": [
        {"name": "<name>", "quantity": <number>, "unit": "<unit>"}
    ]
}"""

    try:
        response = client.chat.completions.create(
            model=get_model(),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        result = _parse_json_response(content)
        if result and "activities" in result:
            logger.info("Groq (%s) extracted %d activities", get_model(), len(result["activities"]))
            return result
        else:
            logger.warning("Groq returned invalid extraction format: %s", content[:150])
            return None
    except Exception as e:
        logger.error("Groq activity extraction failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Entity resolution fallback
# ---------------------------------------------------------------------------

def resolve_entity(raw_name: str, known_keys: list[str]) -> Optional[str]:
    """
    Use Groq to match a raw entity name to one of the known internal keys.
    """
    client = _get_client()
    if client is None:
        return None

    keys_str = ", ".join(known_keys)
    prompt = f"""Match the following industrial material/fuel/energy name to the single most appropriate canonical key from the list.

Name to match: "{raw_name}"
Available keys: [{keys_str}]

RULES:
- If none match well or if ambiguous (e.g. "plastic" without virgin/recycled), respond with "NONE".
- Respond with ONLY the matching key exactly as written in the list, or "NONE".
- Do not include explanation, punctuation, quotes, or markdown."""

    try:
        response = client.chat.completions.create(
            model=get_model(),
            messages=[
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
        )
        result = response.choices[0].message.content.strip().strip('"').strip("'").strip()
        if result == "NONE" or result not in known_keys:
            return None
        return result
    except Exception as e:
        logger.error("Groq entity resolution failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Document analysis
# ---------------------------------------------------------------------------

def analyze_document(file_bytes: bytes, mime_type: str = "application/pdf") -> Optional[dict]:
    """
    Extract structured activity data from an uploaded document (PDF, TXT, CSV, Invoice).
    Uses PyMuPDF (multilingual) for high-fidelity text and table extraction, then parses via Groq.
    """
    client = _get_client()
    if client is None:
        return None

    extracted_text = ""

    # Extract text based on mime type using PyMuPDF (multilingual)
    if "pdf" in mime_type.lower():
        try:
            from backend.services.pdf_parser import extract_pdf_content
            parsed = extract_pdf_content(file_bytes)
            extracted_text = parsed.get("text", "")
            logger.info(
                "Extracted PDF using %s: %d pages, tables=%s, scripts=%s",
                parsed.get("parser"),
                parsed.get("page_count"),
                parsed.get("has_tables"),
                parsed.get("detected_scripts"),
            )
        except Exception as e:
            logger.warning("PyMuPDF extraction note: %s, attempting raw decode fallback", e)
            extracted_text = file_bytes.decode("utf-8", errors="ignore")
    else:
        extracted_text = file_bytes.decode("utf-8", errors="ignore")

    if not extracted_text.strip():
        logger.warning("No readable text could be extracted from document")
        return {"document_type": "unknown", "activities": []}

    # Truncate text if extremely long to fit context
    if len(extracted_text) > 16000:
        extracted_text = extracted_text[:16000]

    system_prompt = """You are an expert industrial carbon auditor. Analyze the following document text (utility invoice, electricity bill, fuel receipt, or ERP dispatch report).

Extract all energy, fuel, water, waste, and material consumption entries.

Return ONLY a valid JSON object in this schema:
{
    "document_type": "<type, e.g. Electricity Bill, Fuel Invoice, Monthly Consumption>",
    "period": "<billing period if found>",
    "industry": "<industry type if identifiable>",
    "activities": [
        {"name": "<activity/fuel/material>", "quantity": <number>, "unit": "<unit>"}
    ]
}"""

    try:
        response = client.chat.completions.create(
            model=get_model(),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document Text:\n{extracted_text}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        result = _parse_json_response(content)
        return result
    except Exception as e:
        logger.error("Groq document analysis failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Image analysis fallback
# ---------------------------------------------------------------------------

def analyze_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[dict]:
    """
    Fallback for image analysis when vision is not supported on the text LLM.
    """
    logger.info("Image analysis requested on Groq text model %s; returning empty result", get_model())
    return {
        "equipment": [],
        "suggested_activities": [],
        "note": f"Direct image parsing is not active on text model {get_model()}."
    }
