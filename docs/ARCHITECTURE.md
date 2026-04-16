# SkillForge — Architecture

This document describes the on-chain and off-chain surface area of SkillForge as delivered in Week 1, and the extension points that Weeks 2 – 4 consume.

## 1. Contracts overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                           0G Chain (Galileo)                          │
│                                                                       │
│   ┌──────────────┐    registerSkill()   ┌────────────────┐            │
│   │  SkillINFT   │◄──────────────────── │ SkillRegistry  │            │
│   │  (ERC-7857)  │    ownerOf()         │                │            │
│   │              │────────────────────► │                │            │
│   └─────┬────────┘                      └──────┬─────────┘            │
│         │ authorizeUsage()                     │ updateQualityScore() │
│         │                                      │ incrementRentals()   │
│         ▼                                      ▲                      │
│   ┌──────────────────────────────────────────┴──────────────────┐    │
│   │                         SkillEscrow                          │    │
│   │  Requested → Funded → Active → Submitted → Verified → Done   │    │
│   │                                   │                          │    │
│   │                                   └─► Disputed → Done        │    │
│   └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.1 SkillINFT (`contracts/src/SkillINFT.sol`)

Implements **ERC-7857** on top of OpenZeppelin's `ERC721` and `ERC2981`. Each token represents the on-chain ownership claim to an encrypted off-chain payload (strategy, prompt, pipeline) stored on 0G Storage.

- `mint(to, dataHash, storageURI)` — registers a new skill token with the hash of the encrypted payload and its storage URI.
- `transfer(from, to, tokenId, sealedKey, proof)` — transfers the token plus a re-encrypted key and an oracle attestation. **Week 1 stub**: validates non-empty `sealedKey` / `proof`. **Week 2**: verifies a 0G Compute TeeML attestation that proves the payload was re-sealed for the recipient.
- `clone(tokenId, to, sealedKey, proof)` — identical semantics, but mints a new token with the same underlying payload (for scale-out delegation).
- `authorizeUsage(tokenId, user, expiresAt)` — callable by the token owner **or an approved operator** (e.g. SkillEscrow). Grants `user` a time-boxed right to use the skill.
- `isAuthorized(tokenId, user)` — non-view by design: simple comparison of stored expiry to `block.timestamp`.
- ERC-2981 royalty: 5% to the creator on all secondary sales.

### 1.2 SkillRegistry (`contracts/src/SkillRegistry.sol`)

Discovery + indexing. Every published skill is keyed by its INFT `tokenId` and indexed by **category** and **creator**.

- `registerSkill(...)` — only the current INFT owner may register their token.
- `updateQualityScore(tokenId, newScore)` — access-restricted to the configured `SkillEscrow` address. Scores are basis points (0 – 10000) so a fixed-point fraction never needs to be reconstructed.
- `incrementRentals(tokenId)` — access-restricted to `SkillEscrow`.
- `getTopSkills(limit)` — returns up to `limit` active skills sorted by quality descending. Uses an O(n²) selection sort over a scratch array; fine for Week 1 scale (≤ low hundreds), Week 3 indexer takes over.

### 1.3 SkillEscrow (`contracts/src/SkillEscrow.sol`)

The **8-state rental machine**. Every transition checks the current `RentalState`, updates storage, and emits an event.

| From | Action | To | Caller |
| --- | --- | --- | --- |
| `None` | `requestRental` | `Requested` | renter |
| `Requested` | `fundRental` | `Funded` | renter (exact `pricePerUse`) |
| `Funded` | `authorizeAccess` | `Active` | creator (also calls `SkillINFT.authorizeUsage`) |
| `Active` | `submitWork` | `Submitted` | renter (provides `workProofHash`) |
| `Submitted` | `verifyWork` | `Verified` | anyone with a valid TeeML attestation (Week 1: format only) |
| `Submitted` | `dispute` | `Disputed` | either renter or creator |
| `Verified` | `completeRental` | `Completed` | anyone (triggers payout + registry update) |
| `Disputed` | `resolveDispute` | `Completed` | contract owner (Week 1) / AI judge (later) |

**Payment flow on completion**: `price * protocolFeeBps / 10_000` → treasury, remainder → creator. Dispute resolution either refunds the full amount to the renter or runs the same 95/5 split.

**Security stance**:
- `ReentrancyGuard` on `fundRental`, `completeRental`, `resolveDispute`.
- `Pausable` on every external state mutator so the owner can freeze the protocol during an incident.
- Custom errors (no revert strings) to keep deployment + failure paths cheap.
- Payouts use OpenZeppelin `Address.sendValue`.

## 2. Data flow: a rental end-to-end

1. **Creator** calls `SkillINFT.mint(creator, keccak256(payload), "og://skills/xxx")`. A pointer to the encrypted payload on 0G Storage is recorded on-chain.
2. Creator calls `SkillRegistry.registerSkill(tokenId, name, description, category, pricePerUse, storageURI)`. The skill now appears in discovery queries.
3. **Renter** discovers the skill via `getSkillsByCategory` / `getTopSkills`, then calls `requestRental(tokenId)` on `SkillEscrow`. A new rental record is created in state `Requested`.
4. Renter `fundRental(rentalId)` with `msg.value == pricePerUse`. State → `Funded`.
5. Creator grants `SkillEscrow` approval (one-time `setApprovalForAll`), then calls `authorizeAccess(rentalId)`. Escrow flips state to `Active` and delegates a time-boxed usage grant to the renter on the INFT.
6. Renter fetches the ciphertext from 0G Storage, decrypts via their sealed key, executes the skill. Submits `workProofHash` (e.g. keccak256 of the outputs). State → `Submitted`.
7. A TeeML run on 0G Compute ingests the work, produces a quality score + attestation, and any third party calls `verifyWork(rentalId, score, attestation)`. State → `Verified`.
8. Anyone calls `completeRental(rentalId)`. Escrow pushes the score + rental increment to the registry, pays the creator (95%) and treasury (5%), state → `Completed`.

The dispute path branches off step 6: either party calls `dispute(rentalId)`, owner arbitration decides whether to refund the renter or release funds to the creator.

## 3. Off-chain components (Weeks 2 – 3)

- **0G Storage gateway** (Week 2): TypeScript module that encrypts a skill payload, uploads to 0G Storage, and returns `{ dataHash, storageURI }` for on-chain registration.
- **0G Compute TeeML runner** (Week 2): harness that executes a renter's submitted proof inside a TEE, emits the attestation consumed by `verifyWork`.
- **OpenClaw MCP server** (Week 3): exposes marketplace operations (`search`, `rent`, `submit`, `fetch`) over the Model Context Protocol so agents can call SkillForge as a plain skill.
- **Next.js marketplace UI** (Week 3): browsing, publishing, and rental management for creators/renters that prefer a web surface.

## 4. Extension points the contracts expose today

- `SkillINFT.transfer / clone` — `proof` argument is pre-allocated for the 0G Compute TeeML re-encryption verifier.
- `SkillEscrow.verifyWork` — `teemlAttestation` argument is pre-allocated for the same verifier.
- `SkillRegistry.updateQualityScore` — constrained to `SkillEscrow`, but the escrow itself is intentionally minimal about where the score comes from — in Week 2 it will accept a signed TeeML blob.
- `SkillEscrow.resolveDispute` — `onlyOwner` today; Week 3 can swap in an AI-judge contract without touching the happy path.

## 5. Testing posture

- 67 unit + fuzz tests, all passing, >85% branch coverage on every contract.
- Happy-path and revert paths are both exercised for every state transition.
- A dedicated reentrancy harness proves the `ReentrancyGuard` on `completeRental` holds against a malicious creator.
- A fuzz test asserts that the 95/5 payout split holds for any combination of price and protocol fee.
