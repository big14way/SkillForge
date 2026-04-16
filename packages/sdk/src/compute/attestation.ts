import { AbiCoder, keccak256, toUtf8Bytes, getBytes, hexlify, solidityPackedKeccak256 } from 'ethers';
import type { Hex } from '../types.js';
import type { Attestation } from './ComputeClient.js';

/**
 * Wire format the SkillEscrow.verifyWork function expects (matches the
 * `AttestationVerifier.Attestation` struct in Solidity):
 *
 *   abi.encode(
 *     bytes32 requestHash,
 *     bytes32 responseHash,
 *     address provider,
 *     uint256 qualityScore,
 *     bytes   signature
 *   )
 *
 * The digest that gets signed by the TeeML provider (or scorer oracle) is:
 *
 *   keccak256(abi.encodePacked(requestHash, responseHash, provider, qualityScore))
 *
 * Using `abi.encodePacked` here (rather than `abi.encode`) means Solidity's
 * `keccak256(abi.encodePacked(...))` produces the same digest — cheaper on-chain.
 */

const coder = AbiCoder.defaultAbiCoder();

export interface SignedAttestation {
  requestHash: Hex;
  responseHash: Hex;
  provider: Hex;
  qualityScore: number;
  /** Raw 65-byte secp256k1 signature produced by the scorer. */
  signature: Hex;
}

/** Keccak256 of the exact bytes the scorer/provider signs — input to ECDSA. */
export function computeAttestationDigest(params: {
  requestHash: Hex;
  responseHash: Hex;
  provider: Hex;
  qualityScore: number;
}): Hex {
  return solidityPackedKeccak256(
    ['bytes32', 'bytes32', 'address', 'uint256'],
    [params.requestHash, params.responseHash, params.provider, params.qualityScore],
  ) as Hex;
}

/** Pack a signed attestation into the bytes blob SkillEscrow.verifyWork accepts. */
export function encodeAttestation(a: SignedAttestation): Hex {
  return coder.encode(
    ['bytes32', 'bytes32', 'address', 'uint256', 'bytes'],
    [a.requestHash, a.responseHash, a.provider, a.qualityScore, a.signature],
  ) as Hex;
}

/** Inverse of {@link encodeAttestation}. Throws on structural mismatch. */
export function decodeAttestation(encoded: Hex): SignedAttestation {
  const decoded = coder.decode(
    ['bytes32', 'bytes32', 'address', 'uint256', 'bytes'],
    encoded,
  ) as unknown as [string, string, string, bigint, string];
  const [requestHash, responseHash, provider, qualityScore, signature] = decoded;
  return {
    requestHash: requestHash as Hex,
    responseHash: responseHash as Hex,
    provider: provider as Hex,
    qualityScore: Number(qualityScore),
    signature: signature as Hex,
  };
}

/**
 * Convenience: derive `requestHash` and `responseHash` from the raw content
 * passed to / received from the provider.
 */
export function hashRequest(messages: Array<{ role: string; content: string }>, model: string): Hex {
  const canonical = JSON.stringify({ model, messages });
  return keccak256(toUtf8Bytes(canonical)) as Hex;
}

export function hashResponse(content: string): Hex {
  return keccak256(toUtf8Bytes(content)) as Hex;
}

/** Re-exported from ComputeClient for convenience. */
export type { Attestation };

/** Sanity-check bytes → avoid silently producing malformed attestations. */
export function assertValidSignature(sig: Hex): void {
  const b = getBytes(sig);
  if (b.length !== 65) {
    throw new Error(`signature must be 65 bytes (got ${b.length})`);
  }
  // v is the last byte and must be 27 or 28 (or 0/1 with the 27 offset added).
  const v = b[64]!;
  if (v !== 27 && v !== 28 && v !== 0 && v !== 1) {
    throw new Error(`signature v byte ${v} invalid`);
  }
  // Re-hexlify to normalize casing — callers can use this form directly.
  void hexlify(b);
}
