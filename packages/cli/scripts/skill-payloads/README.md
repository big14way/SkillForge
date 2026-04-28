# Launch skill payloads

These JSON files define the 8 API wrappers SkillForge ships as its launch
lineup. Each file is the **encrypted-payload-source** for a skill: when
`seed-launch-skills.ts` runs, it reads the JSON, expands `${ENV_VAR}` tokens
against `process.env`, encrypts the result with AES-256-GCM, uploads to 0G
Storage, mints an ERC-7857 INFT, and registers the skill with metadata
pulled from the JSON's `marketplace` block.

## Schema

```jsonc
{
  "marketplace": {                  // public, on-chain via SkillRegistry
    "name": "string",               // displayed on the marketplace
    "description": "string",        // 1-2 sentences
    "category": "trading|data|content|research|automation|other",
    "pricePerUseOG": "0.001"        // human-readable OG amount
  },
  "wrapper": {                      // private, lives encrypted on 0G Storage
    "kind": "openai-chat|tavily-search|...",
    "endpoint": "https://...",
    "apiKeyEnvVar": "OAI_API_KEY",  // resolved at seed-time only
    "defaultModel": "gpt-4o-mini",
    "rateLimit": { "rpm": 60, "tpm": 100000 }
  },
  "demo": {                         // for screenshots + the demo video
    "input": { "prompt": "..." },
    "expectedOutputShape": "string"
  }
}
```

## Operating SkillForge (hackathon constraints)

For the hackathon launch, the API keys come from Gwill's accounts (free
tiers where possible). Set the env vars listed in
[`.env.example`](../../../../contracts/.env.example) before running the seed.

Post-hackathon, each skill creator brings their own key. The protocol takes
a 5% fee on every rental (already implemented in `SkillEscrow.sol`). The
encrypted payload format means the API key is only ever decrypted inside
the TEE-sealed inference; the agent never sees it.
