import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { keccak256 } from 'ethers';
import type { Hex } from '../types.js';

/**
 * AES-256-GCM encryption for skill payloads.
 *
 * Wire format: [nonce(12 bytes)] || [ciphertext(N)] || [authTag(16 bytes)]
 *
 * The nonce is generated freshly per call. We rely on AES-GCM's authenticated
 * encryption: any tampering with the ciphertext, nonce, or tag causes
 * `decryptSkill` to throw.
 */

const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

export class CryptoError extends Error {
  override name = 'CryptoError';
}

export interface EncryptResult {
  ciphertext: Buffer;
  key: Buffer;
}

/**
 * Encrypt `plaintext` with a freshly generated 256-bit key. Returns both the
 * ciphertext and the key — the caller is responsible for sealing the key for
 * the eventual recipient via {@link sealKeyForRecipient}.
 */
export function encryptSkill(plaintext: Buffer): EncryptResult {
  if (!Buffer.isBuffer(plaintext)) {
    throw new CryptoError('plaintext must be a Buffer');
  }
  const key = randomBytes(KEY_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([nonce, encrypted, tag]),
    key,
  };
}

/**
 * Decrypt an AES-GCM blob produced by {@link encryptSkill}. Throws if the key
 * is wrong, the nonce/tag are corrupted, or the wire format is malformed.
 */
export function decryptSkill(ciphertext: Buffer, key: Buffer): Buffer {
  if (key.length !== KEY_BYTES) {
    throw new CryptoError(`key must be ${KEY_BYTES} bytes, got ${key.length}`);
  }
  if (ciphertext.length < NONCE_BYTES + TAG_BYTES) {
    throw new CryptoError('ciphertext too short to contain nonce and auth tag');
  }
  const nonce = ciphertext.subarray(0, NONCE_BYTES);
  const tag = ciphertext.subarray(ciphertext.length - TAG_BYTES);
  const body = ciphertext.subarray(NONCE_BYTES, ciphertext.length - TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } catch (err) {
    throw new CryptoError(`AES-GCM authentication failed: ${(err as Error).message}`);
  }
}

/**
 * On-chain commitment to a ciphertext blob. Matches the `dataHash` field of
 * SkillINFT.
 */
export function computeDataHash(ciphertext: Buffer): Hex {
  return keccak256(ciphertext) as Hex;
}
