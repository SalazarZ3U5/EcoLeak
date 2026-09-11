"""
Hugging Face service for semantic entity matching.

Uses sentence-transformers for local semantic similarity to improve
entity resolution when deterministic matching fails. Lazy-loaded
to avoid blocking startup if the model is unavailable.
"""

from __future__ import annotations

import logging
import os
from typing import Optional, Tuple

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_pipeline = None
_model_loaded = False
_model_load_attempted = False

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_SEMANTIC_THRESHOLD = 0.75


def is_configured() -> bool:
    """Check if HF token is available."""
    return bool(os.getenv("HF_TOKEN", "").strip())


def _load_model():
    """Lazy-load the sentence transformer model."""
    global _pipeline, _model_loaded, _model_load_attempted

    if _model_load_attempted:
        return _model_loaded

    _model_load_attempted = True

    hf_token = os.getenv("HF_TOKEN", "").strip()
    if not hf_token:
        logger.warning("HF_TOKEN not set — HF semantic matching disabled")
        return False

    try:
        from transformers import pipeline
        _pipeline = pipeline(
            "feature-extraction",
            model=MODEL_NAME,
            token=hf_token,
        )
        _model_loaded = True
        logger.info("Loaded HF model: %s", MODEL_NAME)
        return True
    except Exception as e:
        logger.warning("Failed to load HF model '%s': %s", MODEL_NAME, e)
        return False


def match_with_score(query: str, candidates: list[str]) -> Tuple[Optional[str], float]:
    """
    Compute cosine similarity between query and all candidate embeddings.
    Returns (best_candidate, score).
    """
    if not candidates or not _load_model() or _pipeline is None:
        return None, 0.0

    try:
        import torch

        # Get embeddings
        query_emb = _pipeline(query, return_tensors=True)
        # Mean pooling over tokens
        query_vec = query_emb[0].clone().detach().mean(dim=0)

        best_score = -1.0
        best_candidate = None

        for candidate in candidates:
            cand_emb = _pipeline(candidate, return_tensors=True)
            cand_vec = cand_emb[0].clone().detach().mean(dim=0)

            # Cosine similarity
            similarity = torch.nn.functional.cosine_similarity(
                query_vec.unsqueeze(0),
                cand_vec.unsqueeze(0),
            ).item()

            if similarity > best_score:
                best_score = similarity
                best_candidate = candidate

        return best_candidate, float(best_score)

    except Exception as e:
        logger.error("HF semantic matching failed: %s", e)
        return None, 0.0


def semantic_match(query: str, candidates: list[str], threshold: float = DEFAULT_SEMANTIC_THRESHOLD) -> Optional[str]:
    """
    Find the best semantic match for a query among candidates.

    Uses cosine similarity between sentence embeddings.
    Returns the best matching candidate, or None if below threshold.
    """
    best_candidate, best_score = match_with_score(query, candidates)

    if best_score >= threshold and best_candidate is not None:
        logger.debug(
            "HF semantic match: '%s' → '%s' (score: %.3f)",
            query, best_candidate, best_score,
        )
        return best_candidate

    logger.debug(
        "HF semantic match: no match above threshold %.2f for '%s' (best: %.3f for '%s')",
        threshold, query, best_score, best_candidate,
    )
    return None
