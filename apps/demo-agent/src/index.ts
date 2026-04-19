#!/usr/bin/env tsx
/**
 * Reference autonomous agent that drives the SkillForge end-to-end flow.
 * Used as the live-demo hero script in Week 4. Today it exercises the full
 * discover → rent → invoke (preview) → rate path against live Galileo with
 * the preview-mode stubs wired in.
 *
 *   pnpm --filter @skillforge/demo-agent start
 *
 * Env:
 *   SKILLFORGE_INDEXER_URL=http://localhost:4000
 *   PRIVATE_KEY=0x…                 # any wallet funded with a bit of OG
 *   SKILL_ESCROW_ADDRESS=0x…        # defaults to the Week 2 v2 deployment
 */

import chalk from 'chalk';
import { Contract, JsonRpcProvider, Wallet, parseEther } from 'ethers';
import { SkillEscrowABI } from '@skillforge/sdk/contracts';

const cfg = {
  indexerUrl: process.env.SKILLFORGE_INDEXER_URL ?? 'http://localhost:4000',
  rpcUrl: process.env.GALILEO_RPC_URL ?? 'https://evmrpc-testnet.0g.ai',
  escrow: process.env.SKILL_ESCROW_ADDRESS ?? '0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1',
  privateKey: process.env.PRIVATE_KEY,
  category: process.env.DEMO_CATEGORY ?? 'trading',
  maxPriceOg: process.env.DEMO_MAX_PRICE_OG ?? '0.05',
  dryRun: process.env.DEMO_DRY_RUN === '1',
};

interface ApiSkill {
  tokenId: string;
  creator: string;
  name: string;
  category: string;
  pricePerUse: string;
  qualityScore: number;
  totalRentals: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function line(color: typeof chalk.cyan, label: string, value: string): void {
  console.log(color(`  ${label.padEnd(12)}`), value);
}

async function main(): Promise<void> {
  console.log(chalk.bold.cyan('\n[demo-agent] TraderBot booting up…\n'));
  line(chalk.dim, 'indexer', cfg.indexerUrl);
  line(chalk.dim, 'rpc', cfg.rpcUrl);
  line(chalk.dim, 'escrow', cfg.escrow);
  line(chalk.dim, 'category', cfg.category);
  line(chalk.dim, 'max price', `${cfg.maxPriceOg} OG`);
  line(chalk.dim, 'mode', cfg.dryRun ? 'dry-run' : 'live');
  console.log('');

  // 1. discover
  console.log(chalk.bold('1. Discover skills'));
  const skills = await fetchJson<{ items: ApiSkill[] }>(
    `${cfg.indexerUrl}/api/skills?category=${cfg.category}&sort=quality&limit=10`,
  );
  if (skills.items.length === 0) {
    console.log(chalk.yellow('   No skills in that category yet. Publish one first, then rerun.'));
    return;
  }
  const chosen = skills.items.find((s) => BigInt(s.pricePerUse) <= parseEther(cfg.maxPriceOg));
  if (!chosen) {
    console.log(chalk.yellow(`   Every skill > ${cfg.maxPriceOg} OG. Bump DEMO_MAX_PRICE_OG.`));
    return;
  }
  line(chalk.green, 'picked', `#${chosen.tokenId} — ${chosen.name} (score ${chosen.qualityScore})`);
  console.log('');

  if (cfg.dryRun || !cfg.privateKey) {
    console.log(chalk.dim('Dry-run — skipping on-chain rent. Set PRIVATE_KEY and DEMO_DRY_RUN=0 for the real flow.'));
    return;
  }

  // 2. rent
  console.log(chalk.bold('2. Rent skill'));
  const provider = new JsonRpcProvider(cfg.rpcUrl);
  const wallet = new Wallet(cfg.privateKey, provider);
  const escrow = new Contract(cfg.escrow, SkillEscrowABI, wallet);
  const requestTx = await escrow.getFunction('requestRental')(chosen.tokenId);
  const requestReceipt = await requestTx.wait();
  type ParseLogArg = Parameters<typeof escrow.interface.parseLog>[0];
  const requested = requestReceipt?.logs.find((log) => {
    try {
      return escrow.interface.parseLog(log as ParseLogArg)?.name === 'RentalRequested';
    } catch {
      return false;
    }
  });
  const rentalId = requested
    ? escrow.interface.parseLog(requested as ParseLogArg)!.args.rentalId
    : null;
  if (!rentalId) throw new Error('RentalRequested not found');
  line(chalk.green, 'requested', `rental ${rentalId.toString()} tx ${requestReceipt!.hash}`);

  const fundTx = await escrow.getFunction('fundRental')(rentalId, {
    value: chosen.pricePerUse,
  });
  const fundReceipt = await fundTx.wait();
  line(chalk.green, 'funded', `tx ${fundReceipt!.hash}`);
  console.log('');

  // 3. invoke — preview mode
  console.log(chalk.bold('3. Invoke skill (preview mode)'));
  console.log(
    chalk.dim(
      '   TeeML inference is preview-mode while Galileo TeeML providers are offline. ' +
        'Hand-crafted sample output follows:',
    ),
  );
  console.log(
    '   ' +
      chalk.white(
        `[preview] Verdict on "${cfg.category}" input: mildly bullish 3-session horizon. ` +
          'Spot volume +12% w-o-w, funding neutral. Risk: Thursday CPI.',
      ),
  );
  console.log('');

  // 4. rate — skipped in preview
  console.log(chalk.bold('4. Rate skill'));
  console.log(
    chalk.dim(
      '   Skipped in demo preview. Run the `rate_skill` OpenClaw tool to submit a dev-scorer ' +
        'attestation once the renter completes submitWork.',
    ),
  );
  console.log(chalk.bold.green('\n[demo-agent] Done. See txs on ChainScan.\n'));
}

main().catch((err) => {
  console.error(chalk.red('[demo-agent] failed:'), err);
  process.exit(1);
});
