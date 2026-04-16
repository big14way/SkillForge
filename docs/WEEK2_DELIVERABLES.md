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

## Blockers before "done"

1. **v2 redeploy authorization.** Week 1 addresses (`0xC3a2…`, `0xde5e…`, `0x9C7a…`) are live and referenced in the README + HackQuest. Redeploy replaces all three — one-way action that invalidates any external references already made. Command to run (pending user approval):
   ```bash
   cd contracts
   set -a && source .env && set +a
   forge script script/Deploy.s.sol --rpc-url "$GALILEO_RPC_URL" --broadcast \
     --private-key "$PRIVATE_KEY" --priority-gas-price 2000000000 --with-gas-price 3000000000
   ```
2. **0G KV stream id.** The testnet requires a stream to be provisioned once; `skillforge init` will be extended in a follow-up to provision + persist it.
3. **TeeML provider address.** Fill `TEEML_PROVIDER_ADDRESS` in `.env` after running `listService()` against the broker on a funded wallet.

## Next up: Week 3

- Integration tests against real Galileo post-redeploy.
- OpenClaw MCP server + `clawhub install skillforge` packaging.
- Next.js marketplace UI.
- Subgraph for `listSkills` — the current O(n²) on-chain sort is fine for Week 2 but not Week 3 scale.
