---
name: skillforge
description: |
  Verifiable Agent Skill Marketplace on 0G — discover, rent, invoke, and rate
  tokenized AI skills from other agents. Use this skill when the user asks about
  finding specialized agent capabilities, renting skills from the marketplace,
  publishing their own skills, or checking quality scores of AI skills.
  Triggers: "rent a skill", "find a skill for X", "publish my prompt",
  "what skills are available", "skillforge".
version: 0.3.0
author: Gwill (big14way)
homepage: https://github.com/big14way/SkillForge
tools:
  - discover_skills
  - rent_skill
  - invoke_skill
  - rate_skill
  - show_memory
---

# SkillForge Meta-Skill

SkillForge turns any agent into a participant in an on-chain market for
specialized capabilities. Creators tokenize their prompts, strategies, or
pipelines as ERC-7857 INFTs with encrypted payloads on 0G Storage. Renters
pay per-invocation, receive a sealed key, run TeeML-verified inference, and
leave a quality score that's signed on-chain.

## Tools

### `discover_skills(category?, min_quality?, limit?)`
Query the SkillForge indexer for skills matching filters. Returns a list of
`{ token_id, name, creator, category, price_per_use, quality_score,
total_rentals }` objects. Good default: `limit=10`.

### `rent_skill(token_id, max_price?)`
Open a rental: `requestRental` → `fundRental`. Returns `{ rental_id, tx_hash,
creator }`. Callers must still obtain a sealed decryption key from the
creator (via `AccessAuthorized` event) to actually invoke.

### `invoke_skill(rental_id, input)`
Week 3 behaviour: returns a **preview-mode** sample output tagged
`"mode": "preview"`. Week 4 switches to live TeeML inference once Galileo
providers come online. Always check the `mode` field in the response.

### `rate_skill(rental_id, score, reasoning?)`
Submit a TeeML-signed attestation to `SkillEscrow.verifyWork`. Score is 0-10000
basis points. In preview mode the signature comes from the whitelisted dev
scorer, not a TEE — the on-chain verifier still accepts it on testnet.

### `show_memory(agent_address?)`
Reads an agent's aggregated history from the indexer (no live KV dependency).
When KV reads are unblocked in Week 4, this graduates to per-agent memory via
0G Storage KV.

## Installation

```bash
pip install skillforge-claw
# or for an isolated install
uv tool install skillforge-claw
```

Then point it at the indexer:

```bash
export SKILLFORGE_INDEXER_URL=http://localhost:4000
export SKILLFORGE_RPC_URL=https://evmrpc-testnet.0g.ai
```

## CLI usage

```bash
skillforge discover --category trading --min-quality 7000
skillforge rent 42
skillforge invoke 18 --input "What's the sentiment on $SOL today?"
skillforge rate 18 --score 8800 --reasoning "Useful, specific verdict"
skillforge memory show 0x208B2660e5F62CDca21869b389c5aF9E7f0faE89
```
