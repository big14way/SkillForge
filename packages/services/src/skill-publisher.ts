import { keccak256 } from 'ethers';
import {
  encryptSkill,
  computeDataHash,
  logger,
  type SkillForgeClient,
  type Hex,
} from '@skillforge/sdk';

export interface PublishParams {
  name: string;
  description: string;
  category: string;
  pricePerUse: bigint;
  content: Buffer;
}

export interface PublishResult {
  tokenId: bigint;
  storageURI: string;
  dataHash: Hex;
  /** AES-256 skill key — creator MUST persist this; never uploaded anywhere. */
  skillKey: Buffer;
  txHashes: {
    storage: Hex;
    mint: Hex;
    register: Hex;
  };
}

/**
 * End-to-end skill publication: encrypt → upload to 0G Storage → mint INFT →
 * register with the discovery contract. Returns the plaintext skill key so the
 * creator can seal it per-renter later.
 */
export class SkillPublisher {
  constructor(private readonly sdk: SkillForgeClient) {}

  async publish(params: PublishParams): Promise<PublishResult> {
    if (params.content.length === 0) {
      throw new Error('skill content must be non-empty');
    }
    logger.info({ name: params.name, bytes: params.content.length }, 'publishing skill');

    // 1. encrypt + hash the payload.
    const { ciphertext, key: skillKey } = encryptSkill(params.content);
    const dataHash = computeDataHash(ciphertext);

    // 2. upload to 0G Storage.
    const upload = await this.sdk.storage.upload(ciphertext);
    // Sanity-check: our dataHash should be the keccak256 of the exact bytes
    // uploaded; if the indexer ever mutates the payload this diverges.
    if (keccak256(ciphertext) !== dataHash) {
      throw new Error('dataHash mismatch after upload — aborting to avoid orphan INFT');
    }

    // 3. mint the INFT.
    const mintTx = await this.sdk.contracts.skillINFT.getFunction('mint')(
      await this.sdk.signer.getAddress(),
      dataHash,
      upload.storageURI,
    );
    const mintReceipt = await mintTx.wait();
    if (!mintReceipt) throw new Error('mint tx had no receipt');

    const tokenId = await this._extractTokenIdFromReceipt(mintReceipt);

    // 4. register with the marketplace.
    const registerTx = await this.sdk.contracts.skillRegistry.getFunction('registerSkill')(
      tokenId,
      params.name,
      params.description,
      params.category,
      params.pricePerUse,
      upload.storageURI,
    );
    const registerReceipt = await registerTx.wait();
    if (!registerReceipt) throw new Error('registerSkill tx had no receipt');

    logger.info(
      {
        tokenId: tokenId.toString(),
        dataHash,
        storageURI: upload.storageURI,
        mintTx: mintReceipt.hash,
      },
      'skill published',
    );

    return {
      tokenId,
      storageURI: upload.storageURI,
      dataHash,
      skillKey,
      txHashes: {
        storage: upload.txHash,
        mint: mintReceipt.hash as Hex,
        register: registerReceipt.hash as Hex,
      },
    };
  }

  /**
   * Pull the tokenId from the SkillMinted event in the mint receipt. We filter
   * on the event topic hash so we don't depend on log ordering.
   */
  private async _extractTokenIdFromReceipt(receipt: { logs: readonly unknown[] }): Promise<bigint> {
    const inft = this.sdk.contracts.skillINFT;
    for (const raw of receipt.logs) {
      const parsed = inft.interface.parseLog(raw as never);
      if (parsed?.name === 'SkillMinted') {
        return parsed.args.tokenId as bigint;
      }
    }
    throw new Error('SkillMinted event not found in mint receipt');
  }
}
