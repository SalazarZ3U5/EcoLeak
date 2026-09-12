"""
ChromaDB vector store service.

Manages a persistent local ChromaDB collection for semantic retrieval
of circular economy interventions. Uses deterministic IDs and upsert
to prevent duplicates across server restarts.
"""

from __future__ import annotations

import logging
from typing import Optional

try:
    import chromadb
except ImportError:
    chromadb = None

from backend.services.csv_loader import get_circular_interventions, get_circular_interventions_inr

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------

_client: Optional[object] = None
_collection: Optional[object] = None

CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "circular_interventions"


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

def get_client() -> Optional[object]:
    """Get or create the ChromaDB persistent client."""
    global _client
    if chromadb is None:
        return None
    if _client is None:
        try:
            _client = chromadb.PersistentClient(path=CHROMA_PATH)
            logger.info("ChromaDB client initialized at %s", CHROMA_PATH)
        except Exception as exc:
            logger.warning("Failed to initialize ChromaDB: %s", exc)
            return None
    return _client


def get_collection() -> Optional[object]:
    """Get or create the circular_interventions collection."""
    global _collection
    if chromadb is None:
        return None
    if _collection is None:
        client = get_client()
        if client is None:
            return None
        try:
            _collection = client.get_or_create_collection(name=COLLECTION_NAME)
            logger.info("ChromaDB collection '%s' ready", COLLECTION_NAME)
        except Exception as exc:
            logger.warning("Failed to create collection: %s", exc)
            return None
    return _collection


def sync_collection() -> int:
    """
    Synchronize the ChromaDB collection with circular interventions.

    Uses deterministic IDs (circular_{virgin_material_key}) and upsert
    to prevent duplicates. Returns the number of documents in the collection.
    """
    collection = get_collection()
    if collection is None:
        logger.warning("ChromaDB collection unavailable; skipping sync.")
        return 0

    try:
        df = get_circular_interventions_inr()
    except Exception:
        df = get_circular_interventions()

    documents: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for _, row in df.iterrows():
        virgin_key = str(row["virgin_material_key"]).strip()
        alt_key = str(row["circular_alternative_key"]).strip()
        unit = str(row.get("unit", "kg")).strip()
        virgin_co2e = float(row.get("virgin_co2e_per_unit", row.get("virgin_co2e_per_kg", 0.0)))
        recycled_co2e = float(row.get("recycled_co2e_per_unit", row.get("recycled_co2e_per_kg", 0.0)))
        capex_inr = float(row.get("base_capex_inr", float(row.get("avg_capex_usd", 5000.0)) * 95.0))
        payback = float(row.get("payback_months", 12.0))

        # Rich semantic document for better retrieval
        doc = (
            f"Virgin material: {virgin_key}. "
            f"Circular alternative: {alt_key}. "
            f"Unit: {unit}. "
            f"Virgin emission factor: {virgin_co2e} kg CO2e/{unit}. "
            f"Recycled emission factor: {recycled_co2e} kg CO2e/{unit}. "
            f"CO2e reduction: {round(virgin_co2e - recycled_co2e, 4)} kg CO2e/{unit} saved. "
            f"Estimated base capex INR: {capex_inr}. "
            f"Payback: {payback} months."
        )

        metadata = {
            "virgin_material_key": virgin_key,
            "circular_alternative_key": alt_key,
            "unit": unit,
            "virgin_co2e_per_kg": virgin_co2e,
            "recycled_co2e_per_kg": recycled_co2e,
            "base_capex_inr": capex_inr,
            "avg_capex_usd": round(capex_inr / 95.0, 2),
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
    if collection is None:
        return []

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
        col = get_collection()
        return col.count() if col is not None else 0
    except Exception:
        return 0


def is_ready() -> bool:
    """Check if ChromaDB is initialized and accessible."""
    if chromadb is None:
        return False
    try:
        return get_client() is not None
    except Exception:
        return False
