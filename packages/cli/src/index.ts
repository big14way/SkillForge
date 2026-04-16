#!/usr/bin/env node
import { Command } from 'commander';
import { config as loadDotenv } from 'dotenv';
import { runInit } from './commands/init.js';
import { runList } from './commands/list.js';
import { runPublish } from './commands/publish.js';
import { runRent } from './commands/rent.js';
import { runInvoke } from './commands/invoke.js';
import { runMemoryShow, runMemoryHistory } from './commands/memory.js';
import { runMemoryInit } from './commands/memory-init.js';
import { runComputeSetup } from './commands/compute-setup.js';
import { ui } from './ui.js';

loadDotenv();

const program = new Command()
  .name('skillforge')
  .description('Demo CLI for the SkillForge agent-skill marketplace on 0G.')
  .version('0.2.0');

program
  .command('init')
  .description('Generate + persist a fresh wallet under ~/.skillforge/config.json')
  .action(runInit);

program
  .command('list')
  .description('List skills (top-ranked by default)')
  .option('-c, --category <name>', 'filter by category (trading, data, content, …)')
  .option('--creator <address>', 'filter by creator address')
  .action(runList);

program
  .command('publish <file>')
  .description('Encrypt, upload to 0G Storage, mint INFT, and register the skill')
  .requiredOption('-n, --name <name>', 'skill name')
  .requiredOption('-c, --category <name>', 'category')
  .requiredOption('-p, --price <OG>', 'price per use in OG tokens')
  .option('-d, --description <text>', 'skill description')
  .action(runPublish);

program
  .command('rent <tokenId>')
  .description('Request + fund a rental of a published skill')
  .action(runRent);

program
  .command('invoke <rentalId>')
  .description('Execute the rented skill against an input via TeeML inference')
  .requiredOption('-i, --input <text>', 'input to feed the skill')
  .option('--key-path <path>', 'path to the skill key file (defaults to ./.skillforge/keys/<tokenId>.key)')
  .action(runInvoke);

const memory = program.command('memory').description('Per-agent persistent memory on 0G KV');
memory
  .command('init')
  .description('Provision a fresh 0G KV stream for this wallet')
  .option('--stream-id <hex>', 'use a specific 32-byte streamId instead of a random one')
  .action(runMemoryInit);
memory.command('show').description('Show profile + reputation').action(runMemoryShow);
memory.command('history').description('Show rental history').action(runMemoryHistory);

const compute = program.command('compute').description('0G Compute broker operations');
compute
  .command('setup')
  .description('Fund broker ledger, list providers, acknowledge a TeeML provider')
  .option('--fund <OG>', 'amount in OG to deposit (default 0.1)')
  .option('--provider <address>', 'explicit provider to acknowledge')
  .option('--skip-fund', 'skip ledger funding')
  .option('--skip-ack', 'only list providers, do not acknowledge')
  .action(runComputeSetup);

program
  .parseAsync(process.argv)
  .catch((err) => ui.fatal((err as Error).message ?? String(err)));
