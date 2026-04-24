#!/usr/bin/env node
/**
 * Diagnostic: list TeeML providers visible through `ComputeClient` after the
 * April 2026 address correction. Safe — makes only view calls, no spending.
 *
 *   pnpm -F @skillforge/sdk build
 *   set -a && source contracts/.env && set +a
 *   node packages/sdk/scripts/check-providers.mjs
 *
 * Imports the *compiled* SDK dist rather than TS source: the 0G broker has a
 * buggy ESM re-export that tsx trips over but Node + tsc interop handles.
 */
import { ComputeClient, GALILEO_COMPUTE_CONTRACTS } from '../dist/index.js';

const rpc = process.env.GALILEO_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';
const pk = process.env.PRIVATE_KEY;
if (!pk) {
  console.error('PRIVATE_KEY missing; source contracts/.env first');
  process.exit(1);
}

console.log('— 0G Compute contract addresses in use —');
console.log('  inference :', GALILEO_COMPUTE_CONTRACTS.inference);
console.log('  ledger    :', GALILEO_COMPUTE_CONTRACTS.ledger);
console.log('  fineTuning:', GALILEO_COMPUTE_CONTRACTS.fineTuning);
console.log('');

const client = new ComputeClient({ evmRpc: rpc, privateKey: pk });
const providers = await client.listProviders();
console.log(`listService() returned ${providers.length} provider(s).`);

if (providers.length === 0) {
  console.log('');
  console.log('No providers. This either means:');
  console.log('  (a) The inference contract is deployed but no providers are registered.');
  console.log('  (b) The SDK is still silently hitting a different contract.');
  console.log('');
  console.log('Raw on-chain check:');
  console.log(
    `  cast call ${GALILEO_COMPUTE_CONTRACTS.inference} "getAllServices()" --rpc-url ${rpc}`,
  );
  process.exit(0);
}

const teeCount = providers.filter((p) => p.teeEnabled).length;
console.log(`  TeeML-enabled: ${teeCount}/${providers.length}`);
for (const p of providers) {
  console.log(
    `  · ${p.provider} · model="${p.model}" · tee=${p.teeEnabled} · verif="${p.verifiability}"`,
  );
}
