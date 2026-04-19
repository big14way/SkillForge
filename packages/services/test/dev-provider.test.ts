import { describe, it, expect } from 'vitest';
import { Wallet, getBytes, recoverAddress, keccak256, toUtf8Bytes } from 'ethers';
import { computeAttestationDigest, type Hex, type SkillForgeClient } from '@skillforge/sdk';
import { DevTeeMLProvider } from '../src/dev-provider.js';

function mkSdk(chainId: number): SkillForgeClient {
  // Minimal stub — DevTeeMLProvider only reads config.chain.chainId.
  return { config: { chain: { chainId } } } as unknown as SkillForgeClient;
}

describe('DevTeeMLProvider', () => {
  it('refuses to instantiate on mainnet (16661)', () => {
    const scorer = Wallet.createRandom();
    expect(() => new DevTeeMLProvider({ sdk: mkSdk(16661), scorerWallet: scorer })).toThrow(
      /mainnet/,
    );
  });

  it('emits preview-mode inference with category-specific copy', async () => {
    const provider = new DevTeeMLProvider({
      sdk: mkSdk(16602),
      scorerWallet: Wallet.createRandom(),
    });
    const res = await provider.infer({
      messages: [
        { role: 'system', content: 'skill' },
        { role: 'user', content: 'Analyze $SOL this week' },
      ],
      category: 'trading',
    });
    expect(res.mode).toBe('preview');
    expect(res.content.toLowerCase()).toContain('preview');
    expect(res.chatID).toMatch(/^preview-/);
    expect(res.usage.completionTokens).toBeGreaterThan(0);
  });

  it('signs an attestation that recovers to the scorer wallet', () => {
    const scorer = Wallet.createRandom();
    const provider = new DevTeeMLProvider({ sdk: mkSdk(16602), scorerWallet: scorer });
    const requestHash = keccak256(toUtf8Bytes('req')) as Hex;
    const responseHash = keccak256(toUtf8Bytes('resp')) as Hex;
    const { attestation, encoded } = provider.signAttestation({
      requestHash,
      responseHash,
      qualityScore: 8800,
    });

    expect(encoded).toMatch(/^0x[0-9a-f]+$/);
    const digest = computeAttestationDigest({
      requestHash,
      responseHash,
      provider: attestation.provider,
      qualityScore: 8800,
    });
    const recovered = recoverAddress(getBytes(digest), attestation.signature);
    expect(recovered.toLowerCase()).toBe(scorer.address.toLowerCase());
  });
});
