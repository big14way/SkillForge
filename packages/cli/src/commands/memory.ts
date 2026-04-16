import { SkillForgeClient, type Hex } from '@skillforge/sdk';
import { MemoryService } from '@skillforge/services';
import { ui } from '../ui.js';

export async function runMemoryShow(): Promise<void> {
  const sdk = SkillForgeClient.fromEnv();
  if (!sdk.memory) {
    ui.fatal(
      'Memory client not configured. Set OG_KV_STREAM_ID, OG_KV_NODE_RPC, and OG_FLOW_CONTRACT_ADDRESS in your env.',
    );
  }
  const me = (await sdk.signer.getAddress()) as Hex;
  const svc = new MemoryService(sdk, me);

  ui.heading(`Memory for ${me}`);
  const profile = await svc.getProfile();
  const rep = await svc.getReputation();
  console.log('Profile:   ', profile ?? '(none)');
  console.log('Reputation:', rep);
}

export async function runMemoryHistory(): Promise<void> {
  const sdk = SkillForgeClient.fromEnv();
  if (!sdk.memory) ui.fatal('Memory client not configured.');
  const me = (await sdk.signer.getAddress()) as Hex;
  const svc = new MemoryService(sdk, me);

  ui.heading(`Recent rentals for ${me}`);
  const history = await svc.getHistory(10);
  if (history.length === 0) {
    ui.warn('no history yet');
    return;
  }
  for (const entry of history) {
    console.log(`  · ${entry.role} rental ${entry.rentalId} (score ${entry.qualityScore})`);
  }
}
