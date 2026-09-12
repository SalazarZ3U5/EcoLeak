"""
Leak-point & emission hotspot detection engine.

Implements Pareto (80/20 rule) cumulative contribution analysis and
significance thresholding to detect both primary and distributed emission hotspots.
"""

from __future__ import annotations

import logging

from backend.models.schemas import EmissionResult

logger = logging.getLogger(__name__)


def detect_leak_points(emissions: list[EmissionResult]) -> list[EmissionResult]:
    """
    Annotate emissions with share_percent, cumulative_percent, is_leak_point, and hotspot_tier.

    Algorithm:
      1. Filter to resolved emissions with positive CO2e.
      2. Sort descending by absolute CO2e.
      3. Compute individual percentage share and running cumulative share.
      4. Classify hotspots:
         - Primary Hotspot ('high'): Individual share >= max(20.0%, 1.25 * uniform_baseline).
         - Secondary Hotspot ('medium'): Contributes to top 80% cumulative Pareto boundary
           and exceeds 12.0% share.
         - Normal ('low'): Below significance threshold.

    Returns a new sorted list of annotated EmissionResults.
    """
    resolved = [e for e in emissions if e.status == "resolved" and e.co2e_kg > 0]

    if not resolved:
        logger.warning("No resolved emissions to detect leak points from")
        return []

    total_co2e = sum(e.co2e_kg for e in resolved)

    if total_co2e <= 0:
        logger.warning("Total CO2e is zero or negative, cannot compute shares")
        return resolved

    # Sort descending by CO2e
    resolved.sort(key=lambda e: e.co2e_kg, reverse=True)

    n = len(resolved)
    uniform_share = 100.0 / n if n > 0 else 100.0
    primary_cutoff = max(20.0, uniform_share * 1.25)

    cumulative = 0.0
    annotated: list[EmissionResult] = []

    for emission in resolved:
        share = round((emission.co2e_kg / total_co2e) * 100, 2)
        cumulative = round(cumulative + share, 2)

        # Hotspot classification
        if share >= primary_cutoff:
            is_leak = True
            tier = "high"
        elif cumulative <= 80.0 or (cumulative - share < 80.0 and share >= 12.0):
            is_leak = True
            tier = "medium"
        else:
            is_leak = False
            tier = "low"

        annotated.append(emission.model_copy(update={
            "share_percent": share,
            "is_leak_point": is_leak,
            "hotspot_tier": tier,
            "diagnostic": f"{emission.raw_name or emission.activity_key} accounts for {share}% of your entire plant carbon footprint.",
        }))

    leak_count = sum(1 for e in annotated if e.is_leak_point)
    logger.info(
        "Pareto Hotspot Detection: %d activities, total %.1f kg CO2e, %d hotspots detected",
        len(annotated), total_co2e, leak_count,
    )

    return annotated


def get_total_emissions(emissions: list[EmissionResult]) -> float:
    """Sum of CO2e from all resolved emissions."""
    return sum(e.co2e_kg for e in emissions if e.status == "resolved")
