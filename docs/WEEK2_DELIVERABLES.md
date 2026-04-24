# Week 2 Deliverables

_Status: **code complete, awaiting v2 redeploy authorization from Gwill** as of 2026-04-16._

## What was built

### Monorepo conversion

- [`pnpm-workspace.yaml`](../pnpm-workspace.yaml), [`tsconfig.base.json`](../tsconfig.base.json), [`.eslintrc.cjs`](../.eslintrc.cjs), [`.prettierrc`](../.prettierrc) — Week 1's standalone Foundry repo is now a pnpm workspace with three TypeScript packages alongside `contracts/`.

### @skillforge/sdk

| Module | File | Notes |
| --- | --- | --- |
| Typed ABIs | [`packages/sdk/src/contracts/`](../packages/sdk/src/contracts/) | Auto-generated via `pnpm abi:export`; re-export `SkillINFTABI`, `SkillRegistryABI`, `SkillEscrowABI`. |
| AES-256-GCM | [`packages/sdk/src/crypto/aes.ts`](../packages/sdk/src/crypto/aes.ts) | `encryptSkill`, `decryptSkill`, `computeDataHash` — Node `crypto` only. |
| ECIES sealed keys | [`packages/sdk/src/crypto/keys.ts`](../packages/sdk/src/crypto/keys.ts) | `sealKeyForRecipient`, `unsealKey` — wraps `eciesjs` on secp256k1 (matches 0G broker). |
| 0G Storage | [`packages/sdk/src/storage/StorageClient.ts`](../packages/sdk/src/storage/StorageClient.ts) | Buffer-in / Buffer-out over `@0gfoundation/0g-ts-sdk` `Indexer` + `MemData`. |
| 0G KV | [`packages/sdk/src/storage/MemoryClient.ts`](../packages/sdk/src/storage/MemoryClient.ts) | `set/get/delete/append/list`; append-only with tombstone soft-deletes. |
| 0G Compute | [`packages/sdk/src/compute/ComputeClient.ts`](../packages/sdk/src/compute/ComputeClient.ts) | Wraps `createZGComputeNetworkBroker`; returns `verified` bit from TeeML. |
| Attestation helpers | [`packages/sdk/src/compute/attestation.ts`](../packages/sdk/src/compute/attestation.ts) | `encodeAttestation`, `computeAttestationDigest` — matches the on-chain `AttestationVerifier` wire format. |
| `SkillForgeClient` | [`packages/sdk/src/client.ts`](../packages/sdk/src/client.ts) | One entry point; `fromEnv()` reads every knob in `.env.example`. |

**SDK tests:** 18 passing (11 crypto + 7 attestation).

### @skillforge/services

| Service | File | Purpose |
| --- | --- | --- |
| `SkillPublisher` | [`skill-publisher.ts`](../packages/services/src/skill-publisher.ts) | Encrypt → upload → mint → register; returns the AES key the creator must keep secret. |
| `SkillConsumer` | [`skill-consumer.ts`](../packages/services/src/skill-consumer.ts) | Rent → fund → wait for authorize → fetch → decrypt → infer → submit proof. |
| `QualityScorer` | [`quality-scorer.ts`](../packages/services/src/quality-scorer.ts) | TeeML-graded score + scorer-signed attestation + on-chain `verifyWork`. |
| `ReencryptionOracle` | [`oracle.ts`](../packages/services/src/oracle.ts) | ERC-7857 re-seal + ECDSA proof for transfer/clone. |
| `MemoryService` | [`memory-service.ts`](../packages/services/src/memory-service.ts) | Per-agent profile / reputation / history / invocation log over 0G KV. |

**Service tests:** 7 passing — includes a full seal/unseal/re-seal roundtrip that recovers the oracle signer with the same logic SkillINFT v2 uses on-chain.

### Contract upgrades (v2)

| Change | File |
| --- | --- |
| New `AttestationVerifier` library | [`contracts/src/libraries/AttestationVerifier.sol`](../contracts/src/libraries/AttestationVerifier.sol) |
| `SkillEscrow.verifyWork` — real ECDSA attestation + scorer whitelist | [`SkillEscrow.sol`](../contracts/src/SkillEscrow.sol) |
| `SkillINFT.transfer/clone` — real oracle-signed proofs, emits `KeyResealed` | [`SkillINFT.sol`](../contracts/src/SkillINFT.sol) |
| New constructors (both take extra addresses), `setOracle`, `setScorerWhitelisted` | — |
| `Deploy.s.sol` updated for the new ctor args + `oracle` / `scorer` JSON fields | [`script/Deploy.s.sol`](../contracts/script/Deploy.s.sol) |

**Contract tests:** 75 passing (Week 1's 67 + 5 new `AttestationVerifier` unit tests + 3 new SkillINFT oracle tests).

### @skillforge/cli

Commander-based CLI exposing: `init`, `list`, `publish`, `rent`, `invoke`, `memory show/history`. Explorer links printed for every tx ([`packages/cli/src/commands/`](../packages/cli/src/commands/)).

## Acceptance criteria

- [x] `pnpm install` succeeds at the root.
- [x] `pnpm -r build` compiles all packages.
- [x] `pnpm -r test` — **32 passing** (18 SDK + 7 services + 0 CLI + 7 from the contracts package, which runs via Foundry separately).
- [x] `forge test -vv` — **75 passing** in `contracts/`.
- [ ] v2 contracts deployed to Galileo — **requires user go-ahead** (see "Blockers" below).
- [ ] End-to-end integration tests — deferred until v2 is on-chain (streamId + live TeeML provider needed first).
- [x] CLI commands scaffolded and typecheck clean.
- [x] Git history uses conventional commits.

## Live infrastructure findings (2026-04-16, updated April 2026)

While bringing the service layer up against live Galileo, we hit two real-world blockers that are worth recording for the HackQuest submission:

### 0G Compute — addresses corrected, providers still absent

**Original finding (2026-04-16)**: The `@0glabs/0g-serving-broker@0.4.4` defaults to these contracts:
- ledger: `0x907a552804CECC0cBAeCf734E2B9E45b2FA6a960`
- inference: `0x192ff84e5E3Ef3A6D29F508a56bF9beb344471f3`
- fine-tuning: `0x9472Cc442354a5a3bEeA5755Ec781937aB891c10`

The installed broker silently routed to these stale defaults and `listService()` returned 0 providers. We funded a ledger on the *default* ledger contract with 0.1 OG (tx `0x75040bf8fe2461a2543c796902cb90eee97e4ef32fe6c4f99537135f938e31b4`), which succeeded — proving the call path worked but pointing at a stale registry.

**Post-Week-2 correction (April 2026, 0G core team)**: The 0G core team (Dragon/Wilbert) confirmed the canonical Galileo addresses in the APAC Dev Telegram:
- ledger: `0xE70830508dAc0A97e6c087c75f402f9Be669E406`
- inference: `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E`
- fine-tuning: `0xaC66eBd174435c04F1449BBa08157a707B6fa7b1`

We now pass these through explicitly in `ComputeClient` (see [`packages/sdk/src/compute/constants.ts`](../packages/sdk/src/compute/constants.ts)) instead of relying on broker defaults. On-chain sanity checks pass:
- `initialized() = true`
- `owner() = 0x6D233D26…`
- `ledgerAddress()` on the inference contract returns the ledger contract ✓

`getAllServices()` still reverts with empty data — but the signal is now clear: **the contracts are the right ones; no TeeML providers have registered yet**. That's a 0G-side unblock, not ours. `ComputeClient.listProviders()` tolerates the empty revert and returns `[]`, so the dev-provider path keeps the marketplace functional in preview mode.

### 0G KV — read node still unreachable

- Write path is verified working: `skillforge memory init` anchored streamId `0xd5346339…` via the Flow contract at `0x22E03a6A…` (tx `0x50a01338a40982274754d96399d5c4412f1667e0680b98aff7ff4a3feafb27e4`).
- Read path is blocked: the KV read node that every 0G example references, `http://3.101.147.150:6789`, is not reachable from the public internet (15s TCP connect timeout as of 2026-04-16).
- Integration test `memory.integration.test.ts` is gated behind `SKILLFORGE_KV_INTEGRATION=1` so it doesn't break the default suite. 0G team confirmed KV requires connecting to a dedicated node and that "there is no public auto-discovery API" — waiting on a current endpoint.

### 0G KV — read node is unreachable

- Write path is verified working: `skillforge memory init` anchored streamId `0xd5346339…` via the Flow contract at `0x22E03a6A…` (tx `0x50a01338a40982274754d96399d5c4412f1667e0680b98aff7ff4a3feafb27e4`).
- Read path is blocked: the KV read node that every 0G example references, `http://3.101.147.150:6789`, is not reachable from the public internet (15s TCP connect timeout as of 2026-04-16).
- Integration test `memory.integration.test.ts` is gated behind `SKILLFORGE_KV_INTEGRATION=1` so it doesn't break the default suite. When the read endpoint returns, set the flag and `MemoryService` becomes fully verifiable end-to-end.

### Published Galileo addresses (v2)

| Contract | Address |
| --- | --- |
| SkillINFT | `0x8486E62b5975A4241818b564834A5f51ae2540B6` |
| SkillRegistry | `0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985` |
| SkillEscrow | `0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1` |
| Flow (0G) | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` |

### Integration coverage running as of now

| Test | Status |
| --- | --- |
| publish → upload → mint → register → download → decrypt | ✅ passing against live Galileo |
| scorer attestation digest + on-chain whitelist | ✅ passing against live Galileo |
| KV write + read roundtrip | ⏸ gated on the read endpoint |
| TeeML inference | ⏸ gated on provider availability |

## Next up: Week 3

- Integration tests against real Galileo post-redeploy.
- OpenClaw MCP server + `clawhub install skillforge` packaging.
- Next.js marketplace UI.
- Subgraph for `listSkills` — the current O(n²) on-chain sort is fine for Week 2 but not Week 3 scale.
