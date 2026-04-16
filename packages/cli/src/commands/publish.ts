import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import ora from 'ora';
import { parseEther } from 'ethers';
import { SkillForgeClient } from '@skillforge/sdk';
import { SkillPublisher } from '@skillforge/services';
import { ui } from '../ui.js';

export interface PublishOpts {
  name: string;
  description?: string;
  category: string;
  price: string; // in OG, human-readable
}

/**
 * `skillforge publish <file> --name ... --category ... --price ...`
 *
 * Encrypts the file, uploads to 0G Storage, mints the INFT, and registers the
 * skill. The generated skill key is persisted to ./.skillforge/keys/ so the
 * creator can seal it for renters later.
 */
export async function runPublish(filePath: string, opts: PublishOpts): Promise<void> {
  ui.heading(`Publish skill: ${opts.name}`);
  const content = readFileSync(filePath);

  const sdk = SkillForgeClient.fromEnv();
  const publisher = new SkillPublisher(sdk);
  const priceWei = parseEther(opts.price);

  const spinner = ora('encrypt → upload → mint → register').start();
  const result = await publisher.publish({
    name: opts.name,
    description: opts.description ?? '',
    category: opts.category,
    pricePerUse: priceWei,
    content,
  });
  spinner.succeed('Published');

  ui.ok(`Token ID: ${result.tokenId.toString()}`);
  ui.info(`Storage URI: ${result.storageURI}`);
  ui.info(`Data hash:   ${result.dataHash}`);
  ui.tx(result.txHashes.mint, 'mint');
  ui.tx(result.txHashes.register, 'register');
  ui.tx(result.txHashes.storage, 'storage');

  // Persist the skill key under .skillforge/keys/ — never uploaded anywhere.
  const keyDir = join(process.cwd(), '.skillforge', 'keys');
  mkdirSync(keyDir, { recursive: true });
  const keyFile = join(keyDir, `${result.tokenId.toString()}.key`);
  writeFileSync(keyFile, result.skillKey, { mode: 0o600 });
  ui.ok(`Skill key saved to ${keyFile} (mode 0600 — do not share)`);
}
