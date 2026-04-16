# SkillForge — Deployment History

Preserved here because `contracts/deployments/*.json` is gitignored.

## v1 — 2026-04-16 (Week 1)

_Stub ERC-7857 proof validation and stub TeeML attestation validation._

| Contract | Galileo testnet (chainId 16602) |
| --- | --- |
| SkillINFT | `0xC3a201c2Dc904ae32a9a0adea3478EB252d5Cf88` |
| SkillRegistry | `0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac` |
| SkillEscrow | `0x9C7af8B9e41555ce384a67f563Fa0d20D1dD9DFc` |
| Deployer / Treasury | `0x208B2660e5F62CDca21869b389c5aF9E7f0faE89` |

Commit: `04f2153`.

Superseded by v2 (see below).

## v2 — 2026-04-16 (Week 2)

_Real ERC-7857 oracle-signed re-encryption proofs; real scorer-whitelisted TeeML attestations in `SkillEscrow.verifyWork`._

| Contract | Galileo testnet (chainId 16602) |
| --- | --- |
| SkillINFT | `0x8486E62b5975A4241818b564834A5f51ae2540B6` |
| SkillRegistry | `0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985` |
| SkillEscrow | `0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1` |
| Deployer / Treasury / Oracle / Scorer | `0x208B2660e5F62CDca21869b389c5aF9E7f0faE89` |

Cost: ~0.021 OG. The oracle and scorer default to the deployer for Week 2's demo; rotate via `SkillINFT.setOracle` and `SkillEscrow.setScorerWhitelisted` when a dedicated service wallet is provisioned.
