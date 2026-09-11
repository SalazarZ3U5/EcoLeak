"""
ChromaDB vector store service.

Manages a persistent local ChromaDB collection for semantic retrieval
of circular economy interventions. Uses deterministic IDs and upsert
to prevent duplicates across server restarts.
"""

from __future__ import annotations

import logging
from typing import Optional

import chromadb

from backend.services.csv_loader import get_circular_interventions

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------

_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None

CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "circular_interventions"


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

def get_client() -> chromadb.PersistentClient:
    """Get or create the ChromaDB persistent client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        logger.info("ChromaDB client initialized at %s", CHROMA_PATH)
    return _client


def get_collection() -> chromadb.Collection:
    """Get or create the circular_interventions collection."""
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(name=COLLECTION_NAME)
        logger.info("ChromaDB collection '%s' ready", COLLECTION_NAME)
    return _collection


def sync_collection() -> int:
    """
    Synchronize the ChromaDB collection with circular_interventions.csv.

    Uses deterministic IDs (circular_{virgin_material_key}) and upsert
    to prevent duplicates. Returns the number of documents in the collection.
    """
    df = get_circular_interventions()
    collection = get_collection()

    documents: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for _, row in df.iterrows():
        virgin_key = row["virgin_material_key"]
        alt_key = row["circular_alternative_key"]
        virgin_co2e = float(row["virgin_co2e_per_kg"])
        recycled_co2e = float(row["recycled_co2e_per_kg"])
        capex = float(row["avg_capex_usd"])
        payback = float(row["payback_months"])

        # Rich semantic document for better retrieval
        doc = (
            f"Virgin material: {virgin_key}. "
            f"Circular alternative: {alt_key}. "
            f"Virgin emission factor: {virgin_co2e} kg CO2e/kg. "
            f"Recycled emission factor: {recycled_co2e} kg CO2e/kg. "
            f"CO2e reduction: {round(virgin_co2e - recycled_co2e, 2)} kg CO2e/kg saved. "
            f"Estimated capex: USD {capex}. "
            f"Payback: {payback} months."
        )

        metadata = {
            "virgin_material_key": virgin_key,
            "circular_alternative_key": alt_key,
            "virgin_co2e_per_kg": virgin_co2e,
            "recycled_co2e_per_kg": recycled_co2e,
            "avg_capex_usd": capex,
            "payback_months": payback,
        }

        doc_id = f"circular_{virgin_key}"

        documents.append(doc)
        metadatas.append(metadata)
        ids.append(doc_id)

    # Upsert to prevent duplicates
    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids,
    )

    count = collection.count()
    logger.info("ChromaDB collection synced: %d documents", count)
    return count


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def query_alternatives(
    query_text: str,
    n_results: int = 3,
) -> list[dict]:
    """
    Query the ChromaDB collection for circular alternatives.

    Args:
        query_text: Material name or description to search for
        n_results: Maximum number of results to return

    Returns:
        List of dicts with document, metadata, and distance
    """
    collection = get_collection()

    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty, syncing first")
        sync_collection()

    results = collection.query(
        query_texts=[query_text],
        n_results=min(n_results, collection.count()),
    )

    alternatives: list[dict] = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            alt = {
                "document": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else None,
            }
            alternatives.append(alt)

    return alternatives


def get_document_count() -> int:
    """Return the number of documents in the collection."""
    try:
        return get_collection().count()
    except Exception:
        return 0


def is_ready() -> bool:
    """Check if ChromaDB is initialized and accessible."""
    try:
        get_client()
        return True
    except Exception:
        return False
