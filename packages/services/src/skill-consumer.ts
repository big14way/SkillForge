import { keccak256, toUtf8Bytes } from 'ethers';
import {
  decryptSkill,
  unsealKey,
  StorageClient,
  logger,
  type Attestation,
  type SkillForgeClient,
  type Hex,
} from '@skillforge/sdk';

export interface RentAndInvokeParams {
  tokenId: bigint;
  invocationInput: string;
  /** The renter's private key. Used to unseal the skill key provided by the creator. */
  renterPrivateKey: Hex;
  /**
   * Sealed skill key. In the production flow this is delivered via the
   * AccessAuthorized event. For Week 2 we pass it in explicitly so both the
   * CLI and integration test can drive the flow without an off-chain channel.
   */
  sealedSkillKey: Hex;
  /** Optional: a specific TeeML provider to use. Otherwise first available wins. */
  provider?: Hex;
}

export interface RentAndInvokeResult {
  rentalId: bigint;
  output: string;
  attestation: Attestation;
  /** Verification bit from the 0G broker's processResponse. */
  verified: boolean | null;
}

/**
 * End-to-end rental: request → fund → wait for authorize → fetch + decrypt →
 * infer → submit work proof.
 *
 * The `verifyWork` / `completeRental` steps are *not* called here — they
 * require the scorer oracle to produce a signed quality score and are driven
 * by {@link QualityScorer} in a separate step.
 */
export class SkillConsumer {
  constructor(private readonly sdk: SkillForgeClient) {}

  async rentAndInvoke(params: RentAndInvokeParams): Promise<RentAndInvokeResult> {
    logger.info({ tokenId: params.tokenId.toString() }, 'requesting rental');

    const skill = await this.sdk.getSkill(params.tokenId);
    if (!skill.isActive) throw new Error(`skill ${params.tokenId} is inactive`);

    // 1. request + fund.
    const reqTx = await this.sdk.contracts.skillEscrow.getFunction('requestRental')(params.tokenId);
    const reqReceipt = await reqTx.wait();
    if (!reqReceipt) throw new Error('requestRental receipt missing');
    const rentalId = this._extractRentalId(reqReceipt);

    const fundTx = await this.sdk.contracts.skillEscrow.getFunction('fundRental')(rentalId, {
      value: skill.pricePerUse,
    });
    await fundTx.wait();

    // 2. the creator calls authorizeAccess off-band; we poll the rental state
    //    (see below for an event-driven variant in Week 3).
    await this._waitForState(rentalId, /* Active */ 3, 30_000);

    // 3. unseal the skill key, download + decrypt the payload.
    const skillKey = unsealKey(params.sealedSkillKey, params.renterPrivateKey);
    const rootHash = StorageClient.parseURI(skill.storageURI);
    const ciphertext = await this.sdk.storage.download(rootHash);
    const plaintext = decryptSkill(ciphertext, skillKey);

    // 4. run inference through TeeML, passing skill + input together.
    const messages = [
      { role: 'system' as const, content: plaintext.toString('utf8') },
      { role: 'user' as const, content: params.invocationInput },
    ];
    const inference = await this.sdk.compute.infer({
      messages,
      ...(params.provider !== undefined && { provider: params.provider }),
    });

    // 5. submit the work proof: keccak256(output || chatID || provider).
    const workProofHash = keccak256(
      toUtf8Bytes(`${inference.content}|${inference.chatID}|${inference.provider}`),
    ) as Hex;
    const submitTx = await this.sdk.contracts.skillEscrow.getFunction('submitWork')(
      rentalId,
      workProofHash,
    );
    await submitTx.wait();

    const attestation: Attestation = {
      requestHash: keccak256(toUtf8Bytes(JSON.stringify(messages))) as Hex,
      responseHash: keccak256(toUtf8Bytes(inference.content)) as Hex,
      provider: inference.provider,
      qualityScore: 0, // filled in by QualityScorer when it signs
      chatID: inference.chatID,
      signatureLink: await this.sdk.compute.getAttestationLink(
        inference.provider,
        inference.chatID,
      ),
    };

    return {
      rentalId,
      output: inference.content,
      attestation,
      verified: inference.verified,
    };
  }

  private _extractRentalId(receipt: { logs: readonly unknown[] }): bigint {
    const escrow = this.sdk.contracts.skillEscrow;
    for (const raw of receipt.logs) {
      const parsed = escrow.interface.parseLog(raw as never);
      if (parsed?.name === 'RentalRequested') {
        return parsed.args.rentalId as bigint;
      }
    }
    throw new Error('RentalRequested event not found');
  }

  /**
   * Poll `getRental(rentalId).state` until it matches `targetState` or we
   * time out. Replaced with WebSocket events in Week 3.
   */
  private async _waitForState(rentalId: bigint, targetState: number, timeoutMs: number): Promise<void> {
    const start = Date.now();
    const escrow = this.sdk.contracts.skillEscrow;
    while (Date.now() - start < timeoutMs) {
      const rental = (await escrow.getFunction('getRental').staticCall(rentalId)) as unknown as {
        state: bigint;
      };
      if (Number(rental.state) === targetState) return;
      await new Promise((r) => setTimeout(r, 2_000));
    }
    throw new Error(`rental ${rentalId} did not reach state ${targetState} within ${timeoutMs}ms`);
  }
}
