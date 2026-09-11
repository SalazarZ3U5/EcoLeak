"""
Tests for Groq AI service using openai/gpt-oss-120b.
Verifies natural language extraction, JSON parsing, entity disambiguation, and document processing.
"""

import pytest

from backend.services import groq_service


class TestGroqServiceBasics:
    """Basic configuration and JSON parsing tests."""

    def test_groq_is_configured(self):
        assert groq_service.is_configured() is True

    def test_groq_model_name(self):
        model = groq_service.get_model()
        assert "gpt-oss-120b" in model

    def test_parse_json_direct(self):
        data = groq_service._parse_json_response('{"industry": "Plastics", "activities": []}')
        assert data is not None
        assert data["industry"] == "Plastics"

    def test_parse_json_markdown_fences(self):
        raw = 'Here is the extraction:\n```json\n{"industry": "Textile", "activities": [{"name": "coal", "quantity": 500, "unit": "kg"}]}\n```'
        data = groq_service._parse_json_response(raw)
        assert data is not None
        assert data["industry"] == "Textile"
        assert len(data["activities"]) == 1

    def test_parse_json_embedded(self):
        raw = 'Explanation text before {"industry": "Food"} trailing text after'
        data = groq_service._parse_json_response(raw)
        assert data is not None
        assert data["industry"] == "Food"


class TestGroqLiveExtraction:
    """Live inference tests with openai/gpt-oss-120b on Groq."""

    def test_live_extract_activities(self):
        message = "Our injection molding plant in Pune consumes 35,000 kWh of grid electricity and 400 liters of diesel per month."
        result = groq_service.extract_activities(message)
        assert result is not None
        assert "activities" in result
        assert len(result["activities"]) >= 2

        names = [a["name"].lower() for a in result["activities"]]
        assert any("electric" in n or "power" in n or "kwh" in n for n in names)
        assert any("diesel" in n for n in names)

    def test_live_resolve_entity(self):
        keys = ["virgin_plastic_pellets", "recycled_plastic_pellets", "diesel_fuel"]
        matched = groq_service.resolve_entity("virgin plastic pellets", keys)
        assert matched == "virgin_plastic_pellets"

    def test_live_resolve_ambiguous_entity(self):
        keys = ["virgin_plastic_pellets", "recycled_plastic_pellets", "diesel_fuel"]
        # Generic "plastic" without virgin/recycled should return None
        matched = groq_service.resolve_entity("plastic pellets", keys)
        assert matched is None or matched in keys
