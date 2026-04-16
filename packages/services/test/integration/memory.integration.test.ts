import { describe, it, expect, beforeAll } from 'vitest';
import { SkillForgeClient, type Hex } from '@skillforge/sdk';
import { MemoryService } from '../../src/memory-service.js';
import { integrationEnabled } from './_guard.js';

// The 0G KV read node is published at http://3.101.147.150:6789 in 0G's examples
// but is currently not reachable from the public internet (verified 2026-04-16).
// Writes succeed (anchored via the Flow contract), but reads time out. Gate this
// suite behind SKILLFORGE_KV_INTEGRATION=1 so the default integration run stays green.
const DESCRIBE =
  integrationEnabled() && process.env.SKILLFORGE_KV_INTEGRATION === '1' ? describe : describe.skip;

DESCRIBE('integration: MemoryService roundtrip against 0G KV (Galileo)', () => {
  let sdk: SkillForgeClient;
  let me: Hex;

  beforeAll(() => {
    sdk = SkillForgeClient.fromEnv();
    if (!sdk.memory) {
      throw new Error(
        'KV not configured — set OG_KV_STREAM_ID, OG_KV_NODE_RPC, OG_FLOW_CONTRACT_ADDRESS',
      );
    }
  });

  it(
    'writes a profile and reads it back through the stream',
    { timeout: 240_000 },
    async () => {
      me = (await sdk.signer.getAddress()) as Hex;
      const svc = new MemoryService(sdk, me);

      const note = `integration-${Date.now()}`;
      await svc.updateProfile({ displayName: 'integration-agent', bio: note });

      const profile = await svc.getProfile();
      expect(profile?.displayName).toBe('integration-agent');
      expect(profile?.bio).toBe(note);
    },
  );

  it(
    'rolls reputation stats forward when a rental is recorded',
    { timeout: 240_000 },
    async () => {
      const svc = new MemoryService(sdk, me);
      const before = await svc.getReputation();

      await svc.recordRental({
        rentalId: `${Date.now()}`,
        skillTokenId: '1',
        role: 'creator',
        amount: '1000000000000000',
        qualityScore: 8500,
        completedAt: Date.now(),
      });

      const after = await svc.getReputation();
      expect(after.totalRentals).toBe(before.totalRentals + 1);
    },
  );
});
