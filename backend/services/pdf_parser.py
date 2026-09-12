"""
Multilingual PDF parsing service powered by PyMuPDF (pymupdf).

Extracts text, structured table grids, and metadata from industrial utility bills,
electricity receipts, fuel manifests, and emission ledgers across multiple languages
(English, Hindi, Marathi, Gujarati, German, Chinese, etc.) with Unicode normalization.
"""

from __future__ import annotations

import logging
import unicodedata
from typing import Optional

logger = logging.getLogger(__name__)


def extract_pdf_content(file_bytes: bytes) -> dict:
    """
    Extract multilingual text, tabular matrices, and layout metadata from PDF bytes using PyMuPDF.

    Args:
        file_bytes: Raw binary bytes of uploaded PDF.

    Returns:
        dict with:
            - text: Clean normalized full-text string
            - page_count: Total pages processed
            - has_tables: True if structured tables were detected
            - tables: Extracted table grids (rows of cell strings)
            - detected_scripts: List of Unicode scripts detected (e.g. Latin, Devanagari, etc.)
            - parser: "PyMuPDF-v1.28.2 (Multilingual Unicode)"
    """
    try:
        import pymupdf
    except ImportError:
        logger.warning("PyMuPDF (pymupdf) not found, falling back to basic extraction.")
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = "".join(p.extract_text() or "" for p in reader.pages)
            return {
                "text": unicodedata.normalize("NFKC", text),
                "page_count": len(reader.pages),
                "has_tables": False,
                "tables": [],
                "detected_scripts": ["Latin"],
                "parser": "pypdf-fallback",
            }
        except Exception as e:
            logger.error("All PDF extractors failed: %s", e)
            return {
                "text": file_bytes.decode("utf-8", errors="ignore"),
                "page_count": 1,
                "has_tables": False,
                "tables": [],
                "detected_scripts": [],
                "parser": "utf8-raw-fallback",
            }

    doc = None
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)
        full_text_parts: list[str] = []
        all_tables: list[list[list[str]]] = []
        scripts_found = set()

        for page_idx, page in enumerate(doc):
            # 1. Extract raw text with Unicode layout preservation
            page_text = page.get_text("text") or ""
            # Normalize Unicode characters (handles Hindi/Marathi matras, accents, symbols)
            normalized_text = unicodedata.normalize("NFKC", page_text)

            # Detect scripts present in text
            for ch in normalized_text[:500]:
                u_name = unicodedata.name(ch, "")
                if u_name:
                    parts = u_name.split()
                    if parts:
                        script_name = parts[0]
                        if script_name in {
                            "DEVANAGARI", "LATIN", "CYRILLIC", "ARABIC", "CJK",
                            "TAMIL", "GUJARATI", "BENGALI", "TELUGU", "KANNADA",
                            "MALAYALAM", "GURMUKHI", "ORIYA"
                        }:
                            scripts_found.add(script_name)

            # 2. Extract structured table matrices (crucial for utility bills & consumption tariffs)
            try:
                table_finder = page.find_tables()
                if table_finder and table_finder.tables:
                    for table in table_finder.tables:
                        extracted_table = table.extract()
                        if extracted_table:
                            # Clean up cells
                            cleaned_table = [
                                [unicodedata.normalize("NFKC", str(cell or "").strip()) for cell in row]
                                for row in extracted_table
                            ]
                            all_tables.append(cleaned_table)

                            # Append formatted table representation to text for LLM consumption
                            full_text_parts.append(f"\n--- [PAGE {page_idx + 1} TABLE DATA] ---")
                            for row in cleaned_table:
                                full_text_parts.append(" | ".join(row))
            except Exception as table_err:
                logger.debug("Table detection skip on page %d: %s", page_idx + 1, table_err)

            full_text_parts.append(normalized_text)

        combined_text = "\n".join(full_text_parts).strip()

        return {
            "text": combined_text,
            "page_count": page_count,
            "has_tables": len(all_tables) > 0,
            "tables": all_tables,
            "detected_scripts": list(scripts_found),
            "parser": f"PyMuPDF-{pymupdf.__version__} (Multilingual)",
        }

    except Exception as e:
        logger.error("PyMuPDF document extraction failed: %s", e)
        # Fallback decode
        return {
            "text": file_bytes.decode("utf-8", errors="ignore"),
            "page_count": 1,
            "has_tables": False,
            "tables": [],
            "detected_scripts": [],
            "parser": "utf8-raw-fallback",
        }
    finally:
        if doc is not None:
            try:
                doc.close()
            except Exception:
                pass


def extract_text_multilingual(file_bytes: bytes, mime_type: str = "application/pdf") -> str:
    """
    Convenience helper to extract clean, multilingual text from any supported file.
    """
    if "pdf" in mime_type.lower():
        result = extract_pdf_content(file_bytes)
        return result.get("text", "")
    try:
        return unicodedata.normalize("NFKC", file_bytes.decode("utf-8", errors="ignore"))
    except Exception:
        return ""


def has_indic_scripts(file_bytes: bytes) -> tuple[bool, list[str]]:
    """
    Quickly detect if a PDF document contains Indian scripts.

    Returns:
        (is_indic, list_of_detected_indic_scripts)
    """
    try:
        content = extract_pdf_content(file_bytes)
        scripts = content.get("detected_scripts", [])
        indic_set = {
            "DEVANAGARI", "TAMIL", "GUJARATI", "BENGALI", "TELUGU",
            "KANNADA", "MALAYALAM", "GURMUKHI", "ORIYA"
        }
        found_indic = [s for s in scripts if s in indic_set]
        return (len(found_indic) > 0, found_indic)
    except Exception as e:
        logger.debug("Failed checking Indic scripts: %s", e)
        return (False, [])
