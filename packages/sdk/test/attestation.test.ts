import { describe, it, expect } from 'vitest';
import { Wallet, getBytes, hexlify } from 'ethers';
import {
  encodeAttestation,
  decodeAttestation,
  computeAttestationDigest,
  hashRequest,
  hashResponse,
  assertValidSignature,
  type SignedAttestation,
} from '../src/compute/attestation.js';
import type { Hex } from '../src/types.js';

describe('attestation encoding', () => {
  const sample: SignedAttestation = {
    requestHash: `0x${'a'.repeat(64)}` as Hex,
    responseHash: `0x${'b'.repeat(64)}` as Hex,
    provider: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
    qualityScore: 8500,
    signature: `0x${'c'.repeat(130)}` as Hex, // 65 bytes
  };

  it('encodes then decodes losslessly', () => {
    const encoded = encodeAttestation(sample);
    const decoded = decodeAttestation(encoded);
    expect(decoded.requestHash).toBe(sample.requestHash);
    expect(decoded.responseHash).toBe(sample.responseHash);
    expect(decoded.provider.toLowerCase()).toBe(sample.provider.toLowerCase());
    expect(decoded.qualityScore).toBe(sample.qualityScore);
    expect(decoded.signature).toBe(sample.signature);
  });

  it('digest is deterministic for the same inputs', () => {
    const d1 = computeAttestationDigest(sample);
    const d2 = computeAttestationDigest(sample);
    expect(d1).toBe(d2);
  });

  it('digest changes when any field changes', () => {
    const base = computeAttestationDigest(sample);
    expect(computeAttestationDigest({ ...sample, qualityScore: 8501 })).not.toBe(base);
    expect(
      computeAttestationDigest({ ...sample, requestHash: `0x${'0'.repeat(64)}` as Hex }),
    ).not.toBe(base);
  });

  it('hashRequest is stable across identical inputs', () => {
    const msgs = [{ role: 'user', content: 'hi' }];
    expect(hashRequest(msgs, 'llama-3')).toBe(hashRequest(msgs, 'llama-3'));
  });

  it('hashResponse differs from hashRequest for the same string', () => {
    expect(hashResponse('abc')).not.toBe(hashRequest([{ role: 'user', content: 'abc' }], 'x'));
  });
});

describe('signer recovery roundtrip', () => {
  it('a scorer wallet can sign a digest that recovers on-chain via ethers', async () => {
    const scorer = Wallet.createRandom();
    const digest = computeAttestationDigest({
      requestHash: `0x${'1'.repeat(64)}` as Hex,
      responseHash: `0x${'2'.repeat(64)}` as Hex,
      provider: '0x1111111111111111111111111111111111111111' as Hex,
      qualityScore: 9000,
    });
    // Sign the raw digest (no EIP-191 prefix) — matches how the Solidity
    // AttestationVerifier recovers via ECDSA.recover(digest, signature).
    const sig = scorer.signingKey.sign(digest).serialized as Hex;
    assertValidSignature(sig);

    // Recover with ethers' primitive so the test mirrors on-chain behavior.
    const { recoverAddress } = await import('ethers');
    const recovered = recoverAddress(getBytes(digest), sig);
    expect(recovered.toLowerCase()).toBe(scorer.address.toLowerCase());
    void hexlify;
  });
});

describe('assertValidSignature', () => {
  it('rejects wrong length', () => {
    expect(() => assertValidSignature(('0x' + 'ab'.repeat(30)) as Hex)).toThrow(/65 bytes/);
  });
});
