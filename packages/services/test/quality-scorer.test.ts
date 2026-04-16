import { describe, it, expect } from 'vitest';
import { Wallet, getBytes, recoverAddress } from 'ethers';
import {
  computeAttestationDigest,
  decodeAttestation,
  encodeAttestation,
  type SignedAttestation,
} from '@skillforge/sdk';
import { QualityScorer } from '../src/quality-scorer.js';
import type { Hex } from '@skillforge/sdk';

/**
 * White-box test: we exercise the JSON parser and the signing path without
 * actually calling out to the TeeML network.
 */
describe('QualityScorer._parseJSONScore (via any)', () => {
  const scorer = new QualityScorer({} as never, Wallet.createRandom());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parse = (raw: string) => (scorer as any)._parseJSONScore(raw);

  it('extracts JSON from raw text', () => {
    expect(parse('{"score":7500,"reasoning":"ok"}')).toEqual({ score: 7500, reasoning: 'ok' });
  });

  it('strips markdown fences', () => {
    expect(parse('```json\n{"score":8000,"reasoning":"fine"}\n```')).toEqual({
      score: 8000,
      reasoning: 'fine',
    });
  });

  it('tolerates noise around the JSON', () => {
    expect(parse('Sure, here is the verdict:\n{"score":9000,"reasoning":"nice"}\nThanks!')).toEqual({
      score: 9000,
      reasoning: 'nice',
    });
  });

  it('rejects out-of-range scores', () => {
    expect(() => parse('{"score":20000,"reasoning":""}')).toThrow(/invalid score/);
    expect(() => parse('{"score":-1,"reasoning":""}')).toThrow(/invalid score/);
  });

  it('rejects non-JSON', () => {
    expect(() => parse('not json at all')).toThrow(/no JSON/);
  });
});

describe('QualityScorer signs attestations recoverable by AttestationVerifier', () => {
  it('digest signed by scorer key recovers to its address', () => {
    const scorerKey = Wallet.createRandom();
    const requestHash = `0x${'1'.repeat(64)}` as Hex;
    const responseHash = `0x${'2'.repeat(64)}` as Hex;
    const provider = '0x1111111111111111111111111111111111111111' as Hex;
    const qualityScore = 8200;

    const digest = computeAttestationDigest({
      requestHash,
      responseHash,
      provider,
      qualityScore,
    });
    const signature = scorerKey.signingKey.sign(getBytes(digest)).serialized as Hex;
    const attestation: SignedAttestation = {
      requestHash,
      responseHash,
      provider,
      qualityScore,
      signature,
    };

    const recovered = recoverAddress(getBytes(digest), signature);
    expect(recovered.toLowerCase()).toBe(scorerKey.address.toLowerCase());

    // Roundtrip through encode/decode — the digest must not change.
    const encoded = encodeAttestation(attestation);
    const decoded = decodeAttestation(encoded);
    expect(decoded.qualityScore).toBe(qualityScore);
    expect(decoded.signature).toBe(signature);
  });
});
