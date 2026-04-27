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
        // Initial placeholder upsert — `name` and `description` are not in the
        // event, so we seed them with safe values. The async `enrichFromRegistry`
        // call below replaces them with the real on-chain values via
        // `Registry.getSkill(tokenId)`.
        this.deps.db.upsertSkill({
          token_id: tokenId,
          creator,
          name: `skill-${tokenId}`,
          description: '',
          category: String(args.category),
          price_per_use: String(args.pricePerUse),
          storage_uri: String(args.storageURI),
          created_at: ts,
        });
        this.deps.db.touchAgent(creator, ts);
        this.deps.db.bumpAgentCreated(creator);
        this.deps.logger.info({ tokenId, creator, category: args.category }, 'SkillRegistered');
        // Fire-and-forget — never block the event loop on RPC, but log failures.
        void this.enrichFromRegistry(tokenId);
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

  /**
   * Reads the full Skill struct from the registry via `getSkill(tokenId)` and
   * patches the SQLite row with the real `name` + `description`. The
   * SkillRegistered event omits these fields, so the watcher's initial upsert
   * leaves the marketplace UI showing placeholder names like "skill-4". This
   * call closes that gap.
   *
   * Best-effort: any RPC failure is logged but does not throw — the placeholder
   * row stays in place and the backfill script can re-run later.
   */
  async enrichFromRegistry(tokenId: string): Promise<void> {
    try {
      const skill = (await this.deps.client.readContract({
        address: this.address,
        abi: this.abi,
        functionName: 'getSkill',
        args: [BigInt(tokenId)],
      })) as {
        creator: string;
        name: string;
        description: string;
        category: string;
        pricePerUse: bigint;
        qualityScore: bigint;
        totalRentals: bigint;
        storageURI: string;
        metadataHash: string;
        isActive: boolean;
        createdAt: bigint;
      };
      // Preserve created_at from the existing row so we don't bounce the UI's
      // "published Xh ago" text on every re-fetch.
      const existing = this.deps.db.getSkill(tokenId);
      this.deps.db.upsertSkill({
        token_id: tokenId,
        creator: skill.creator.toLowerCase(),
        name: skill.name,
        description: skill.description,
        category: skill.category,
        price_per_use: skill.pricePerUse.toString(),
        storage_uri: skill.storageURI,
        created_at: existing?.created_at ?? Number(skill.createdAt) * 1000,
      });
      this.deps.logger.debug(
        { tokenId, name: skill.name, description: skill.description.slice(0, 60) },
        'enrichFromRegistry ok',
      );
    } catch (err) {
      this.deps.logger.warn(
        { tokenId, err: (err as Error).message },
        'enrichFromRegistry failed; placeholder stays — re-run backfill script later',
      );
    }
  }
}
