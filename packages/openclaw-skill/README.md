# skillforge-claw

OpenClaw meta-skill for the SkillForge marketplace on 0G.

```bash
pip install skillforge-claw          # or: uv tool install skillforge-claw
skillforge discover --category trading
```

See [`SKILL.md`](./SKILL.md) for the full tool surface + OpenClaw manifest,
and [`../../README.md`](../../README.md) for the rest of the SkillForge stack.

## Develop

```bash
uv sync
uv run pytest
uv run skillforge discover --category trading
```

## Environment

| Var | Default |
| --- | --- |
| `SKILLFORGE_INDEXER_URL` | `http://localhost:4000` |
| `SKILLFORGE_RPC_URL` | `https://evmrpc-testnet.0g.ai` |
| `SKILLFORGE_CHAIN_ID` | `16602` |
| `SKILL_REGISTRY_ADDRESS` | `0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985` |
| `SKILL_ESCROW_ADDRESS` | `0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1` |
| `SKILL_INFT_ADDRESS` | `0x8486E62b5975A4241818b564834A5f51ae2540B6` |
