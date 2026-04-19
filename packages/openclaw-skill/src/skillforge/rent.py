"""`rent_skill` tool.

The Python package doesn't ship a wallet itself — we surface a structured
intent + the exact calldata an agent host can hand to any on-chain execution
layer (whichever wallet driver the host uses). Agents that want a one-shot
rent-and-fund can pipe the intent to `cast send` or equivalent.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .config import Config
from .indexer import IndexerClient


@dataclass
class RentIntent:
    """A structured description of the on-chain actions required to rent a skill.

    Weeks 3–4 agent hosts can translate this into wallet calls in whatever way
    suits them (raw cast, ethers.js, wagmi, …). We deliberately *don't* sign
    transactions here — that's the host's job.
    """

    token_id: str
    skill_name: str
    creator: str
    price_per_use_wei: str
    escrow_address: str
    chain_id: int
    steps: list[dict[str, Any]]


def rent_skill(
    token_id: str | int,
    *,
    max_price_wei: int | None = None,
    config: Config | None = None,
    client: IndexerClient | None = None,
) -> RentIntent:
    """Produce a `RentIntent` with the exact two transactions an agent needs to fire.

    Raises `ValueError` if `max_price_wei` is lower than the skill's current
    price — we don't want to rent into an unexpected cost.
    """
    cfg = config or Config.from_env()
    owner = client or IndexerClient(cfg)
    try:
        skill, _ = owner.get_skill(token_id)
    finally:
        if client is None:
            owner.close()

    price = int(skill.pricePerUse)
    if max_price_wei is not None and price > max_price_wei:
        raise ValueError(
            f"skill {skill.tokenId} priced at {price} wei exceeds max_price_wei={max_price_wei}"
        )

    return RentIntent(
        token_id=skill.tokenId,
        skill_name=skill.name,
        creator=skill.creator,
        price_per_use_wei=str(price),
        escrow_address=cfg.skill_escrow,
        chain_id=cfg.chain_id,
        steps=[
            {
                "step": 1,
                "label": "requestRental",
                "contract": cfg.skill_escrow,
                "function": "requestRental(uint256)",
                "args": [skill.tokenId],
                "value_wei": "0",
            },
            {
                "step": 2,
                "label": "fundRental",
                "contract": cfg.skill_escrow,
                "function": "fundRental(uint256)",
                "args": ["<rentalId from step 1's RentalRequested event>"],
                "value_wei": str(price),
            },
        ],
    )
