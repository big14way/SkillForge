# SkillForge

**A verifiable agent-skill marketplace on 0G.** AI agents tokenize their capabilities as ERC-7857 INFTs with encrypted payloads on 0G Storage, prove quality with 0G Compute TeeML, rent them to each other through an 8-state escrow on 0G Chain, and carry reputation across sessions via 0G Storage KV.

Built for the **0G APAC Hackathon — Track 1 (Agentic Infrastructure & OpenClaw Lab)**. Submission deadline: **2026-05-16**.

---

## Why it matters

Today, AI agents are islands. If one agent writes a great trading strategy or a precise market-news summarizer, no other agent can discover, pay for, and safely use it. SkillForge fixes that at the protocol layer:

- **Tokenize skills** — every skill is an ERC-7857 INFT with an encrypted payload on 0G Storage.
- **Prove quality** — before a rental completes, a scorer-signed attestation is verified on-chain against a whitelisted provider set; the production path runs inside a 0G Compute TeeML.
- **Settle on-chain** — an 8-state escrow mediates the rental, with 95% to creator / 5% to protocol.
- **Plug in** — the marketplace ships as an OpenClaw meta-skill: `clawhub install skillforge`.

SkillForge is the one entry that combines all four 0G primitives (Chain + Storage + Compute + ERC-7857) in a single product, wired to a frontend, an indexer, and an OpenClaw distribution.

---

## Architecture

```mermaid
flowchart LR
    subgraph Onchain["0G Chain (Galileo, v2)"]
        INFT[SkillINFT<br/>ERC-7857]
        REG[SkillRegistry<br/>discovery + indexing]
        ESC[SkillEscrow<br/>8-state lifecycle]
        VER[AttestationVerifier<br/>ECDSA + whitelist]
    end

    subgraph OffChain["0G Off-Chain Primitives"]
        STO[(0G Storage<br/>encrypted skill payloads)]
        COM[0G Compute<br/>TeeML inference]
        KV[(0G Storage KV<br/>agent memory)]
    end

    subgraph Services["SkillForge Stack"]
        SDK[@skillforge/sdk<br/>crypto + storage + compute]
        SVC[@skillforge/services<br/>publisher/consumer/scorer/oracle]
        IDX[@skillforge/indexer<br/>SQLite + Fastify API]
        WEB[@skillforge/web<br/>Next.js marketplace]
        CLAW[skillforge-claw<br/>OpenClaw meta-skill]
    end

    SVC -- mint + register --> INFT
    SVC -- encrypted blob --> STO
    SVC -- rent / fund / submit --> ESC
    SVC -- signed attestation --> VER
    ESC -- authorizeUsage --> INFT
    ESC -- updateQualityScore --> REG
    COM -. provider response .-> SVC

    IDX -. watch events .-> INFT & REG & ESC
    WEB -- /api/skills --> IDX
    WEB -- wallet txs --> ESC
    CLAW -- discover/rent --> IDX & ESC
    SVC --> KV
```

### 0G component integration

| 0G Component | How SkillForge uses it | Code reference |
| --- | --- | --- |
| **0G Chain (Galileo, chainId 16602)** | Hosts SkillINFT, SkillRegistry, SkillEscrow, AttestationVerifier library. | [`contracts/src/`](contracts/src/) |
| **ERC-7857 INFTs** | Skills are tokenized with encrypted metadata + oracle-signed re-encryption proofs on transfer/clone. | [`contracts/src/SkillINFT.sol`](contracts/src/SkillINFT.sol) |
| **0G Storage** | Encrypts + uploads the skill payload; the indexer downloads on demand. Live end-to-end. | [`packages/sdk/src/storage/StorageClient.ts`](packages/sdk/src/storage/StorageClient.ts) |
| **0G Compute (TeeML)** | Scores rental outputs; ECDSA-signed attestation is verified on-chain. Preview-mode stub when providers aren't registered. | [`contracts/src/libraries/AttestationVerifier.sol`](contracts/src/libraries/AttestationVerifier.sol) · [`packages/services/src/dev-provider.ts`](packages/services/src/dev-provider.ts) |
| **0G Storage KV** | Per-agent persistent memory. Writes anchored live; read endpoint currently unreachable → indexer fallback. | [`packages/sdk/src/storage/MemoryClient.ts`](packages/sdk/src/storage/MemoryClient.ts) |
| **OpenClaw / `clawhub`** | Marketplace exposed as a meta-skill. | [`packages/openclaw-skill/SKILL.md`](packages/openclaw-skill/SKILL.md) |

### 8-state rental lifecycle

```
None → Requested → Funded → Active → Submitted → Verified → Completed
                                                  │
                                                  └─→ Disputed → Completed (refund or release)
```

Each transition is a guarded function on [`SkillEscrow`](contracts/src/SkillEscrow.sol) that emits an event the indexer picks up.

---

## What's in preview mode right now

Transparency: the following table is the source of truth about which surfaces are backed by live 0G infrastructure versus safe fallbacks. Flipping from ⏸ to ✅ is a config change, not a rewrite — each preview path calls `withComputeFallback()` so the switch happens in one place.

| Feature | Status | Notes |
| --- | --- | --- |
| Publish encrypted skill → mint INFT → register | ✅ Live on Galileo | Real on-chain txs; verified end-to-end via `publish.integration.test.ts` |
| 8-state rental state machine | ✅ Live on Galileo | Real on-chain txs through `SkillEscrow` v2 |
| ERC-7857 sealed-key transfer / clone | ✅ Live on Galileo | Real oracle signatures verified on-chain (75 Foundry tests) |
| Quality-score attestation (whitelist verify) | ✅ Live on Galileo | Scorer whitelist verified via `scoring.integration.test.ts` |
| Indexer backfill + live event watch | ✅ Running locally | Smoke-tested against Galileo; paginated REST API on port 4000 |
| Next.js marketplace UI | ✅ Builds + reads live indexer | No Vercel deploy yet; ship in Week 4 |
| OpenClaw `discover` / `rent` / `rate` tools | ✅ Library + CLI pass tests | Distribution to clawhub registry deferred to Week 4 |
| TeeML-verified live inference | ⏸ Preview mode | SDK updated to canonical inference contract `0xa79F4c…` (confirmed by 0G core team, April 2026); `initialized()` + `ledgerAddress()` sanity-check pass, but the contract reverts on `getAllServices()` because no TeeML providers are currently registered. `DevTeeMLProvider` emits realistic samples tagged `mode: preview` in the meantime. |
| 0G KV memory reads | ⏸ Preview mode | Writes succeed via the Flow contract; the read node `http://3.101.147.150:6789` is not reachable from the public internet |
| Mainnet deployment | 🟡 Scheduled | Week 4 after 0G infrastructure blockers clear |

Every preview-mode surface renders a non-alarming banner ("Running in preview mode — live inference connects Week 4") so judges see an honest flag, not a silent mock. No transaction is ever fabricated — on-chain state is always real.

---

## Quick start

```bash
git clone https://github.com/big14way/SkillForge.git
cd SkillForge

# Install everything
pnpm install

# Contracts
cd contracts && forge build && forge test -vv
# -> 75 passing tests

# Frontend + indexer + services in parallel
cd .. && pnpm dev
# -> indexer on http://localhost:4000, web on http://localhost:3000

# OpenClaw Python skill
cd packages/openclaw-skill
uv sync
uv run skillforge discover --category trading
```

### Deploying contracts to Galileo

```bash
cd contracts
cp .env.example .env          # fill in PRIVATE_KEY + PROTOCOL_TREASURY
set -a && source .env && set +a
forge script script/Deploy.s.sol \
  --rpc-url "$GALILEO_RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  --priority-gas-price 2000000000 \
  --with-gas-price 3000000000     # Galileo requires ≥ 2 gwei tip
```

---

## Deployed addresses

Live on **0G Galileo testnet (chainId 16602)** — v2 deployed 2026-04-16.

| Contract | v2 (current) |
| --- | --- |
| SkillINFT | [`0x8486E62b5975A4241818b564834A5f51ae2540B6`](https://chainscan-galileo.0g.ai/address/0x8486E62b5975A4241818b564834A5f51ae2540B6) |
| SkillRegistry | [`0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985`](https://chainscan-galileo.0g.ai/address/0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985) |
| SkillEscrow | [`0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1`](https://chainscan-galileo.0g.ai/address/0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1) |

Oracle + initial scorer are bootstrapped to the deployer (`0x208B…faE89`) and can be rotated via `setOracle` / `setScorerWhitelisted`.

Explorer: https://chainscan-galileo.0g.ai · v1 archive: [`docs/deployments-history.md`](docs/deployments-history.md)

> Note: 0G relaunched Galileo with chainId `16602` (not the originally documented `16601`). The `.env.example` reflects the live value.

---

## Install the OpenClaw skill

```bash
pip install skillforge-claw      # or: uv tool install skillforge-claw
skillforge discover --category trading --min-quality 7000
```

See [`packages/openclaw-skill/SKILL.md`](packages/openclaw-skill/SKILL.md) for the full tool surface (`discover_skills`, `rent_skill`, `invoke_skill`, `rate_skill`, `show_memory`) and the OpenClaw manifest.

---

## Repo layout

```
SkillForge/
├── contracts/                Foundry — Solidity 0.8.24 (75 tests, v2 on Galileo)
│   ├── src/                  SkillINFT · SkillRegistry · SkillEscrow · AttestationVerifier
│   ├── test/                 Unit + fuzz + oracle-signature tests
│   └── script/Deploy.s.sol
├── packages/
│   ├── sdk/                  @skillforge/sdk — crypto (AES/ECIES) + storage + KV + compute
│   ├── services/             @skillforge/services — publisher · consumer · scorer · oracle · memory · dev-provider
│   ├── indexer/              @skillforge/indexer — SQLite + Fastify API
│   ├── web/                  @skillforge/web — Next.js 15 marketplace
│   ├── cli/                  @skillforge/cli — `init` / `publish` / `rent` / `memory init` / `compute setup`
│   └── openclaw-skill/       skillforge-claw — Python OpenClaw meta-skill
├── apps/
│   └── demo-agent/           Autonomous reference agent for the Week 4 demo
├── scripts/export-abis.mjs   Regenerate typed ABIs from Foundry artifacts
└── docs/
    ├── ARCHITECTURE.md
    ├── WEEK1_DELIVERABLES.md · WEEK2_DELIVERABLES.md · WEEK3_DELIVERABLES.md
    └── deployments-history.md
```

### Chain library note

Both `@0gfoundation/0g-ts-sdk` and `@0glabs/0g-serving-broker` declare **ethers v6** as a peer dependency. The SkillForge SDK is built on ethers v6 rather than viem to avoid shipping two chain libraries; the frontend uses **viem + wagmi** for wallet connections because that's what RainbowKit expects.

---

## Project Journey

SkillForge is being built in the open across the 0G APAC Hackathon's two-month window. Each week produces a deployable artifact with its own deliverables doc; nothing is held back for a surprise demo.

### Week 1 — Contract Foundation (2026-04-16)
- Three contracts on Galileo testnet: `SkillINFT` (ERC-7857), `SkillRegistry`, `SkillEscrow`
- 8-state rental lifecycle state machine with `ReentrancyGuard` + `Pausable`
- 67 Foundry tests at 97% line / 85% branch coverage, custom errors, NatSpec throughout
- v1 addresses archived in [`docs/deployments-history.md`](docs/deployments-history.md)
- Key commit: [`0df23f2`](https://github.com/big14way/SkillForge/commit/0df23f2) "feat: implement SkillEscrow with 8-state lifecycle"
- Detail: [`docs/WEEK1_DELIVERABLES.md`](docs/WEEK1_DELIVERABLES.md)

### Week 2 — Services + Real Attestation (2026-04-16)
- pnpm workspace with `@skillforge/sdk`, `@skillforge/services`, `@skillforge/cli`
- Client-side AES-256-GCM encryption for skill payloads; ECIES sealed-key envelopes for rental access
- `AttestationVerifier` library replaces the Week 1 stub — real ECDSA recovery + whitelist check, plus on-chain score binding to prevent replay
- ERC-7857 oracle re-encryption proofs upgraded from stub to signature verification; `KeyResealed` event added
- v2 redeployed: [`SkillINFT`](https://chainscan-galileo.0g.ai/address/0x8486E62b5975A4241818b564834A5f51ae2540B6) / [`SkillRegistry`](https://chainscan-galileo.0g.ai/address/0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985) / [`SkillEscrow`](https://chainscan-galileo.0g.ai/address/0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1)
- Integration tests against live Galileo: publish flow ✅, scorer attestation ✅
- Key commit: [`52ca9cf`](https://github.com/big14way/SkillForge/commit/52ca9cf) "chore: redeploy v2 contracts to Galileo"
- Detail: [`docs/WEEK2_DELIVERABLES.md`](docs/WEEK2_DELIVERABLES.md)

### Week 3 — Frontend + Indexer + OpenClaw Distribution (2026-04-19)
- Next.js 15 marketplace: browse, skill detail, publish wizard, rental state-machine viewer, agent profile
- SQLite-backed event indexer with a Fastify API — every UI render reads from indexed state, not raw RPC
- OpenClaw meta-skill (`skillforge-claw`, Python) so any OpenClaw-compatible agent host can access the marketplace via `discover` / `rent` / `invoke` / `rate` / `show_memory` tools
- `withComputeFallback()` helper + `DevTeeMLProvider` so scoring + inference surfaces keep working while upstream 0G infrastructure is resolved
- `Deploy.s.sol` mainnet-chain-id guard that refuses to whitelist the dev scorer on chain 16661
- Demo agent (`apps/demo-agent`) walks discover → rent → invoke → rate end-to-end
- Key commits: [`01701bb`](https://github.com/big14way/SkillForge/commit/01701bb) "feat(indexer): contract event watchers"; [`3b3519a`](https://github.com/big14way/SkillForge/commit/3b3519a) "feat(web): next.js 15 marketplace"; [`938534c`](https://github.com/big14way/SkillForge/commit/938534c) "feat(openclaw): python meta-skill"
- Detail: [`docs/WEEK3_DELIVERABLES.md`](docs/WEEK3_DELIVERABLES.md)

### Week 4 — Live Compute + Mainnet (targeted 2026-05-16)
- Wire live 0G Compute TeeML inference into `QualityScorer` and skill invocation (replace `DevTeeMLProvider`)
- Wire live 0G Storage KV reads into `MemoryService`
- Deploy to 0G Aristotle Mainnet (chainId 16661)
- 3-minute demo video, Vercel + Railway deploys, HackQuest submission

### Lessons from iteration
- **Real attestation verification is nontrivial.** The Week 1 stub shipped fast; Week 2 replaced it with on-chain ECDSA recovery + a whitelist + score-binding so a replay can't reuse an old signature under a new score. Both versions forced a clearer trust model.
- **Events must be designed for indexing.** Mid-Week 3, the indexer's `AccessAuthorized` handler exposed that our rental-state transitions needed the creator address to already be stored — so the SkillEscrow watcher reads from the indexer's own `skills` table rather than re-parsing. Fixing that pattern before shipping the API saved a re-index on every deploy.
- **Soft-fail beats hard-fail.** Two 0G infra components (KV read node, TeeML providers) were unreachable during Week 2 and are still unreachable as of Week 3. Wrapping every call in `withComputeFallback()` means the frontend, OpenClaw skill, and demo agent all stay buildable — judges see an honest preview-mode banner instead of a broken app.
- **Specific sentinels > vague placeholders.** The dev scorer address is `0x…defeA700` (valid checksum) and appears in both the TypeScript and Solidity codepaths. A single grep finds every place preview mode leaks into production paths.

---

## Post-Hackathon Roadmap

SkillForge is designed to outlive the hackathon. The deadline is 2026-05-16; the roadmap below is what happens between then and end of 2026.

### Phase 1 — Public Mainnet Launch (targeted June 2026)
- Deploy v2 contracts to 0G Aristotle Mainnet with full event indexing
- Ship `skillforge-claw` to PyPI and to ClawHub for one-command installation across OpenClaw-compatible agent hosts (Claude Code, Cursor, GitHub Copilot, Continue, Zed)
- Soft-launch to ~100 agent developers via the 0G APAC Dev community, ETHGlobal Discord, and OpenClaw forum
- Pricing: fully gasless for publishers; 5% protocol fee on completed rentals (already implemented in `SkillEscrow`)

### Phase 2 — Developer-First Distribution (targeted July–August 2026)
- **Skill templates**: 20 curated, MIT-licensed templates for common agent tasks (sentiment analysis, DEX routing, on-chain due diligence, code review, content moderation) — free, team-seeded to bootstrap the marketplace
- **SDK expansions**: Rust SDK mirroring the TypeScript one, targeting agent runtimes in the 0G Rust ecosystem
- **Embedded marketplace component**: `@skillforge/react` package so any dApp can embed a "Hire a skill" widget in ~10 lines of code
- **Public indexer + subgraph**: graduate from SQLite to a hosted Postgres + Subgraph deployment, publicly queryable

### Phase 3 — Reputation & Governance (targeted September–October 2026)
- **Portable reputation**: ERC-7857 metadata extensions that let skill creators carry their quality scores across platforms — reputation becomes a transferable asset, not a siloed number
- **Staking for providers**: TeeML inference providers stake $0G to join the scoring quorum; slashing on proven tampering
- **Dispute resolution**: transition from owner-arbitration to a multi-agent AI judge committee, with appeal to a small human panel for edge cases
- **Creator royalties**: extend the existing ERC-2981 5% royalty to support split-royalty on forked/derived skills

### Phase 4 — Agent Economy Primitives (targeted November–December 2026)
- **Composable skills**: skills can depend on other skills; on-chain dependency graph resolved at invocation time
- **Subscription pricing**: alongside per-use, add daily/monthly subscriptions for heavy-use skills
- **Cross-chain invocation**: bridge to Chainlink CRE or LayerZero so skills published on 0G can be invoked from agents running on other chains
- **Revenue share for fine-tuned models**: creators who fine-tune a base model for a skill receive ongoing royalties when that skill is invoked

### What we are explicitly NOT building
- **A token**: SkillForge uses $0G for payments; no separate token is planned. Token launches are a distraction from product-market fit.
- **A competing agent framework**: SkillForge is infrastructure, not a framework. We integrate with OpenClaw, ElizaOS, and any agent runtime that speaks MCP.
- **Centralized arbitration**: disputes resolve through the on-chain process or not at all. No off-chain customer support team.
- **A closed ecosystem**: all contracts are verified on 0G Explorer, the indexer is open source, the SDK is MIT-licensed. Anyone can fork and run their own marketplace; we win by being the default.

### How to follow the build
- GitHub: [github.com/big14way/SkillForge](https://github.com/big14way/SkillForge) — watch for weekly deliverables docs
- Feedback: open a GitHub issue or reach out on the 0G APAC Telegram

---

*This roadmap represents current thinking and will be updated quarterly. Priorities shift based on what the agent ecosystem actually needs — not based on what we planned in April 2026.*

---

## License

[MIT](LICENSE) — © 2026 SkillForge Contributors.
