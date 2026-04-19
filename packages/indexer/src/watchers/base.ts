import type { Abi, Log, PublicClient, Hex } from 'viem';
import type { Logger } from 'pino';
import type { Queries } from '../db/queries.js';

/**
 * Shape viem's `decodeEventLog` returns at runtime when the ABI isn't supplied
 * `as const` — `eventName` is a plain string and `args` is indexable.
 */
export type DecodedEvent = { eventName: string; args: Record<string, unknown> };

/**
 * Shared shape for each contract watcher. Each concrete watcher owns:
 *   - a contract address + ABI
 *   - a `handleLog` handler that decodes the event and mutates `db`
 * and relies on `BaseWatcher` for the reconcile → subscribe plumbing.
 */

export interface WatcherDeps {
  client: PublicClient;
  db: Queries;
  logger: Logger;
  confirmations: number;
}

export abstract class BaseWatcher {
  abstract readonly name: string;
  abstract readonly address: Hex;
  abstract readonly abi: Abi;
  /** Storage key in `indexer_state` that tracks the last processed block. */
  abstract readonly stateKey: string;

  private unwatch?: () => void;

  constructor(protected readonly deps: WatcherDeps) {}

  /** Entry point. First backfills from `fromBlock` to head−confirmations, then subscribes live. */
  async start(fromBlock: bigint): Promise<void> {
    const saved = this.deps.db.getIndexerState(this.stateKey);
    const start = saved ? BigInt(saved) + 1n : fromBlock;
    const head = await this.deps.client.getBlockNumber();
    const target = head > BigInt(this.deps.confirmations)
      ? head - BigInt(this.deps.confirmations)
      : 0n;

    this.deps.logger.info({ watcher: this.name, from: start.toString(), to: target.toString() }, 'reconcile start');
    if (target >= start) {
      await this.reconcile(start, target);
    }
    this.subscribe();
  }

  /** Stop listening for new logs; tests call this. */
  async stop(): Promise<void> {
    this.unwatch?.();
  }

  /**
   * Replay all matching logs between `fromBlock` and `toBlock` (inclusive).
   * Chunked to 10k blocks per getLogs call — Galileo's RPC caps ranges.
   */
  private async reconcile(fromBlock: bigint, toBlock: bigint): Promise<void> {
    const CHUNK = 9_000n;
    let cursor = fromBlock;
    while (cursor <= toBlock) {
      const end = cursor + CHUNK - 1n > toBlock ? toBlock : cursor + CHUNK - 1n;
      const logs = await this.deps.client.getContractEvents({
        address: this.address,
        abi: this.abi,
        fromBlock: cursor,
        toBlock: end,
      });
      for (const log of logs) {
        this.handleLog(log);
      }
      this.deps.db.setIndexerState(this.stateKey, end.toString());
      this.deps.logger.debug({ watcher: this.name, from: cursor.toString(), to: end.toString(), count: logs.length }, 'chunk processed');
      cursor = end + 1n;
    }
  }

  private subscribe(): void {
    this.unwatch = this.deps.client.watchContractEvent({
      address: this.address,
      abi: this.abi,
      onLogs: (logs) => {
        for (const log of logs) {
          try {
            this.handleLog(log);
            if (log.blockNumber != null) {
              this.deps.db.setIndexerState(this.stateKey, log.blockNumber.toString());
            }
          } catch (err) {
            this.deps.logger.error({ err, log }, 'watcher handleLog failed');
          }
        }
      },
      onError: (err) => {
        this.deps.logger.warn({ watcher: this.name, err: err.message }, 'watcher stream error (auto-reconnects)');
      },
    });
  }

  protected abstract handleLog(log: Log): void;

  /** Insert the raw event for audit + reconciliation. Idempotent via unique(tx_hash, log_index). */
  protected recordEvent(log: Log, eventName: string, args: unknown): void {
    if (log.blockNumber == null || log.transactionHash == null || log.logIndex == null) return;
    this.deps.db.insertEvent({
      block_number: Number(log.blockNumber),
      tx_hash: log.transactionHash,
      log_index: log.logIndex,
      contract: this.name,
      event_name: eventName,
      args: JSON.stringify(args, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
      processed_at: Date.now(),
    });
  }
}
