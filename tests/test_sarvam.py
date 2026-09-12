"""
Tests for Sarvam AI DocAgent integration and PyMuPDF fallback.
"""

import json
from unittest.mock import patch, MagicMock
import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.services import sarvam_service
from backend.services.pdf_parser import has_indic_scripts, extract_pdf_content


class TestSarvamService:
    """Test unit functionality of sarvam_service."""

    def test_is_indic_script_detection(self):
        # Hindi / Devanagari
        assert sarvam_service.is_indic_script("बिजली बिल विवरण - 15000 kWh") is True
        # Marathi / Devanagari
        assert sarvam_service.is_indic_script("महाराष्ट्र राज्य विद्युत वितरण") is True
        # Gujarati
        assert sarvam_service.is_indic_script("ગુજરાત ઉર્જા વિકાસ નિગમ") is True
        # Tamil
        assert sarvam_service.is_indic_script("மின்சார வாரியம் சென்னை") is True
        # Bengali
        assert sarvam_service.is_indic_script("পশ্চিমবঙ্গ বিদ্যুৎ পর্ষদ") is True
        # English / Latin
        assert sarvam_service.is_indic_script("Electricity Bill Invoice 24500 kWh") is False
        # Empty
        assert sarvam_service.is_indic_script("") is False

    def test_detect_indic_language_hint(self):
        assert sarvam_service.detect_indic_language_hint("बिजली बिल") == "hi-IN"
        assert sarvam_service.detect_indic_language_hint("ગુજરાત ગેસ") == "gu-IN"
        assert sarvam_service.detect_indic_language_hint("தமிழ்நாடு மின்சாரம்") == "ta-IN"
        assert sarvam_service.detect_indic_language_hint("Pure English") == "hi-IN"

    def test_is_configured(self):
        with patch.dict("os.environ", {"SARVAM_API_KEY": ""}):
            assert sarvam_service.is_configured() is False
            assert sarvam_service.is_configured("custom-key-123") is True
        with patch.dict("os.environ", {"SARVAM_API_KEY": "env-key-456"}):
            assert sarvam_service.is_configured() is True

    def test_parse_with_sarvam_docagent_missing_key(self):
        # Should return None when key is missing, triggering fallback
        result = sarvam_service.parse_with_sarvam_docagent(
            file_bytes=b"dummy pdf bytes",
            api_key="",
        )
        assert result is None

    @patch("httpx.Client")
    def test_parse_with_sarvam_docagent_success(self, mock_client_cls):
        # Mock successful Sarvam DocAgent job submission, polling, and results
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client

        # 1. Post job -> returns job_id
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {"job_id": "sarvam-test-job-999", "status": "pending"}
        mock_client.post.return_value = mock_post_resp

        # 2. Get status -> returns completed
        mock_status_resp = MagicMock()
        mock_status_resp.status_code = 200
        mock_status_resp.json.return_value = {"status": "completed"}

        # 3. Get results -> returns structured activities
        mock_results_resp = MagicMock()
        mock_results_resp.status_code = 200
        mock_results_resp.json.return_value = {
            "result": {
                "industry": "Textile",
                "document_type": "Electricity Bill",
                "activities": [
                    {"name": "Grid Electricity", "quantity": 12000, "unit": "kWh"},
                    {"name": "Diesel Fuel", "quantity": 400, "unit": "liters"},
                ],
            }
        }

        mock_client.get.side_effect = [mock_status_resp, mock_results_resp]

        result = sarvam_service.parse_with_sarvam_docagent(
            file_bytes=b"%PDF-1.4 dummy",
            filename="test_bill.pdf",
            mime_type="application/pdf",
            language="hi-IN",
            api_key="valid-test-key",
            poll_timeout_seconds=5,
        )

        assert result is not None
        assert result["industry"] == "Textile"
        assert len(result["activities"]) == 2
        assert result["activities"][0]["name"] == "Grid Electricity"
        assert result["activities"][0]["quantity"] == 12000.0
        assert "Sarvam-DocAgent" in result["parser"]


class TestPyMuPDFFallback:
    """Test PyMuPDF parser and fallback behavior."""

    def test_has_indic_scripts(self):
        # Non-PDF or plain bytes returns False safely
        is_indic, scripts = has_indic_scripts(b"plain non pdf text")
        assert isinstance(is_indic, bool)
        assert isinstance(scripts, list)

    def test_analyze_document_with_fallback(self):
        """When Sarvam AI is unconfigured or fails, /api/analyze/document falls back to PyMuPDF."""
        client = TestClient(app)

        # Create a sample text file acting as an invoice
        file_content = (
            "INVOICE\n"
            "Company: Shanti Textiles Pvt Ltd\n"
            "Grid Electricity Consumption: 15000 kWh\n"
            "Diesel Genset Fuel: 500 liters\n"
        ).encode("utf-8")

        response = client.post(
            "/api/analyze/document",
            files={"file": ("invoice.txt", file_content, "text/plain")},
            data={"industry": "Textiles", "language": "hi-IN"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "facility_summary" in data
        assert "warnings" in data
        # Check that warnings note either PyMuPDF fallback or document parsing
        combined_warnings = " ".join(data["warnings"])
        assert any(term in combined_warnings for term in ["PyMuPDF", "Sarvam", "fallback", "Document"])

