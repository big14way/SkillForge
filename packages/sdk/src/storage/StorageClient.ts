import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonRpcProvider, Wallet } from 'ethers';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { logger } from '../logger.js';
import type { Hex } from '../types.js';

/**
 * Wraps `Indexer` from @0gfoundation/0g-ts-sdk to expose a Buffer-in / Buffer-out
 * surface that matches our service-layer needs.
 *
 * 0G Storage is content-addressable: every uploaded blob is identified by the
 * keccak256 of its merkle root. The same blob uploaded twice yields the same
 * root hash, which is convenient because it lets us use {@link rootHashFor}
 * client-side to dedupe before paying for storage.
 */

export interface StorageClientConfig {
  /** Indexer RPC, e.g. https://indexer-storage-testnet-turbo.0g.ai */
  indexerRpc: string;
  /** Galileo EVM RPC, e.g. https://evmrpc-testnet.0g.ai */
  evmRpc: string;
  /** Private key for the wallet that pays for uploads. */
  privateKey: Hex;
  /** Number of replicas to request (default 1, fine for testnet). */
  expectedReplicas?: number;
}

export interface StorageUploadResult {
  /** keccak256-derived merkle root of the uploaded blob. */
  rootHash: Hex;
  /** Transaction hash on 0G Chain that anchored the upload. */
  txHash: Hex;
  /** Canonical SkillForge URI: `0g://<rootHash>`. */
  storageURI: string;
}

export class StorageError extends Error {
  override name = 'StorageError';
}

export class StorageClient {
  private readonly indexer: Indexer;
  private readonly signer: Wallet;
  private readonly evmRpc: string;

  constructor(config: StorageClientConfig) {
    const provider = new JsonRpcProvider(config.evmRpc);
    this.signer = new Wallet(config.privateKey, provider);
    this.indexer = new Indexer(config.indexerRpc);
    this.evmRpc = config.evmRpc;
    // expectedReplicas is reserved for a future opts arg to indexer.upload.
    void config.expectedReplicas;
  }

  /**
   * Upload a blob and return its on-chain commitment. The 0G SDK wraps every
   * call in a `[result, error]` tuple — we surface errors as thrown
   * {@link StorageError} for ergonomics.
   */
  async upload(data: Buffer): Promise<StorageUploadResult> {
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new StorageError('upload: data must be a non-empty Buffer');
    }
    const file = new MemData(Uint8Array.from(data));

    logger.debug({ bytes: data.length }, 'StorageClient.upload start');
    // Cast: 0g-ts-sdk types pull in ethers via dual ESM/CJS so the Wallet from
    // our ethers v6 ESM build is structurally identical but nominally distinct.
    const [result, err] = await this.indexer.upload(file, this.evmRpc, this.signer as never);
    if (err) {
      throw new StorageError(`upload failed: ${err.message ?? String(err)}`);
    }
    if (!result || !('rootHash' in result)) {
      throw new StorageError(`upload returned unexpected shape: ${JSON.stringify(result)}`);
    }
    const rootHash = result.rootHash as Hex;
    const txHash = result.txHash as Hex;
    logger.info({ rootHash, txHash }, 'StorageClient.upload ok');
    return {
      rootHash,
      txHash,
      storageURI: `0g://${rootHash.startsWith('0x') ? rootHash.slice(2) : rootHash}`,
    };
  }

  /**
   * Download a blob by root hash. The 0G SDK only writes to a file path, so we
   * stream into a tempfile, read it back, and clean up. The merkle proof is
   * verified client-side when `withProof=true`.
   */
  async download(rootHash: Hex, withProof = true): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'skillforge-dl-'));
    const path = join(dir, 'blob');
    try {
      const err = await this.indexer.download(rootHash, path, withProof);
      if (err) {
        throw new StorageError(`download failed: ${err.message ?? String(err)}`);
      }
      return await readFile(path);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  /**
   * Cheap existence check via the indexer's locator. Returns true iff at least
   * one storage node reports holding the file.
   */
  async exists(rootHash: Hex): Promise<boolean> {
    try {
      const nodes = await this.indexer.getFileLocations(rootHash);
      return nodes.length > 0;
    } catch (err) {
      logger.debug({ rootHash, err: (err as Error).message }, 'exists() lookup miss');
      return false;
    }
  }

  /** Parse a `0g://<rootHash>` URI back into its 0x-prefixed root hash. */
  static parseURI(uri: string): Hex {
    if (!uri.startsWith('0g://')) {
      throw new StorageError(`not a 0g URI: ${uri}`);
    }
    const tail = uri.slice('0g://'.length);
    const hex = tail.startsWith('0x') ? tail : `0x${tail}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) {
      throw new StorageError(`malformed root hash in URI: ${uri}`);
    }
    return hex as Hex;
  }
}
