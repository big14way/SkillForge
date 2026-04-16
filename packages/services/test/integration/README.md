# Integration tests

These hit live 0G Galileo testnet and the v2 SkillForge contracts.

```bash
# One-time: fill in contracts/.env with a funded PRIVATE_KEY.
# Then from the repo root:
SKILLFORGE_INTEGRATION=1 pnpm --filter @skillforge/services test:integration
```

Each test is wrapped in `describe.skip` unless `SKILLFORGE_INTEGRATION=1` is set.

## Coverage

| File | Exercise |
| --- | --- |
| `publish.integration.test.ts` | encrypt → upload to 0G Storage → mint INFT → register → read back → decrypt. Proves the storage pipeline returns the exact bytes we uploaded. |
| `scoring.integration.test.ts` | sign a quality attestation with the deployer key, decode locally, confirm the deployer is whitelisted as a scorer on the live SkillEscrow. Doesn't touch the TeeML broker (which needs funded compute credits). |

## Not yet covered (follow-ups)

- Live TeeML inference via `ComputeClient.infer` — requires `broker.ledger.addLedger()` and a preferred provider. Gated behind `TEEML_PROVIDER_ADDRESS` being set.
- KV memory write/read — requires a provisioned `OG_KV_STREAM_ID` + `OG_FLOW_CONTRACT_ADDRESS`.
- Full rent + invoke happy path — blocked on the two above.
