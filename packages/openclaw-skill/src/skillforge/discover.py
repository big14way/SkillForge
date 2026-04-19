"""`discover_skills` tool — the entry point most agents will use first."""

from __future__ import annotations

from typing import Any

from .indexer import IndexerClient, SkillRow


def discover_skills(
    *,
    category: str | None = None,
    min_quality: int = 0,
    limit: int = 10,
    client: IndexerClient | None = None,
) -> list[SkillRow]:
    """Return up to `limit` skills sorted by descending quality score.

    `min_quality` filters client-side (the indexer API doesn't support it yet).
    Supply your own `IndexerClient` for testing / DI.
    """
    owner_client = client or IndexerClient()
    try:
        skills = owner_client.list_skills(category=category, sort="quality", limit=limit)
    finally:
        if client is None:
            owner_client.close()
    return [s for s in skills if s.qualityScore >= min_quality]


def discover_to_dict(skills: list[SkillRow]) -> list[dict[str, Any]]:
    """Agent-host-friendly serialization used by the OpenClaw tool wrapper."""
    return [s.model_dump() for s in skills]
