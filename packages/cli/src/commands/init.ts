import { Wallet } from 'ethers';
import type { Hex } from '@skillforge/sdk';
import { loadConfig, saveConfig, configPath } from '../config.js';
import { ui } from '../ui.js';

/**
 * `skillforge init` — first-run helper. Generates a fresh wallet and persists
 * it to ~/.skillforge/config.json. Prints the address so the user can top it
 * up from the Galileo faucet before running other commands.
 */
export async function runInit(): Promise<void> {
  ui.heading('SkillForge CLI init');

  const existing = loadConfig();
  if (existing.privateKey) {
    const addr = new Wallet(existing.privateKey).address;
    ui.warn(`Wallet already initialized: ${addr}`);
    ui.info(`Config: ${configPath()}`);
    ui.info('Delete that file to start fresh.');
    return;
  }

  const wallet = Wallet.createRandom();
  saveConfig({
    privateKey: wallet.privateKey as Hex,
    createdAt: Date.now(),
  });

  ui.ok('Generated a fresh SkillForge wallet');
  ui.addr(wallet.address, 'wallet');
  ui.info(`Config stored at ${configPath()} (mode 0600)`);
  console.log('');
  ui.info('Next steps:');
  ui.info('  1. Fund the wallet at https://faucet.0g.ai (request 0.1 OG)');
  ui.info('  2. Run `skillforge list` to see the marketplace');
  ui.info('  3. Run `skillforge publish <file>` to register your first skill');
}
