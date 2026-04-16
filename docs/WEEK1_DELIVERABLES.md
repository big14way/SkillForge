# Week 1 Deliverables

_Status: **complete** as of 2026-04-16._

## What was built

### Contracts

| Contract | Path | Purpose |
| --- | --- | --- |
| `SkillTypes` (library) | [`contracts/src/libraries/SkillTypes.sol`](../contracts/src/libraries/SkillTypes.sol) | Shared enums + structs (`RentalState`, `Skill`, `Rental`). |
| `SkillINFT` | [`contracts/src/SkillINFT.sol`](../contracts/src/SkillINFT.sol) | ERC-7857 implementation with stub TEE-oracle proof validation + ERC-2981 royalties. |
| `SkillRegistry` | [`contracts/src/SkillRegistry.sol`](../contracts/src/SkillRegistry.sol) | Skill directory indexed by category + creator, with escrow-gated quality/usage metrics. |
| `SkillEscrow` | [`contracts/src/SkillEscrow.sol`](../contracts/src/SkillEscrow.sol) | 8-state rental lifecycle with ReentrancyGuard, Pausable, and owner-arbitrated disputes. |

### Interfaces

- [`IERC7857`](../contracts/src/interfaces/IERC7857.sol)
- [`ISkillRegistry`](../contracts/src/interfaces/ISkillRegistry.sol)
- [`ISkillEscrow`](../contracts/src/interfaces/ISkillEscrow.sol)

### Tests

- [`SkillINFT.t.sol`](../contracts/test/SkillINFT.t.sol) — 24 tests including a fuzz test on `mint` round-trip.
- [`SkillRegistry.t.sol`](../contracts/test/SkillRegistry.t.sol) — 18 tests covering indexing, access control, and top-N sorting (with inactive-skill exclusion).
- [`SkillEscrow.t.sol`](../contracts/test/SkillEscrow.t.sol) — 25 tests including the full happy path, the dispute path (both outcomes), a reentrancy harness, and a fuzz test on payout distribution.

**Totals**: 67 tests passing · 97.36% line coverage · 95.27% statement coverage · 85.45% branch coverage.

### Deployment

- [`script/Deploy.s.sol`](../contracts/script/Deploy.s.sol) wires all three contracts (INFT → Registry → Escrow) and writes a `deployments/galileo.json` artifact.
- [`.env.example`](../contracts/.env.example) documents every required env var for a Galileo broadcast.
- Dry-run succeeds locally (`forge script script/Deploy.s.sol`).

### Documentation

- [`README.md`](../README.md) — tagline, architecture mermaid diagram, 0G integration table, quick-start, license.
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — contract surface area, end-to-end rental flow, Week 2/3 extension points.
- [`docs/WEEK1_DELIVERABLES.md`](WEEK1_DELIVERABLES.md) — this file.

## Acceptance criteria

- [x] `forge build` compiles cleanly.
- [x] `forge test` shows 67/67 tests passing.
- [x] `forge coverage` reports >85% overall on every contract.
- [x] Deployment script runs in dry-run mode and emits a JSON artifact.
- [x] README has an architecture diagram + 0G integration table.
- [x] Repo has a clean conventional-commit history.
- [x] All contracts have NatSpec on public/external functions.
- [x] No `console.log` or commented-out code in `contracts/src/`.

## Out of scope (deferred to later weeks)

- Real ERC-7857 TEE oracle re-encryption (Week 2).
- 0G Storage SDK + encrypt-upload service (Week 2).
- Real TeeML attestation verification (Week 2).
- OpenClaw MCP server + `clawhub install skillforge` packaging (Week 3).
- Next.js marketplace UI (Week 3).
- Mainnet deployment + demo video (Week 4).
- AI judge for dispute resolution (Week 3+; `resolveDispute` remains `onlyOwner` for now).

## Next up: Week 2

1. TypeScript service layer that encrypts a skill payload and uploads to 0G Storage; returns `{ dataHash, storageURI }` for the on-chain `mint` call.
2. A 0G Compute TeeML runner harness: takes a `workProofHash`, executes the scoring routine inside a TEE, returns an attestation consumable by `SkillEscrow.verifyWork`.
3. Replace the stub `proof` validation in `SkillINFT.transfer` / `clone` with a real oracle-signature check once the TEE oracle key is known.
4. First live broadcast to Galileo; populate the deployed-addresses table in [`README.md`](../README.md).
