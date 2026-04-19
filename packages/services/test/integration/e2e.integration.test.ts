import { describe, it, expect, beforeAll } from 'vitest';
import { SkillForgeClient } from '@skillforge/sdk';
import { SkillPublisher } from '../../src/skill-publisher.js';
import { integrationEnabled } from './_guard.js';

const DESCRIBE =
  integrationEnabled() && process.env.SKILLFORGE_E2E === '1' ? describe : describe.skip;

/**
 * End-to-end: publish a skill, then (optionally) verify it appears on the
 * indexer API. This test is the heaviest — spins a real storage upload + two
 * on-chain txs — so it's opt-in via SKILLFORGE_E2E=1 on top of the normal
 * integration gate. Run against a running indexer at INDEXER_URL.
 */
DESCRIBE('integration: e2e publish → indexer pickup', () => {
  let sdk: SkillForgeClient;

  beforeAll(() => {
    sdk = SkillForgeClient.fromEnv();
  });

  it(
    'publishes and waits for the indexer to pick the new skill up',
    { timeout: 240_000 },
    async () => {
      const publisher = new SkillPublisher(sdk);
      const content = Buffer.from(`e2e test skill ${Date.now()}`);
      const published = await publisher.publish({
        name: `e2e-skill-${Date.now()}`,
        description: 'spawned by services e2e test',
        category: 'trading',
        pricePerUse: 1_000n,
        content,
      });

      const indexerUrl = process.env.INDEXER_URL ?? 'http://localhost:4000';
      const deadline = Date.now() + 120_000;
      let seen = false;
      while (Date.now() < deadline) {
        const res = await fetch(`${indexerUrl}/api/skills/${published.tokenId}`);
        if (res.status === 200) {
          seen = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 4_000));
      }
      expect(seen).toBe(true);
    },
  );
});
