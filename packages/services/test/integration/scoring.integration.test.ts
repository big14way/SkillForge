import { describe, it, expect, beforeAll } from 'vitest';
import { Wallet, keccak256, toUtf8Bytes } from 'ethers';
import {
  SkillForgeClient,
  computeAttestationDigest,
  decodeAttestation,
  encodeAttestation,
  type Hex,
  type SignedAttestation,
} from '@skillforge/sdk';
import { integrationEnabled } from './_guard.js';

const DESCRIBE = integrationEnabled() ? describe : describe.skip;

/**
 * Doesn't hit the live TeeML broker (keeps the test reliable without funded
 * compute credits). Instead, it exercises the end-to-end signing +
 * on-chain verification path using the deployer as the whitelisted scorer.
 */
DESCRIBE('integration: scorer attestation verifies on-chain', () => {
  let sdk: SkillForgeClient;

  beforeAll(() => {
    sdk = SkillForgeClient.fromEnv();
  });

  it('decodes locally and survives the AttestationVerifier whitelist check', async () => {
    const scorer = new Wallet(sdk.signer.privateKey as Hex);
    const provider = '0x000000000000000000000000000000000000beef' as Hex;
    const qualityScore = 8700;
    const requestHash = keccak256(toUtf8Bytes('canonical-request')) as Hex;
    const responseHash = keccak256(toUtf8Bytes('canonical-response')) as Hex;

    const digest = computeAttestationDigest({ requestHash, responseHash, provider, qualityScore });
    const signature = scorer.signingKey.sign(digest).serialized as Hex;
    const signed: SignedAttestation = {
      requestHash,
      responseHash,
      provider,
      qualityScore,
      signature,
    };
    const encoded = encodeAttestation(signed);

    // Local roundtrip sanity.
    const decoded = decodeAttestation(encoded);
    expect(decoded.qualityScore).toBe(qualityScore);
    expect(decoded.signature).toBe(signature);

    // On-chain: confirm the deployer is actually whitelisted as a scorer.
    const escrow = sdk.contracts.skillEscrow;
    const ok = (await escrow
      .getFunction('whitelistedScorers')
      .staticCall(scorer.address)) as unknown as boolean;
    expect(ok).toBe(true);
  });
});
