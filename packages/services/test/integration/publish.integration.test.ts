import { describe, it, expect, beforeAll } from 'vitest';
import { SkillForgeClient, decryptSkill, StorageClient, type Hex } from '@skillforge/sdk';
import { SkillPublisher } from '../../src/skill-publisher.js';
import { integrationEnabled } from './_guard.js';

const DESCRIBE = integrationEnabled() ? describe : describe.skip;

DESCRIBE('integration: publish → storage roundtrip (Galileo)', () => {
  let sdk: SkillForgeClient;

  beforeAll(() => {
    sdk = SkillForgeClient.fromEnv();
  });

  it(
    'encrypts a skill, uploads to 0G, mints INFT, registers, then reads back',
    { timeout: 180_000 },
    async () => {
      const payload = Buffer.from(
        `You are Alpha Hunter v1. Given a ticker, emit a one-sentence bullish/bearish verdict with ` +
          `your confidence (0-10). TS=${Date.now()}`,
      );

      const publisher = new SkillPublisher(sdk);
      const result = await publisher.publish({
        name: `it-skill-${Date.now()}`,
        description: 'integration test skill',
        category: 'trading',
        pricePerUse: 1_000n, // 1000 wei — tiny so the test is cheap
        content: payload,
      });

      expect(result.tokenId).toBeGreaterThan(0n);
      // `StorageClient.upload` strips the `0x` prefix in the URI.
      expect(result.storageURI).toMatch(/^0g:\/\/[a-f0-9]{64}$/i);

      // Read the registered skill back through the registry.
      const skill = await sdk.getSkill(result.tokenId);
      expect(skill.creator.toLowerCase()).toBe(
        (await sdk.signer.getAddress()).toLowerCase(),
      );
      expect(skill.storageURI).toBe(result.storageURI);
      expect(skill.isActive).toBe(true);

      // Fetch + decrypt — proves the indexer returns the exact bytes we uploaded.
      const rootHash = StorageClient.parseURI(result.storageURI) as Hex;
      const ciphertext = await sdk.storage.download(rootHash);
      const decrypted = decryptSkill(ciphertext, result.skillKey);
      expect(decrypted.equals(payload)).toBe(true);
    },
  );
});
