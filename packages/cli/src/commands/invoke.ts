import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ora from 'ora';
import { Wallet } from 'ethers';
import { SkillForgeClient, sealKeyForRecipient, type Hex } from '@skillforge/sdk';
import { SkillConsumer } from '@skillforge/services';
import { ui } from '../ui.js';

export interface InvokeOpts {
  input: string;
  /**
   * Path to the creator's skill key (encrypted off-band in prod). In the demo
   * flow, the same user is both creator and renter, so we read it from
   * ./.skillforge/keys/<tokenId>.key.
   */
  keyPath?: string;
}

/**
 * `skillforge invoke <rentalId> --input "..."` — fetches + decrypts the skill,
 * runs TeeML inference, and submits the work proof. Does NOT run the quality
 * scorer or complete the rental (those are separate commands).
 */
export async function runInvoke(rentalIdArg: string, opts: InvokeOpts): Promise<void> {
  const rentalId = BigInt(rentalIdArg);
  const sdk = SkillForgeClient.fromEnv();
  const consumer = new SkillConsumer(sdk);

  // Pull rental → skill → skill key.
  const rental = (await sdk.contracts.skillEscrow
    .getFunction('getRental')
    .staticCall(rentalId)) as unknown as { skillTokenId: bigint; creator: Hex };
  const tokenId = rental.skillTokenId;
  const keyFile = opts.keyPath ?? join(process.cwd(), '.skillforge', 'keys', `${tokenId}.key`);
  const skillKey = readFileSync(keyFile);

  // For the demo, we seal the key for the current wallet (which is also the renter).
  const renterWallet = new Wallet(sdk.signer.privateKey as Hex);
  const sealedKey = sealKeyForRecipient(skillKey, renterWallet.signingKey.publicKey as Hex);

  ui.heading(`Invoke rental #${rentalId.toString()}`);
  const spinner = ora('decrypting skill and running inference…').start();
  const result = await consumer.rentAndInvoke({
    tokenId,
    invocationInput: opts.input,
    renterPrivateKey: sdk.signer.privateKey as Hex,
    sealedSkillKey: sealedKey,
  });
  spinner.succeed('inference complete');

  ui.ok(`Rental ID: ${result.rentalId.toString()}`);
  ui.info(`TeeML verified: ${result.verified}`);
  ui.info('Output:');
  console.log('\n' + result.output + '\n');
  if (result.attestation.signatureLink) {
    ui.info(`Attestation link: ${result.attestation.signatureLink}`);
  }
}
