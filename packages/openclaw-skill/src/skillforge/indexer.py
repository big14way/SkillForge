"""Thin HTTP client for the SkillForge indexer.

We intentionally don't depend on web3.py for reads — every discover/list call
already goes through the indexer, so httpx is enough and keeps the install
footprint small.
"""

from __future__ import annotations

from typing import Any

import httpx
from pydantic import BaseModel

from .config import Config


class SkillRow(BaseModel):
    tokenId: str
    creator: str
    name: str
    description: str
    category: str
    pricePerUse: str
    qualityScore: int
    totalRentals: int
    storageURI: str
    dataHash: str
    isActive: bool
    createdAt: int
    updatedAt: int


class RentalRow(BaseModel):
    rentalId: str
    skillTokenId: str
    renter: str
    creator: str
    amount: str
    state: str
    workProofHash: str | None = None
    qualityScore: int | None = None
    createdAt: int
    completedAt: int | None = None


class AgentRow(BaseModel):
    address: str
    skillsCreated: int
    skillsRented: int
    totalEarned: str
    totalSpent: str
    avgQualityScoreAsCreator: int | None = None
    firstSeenAt: int
    lastActiveAt: int


class IndexerClient:
    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config.from_env()
        self._client = httpx.Client(base_url=self.config.indexer_url, timeout=10.0)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "IndexerClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def health(self) -> dict[str, Any]:
        r = self._client.get("/api/health")
        r.raise_for_status()
        return r.json()  # type: ignore[no-any-return]

    def list_skills(
        self,
        *,
        category: str | None = None,
        creator: str | None = None,
        sort: str = "quality",
        limit: int = 20,
        offset: int = 0,
    ) -> list[SkillRow]:
        params: dict[str, str | int] = {"sort": sort, "limit": limit, "offset": offset}
        if category:
            params["category"] = category
        if creator:
            params["creator"] = creator
        r = self._client.get("/api/skills", params=params)
        r.raise_for_status()
        return [SkillRow(**item) for item in r.json()["items"]]

    def get_skill(self, token_id: str | int) -> tuple[SkillRow, list[RentalRow]]:
        r = self._client.get(f"/api/skills/{token_id}")
        r.raise_for_status()
        body = r.json()
        return (
            SkillRow(**body["skill"]),
            [RentalRow(**x) for x in body["recentRentals"]],
        )

    def get_rental(self, rental_id: str | int) -> RentalRow:
        r = self._client.get(f"/api/rentals/{rental_id}")
        r.raise_for_status()
        return RentalRow(**r.json()["rental"])

    def get_agent(
        self, address: str
    ) -> tuple[AgentRow, list[RentalRow], list[RentalRow]]:
        r = self._client.get(f"/api/agents/{address}")
        r.raise_for_status()
        body = r.json()
        return (
            AgentRow(**body["agent"]),
            [RentalRow(**x) for x in body["recent"]["asRenter"]],
            [RentalRow(**x) for x in body["recent"]["asCreator"]],
        )
