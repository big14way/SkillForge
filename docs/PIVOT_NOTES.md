# Pivot rationale — Agent-Ready API Wrapper Layer

_Captured 2026-04-21 after a product-feedback call with Dragon (0G core team)._

## What Dragon said

> "Cut the unnecessary use case. Verification layer, privacy layer, make the
> user know the value and why they need to use it. API skills, more privacy
> verifiable loop, agent loops for feedback for close workflow. Make it more
> easy to use, give your user reason to use, give a close workflow that people
> can't be jumped."

He held up [Claw Wallet](https://clawwallet.cc) and [LH DAO](https://app.lhdao.top)
as products that joined the hackathon as a milestone, not as the destination.
The bar he's evaluating against is product-fit, not feature count.

## Diagnosis (what was wrong)

SkillForge's architecture (Weeks 1-3) is solid:
- ERC-7857 INFTs with TEE-oracle re-encryption ✅
- 8-state escrow on 0G Chain ✅
- AES + ECIES encrypted skill payloads on 0G Storage ✅
- Indexer + frontend + OpenClaw distribution ✅
- Real on-chain attestation verification ✅

But the **positioning** was generic: "verifiable agent skill marketplace." A
judge reading that has to invent a use case in their head. The verification +
privacy + reputation work was buried under generic framing.

## What changed

| Dimension | Before | After |
| --- | --- | --- |
| **Tagline** | "Verifiable Agent Skill Marketplace on 0G" | "The Agent-Ready API Wrapper Layer for OpenClaw" |
| **Target user** | Vague "agent developers" | Every dev building autonomous agents who has a `process.env.OPENAI_API_KEY` problem |
| **Launch content** | 5 anonymous test skills (`it-skill-…`) | 8 curated API wrappers (OpenAI, Anthropic, CoinGecko, Tavily, Firecrawl, Twilio, Nansen, WeatherAPI) |
| **Closed loop** | Implied by 8-state machine | Explicit: API key never leaves TEE → invocation → TEE-attested output → on-chain reputation → ranks the marketplace |
| **Why-now** | Future-of-agents abstract | "Your agent has API keys in env; one compromise drains your quota" |

## What did NOT change

The on-chain machinery, SDK, indexer, frontend skeleton, and OpenClaw skill
are unchanged. This is a positioning + seed-content + UI-badge patch, not a
rewrite. Specifically:

- **No new contract features.** Redeploy = days lost; on-chain logic is correct.
- **No browser-safe encryption port.** Publish stays CLI-driven; wizard
  remains preview-mode in browser.
- **No mobile app.** Responsive web is enough for the demo.
- **No third-party API key onboarding flow.** Hackathon uses Gwill's keys
  (free tiers where possible); we'll document this honestly. Post-hackathon,
  each skill creator brings their own key and pays the 5% protocol fee.

See [`docs/WEEK4_BACKLOG.md`](WEEK4_BACKLOG.md) for the deferred items.

## What's now visible to the user

Three new UI affordances surface the verifiable + private + closed-loop
properties that judges and developers care about:

1. **TEE-Verified Output badge** — a small green shield on every skill +
   rental page, click-through to the raw attestation hash + the on-chain
   verification tx.
2. **End-to-End Encrypted Invocation badge** — a small purple lock with a
   modal that walks through the 4-step encryption flow.
3. **Reputation Trajectory sparkline** — instead of a single static quality
   score, every skill page now shows the last 10 ratings as a sparkline. A
   bad skill surfaces immediately; a good skill compounds.

## The closed workflow developers can't jump

Self-managing API keys in autonomous agents is a known unsolved problem. Once
an agent gets compromised, all API quota is drained. SkillForge makes that
stop being a problem — the key never lives on the agent. There is no way to
implement "the API key stays in a TEE, the rate limit is enforced on-chain,
the output is attested" without either (a) the SkillForge architecture or
(b) something equivalent that doesn't exist yet.

## Why these 8 launch skills

- **OpenAI + Anthropic** — every agent dev calls these; this alone is a reason
  to install SkillForge.
- **CoinGecko + Nansen** — trading / research agents.
- **Tavily + Firecrawl** — research / RAG agents.
- **Twilio** — agents that need to communicate with humans.
- **WeatherAPI** — non-crypto utility, opens IoT / agriculture verticals.

A new agent dev installs SkillForge once and has 8 capabilities the next
morning. That's the install moment that makes the marketplace stick.
