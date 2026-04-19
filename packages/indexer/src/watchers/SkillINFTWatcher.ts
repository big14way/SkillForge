import type { Abi, Hex, Log } from 'viem';
import { decodeEventLog } from 'viem';
import { SkillINFTABI } from '@skillforge/sdk/contracts';
import { BaseWatcher, type DecodedEvent, type WatcherDeps } from './base.js';

/**
 * Tracks ERC-7857 events from SkillINFT:
 *   - SkillMinted      → persisted as `data_hash` on the skill row
 *   - UsageAuthorized  → stored only in raw events table (no dedicated column)
 *   - MetadataUpdated  → updates data_hash + storage_uri on the skill
 *   - KeyResealed      → audit-only (landed in events log)
 *
 * The Registry emits SkillRegistered with the marketplace metadata; the INFT
 * only carries dataHash + storageURI. We merge the two on upsertSkill().
 */
export class SkillINFTWatcher extends BaseWatcher {
  readonly name = 'SkillINFT';
  readonly stateKey = 'skill_inft_last_block';
  readonly abi = SkillINFTABI as Abi;

  constructor(deps: WatcherDeps, readonly address: Hex) {
    super(deps);
  }

  protected handleLog(log: Log): void {
    const decoded = decodeEventLog({
      abi: this.abi,
      data: log.data,
      topics: log.topics,
    }) as unknown as DecodedEvent;
    const { eventName, args } = decoded;
    this.recordEvent(log, eventName, args);

    switch (eventName) {
      case 'SkillMinted': {
        const tokenId = String(args.tokenId);
        const creator = (args.creator as string).toLowerCase();
        const existing = this.deps.db.getSkill(tokenId);
        if (existing) {
          // Registry event already seeded the row; just backfill data_hash.
          this.deps.db.upsertSkill({
            ...existing,
            data_hash: String(args.dataHash),
          });
        } else {
          // Rare: INFT mint observed before Registry.registerSkill(). Seed
          // what we have; Registry watcher will fill the rest later.
          this.deps.db.upsertSkill({
            token_id: tokenId,
            creator,
            name: `skill-${tokenId}`,
            description: '',
            category: 'other',
            price_per_use: '0',
            storage_uri: String(args.storageURI),
            data_hash: String(args.dataHash),
            created_at: Date.now(),
          });
          this.deps.db.touchAgent(creator, Date.now());
        }
        break;
      }
      case 'MetadataUpdated': {
        const tokenId = String(args.tokenId);
        const existing = this.deps.db.getSkill(tokenId);
        if (existing) {
          this.deps.db.upsertSkill({
            ...existing,
            data_hash: String(args.newDataHash),
            storage_uri: String(args.newStorageURI),
          });
        }
        break;
      }
      case 'KeyResealed':
      case 'UsageAuthorized':
      default:
        // Audit-only — already captured in events log.
        break;
    }
  }
}
