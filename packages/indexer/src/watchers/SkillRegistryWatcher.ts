import type { Abi, Log, Hex } from 'viem';
import { decodeEventLog } from 'viem';
import { SkillRegistryABI } from '@skillforge/sdk/contracts';
import { BaseWatcher, type DecodedEvent, type WatcherDeps } from './base.js';

/**
 * Consumes SkillRegistry events:
 *   - SkillRegistered       → upsert skills row, bump agents.skills_created
 *   - SkillDeactivated      → flip is_active
 *   - QualityScoreUpdated   → update skills.quality_score
 *   - RentalRecorded        → increment skills.total_rentals
 */
export class SkillRegistryWatcher extends BaseWatcher {
  readonly name = 'SkillRegistry';
  readonly stateKey = 'skill_registry_last_block';
  readonly abi = SkillRegistryABI as Abi;

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
      case 'SkillRegistered': {
        const tokenId = String(args.tokenId);
        const creator = (args.creator as string).toLowerCase();
        const ts = Date.now();
        this.deps.db.upsertSkill({
          token_id: tokenId,
          creator,
          name: `skill-${tokenId}`,              // overwritten by Registry read, but keep a placeholder
          description: '',
          category: String(args.category),
          price_per_use: String(args.pricePerUse),
          storage_uri: String(args.storageURI),
          created_at: ts,
        });
        this.deps.db.touchAgent(creator, ts);
        this.deps.db.bumpAgentCreated(creator);
        this.deps.logger.info({ tokenId, creator, category: args.category }, 'SkillRegistered');
        break;
      }
      case 'SkillDeactivated': {
        this.deps.db.deactivateSkill(String(args.tokenId));
        this.deps.logger.info({ tokenId: String(args.tokenId) }, 'SkillDeactivated');
        break;
      }
      case 'QualityScoreUpdated': {
        this.deps.db.updateSkillScore(String(args.tokenId), Number(args.newScore));
        this.deps.logger.debug({ tokenId: String(args.tokenId), score: Number(args.newScore) }, 'QualityScoreUpdated');
        break;
      }
      case 'RentalRecorded': {
        this.deps.db.incrementSkillRentals(String(args.tokenId));
        break;
      }
      default:
        // Non-state events (e.g. SkillEscrowSet) are logged via recordEvent already.
        break;
    }
  }
}
