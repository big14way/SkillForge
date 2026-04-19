"""`show_memory` tool — reads an agent's aggregated state from the indexer.

This is the Week 3 fallback for the full 0G Storage KV read path. The
indexer's `/api/agents/:address` endpoint already aggregates skills_created,
skills_rented, total_earned, total_spent, recent rentals as creator and
renter, and first/last activity timestamps — which is most of what
`MemoryService.getReputation()` + `getHistory()` would return over KV.

When the KV read node comes back online, `show_memory` gains an additional
block for the KV-held profile + per-invocation memory. The indexer data
remains the primary source (reputation is more reliable derived from events
than self-reported).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .indexer import IndexerClient, RentalRow


@dataclass
class MemoryView:
    agent: dict[str, Any]
    recent_as_creator: list[RentalRow]
    recent_as_renter: list[RentalRow]
    mode: str  # always "indexer-fallback" in Week 3
    note: str


def show_memory(
    address: str, *, client: IndexerClient | None = None
) -> MemoryView:
    owner = client or IndexerClient()
    try:
        agent, as_renter, as_creator = owner.get_agent(address)
    finally:
        if client is None:
            owner.close()

    return MemoryView(
        agent=agent.model_dump(),
        recent_as_creator=as_creator,
        recent_as_renter=as_renter,
        mode="indexer-fallback",
        note=(
            "Reading from the SkillForge indexer. Per-invocation memory via 0G "
            "Storage KV comes online when Galileo's KV read node is reachable "
            "again (tracked in WEEK2_DELIVERABLES.md)."
        ),
    )
