"""Runtime configuration pulled from env vars.

All knobs have safe testnet defaults so `skillforge discover` works without
any setup beyond having the indexer reachable on localhost:4000.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    indexer_url: str
    rpc_url: str
    explorer_url: str
    skill_registry: str
    skill_escrow: str
    skill_inft: str
    chain_id: int

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            indexer_url=os.getenv("SKILLFORGE_INDEXER_URL", "http://localhost:4000"),
            rpc_url=os.getenv("SKILLFORGE_RPC_URL", "https://evmrpc-testnet.0g.ai"),
            explorer_url=os.getenv(
                "SKILLFORGE_EXPLORER_URL", "https://chainscan-galileo.0g.ai"
            ),
            skill_registry=os.getenv(
                "SKILL_REGISTRY_ADDRESS", "0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985"
            ),
            skill_escrow=os.getenv(
                "SKILL_ESCROW_ADDRESS", "0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1"
            ),
            skill_inft=os.getenv(
                "SKILL_INFT_ADDRESS", "0x8486E62b5975A4241818b564834A5f51ae2540B6"
            ),
            chain_id=int(os.getenv("SKILLFORGE_CHAIN_ID", "16602")),
        )
