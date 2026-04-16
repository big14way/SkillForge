import { describe, it, expect } from 'vitest';
import { Wallet, getBytes, keccak256, recoverAddress, solidityPacked } from 'ethers';
import { sealKeyForRecipient } from '@skillforge/sdk';
import { ReencryptionOracle } from '../src/oracle.js';
import type { Hex } from '@skillforge/sdk';

describe('ReencryptionOracle', () => {
  it('unseals, re-seals, and signs a proof that the on-chain verifier can recover', async () => {
    // Parties: oracle, the current owner (from), the new owner (to).
    const oracle = new ReencryptionOracle(Wallet.createRandom());
    const fromWallet = Wallet.createRandom();
    const toWallet = Wallet.createRandom();

    // The creator initially sealed the skill key for the oracle so the oracle
    // can always re-encrypt on demand. In prod the oracle key is isolated.
    const skillKey = Buffer.alloc(32, 0xab);
    const oldSealedKey = sealKeyForRecipient(
      skillKey,
      (oracle as unknown as { oracleWallet: Wallet }).oracleWallet.signingKey.publicKey as Hex,
    );

    const tokenId = 42n;
    const { newSealedKey, oracleProof } = await oracle.handleTransfer({
      tokenId,
      from: fromWallet.address as Hex,
      to: toWallet.address as Hex,
      oldSealedKey,
      oldRecipientPrivateKey: (oracle as unknown as { oracleWallet: Wallet }).oracleWallet
        .privateKey as Hex,
      toPubKey: toWallet.signingKey.publicKey as Hex,
    });

    // Mirror the Solidity digest: keccak256(packed(tokenId, from, to, keccak256(newSealedKey))).
    const digest = keccak256(
      solidityPacked(
        ['uint256', 'address', 'address', 'bytes32'],
        [tokenId, fromWallet.address, toWallet.address, keccak256(newSealedKey)],
      ),
    );
    const recovered = recoverAddress(getBytes(digest), oracleProof);
    expect(recovered.toLowerCase()).toBe(oracle.address.toLowerCase());

    // New owner should be able to unseal the re-encrypted envelope.
    const { unsealKey } = await import('@skillforge/sdk');
    const recoveredKey = unsealKey(newSealedKey, toWallet.privateKey as Hex);
    expect(recoveredKey.equals(skillKey)).toBe(true);
  });
});
