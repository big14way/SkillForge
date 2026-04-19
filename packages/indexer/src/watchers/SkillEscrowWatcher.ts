import type { Abi, Hex, Log } from 'viem';
import { decodeEventLog } from 'viem';
import { SkillEscrowABI } from '@skillforge/sdk/contracts';
import { BaseWatcher, type DecodedEvent, type WatcherDeps } from './base.js';

/**
 * Tracks the rental state machine. The escrow doesn't emit a single
 * RentalStateChanged event — it emits one event per transition. We consolidate
 * all of them into a single `rentals` row keyed by rentalId. For each event:
 *
 *   RentalRequested   → Requested
 *   RentalFunded      → Funded
 *   AccessAuthorized  → Active
 *   WorkSubmitted     → Submitted
 *   WorkVerified      → Verified (+ quality_score)
 *   RentalCompleted   → Completed (+ completed_at)
 *   RentalDisputed    → Disputed
 *   DisputeResolved   → Completed  (+ completed_at)
 *
 * Agent rolling stats (earned / spent) are updated on RentalCompleted.
 */
export class SkillEscrowWatcher extends BaseWatcher {
  readonly name = 'SkillEscrow';
  readonly stateKey = 'skill_escrow_last_block';
  readonly abi = SkillEscrowABI as Abi;

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
      case 'RentalRequested': {
        const rentalId = String(args.rentalId);
        const skillTokenId = String(args.skillTokenId);
        const renter = (args.renter as string).toLowerCase();
        const existingSkill = this.deps.db.getSkill(skillTokenId);
        const creator = existingSkill?.creator ?? '';
        // Amount is unknown at this event — filled in at RentalFunded.
        this.deps.db.upsertRental({
          rental_id: rentalId,
          skill_token_id: skillTokenId,
          renter,
          creator,
          amount: existingSkill?.price_per_use ?? '0',
          state: 'Requested',
          created_at: Date.now(),
        });
        this.deps.db.touchAgent(renter, Date.now());
        this.deps.db.bumpAgentRented(renter);
        this.deps.logger.info({ rentalId, skillTokenId, renter }, 'RentalRequested');
        break;
      }
      case 'RentalFunded': {
        const rentalId = String(args.rentalId);
        const existing = this.deps.db.getRental(rentalId);
        if (existing) {
          this.deps.db.upsertRental({
            ...existing,
            state: 'Funded',
            amount: String(args.amount),
          });
        }
        this.deps.logger.info({ rentalId, amount: String(args.amount) }, 'RentalFunded');
        break;
      }
      case 'AccessAuthorized': {
        this.deps.db.upsertRental(this._withState(args.rentalId, 'Active'));
        break;
      }
      case 'WorkSubmitted': {
        const rentalId = String(args.rentalId);
        const existing = this.deps.db.getRental(rentalId);
        if (existing) {
          this.deps.db.upsertRental({
            ...existing,
            state: 'Submitted',
            work_proof_hash: String(args.workProofHash),
          });
        }
        break;
      }
      case 'WorkVerified': {
        const rentalId = String(args.rentalId);
        const existing = this.deps.db.getRental(rentalId);
        if (existing) {
          this.deps.db.upsertRental({
            ...existing,
            state: 'Verified',
            quality_score: Number(args.qualityScore),
          });
        }
        break;
      }
      case 'RentalCompleted': {
        const rentalId = String(args.rentalId);
        const existing = this.deps.db.getRental(rentalId);
        if (existing) {
          this.deps.db.upsertRental({
            ...existing,
            state: 'Completed',
            completed_at: Date.now(),
          });
          this.deps.db.touchAgent(existing.creator, Date.now());
        }
        this.deps.logger.info({ rentalId, creatorPayout: String(args.creatorPayout) }, 'RentalCompleted');
        break;
      }
      case 'RentalDisputed': {
        this.deps.db.upsertRental(this._withState(args.rentalId, 'Disputed'));
        break;
      }
      case 'DisputeResolved': {
        const rentalId = String(args.rentalId);
        const existing = this.deps.db.getRental(rentalId);
        if (existing) {
          this.deps.db.upsertRental({
            ...existing,
            state: 'Completed',
            completed_at: Date.now(),
          });
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Produce a rental upsert payload that only moves the state forward, leaving
   * other fields untouched. Helper used by simple state-only transitions.
   */
  private _withState(rentalIdArg: unknown, state: string) {
    const rentalId = String(rentalIdArg);
    const existing = this.deps.db.getRental(rentalId);
    if (!existing) {
      // Shouldn't happen — RentalRequested always comes first — but stay safe.
      return {
        rental_id: rentalId,
        skill_token_id: '0',
        renter: '',
        creator: '',
        amount: '0',
        state,
        created_at: Date.now(),
      };
    }
    return { ...existing, state };
  }
}
