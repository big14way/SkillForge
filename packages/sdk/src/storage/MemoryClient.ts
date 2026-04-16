import { JsonRpcProvider, Wallet, encodeBase64 } from 'ethers';
import { Batcher, Indexer, KvClient, getFlowContract } from '@0gfoundation/0g-ts-sdk';
import { logger } from '../logger.js';
import type { Hex } from '../types.js';

/**
 * Wraps the 0G Storage KV primitives into a typed key/value store.
 *
 * Schema convention (set by the SkillForge service layer, not enforced here):
 *   agent:{address}:profile             — JSON profile
 *   agent:{address}:reputation          — JSON rolling stats
 *   agent:{address}:history:{ts}        — append-only rental history
 *   skill:{tokenId}:invocations:{ts}    — per-rental invocation log
 *   skill:{tokenId}:stats               — aggregate stats
 *
 * 0G Storage KV is *append-only* under the hood — every write produces a new
 * version. We treat the most recent version as the current value. Deletes are
 * implemented by writing a magic tombstone payload that {@link MemoryClient.get}
 * recognizes.
 */

const TOMBSTONE = Buffer.from('__SKILLFORGE_TOMBSTONE__');

export interface MemoryClientConfig {
  /** KV node RPC, e.g. http://3.101.147.150:6789 (Galileo testnet). */
  kvNodeRpc: string;
  /** Storage indexer (used to discover write nodes for the batcher). */
  indexerRpc: string;
  /** Galileo EVM RPC. */
  evmRpc: string;
  /** Wallet that pays for KV writes. */
  privateKey: Hex;
  /** The 32-byte stream id under which all SkillForge keys live. */
  streamId: Hex;
  /** Address of the 0G Flow contract (testnet-specific). */
  flowContractAddress: Hex;
  /** Builder version; default 1 (matches SDK default). */
  version?: number;
}

export class MemoryError extends Error {
  override name = 'MemoryError';
}

export class MemoryClient {
  private readonly cfg: Required<MemoryClientConfig>;
  private readonly signer: Wallet;
  private readonly indexer: Indexer;
  private readonly reader: KvClient;

  constructor(config: MemoryClientConfig) {
    this.cfg = { version: 1, ...config };
    const provider = new JsonRpcProvider(config.evmRpc);
    this.signer = new Wallet(config.privateKey, provider);
    this.indexer = new Indexer(config.indexerRpc);
    this.reader = new KvClient(config.kvNodeRpc);
  }

  /** JSON-encode `value` and write to the configured stream. */
  async set(key: string, value: unknown): Promise<void> {
    const payload = Buffer.from(JSON.stringify(value));
    await this._write(key, payload);
  }

  /** Retrieve and JSON-parse the most recent value at `key`, or null if absent. */
  async get<T = unknown>(key: string): Promise<T | null> {
    const keyB64 = encodeBase64(this._encodeKey(key));
    // KV client types declare `Bytes` (= ArrayLike<number>) but every example
    // and the runtime accept a base64 string. Cast to bypass the stale type.
    const value = await this.reader.getValue(this.cfg.streamId, keyB64 as never);
    if (!value || !value.data) return null;
    const buf = this._dataToBuffer(value.data);
    if (buf.equals(TOMBSTONE)) return null;
    try {
      return JSON.parse(buf.toString('utf8')) as T;
    } catch (err) {
      throw new MemoryError(`get(${key}): value is not JSON: ${(err as Error).message}`);
    }
  }

  /** Soft-delete via tombstone write. KV is append-only at the protocol layer. */
  async delete(key: string): Promise<void> {
    await this._write(key, TOMBSTONE);
  }

  /**
   * Append an entry to a logical stream by suffixing the key with a
   * monotonic timestamp. Convention used by callers who want history logs:
   *   `client.append('agent:0xabc:history', { rentalId, score, ts })`
   */
  async append(streamKey: string, entry: unknown): Promise<void> {
    const ts = Date.now().toString().padStart(13, '0');
    await this.set(`${streamKey}:${ts}`, entry);
  }

  /**
   * List the most recent N entries for a logical stream. Walks the iterator
   * back from the latest timestamped key under `prefix`.
   *
   * Note: `KvClient.newIterator` returns a forward iterator over a stream;
   * for efficient "tail" reads we'd want a reverse iterator. Until 0G ships
   * one, we cap by limit and rely on the fact that timestamp-suffixed keys
   * sort lexicographically.
   */
  async list(prefix: string, limit = 50): Promise<Array<{ key: string; value: unknown }>> {
    const results: Array<{ key: string; value: unknown }> = [];
    const iter = this.reader.newIterator(this.cfg.streamId);
    // Seek to first key >= prefix.
    const seekKey = encodeBase64(this._encodeKey(prefix));
    const start = await this.reader.getNext(this.cfg.streamId, seekKey as never, 0, 1024, true);
    if (!start || !start.key) return results;

    let cursor = start;
    while (cursor && cursor.key && results.length < limit) {
      const decodedKey = this._dataToBuffer(cursor.key).toString('utf8');
      if (!decodedKey.startsWith(prefix)) break;
      const valueBuf = this._dataToBuffer(cursor.data ?? '');
      if (!valueBuf.equals(TOMBSTONE)) {
        try {
          results.push({ key: decodedKey, value: JSON.parse(valueBuf.toString('utf8')) });
        } catch {
          // skip non-JSON entries — likely user error
        }
      }
      const next = await this.reader.getNext(this.cfg.streamId, cursor.key as never, 0, 1024, false);
      if (!next || !next.key || next.key === cursor.key) break;
      cursor = next;
    }
    void iter; // iterator is unused at the moment; reserved for future range scans
    return results;
  }

  /** SDK returns `Bytes` (string|ArrayLike<number>) — coerce uniformly. */
  private _dataToBuffer(data: unknown): Buffer {
    if (typeof data === 'string') return Buffer.from(data, 'base64');
    if (data instanceof Uint8Array) return Buffer.from(data);
    return Buffer.from(data as ArrayLike<number>);
  }

  /** Write `payload` to `key`, paying gas. Used internally by set/append/delete. */
  private async _write(key: string, payload: Buffer): Promise<void> {
    const [nodes, nodesErr] = await this.indexer.selectNodes(1);
    if (nodesErr || !nodes || nodes.length === 0) {
      throw new MemoryError(`selectNodes failed: ${nodesErr?.message ?? 'no nodes'}`);
    }
    // ethers v6 Wallet vs SDK's dual-export Signer type — see StorageClient.
    const flow = getFlowContract(this.cfg.flowContractAddress, this.signer as never);
    const batcher = new Batcher(this.cfg.version, nodes, flow, this.cfg.evmRpc);
    batcher.streamDataBuilder.set(
      this.cfg.streamId,
      this._encodeKey(key),
      Uint8Array.from(payload),
    );
    const [tx, err] = await batcher.exec();
    if (err) {
      throw new MemoryError(`KV write failed: ${err.message ?? String(err)}`);
    }
    logger.debug({ key, txHash: tx.txHash, rootHash: tx.rootHash }, 'MemoryClient write ok');
  }

  private _encodeKey(key: string): Uint8Array {
    return new TextEncoder().encode(key);
  }
}
