import type { Wallet} from 'ethers';
import { getBytes, keccak256, solidityPacked } from 'ethers';
import { sealKeyForRecipient, unsealKey, logger, type Hex } from '@skillforge/sdk';

export interface HandleTransferParams {
  tokenId: bigint;
  from: Hex;
  to: Hex;
  /** Old sealed envelope the oracle can decrypt (sealed for `from` or for itself). */
  oldSealedKey: Hex;
  /** Private key used to unseal `oldSealedKey`. Must match the recipient of the old envelope. */
  oldRecipientPrivateKey: Hex;
  /** Uncompressed public key (65 bytes) of the new owner. */
  toPubKey: Hex;
}

export interface HandleTransferResult {
  newSealedKey: Hex;
  oracleProof: Hex;
}

/**
 * Re-encryption oracle for ERC-7857 transfers and clones.
 *
 * Week 2 trust model: the oracle wallet is operated by the creator (or a
 * designated helper). It unseals → re-seals → signs. The on-chain
 * SkillINFT.transfer verifies the signature was produced by the configured
 * `oracleAddress`.
 *
 * Week 4 moves this inside a TEE; the interface stays the same so callers
 * don't have to change.
 */
export class ReencryptionOracle {
  constructor(private readonly oracleWallet: Wallet) {}

  /** Address clients should register as `oracleAddress` on SkillINFT. */
  get address(): Hex {
    return this.oracleWallet.address as Hex;
  }

  async handleTransfer(params: HandleTransferParams): Promise<HandleTransferResult> {
    // 1. unseal the old envelope.
    const skillKey = unsealKey(params.oldSealedKey, params.oldRecipientPrivateKey);

    // 2. re-seal for the new recipient.
    const newSealedKey = sealKeyForRecipient(skillKey, params.toPubKey);

    // 3. sign the transfer-proof digest the on-chain SkillINFT expects:
    //    keccak256(abi.encodePacked(tokenId, from, to, keccak256(newSealedKey))).
    const sealedKeyDigest = keccak256(newSealedKey) as Hex;
    const packedDigest = keccak256(
      solidityPacked(
        ['uint256', 'address', 'address', 'bytes32'],
        [params.tokenId, params.from, params.to, sealedKeyDigest],
      ),
    ) as Hex;
    const oracleProof = this.oracleWallet.signingKey.sign(getBytes(packedDigest)).serialized as Hex;

    logger.debug(
      { tokenId: params.tokenId.toString(), from: params.from, to: params.to },
      'oracle re-encryption done',
    );

    return { newSealedKey, oracleProof };
  }
}
