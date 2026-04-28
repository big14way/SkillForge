# SkillForge — End-to-End Test Plan (Frontend)

_Updated 2026-04-21 after the rent-page render-loop fix._

A 12-step manual checklist that exercises every UI surface against live
Galileo. Skip the steps that match your role — a creator-only run is steps
1-3 + 12, a renter-only run is 4-9.

## Pre-flight

Before you start, you need:

- A wallet (MetaMask, Rainbow, etc.) with **Galileo testnet (chainId 16602)**
  added. RPC: `https://evmrpc-testnet.0g.ai`. Get OG from
  [faucet.0g.ai](https://faucet.0g.ai) — 0.5 OG is plenty.
- The dev servers running: `pnpm dev` from repo root → indexer on `:4000`,
  web on `:3000`.
- The indexer health endpoint reports current state:
  ```bash
  curl -s http://127.0.0.1:4000/api/health | python3 -m json.tool
  ```
  Confirm `"chainId": 16602` and `lastBlocks` are within ~1000 blocks of head.

## Smoke checks (every test session)

| # | What | URL | Expected |
| --- | --- | --- | --- |
| S1 | Indexer up | http://127.0.0.1:4000/api/health | JSON with `ok:true`, `skillsIndexed >= 1` |
| S2 | Marketplace renders | http://127.0.0.1:3000/ | At least one skill card; reputation sparkline shows "no ratings yet" pill on unrated skills |
| S3 | Skill API responds | http://127.0.0.1:4000/api/skills/4 | JSON with `skill.creator`, `skill.name`, `recentRentals[]` |

If any of S1–S3 fails, stop. The frontend can't pass without them.

## Creator flow (steps 1-3)

These exercise the publish path. Currently runs from the CLI (browser-side
publish is preview-mode); the wizard at `/publish` is the demo surface.

| # | Action | Expected |
| --- | --- | --- |
| 1 | Visit http://127.0.0.1:3000/publish; fill the 3-step wizard | Step 3 shows the **TEE-Verified** + **E2E encrypted** badges. Click each → modal opens with attestation-fields explainer / 4-step flow. |
| 2 | Click "Download plan.json" | A `publish-plan-<ts>.json` downloads. |
| 3 | Run the seed-launch-skills CLI (with at least one API key set) — see [`packages/cli/scripts/skill-payloads/`](../packages/cli/scripts/skill-payloads/) | Skill appears in the marketplace within ~30s after the indexer picks up the `SkillRegistered` event. |

## Renter flow (steps 4-9) — **this is the path that broke before**

Connect your wallet first (top-right "Connect wallet" button). Pick a wallet
that supports Galileo or that lets you add a custom chain.

| # | Action | Expected |
| --- | --- | --- |
| 4 | http://127.0.0.1:3000/skills/4 (or any tokenId from the marketplace) | Hero shows real skill name (not `skill-N`), reputation sparkline, **TEE-Verified + E2E encrypted** badges visible under the hero |
| 5 | Click "Rent this skill" → lands on `/skills/4/rent` | Page shows price + connected wallet address + network row |
| 6a | If your wallet is on a chain other than 16602 | A yellow card appears with **"Switch to Galileo"** button — click it; wallet prompts; chain changes |
| 6b | Otherwise (correct chain) | Single button: **"Request + fund rental (X OG)"** |
| 7 | Click the rent button | Wallet pops up to sign **transaction 1: requestRental**. Sign. Wallet stays connected (this is the bug we just fixed). |
| 8 | Wait ~5–10s | Step 1 ("Request rental") flips to ✓ with explorer link. Wallet pops up again for **transaction 2: fundRental** (with the price as msg.value). Sign. |
| 9 | Wait another ~5–10s | Step 2 flips to ✓. Page shows "Rental funded. State machine: Funded." with a "View rental #N" CTA. Click it. |

## Indexer-eventually-consistent (step 10)

| # | Action | Expected |
| --- | --- | --- |
| 10 | http://127.0.0.1:3000/rentals/N (the rentalId from step 9) | Within ~30s the state-machine chip strip lights up the first 2 nodes (Requested → **Funded**). Polls every 10s. |

## Failure-path checks (step 11)

These should produce graceful UI errors, not blank pages.

| # | Action | Expected |
| --- | --- | --- |
| 11a | http://127.0.0.1:3000/rentals/9999 (non-existent rentalId) | "Rental #9999 not indexed yet" card with troubleshooting bullets. **Not** a Next 404. |
| 11b | http://127.0.0.1:3000/skills/9999 | "Skill #9999 not found" card with "Back to marketplace" button. |
| 11c | On the rent page, reject the wallet popup | Red error card "Transaction failed" with the wallet's reason + a "Try again" button. Wallet stays connected. |

## Agent profile (step 12)

| # | Action | Expected |
| --- | --- | --- |
| 12 | http://127.0.0.1:3000/agent/0x208B2660e5F62CDca21869b389c5aF9E7f0faE89 | Profile renders with skillsCreated / skillsRented stats from the indexer. (Memory tab will show preview-mode banner — that's correct, KV reads are upstream-blocked.) |

## What you've proven if all 12 pass

- ✅ Indexer + frontend talking via REST
- ✅ Wallet connect / chain switch / signing all working with RainbowKit
- ✅ ERC-7857 + SkillEscrow integration end-to-end (request + fund land on-chain)
- ✅ Reputation trajectory + TEE + E2E badges render with click-through modals
- ✅ State machine view picks up indexer-side rental progression
- ✅ Error paths render readable text, not blank pages

If any step fails, the failure is the bug — capture a screenshot of the
console (cmd-opt-J in Chromium browsers) and attach it; the most likely
failure modes are wallet-chain mismatch (step 6) or indexer not synced
(step 10 is slow → check `lastBlocks` in /api/health).

## Quick automated smoke

For a tighter feedback loop, this one-liner pings every route + verifies
the rental-flow API contract:

```bash
for path in / /skills/4 /skills/4/rent /rentals/1 /publish \
            /agent/0x208B2660e5F62CDca21869b389c5aF9E7f0faE89; do
  printf "  %s  %s\n" "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000$path)" "$path"
done

curl -s http://127.0.0.1:4000/api/skills/4/scores | python3 -m json.tool
curl -s http://127.0.0.1:4000/api/health         | python3 -m json.tool
```

All routes should return `200`. The scores endpoint should return an
`items` array (possibly empty if no rentals have completed yet).
