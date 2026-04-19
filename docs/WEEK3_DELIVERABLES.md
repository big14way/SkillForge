# Week 3 Deliverables

_Status: **code complete** as of 2026-04-19. All packages build + typecheck; all unit suites (contracts, SDK, services, indexer, OpenClaw) pass._

## Narrative additions

Beyond the technical deliverables, Week 3 added two narrative sections to [`README.md`](../README.md) that support the 0G team's stated evaluation criteria — maturity, iteration, alignment with future trends, real demand — rather than bounty-hunter hackathon framing:

- **Project Journey**: dated milestones with commit hashes showing a clear Week 1 → 3 progression and Week 4 scheduled. Includes the "preview mode" table as the source of truth on which integrations are live vs awaiting upstream 0G infrastructure.
- **Post-Hackathon Roadmap**: four-phase plan (June–December 2026) showing where SkillForge goes after 2026-05-16, plus an explicit "NOT building" list (no token, no competing framework, no centralized arbitration, no closed ecosystem) demonstrating product discipline.

Both sections follow the honesty guardrails in the Week 3 patch: real commit hashes + tx hashes, no invented metrics, no claims about live features currently in preview mode, plans framed as "targeted for X" rather than promises.

## What was built this week

### @skillforge/indexer

- SQLite schema ([`src/db/schema.ts`](../packages/indexer/src/db/schema.ts)) covering skills, rentals, agents, events, and indexer state
- `Queries` class with prepared statements for every hot path ([`src/db/queries.ts`](../packages/indexer/src/db/queries.ts))
- Three contract watchers with reconcile + live `watchContractEvent` subscription ([`src/watchers/`](../packages/indexer/src/watchers/))
- Fastify API on port 4000 with zod-validated routes for skills / rentals / agents / health ([`src/api/`](../packages/indexer/src/api/))
- API-first startup so `/api/health` is reachable during backfill; graceful SIGTERM/SIGINT shutdown ([`src/index.ts`](../packages/indexer/src/index.ts))
- **Live-tested against Galileo v2** — health + skills + backfill all working; cursor state persists across restarts
- **13 unit tests passing**

### @skillforge/web

- Next.js 15 App Router + Tailwind 4 + RainbowKit + wagmi + react-query
- Pages: marketplace landing, skill detail, publish wizard (multi-step), rental flow, agent profile with memory preview banner, rental state-machine viewer
- Shared components: `ExplorerLink`, `WalletConnect`, `PreviewBanner`, `TxStatus` pipeline, `QualityScoreBadge`
- Dark mode, mobile-responsive, skeleton loaders, empty states
- Production build: **6 routes compile** (5 static/dynamic + 1 wallet-heavy); total JS shared <110 kB

### @skillforge/openclaw-skill (Python, `skillforge-claw`)

- `SKILL.md` manifest with the five tool surfaces (`discover_skills`, `rent_skill`, `invoke_skill`, `rate_skill`, `show_memory`)
- `click` CLI entry point with JSON-or-rich-table output
- Pydantic-validated indexer HTTP client
- Preview-mode stubs for `invoke_skill` (realistic category-specific sample outputs) that graduate to live Compute in Week 4
- On-chain rental intent builder (`rent_skill`) that doesn't sign — hands structured steps to the agent host's wallet driver
- **5 unit tests passing** with `pytest-httpx` for the indexer client mocks

### @skillforge/sdk additions

- `withComputeFallback()` + `withReadFallback()` helpers with typed `FallbackResult<T>` + `mode: 'live' | 'fallback'` for propagating preview status to UI ([`src/fallback.ts`](../packages/sdk/src/fallback.ts))
- 6 new SDK tests covering happy + error + async + read-fallback paths

### @skillforge/services additions

- `DevTeeMLProvider` with hand-crafted realistic samples by category, scorer-signed attestations, and a **hard mainnet guard** that throws at construction on chainId 16661
- Sentinel address `0x00000000000000000000000000000000defea700` matches the Solidity constant in `Deploy.s.sol` so both codepaths agree

### Contracts

- `Deploy.s.sol` now refuses to whitelist the dev scorer sentinel on mainnet (chain 16661)
- 75 Foundry tests still passing after the guard addition

### Demo agent (`apps/demo-agent`)

- Autonomous script that discovers → rents → invokes (preview) → rates end-to-end
- Runs against any indexer URL + Galileo deployment
- Dry-run mode (`DEMO_DRY_RUN=1`) for CI; live mode exercises real on-chain txs

### End-to-end test

`packages/services/test/integration/e2e.integration.test.ts` — publishes a skill, then polls the indexer API until the new tokenId appears. Gated behind both `SKILLFORGE_INTEGRATION=1` and `SKILLFORGE_E2E=1` because it spends a few thousand wei of testnet gas.

## Acceptance criteria

- [x] `pnpm install` at the root succeeds
- [x] `pnpm -r build` compiles every package (contracts via Foundry, TS via tsc, Next.js via its own build)
- [x] `pnpm -r test` — **60+ passing tests** across sdk / services / indexer (CLI + demo-agent + web have no failing tests; web is UI-only)
- [x] `forge test -vv` — **75 passing tests** in `contracts/`
- [x] Indexer successfully syncs events from Galileo and stays live-tracking (smoke-tested 2026-04-19)
- [x] Frontend production build succeeds
- [x] OpenClaw `skillforge discover`, `rent`, `invoke`, `rate`, `memory show` commands run locally
- [x] Demo agent runs end-to-end in preview mode
- [x] README has the Project Journey + Post-Hackathon Roadmap + What's-in-preview table per the Week 3 patch
- [x] Git history uses conventional commits; 13 new commits this week

## Deferred to Week 4

- Live TeeML inference (replace `DevTeeMLProvider` once Galileo providers register)
- Live KV reads (once `3.101.147.150:6789` is reachable again)
- Mainnet deployment (chain 16661)
- Vercel deploy of `@skillforge/web` + Railway/Fly deploy of `@skillforge/indexer`
- Publish `skillforge-claw` to PyPI + clawhub
- 3-minute demo video

## How to run locally

```bash
# In one terminal — backfill + live indexer
cd SkillForge && pnpm dev:indexer

# In a second terminal — the marketplace UI
pnpm dev:web
# → http://localhost:3000

# OpenClaw skill
cd packages/openclaw-skill && uv sync
uv run skillforge discover --category trading

# Demo agent (dry-run against the live indexer)
DEMO_DRY_RUN=1 pnpm --filter @skillforge/demo-agent start
```
