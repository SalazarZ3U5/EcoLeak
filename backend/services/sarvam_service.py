"""
Sarvam AI DocAgent Service for Indic Language Document Parsing.

Leverages Sarvam AI's Document AI (powered by Sarvam Vision 1.5) to parse
and extract consumption activity entries from Indian language utility bills,
fuel invoices, and material receipts (Hindi, Marathi, Gujarati, Tamil, Telugu,
Bengali, Kannada, Malayalam, Punjabi, Odia, etc.).

Falls back seamlessly to PyMuPDF (pymupdf) when unconfigured, non-Indic,
or if network/API limits occur.
"""

from __future__ import annotations

import json
import logging
import os
import time
import unicodedata
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SARVAM_DOC_AI_EXTRACT_URL = "https://api.sarvam.ai/doc-ai/v1/job/extract"
SARVAM_DOC_AI_DIGITISE_URL = "https://api.sarvam.ai/doc-ai/v1/job/digitise"
SARVAM_DOC_AI_STATUS_URL = "https://api.sarvam.ai/doc-ai/v1/job/{job_id}/status"
SARVAM_DOC_AI_RESULTS_URL = "https://api.sarvam.ai/doc-ai/v1/job/{job_id}/results"
SARVAM_DOC_AI_DOWNLOAD_URL = "https://api.sarvam.ai/doc-ai/v1/job/{job_id}/download-url"

# Supported Indic languages mapping: code -> human label
INDIC_LANGUAGES: dict[str, str] = {
    "hi-IN": "Hindi (हिन्दी)",
    "mr-IN": "Marathi (मराठी)",
    "gu-IN": "Gujarati (ગુજરાતી)",
    "ta-IN": "Tamil (தமிழ்)",
    "te-IN": "Telugu (తెలుగు)",
    "bn-IN": "Bengali (বাংলা)",
    "kn-IN": "Kannada (ಕನ್ನಡ)",
    "ml-IN": "Malayalam (മലയാളം)",
    "pa-IN": "Punjabi (ਪੰਜਾਬੀ)",
    "od-IN": "Odia (ଓଡ଼ିଆ)",
    "as-IN": "Assamese (অসমীয়া)",
    "en-IN": "Indian English",
}

# Indic Unicode script names recognized by unicodedata
INDIC_SCRIPTS = {
    "DEVANAGARI",
    "BENGALI",
    "GURMUKHI",
    "GUJARATI",
    "ORIYA",
    "TAMIL",
    "TELUGU",
    "KANNADA",
    "MALAYALAM",
}

# Target extraction schema for Sarvam DocAgent Extract
ECOLEAK_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "industry": {
            "type": "string",
            "description": "The industrial sector or plant type, e.g. Plastic manufacturing, Textile, Chemical, Steel/Metal fabrication, Food processing",
        },
        "document_type": {
            "type": "string",
            "description": "Document classification such as Electricity Bill, Diesel Receipt, Fuel Invoice, Raw Material Purchase Order, Waste Manifest",
        },
        "period": {
            "type": "string",
            "description": "Billing period or invoice date mentioned in the document",
        },
        "activities": {
            "type": "array",
            "description": "List of resource, energy, fuel, raw material, or waste consumption entries found in the document",
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Common industrial name of the material, fuel, or energy (e.g. Grid Electricity, Diesel Fuel, LPG, Natural Gas, Virgin HDPE, Packaging)",
                    },
                    "quantity": {
                        "type": "number",
                        "description": "Numerical quantity consumed or purchased",
                    },
                    "unit": {
                        "type": "string",
                        "description": "Standard physical unit: kWh, liters, kg, tonnes, or m3",
                    },
                },
                "required": ["name", "quantity", "unit"],
            },
        },
    },
    "required": ["activities"],
}


def get_api_key(api_key: Optional[str] = None) -> str:
    """Resolve Sarvam API key from argument or environment."""
    if api_key and api_key.strip():
        return api_key.strip()
    return os.getenv("SARVAM_API_KEY", "").strip()


def is_configured(api_key: Optional[str] = None) -> bool:
    """Check if a valid Sarvam API key is available."""
    return bool(get_api_key(api_key))


def is_indic_script(text: str) -> bool:
    """
    Detect whether text contains Unicode characters from Indic scripts
    (Devanagari, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Gurmukhi, Oriya).
    """
    if not text:
        return False

    for ch in text:
        name = unicodedata.name(ch, "")
        if name:
            script = name.split()[0]
            if script in INDIC_SCRIPTS:
                return True
    return False


def detect_indic_language_hint(text: str) -> str:
    """
    Inspect text sample and return a recommended Indic language code hint,
    defaulting to 'hi-IN' (Hindi / Devanagari) if Indic characters are detected.
    """
    if not text:
        return "hi-IN"

    script_counts: dict[str, int] = {}
    for ch in text:
        name = unicodedata.name(ch, "")
        if name:
            parts = name.split()
            script = parts[0]
            if script in INDIC_SCRIPTS:
                script_counts[script] = script_counts.get(script, 0) + 1

    if not script_counts:
        return "hi-IN"

    top_script = max(script_counts, key=script_counts.get)
    script_to_lang = {
        "DEVANAGARI": "hi-IN",
        "GUJARATI": "gu-IN",
        "TAMIL": "ta-IN",
        "TELUGU": "te-IN",
        "BENGALI": "bn-IN",
        "KANNADA": "kn-IN",
        "MALAYALAM": "ml-IN",
        "GURMUKHI": "pa-IN",
        "ORIYA": "od-IN",
    }
    return script_to_lang.get(top_script, "hi-IN")


def parse_with_sarvam_docagent(
    file_bytes: bytes,
    filename: str = "document.pdf",
    mime_type: str = "application/pdf",
    language: Optional[str] = None,
    api_key: Optional[str] = None,
    poll_timeout_seconds: int = 40,
) -> Optional[dict]:
    """
    Parse an Indian language document using Sarvam AI's DocAgent Extract API.

    Args:
        file_bytes: Raw binary bytes of uploaded file.
        filename: Original file name.
        mime_type: MIME type of the uploaded file.
        language: Language code (e.g. 'hi-IN', 'mr-IN', 'gu-IN', etc.).
        api_key: Optional custom API subscription key.
        poll_timeout_seconds: Maximum time to wait for the asynchronous job.

    Returns:
        Structured dict with 'industry', 'document_type', 'activities', and 'parser',
        or None if parsing failed (allowing PyMuPDF fallback).
    """
    key = get_api_key(api_key)
    if not key:
        logger.debug("Sarvam API key not set — skipping Sarvam DocAgent")
        return None

    import httpx

    target_lang = language if language and language in INDIC_LANGUAGES else "hi-IN"
    headers = {
        "api-subscription-key": key,
    }

    # Ensure filename has an appropriate extension
    if not filename:
        filename = "document.pdf"
    if "." not in filename:
        ext = ".pdf" if "pdf" in mime_type else ".png"
        filename = f"{filename}{ext}"

    logger.info(
        "Submitting file '%s' (%d bytes) to Sarvam DocAgent Extract (language: %s)",
        filename,
        len(file_bytes),
        target_lang,
    )

    try:
        # Step 1: Submit extract job
        with httpx.Client(timeout=30.0) as client:
            files = {
                "file": (filename, file_bytes, mime_type),
            }
            data = {
                "schema": json.dumps(ECOLEAK_EXTRACTION_SCHEMA),
                "language": target_lang,
                "output_format": "json",
            }

            resp = client.post(
                SARVAM_DOC_AI_EXTRACT_URL,
                headers=headers,
                files=files,
                data=data,
            )

            if resp.status_code != 200:
                logger.warning(
                    "Sarvam DocAgent job submission returned status %d: %s",
                    resp.status_code,
                    resp.text[:300],
                )
                return None

            job_data = resp.json()
            job_id = job_data.get("job_id")
            if not job_id:
                logger.warning("Sarvam DocAgent returned no job_id: %s", job_data)
                return None

            logger.info("Sarvam DocAgent job created: %s. Polling for results...", job_id)

            # Step 2: Poll for job completion
            terminal_states = {"completed", "partially_completed", "failed", "rejected"}
            start_time = time.time()
            status_url = SARVAM_DOC_AI_STATUS_URL.format(job_id=job_id)

            while time.time() - start_time < poll_timeout_seconds:
                time.sleep(2.5)
                st_resp = client.get(status_url, headers=headers)
                if st_resp.status_code != 200:
                    logger.warning("Sarvam status check returned %d: %s", st_resp.status_code, st_resp.text[:200])
                    continue

                st_data = st_resp.json()
                current_status = str(st_data.get("status", "")).lower()

                if current_status in ("completed", "partially_completed"):
                    logger.info("Sarvam DocAgent job %s reached status: %s", job_id, current_status)
                    break
                elif current_status in ("failed", "rejected"):
                    logger.warning("Sarvam DocAgent job %s finished with status: %s", job_id, current_status)
                    return None

            # Step 3: Retrieve extracted results
            results_url = SARVAM_DOC_AI_RESULTS_URL.format(job_id=job_id)
            res_resp = client.get(results_url, headers=headers)
            if res_resp.status_code != 200:
                logger.warning("Sarvam get_results returned %d: %s", res_resp.status_code, res_resp.text[:200])
                return None

            res_payload = res_resp.json()
            extracted_result = res_payload.get("result", {})

            # Clean and validate activities list
            raw_activities = extracted_result.get("activities", [])
            valid_activities: list[dict] = []
            for act in raw_activities:
                if isinstance(act, dict) and "name" in act and "quantity" in act:
                    try:
                        valid_activities.append({
                            "name": str(act["name"]).strip(),
                            "quantity": float(act["quantity"]),
                            "unit": str(act.get("unit", "kg")).strip() or "kg",
                        })
                    except (ValueError, TypeError):
                        continue

            if not valid_activities:
                logger.warning("Sarvam DocAgent returned empty or unparseable activities")
                return None

            return {
                "document_type": extracted_result.get("document_type", "Industrial Document"),
                "period": extracted_result.get("period", ""),
                "industry": extracted_result.get("industry", "Other"),
                "activities": valid_activities,
                "parser": f"Sarvam-DocAgent-v1.5 ({target_lang})",
            }

    except Exception as e:
        logger.error("Sarvam DocAgent parsing error: %s (falling back to PyMuPDF)", e)
        return None

