import ora from 'ora';
import Table from 'cli-table3';
import { SkillForgeClient } from '@skillforge/sdk';
import { ui } from '../ui.js';

/**
 * `skillforge compute setup` — one-shot bootstrap for 0G Compute:
 *   1. Create/fund a ledger (default 0.1 OG) on the broker.
 *   2. List inference providers and flag the TeeML-verifiable ones.
 *   3. Acknowledge the first TeeML provider (or a caller-supplied one).
 *
 * Writes the chosen provider address to stdout so the user can paste it into
 * `TEEML_PROVIDER_ADDRESS` in their `.env`.
 */
export interface ComputeSetupOpts {
  fund?: string;        // OG amount (default "0.1")
  provider?: string;    // Explicit provider address to acknowledge
  skipFund?: boolean;   // Skip ledger funding (use if already funded)
  skipAck?: boolean;    // Skip acknowledging — only list providers
}

export async function runComputeSetup(opts: ComputeSetupOpts): Promise<void> {
  ui.heading('0G Compute bootstrap');
  const sdk = SkillForgeClient.fromEnv();

  if (!opts.skipFund) {
    const amount = Number(opts.fund ?? '0.1');
    const spinner = ora(`funding broker ledger with ${amount} OG…`).start();
    try {
      await sdk.compute.ensureLedgerFunded(amount);
      spinner.succeed(`ledger funded (${amount} OG)`);
    } catch (err) {
      spinner.fail(`ledger funding failed: ${(err as Error).message}`);
      throw err;
    }
  }

  const spin = ora('listing providers…').start();
  const providers = await sdk.compute.listProviders();
  spin.succeed(`found ${providers.length} providers`);

  const table = new Table({
    head: ['provider', 'model', 'TeeML', 'verifiability'],
    style: { head: ['cyan'] },
  });
  for (const p of providers) {
    table.push([
      p.provider,
      p.model.slice(0, 40),
      p.teeEnabled ? '✓' : '—',
      p.verifiability || '—',
    ]);
  }
  console.log(table.toString());

  if (opts.skipAck) return;

  const chosen = await sdk.compute.pickProvider(
    true,
    (opts.provider as `0x${string}` | undefined) ?? undefined,
  );
  ui.ok(`Acknowledging TeeML provider: ${chosen.provider}`);
  ui.info(`  endpoint: ${chosen.endpoint}`);
  ui.info(`  model:    ${chosen.model}`);
  ui.info('');
  ui.info(`Add this to your .env:`);
  ui.info(`  TEEML_PROVIDER_ADDRESS=${chosen.provider}`);
}
