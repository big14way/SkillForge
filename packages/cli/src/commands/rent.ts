import ora from 'ora';
import { formatEther } from 'ethers';
import { SkillForgeClient } from '@skillforge/sdk';
import { ui } from '../ui.js';

/**
 * `skillforge rent <tokenId>` — request + fund a rental, then print the rental id.
 *
 * The actual invocation happens separately via `skillforge invoke`. This
 * split mirrors how a real agent would work: fund now, execute later when the
 * creator has authorized access.
 */
export async function runRent(tokenIdArg: string): Promise<void> {
  const tokenId = BigInt(tokenIdArg);
  const sdk = SkillForgeClient.fromEnv();

  const skill = await sdk.getSkill(tokenId);
  ui.heading(`Rent skill #${tokenId.toString()} — ${skill.name}`);
  ui.info(`Price: ${formatEther(skill.pricePerUse)} OG`);

  const spinner = ora('requesting rental…').start();
  const reqTx = await sdk.contracts.skillEscrow.getFunction('requestRental')(tokenId);
  const reqReceipt = await reqTx.wait();
  spinner.text = 'funding…';
  const escrow = sdk.contracts.skillEscrow;
  let rentalId = 0n;
  for (const log of reqReceipt.logs) {
    try {
      const parsed = escrow.interface.parseLog(log);
      if (parsed?.name === 'RentalRequested') {
        rentalId = parsed.args.rentalId as bigint;
        break;
      }
    } catch {
      /* not our event */
    }
  }
  if (rentalId === 0n) ui.fatal('RentalRequested event not found');

  const fundTx = await escrow.getFunction('fundRental')(rentalId, { value: skill.pricePerUse });
  await fundTx.wait();
  spinner.succeed('Rental funded');

  ui.ok(`Rental ID: ${rentalId.toString()}`);
  ui.tx(reqReceipt.hash, 'request');
  ui.tx(fundTx.hash, 'fund');
  ui.info(`Waiting for creator ${skill.creator} to call authorizeAccess…`);
  ui.info(`Next: skillforge invoke ${rentalId.toString()} --input "..."`);
}
