# SkillForge — Project Facts

_Source of truth for the pivot positioning. Single document so the README,
demo script, X thread, and HackQuest submission stay consistent. Update this
file first; everything else references it._

## Tagline

**The Agent-Ready API Wrapper Layer for OpenClaw**

## One-paragraph pitch

SkillForge is the Agent-Ready API Wrapper Layer for OpenClaw. AI agents need
to call paid APIs (OpenAI, Anthropic, Stripe, Twilio, market data, scrapers)
but doing this from autonomous agents is a security nightmare: raw API keys
leak, rate limits don't propagate to autonomous behavior, and there's no
standard for proving the API output reaching the agent wasn't tampered with
mid-flight. SkillForge fixes this by tokenizing each API wrapper as an
encrypted ERC-7857 INFT where the API key lives inside the skill's
TEE-protected sealed inference, rate limits are enforced on-chain via the
rental escrow, and every output ships with a TEE attestation an agent can
verify before acting on the result. We launch with 8 pre-built API wrappers
(the ones every agent developer needs) and grow into a marketplace where
third parties publish their own.

## Target user

Every developer building autonomous agents on OpenClaw, Eliza, or any agent
framework who currently has to choose between putting raw API keys in their
agent (security disaster) or building their own wrapper service (engineering
distraction).

## Three pillars surfaced as UI badges

| Badge | What it proves | Where it lives |
| --- | --- | --- |
| **TEE-Verified Output** | The model ran inside a hardware-isolated environment; the response signature recovers to a whitelisted provider on-chain. | Skill detail, rental detail, publish wizard preview |
| **End-to-End Encrypted Invocation** | Inputs decrypted only inside the sealed inference; outputs re-encrypted for the renter. Skill creator sees no queries; API provider sees no wallets. | Skill detail near "Rent" CTA, publish wizard, agent profile |
| **Reputation Trajectory** | Last N quality scores as a sparkline — direction matters, not just the current number. | Skill detail (replaces static score), marketplace cards |

## 8 launch skills

| # | Skill ID | Wraps | Price/use | One-line value |
| --- | --- | --- | --- | --- |
| 1 | `oai-chat` | OpenAI Chat Completions | 0.001 OG | GPT-4o/o1 inference with attestation |
| 2 | `anthropic-chat` | Anthropic Messages API | 0.001 OG | Claude 3.5/Opus inference with attestation |
| 3 | `coingecko-price` | CoinGecko Pro | 0.0001 OG | Real-time prices for top 1000 tokens |
| 4 | `tavily-search` | Tavily Search | 0.0005 OG | AI-optimized web search with cleaned snippets |
| 5 | `firecrawl-scrape` | Firecrawl | 0.001 OG | Any URL → agent-readable markdown |
| 6 | `twilio-sms` | Twilio | 0.005 OG | Send SMS from autonomous agent (rate-limited) |
| 7 | `nansen-onchain` | Nansen | 0.002 OG | Wallet labels + smart-money flow summary |
| 8 | `weatherapi-forecast` | WeatherAPI | 0.0001 OG | 7-day forecast for any location |

Source of truth: [`packages/cli/scripts/skill-payloads/`](../packages/cli/scripts/skill-payloads/).

## Closed loop (the workflow developers can't jump)

```
                 ┌──────────────────────────────────────────────┐
                 │                                              │
   Agent ── 1 ─→ Rent on-chain ── 2 ─→ Invoke inside TEE ── 3 ──┘
     ↑                                       │
     │                                       4
     │                                       ↓
     └── 5 ── Quality score updates ←── TEE-attested output
              skill reputation                 (signed)
```

1. Agent rents the skill via SkillEscrow on 0G Chain (real tx)
2. Invocation is sent encrypted to the skill's TEE-protected inference
3. API key is decrypted inside the TEE; upstream API is called; output is signed by the TEE
4. Output + attestation returned; agent verifies the signature before acting
5. After invocation, agent's quality rating goes through a TEE-attested scorer
   and updates the skill's on-chain reputation; bad skills surface, good
   skills get more rentals

No mid-flight tampering possible. No API key on the agent. No moderator needed.

## What's verifiable on-chain

- Skill identity (ERC-7857 INFT, content hash on-chain)
- Skill creator (immutable)
- Quality scoring (ECDSA signature recovers to a whitelisted scorer; verified
  by `AttestationVerifier.sol`)
- Reputation trajectory (every `WorkVerified` event is queryable via the
  indexer; sparkline computed from last N)
- Rental lifecycle (8-state machine: Requested → Funded → Active →
  Submitted → Verified → Completed)
- Payment flow (95% creator / 5% protocol)

## Hackathon constraints we're honest about

- **API keys come from Gwill's accounts.** Free tiers where possible. The
  keys are encrypted into each INFT's payload; only the TEE-sealed inference
  decrypts them.
- **Browser-side publishing** is preview-mode; real publishing runs from the
  CLI. `SkillPublisher` needs Node `crypto`; a browser-safe path is Week 5+.
- **TeeML inference** runs through `DevTeeMLProvider` until 0G Galileo
  registers a real provider. The on-chain verifier accepts the dev scorer's
  signature on testnet only — `Deploy.s.sol` refuses the dev sentinel
  address on mainnet (chainId 16661).
- **0G KV reads** still gated behind `SKILLFORGE_KV_INTEGRATION=1`; the
  read endpoint is upstream-blocked. Indexer-fallback path is documented.

## What is explicitly NOT shipping for the hackathon

- New contract features (redeploy = days lost)
- Mobile app
- Real ClawHub publication (GitHub direct-install for now)
- Cross-skill reputation portability (per-skill trajectory only)
- Multi-chain
- Third-party API-key onboarding flow

## Naming conventions

- **Project name**: SkillForge
- **Repo**: [github.com/big14way/SkillForge](https://github.com/big14way/SkillForge)
- **Mainnet target**: 0G Aristotle Mainnet (chainId 16661)
- **Testnet**: 0G Galileo (chainId 16602)
- **Skill IDs**: kebab-case, vendor-then-action (`oai-chat`, `coingecko-price`,
  `firecrawl-scrape`)

## Feedback loop with Dragon (0G core team)

Direct product feedback received 2026-04-21. The pivot recorded in
[`docs/PIVOT_NOTES.md`](PIVOT_NOTES.md) was the result. Architectural choices
from Weeks 1-3 stand; positioning, seed content, and UI surfacing are
sharpened.
