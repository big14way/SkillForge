import { encrypt as eciesEncrypt, decrypt as eciesDecrypt, PublicKey } from 'eciesjs';
import { computeAddress, getBytes, hexlify } from 'ethers';
import type { Hex } from '../types.js';
import { CryptoError } from './aes.js';

/**
 * Sealed-key envelopes via ECIES on secp256k1.
 *
 * Why ECIES? Every Ethereum wallet already carries a secp256k1 keypair, so we
 * can seal a symmetric skill key for any wallet by their public key with no
 * additional key management on the renter side. The eciesjs library is the
 * same one the 0G compute broker uses internally, so we share crypto with the
 * provider stack and avoid surface for accidental incompatibilities.
 *
 * Public-key format: 65-byte uncompressed (0x04 || X || Y) — the format ethers
 * gives via `Wallet.signingKey.publicKey`. We accept either the 0x-prefixed hex
 * string or a raw Hex value.
 */

/** Length of an uncompressed secp256k1 public key in bytes (0x04 prefix + 64). */
const UNCOMPRESSED_PUBKEY_BYTES = 65;

/**
 * Seal `skillKey` (32-byte symmetric key) so that only the holder of the
 * private key matching `recipientPubKey` can recover it.
 */
export function sealKeyForRecipient(skillKey: Buffer, recipientPubKey: Hex): Hex {
  const pubKeyBytes = getBytes(recipientPubKey);
  if (pubKeyBytes.length !== UNCOMPRESSED_PUBKEY_BYTES) {
    throw new CryptoError(
      `recipient pubkey must be ${UNCOMPRESSED_PUBKEY_BYTES} bytes uncompressed, got ${pubKeyBytes.length}`,
    );
  }
  // eciesjs accepts either the raw 65-byte uncompressed key or the
  // PublicKey wrapper. Wrapping it makes intent explicit.
  const recipient = new PublicKey(Buffer.from(pubKeyBytes));
  const sealed = eciesEncrypt(recipient.toHex(), skillKey);
  return hexlify(sealed) as Hex;
}

/**
 * Recover the original symmetric key from an envelope produced by
 * {@link sealKeyForRecipient} using the recipient's private key.
 */
export function unsealKey(sealedEnvelope: Hex, recipientPrivateKey: Hex): Buffer {
  const sealedBytes = getBytes(sealedEnvelope);
  const skBytes = getBytes(recipientPrivateKey);
  if (skBytes.length !== 32) {
    throw new CryptoError(`private key must be 32 bytes, got ${skBytes.length}`);
  }
  try {
    const decrypted = eciesDecrypt(Buffer.from(skBytes), Buffer.from(sealedBytes));
    return Buffer.from(decrypted);
  } catch (err) {
    throw new CryptoError(`ECIES unseal failed: ${(err as Error).message}`);
  }
}

/**
 * Convenience: derive the Ethereum address that corresponds to a given
 * uncompressed public key. Useful when an event carries a sealedKey along
 * with a recipient pubkey and we want to sanity-check who it was sealed for.
 */
export function deriveAddressFromPubKey(pubKey: Hex): Hex {
  return computeAddress(pubKey) as Hex;
}
