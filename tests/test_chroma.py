"""Tests for ChromaDB vector store integration."""

import pytest

from backend.services.chroma_service import (
    sync_collection,
    query_alternatives,
    get_document_count,
    is_ready,
)


@pytest.fixture(scope="module", autouse=True)
def _sync_chroma():
    """Ensure ChromaDB is synced before tests run."""
    sync_collection()


class TestChromaDB:
    """Test 7 — ChromaDB retrieval for all materials."""

    def test_chroma_is_ready(self):
        assert is_ready() is True

    def test_collection_not_empty(self):
        count = get_document_count()
        assert count >= 4, f"Expected at least 4 documents, got {count}"

    def test_retrieve_virgin_hdpe(self):
        results = query_alternatives("virgin_hdpe_plastic", n_results=1)
        assert len(results) >= 1
        meta = results[0]["metadata"]
        assert meta["virgin_material_key"] == "virgin_hdpe_plastic"
        assert meta["circular_alternative_key"] == "recycled_hdpe_flakes"

    def test_retrieve_virgin_pet(self):
        results = query_alternatives("virgin_pet_plastic", n_results=1)
        assert len(results) >= 1
        meta = results[0]["metadata"]
        assert meta["virgin_material_key"] == "virgin_pet_plastic"
        assert meta["circular_alternative_key"] == "rpet_regrind"

    def test_retrieve_virgin_steel(self):
        results = query_alternatives("virgin_steel", n_results=1)
        assert len(results) >= 1
        meta = results[0]["metadata"]
        assert meta["virgin_material_key"] == "virgin_steel"
        assert meta["circular_alternative_key"] == "electric_arc_scrap_steel"

    def test_retrieve_virgin_aluminum(self):
        results = query_alternatives("virgin_aluminum", n_results=1)
        assert len(results) >= 1
        meta = results[0]["metadata"]
        assert meta["virgin_material_key"] == "virgin_aluminum"
        assert meta["circular_alternative_key"] == "recycled_scrap_aluminum"

    def test_metadata_has_numeric_fields(self):
        results = query_alternatives("virgin_hdpe_plastic", n_results=1)
        meta = results[0]["metadata"]
        assert meta["virgin_co2e_per_kg"] in (pytest.approx(1.95), pytest.approx(3.093))
        assert meta["recycled_co2e_per_kg"] in (pytest.approx(0.62), pytest.approx(1.768))
        assert meta["payback_months"] == pytest.approx(8)
