"""
Gemini AI service for natural language understanding.

Handles:
  - Structured activity extraction from natural language
  - Image/document understanding (equipment photos, bills, invoices)
  - Entity resolution fallback

The LLM is NEVER used for numerical calculations — only for
understanding, extraction, and disambiguation.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = None
_MODEL = "gemini-3.6-flash"


def _get_client():
    """Lazy-initialize the Gemini client."""
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — Gemini features disabled")
        return None

    try:
        from google import genai
        _client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialized (model: %s)", _MODEL)
        return _client
    except Exception as e:
        logger.error("Failed to initialize Gemini client: %s", e)
        return None


def is_configured() -> bool:
    """Check if Gemini API key is available."""
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def _parse_json_response(text: str) -> Optional[dict]:
    """Extract JSON from a Gemini response that may contain markdown fences."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fences
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse JSON from Gemini response: %s", text[:200])
    return None


# ---------------------------------------------------------------------------
# Natural language extraction
# ---------------------------------------------------------------------------

def extract_activities(message: str) -> Optional[dict]:
    """
    Extract structured activities from a natural language description.

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

    prompt = f"""You are an industrial emissions data extractor. Extract structured activity data from the following factory description.

INSTRUCTIONS:
- Identify the industry type
- Extract each resource/material/fuel/energy activity mentioned
- For each activity, extract: name (common name), quantity (number), unit (standard unit)
- Convert "tonnes" to "kg" (1 tonne = 1000 kg)
- Use standard units: "l" for litres, "kWh" for electricity, "kg" for materials, "m3" for natural gas
- Do NOT calculate any emissions — only extract raw activity data
- If a time period is mentioned (monthly, yearly), note the quantity as-is for that period

Return ONLY valid JSON in this exact format:
{{
    "industry": "<industry type>",
    "activities": [
        {{"name": "<activity name>", "quantity": <number>, "unit": "<unit>"}}
    ]
}}

Factory description:
{message}"""

    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
        )
        result = _parse_json_response(response.text)
        if result and "activities" in result:
            logger.info("Gemini extracted %d activities", len(result["activities"]))
            return result
        else:
            logger.warning("Gemini returned invalid extraction format")
            return None
    except Exception as e:
        logger.error("Gemini extraction failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Entity resolution fallback
# ---------------------------------------------------------------------------

def resolve_entity(raw_name: str, known_keys: list[str]) -> Optional[str]:
    """
    Use Gemini to match a raw entity name to one of the known internal keys.

    Returns the matched key or None.
    """
    client = _get_client()
    if client is None:
        return None

    keys_str = ", ".join(known_keys)
    prompt = f"""Match the following material/fuel/energy name to the most appropriate key from the list.

Name to match: "{raw_name}"
Available keys: [{keys_str}]

If none match well, respond with "NONE".
Respond with ONLY the matching key (no explanation, no quotes), or "NONE"."""

    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
        )
        result = response.text.strip().strip('"').strip("'")
        if result == "NONE" or result not in known_keys:
            return None
        return result
    except Exception as e:
        logger.error("Gemini entity resolution failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Image analysis
# ---------------------------------------------------------------------------

def analyze_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[dict]:
    """
    Analyze a factory/equipment image using Gemini vision.

    Returns structured information about identified equipment.
    """
    client = _get_client()
    if client is None:
        return None

    from google.genai import types

    prompt = """Analyze this industrial/factory image. Identify any equipment, machinery, or processes visible.

For each piece of equipment identified, extract:
- equipment_type: internal key (e.g., "diesel_generator", "boiler", "extruder")
- description: brief description
- estimated_capacity: if possible to estimate
- confidence: your confidence level (0.0 to 1.0)
- requires_user_confirmation: always true

Return ONLY valid JSON:
{
    "equipment": [
        {
            "equipment_type": "...",
            "description": "...",
            "estimated_capacity": "...",
            "confidence": 0.0,
            "requires_user_confirmation": true
        }
    ],
    "suggested_activities": [
        {"name": "...", "unit": "..."}
    ]
}"""

    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
        )
        result = _parse_json_response(response.text)
        return result
    except Exception as e:
        logger.error("Gemini image analysis failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Document analysis
# ---------------------------------------------------------------------------

def analyze_document(file_bytes: bytes, mime_type: str = "application/pdf") -> Optional[dict]:
    """
    Extract structured activity data from a document (bill, invoice, report).

    Returns same format as extract_activities.
    """
    client = _get_client()
    if client is None:
        return None

    from google.genai import types

    prompt = """You are an industrial emissions data extractor. Analyze this document (could be an electricity bill, fuel invoice, material purchase order, waste record, or ERP export).

Extract all energy/fuel/material consumption data you can find.

Return ONLY valid JSON:
{
    "document_type": "<type of document>",
    "period": "<billing/reporting period if found>",
    "industry": "<industry if identifiable>",
    "activities": [
        {"name": "<activity/material name>", "quantity": <number>, "unit": "<unit>"}
    ]
}

If no consumption data is found, return:
{"document_type": "unknown", "activities": []}"""

    try:
        response = client.models.generate_content(
            model=_MODEL,
            contents=[
                prompt,
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            ],
        )
        result = _parse_json_response(response.text)
        return result
    except Exception as e:
        logger.error("Gemini document analysis failed: %s", e)
        return None
