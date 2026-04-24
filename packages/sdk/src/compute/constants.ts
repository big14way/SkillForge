import type { Hex } from '../types.js';

/**
 * Canonical 0G Compute contract addresses on Galileo testnet.
 *
 * The installed `@0glabs/0g-serving-broker@0.4.4` hardcodes stale defaults
 * (inference: 0x192ff84e…, ledger: 0x907a5528…, fineTuning: 0x9472Cc44…).
 * Those resolve to empty provider lists. The addresses below were confirmed
 * by the 0G core team (Dragon/Wilbert) in the 0G APAC Dev Telegram, April 2026.
 *
 * When we bump the broker version and its defaults match these, we can drop
 * the explicit pass-through in ComputeClient — but for now we always pass.
 */
export const GALILEO_COMPUTE_CONTRACTS = {
  inference: '0xa79F4c8311FF93C06b8CfB403690cc987c93F91E' as Hex,
  ledger: '0xE70830508dAc0A97e6c087c75f402f9Be669E406' as Hex,
  fineTuning: '0xaC66eBd174435c04F1449BBa08157a707B6fa7b1' as Hex,
} as const;
