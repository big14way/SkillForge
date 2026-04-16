import { describe, it, expect } from 'vitest';
import { Wallet } from 'ethers';
import { encryptSkill, decryptSkill, computeDataHash, CryptoError } from '../src/crypto/aes.js';
import { sealKeyForRecipient, unsealKey, deriveAddressFromPubKey } from '../src/crypto/keys.js';

describe('AES-256-GCM', () => {
  const plaintext = Buffer.from('SkillForge alpha-hunter strategy v1: BUY ON $SOL DIP');

  it('encrypts then decrypts to original plaintext', () => {
    const { ciphertext, key } = encryptSkill(plaintext);
    expect(ciphertext.length).toBeGreaterThan(plaintext.length); // includes nonce + tag
    expect(key.length).toBe(32);
    const decrypted = decryptSkill(ciphertext, key);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('produces a different ciphertext on every call (random nonce)', () => {
    const a = encryptSkill(plaintext);
    const b = encryptSkill(plaintext);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    // Even the keys differ (each call generates a fresh key).
    expect(a.key.equals(b.key)).toBe(false);
  });

  it('rejects decryption with the wrong key', () => {
    const { ciphertext } = encryptSkill(plaintext);
    const wrongKey = Buffer.alloc(32, 1);
    expect(() => decryptSkill(ciphertext, wrongKey)).toThrow(CryptoError);
  });

  it('rejects decryption when ciphertext is tampered', () => {
    const { ciphertext, key } = encryptSkill(plaintext);
    ciphertext[20] = ciphertext[20]! ^ 0xff;
    expect(() => decryptSkill(ciphertext, key)).toThrow(CryptoError);
  });

  it('rejects too-short ciphertext', () => {
    expect(() => decryptSkill(Buffer.alloc(10), Buffer.alloc(32))).toThrow(CryptoError);
  });

  it('rejects wrong-size key', () => {
    expect(() => decryptSkill(Buffer.alloc(40), Buffer.alloc(16))).toThrow(CryptoError);
  });

  it('computeDataHash returns a 32-byte hex', () => {
    const { ciphertext } = encryptSkill(plaintext);
    const hash = computeDataHash(ciphertext);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('ECIES sealed keys', () => {
  it('seal then unseal recovers the original key', () => {
    const wallet = Wallet.createRandom();
    const skillKey = Buffer.from(
      'aaaabbbbccccddddeeeeffff00001111aaaabbbbccccddddeeeeffff00001111',
      'hex',
    );

    const sealed = sealKeyForRecipient(skillKey, wallet.signingKey.publicKey as `0x${string}`);
    const recovered = unsealKey(sealed, wallet.privateKey as `0x${string}`);

    expect(recovered.equals(skillKey)).toBe(true);
  });

  it('unseal with the wrong private key throws', () => {
    const intended = Wallet.createRandom();
    const attacker = Wallet.createRandom();
    const skillKey = Buffer.alloc(32, 7);

    const sealed = sealKeyForRecipient(skillKey, intended.signingKey.publicKey as `0x${string}`);

    expect(() => unsealKey(sealed, attacker.privateKey as `0x${string}`)).toThrow(CryptoError);
  });

  it('rejects malformed pubkey (compressed format not supported)', () => {
    const compressed = '0x02' + 'a'.repeat(64); // 33 bytes — compressed
    expect(() => sealKeyForRecipient(Buffer.alloc(32), compressed as `0x${string}`)).toThrow(
      CryptoError,
    );
  });

  it('deriveAddressFromPubKey matches ethers Wallet address', () => {
    const wallet = Wallet.createRandom();
    const derived = deriveAddressFromPubKey(wallet.signingKey.publicKey as `0x${string}`);
    expect(derived.toLowerCase()).toBe(wallet.address.toLowerCase());
  });
});
