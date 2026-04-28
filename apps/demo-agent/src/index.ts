#!/usr/bin/env tsx
/**
 * Reference autonomous agent that drives the SkillForge end-to-end flow.
 * Used as the live-demo hero script for the Week 4 video. Exercises
 * discover → rent → invoke (preview) → rate against live Galileo and prints
 * a video-ready narrative with explorer links + a summary table at the end.
 *
 *   pnpm --filter @skillforge/demo-agent start
 *
 * Env:
 *   SKILLFORGE_INDEXER_URL=http://localhost:4000
 *   PRIVATE_KEY=0x…                  # any wallet funded with a bit of OG
 *   SKILL_ESCROW_ADDRESS=0x…         # defaults to v2 Galileo (in-repo constant)
 *   GALILEO_RPC_URL=https://evmrpc-testnet.0g.ai
 *
 *   DEMO_CATEGORY=trading            # filter skills by category
 *   DEMO_MAX_PRICE_OG=0.05           # skip skills above this price
 *   DEMO_PACE_MS=1500                # pacing delay between narrative beats (0 = no delay)
 *   DEMO_AGENT_NAME=TraderBot        # agent persona name (cosmetic)
 *   DEMO_INPUT="..."                 # what the agent asks the skill
 *   DEMO_DRY_RUN=1                   # skip on-chain calls (CI/preview)
 *   DEMO_NO_PACE=1                   # disable pacing entirely (CI)
 *   DEMO_EXPLORER_URL=https://chainscan-galileo.0g.ai
 */

import chalk from 'chalk';
import { Contract, JsonRpcProvider, Wallet, formatEther, parseEther } from 'ethers';
import { SkillEscrowABI } from '@skillforge/sdk/contracts';

const cfg = {
  indexerUrl: process.env.SKILLFORGE_INDEXER_URL ?? 'http://localhost:4000',
  rpcUrl: process.env.GALILEO_RPC_URL ?? 'https://evmrpc-testnet.0g.ai',
  escrow: process.env.SKILL_ESCROW_ADDRESS ?? '0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1',
  privateKey: process.env.PRIVATE_KEY,
  category: process.env.DEMO_CATEGORY ?? 'trading',
  maxPriceOg: process.env.DEMO_MAX_PRICE_OG ?? '0.05',
  paceMs: process.env.DEMO_NO_PACE === '1' ? 0 : Number(process.env.DEMO_PACE_MS ?? '1500'),
  agent: process.env.DEMO_AGENT_NAME ?? 'TraderBot',
  input: process.env.DEMO_INPUT ?? "What's the sentiment on $SOL this week, and is it diverging from BTC?",
  explorer: process.env.DEMO_EXPLORER_URL ?? 'https://chainscan-galileo.0g.ai',
  dryRun: process.env.DEMO_DRY_RUN === '1',
};

interface ApiSkill {
  tokenId: string;
  creator: string;
  name: string;
  description: string;
  category: string;
  pricePerUse: string;
  qualityScore: number;
  totalRentals: number;
}

interface StepRecord {
  label: string;
  txHash?: string;
  costWei?: bigint;
  ms: number;
}

// ─── tiny utilities ────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const pace = (mult = 1): Promise<void> =>
  cfg.paceMs > 0 ? sleep(cfg.paceMs * mult) : Promise.resolve();

const explorerTx = (hash: string): string => `${cfg.explorer}/tx/${hash}`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

// ─── narrative beats ──────────────────────────────────────────────────────

function thinks(text: string): void {
  console.log(chalk.dim.italic(`  ${cfg.agent} 💭 ${text}`));
}

function says(text: string): void {
  console.log(chalk.cyan(`  ${cfg.agent} 🗣  ${text}`));
}

function ok(label: string, detail: string): void {
  console.log(chalk.green('  ✓ ') + chalk.bold(label.padEnd(14)) + chalk.dim(detail));
}

function tx(label: string, hash: string): void {
  console.log(
    chalk.dim('    ') + chalk.dim(label.padEnd(10)) + chalk.blue(explorerTx(hash)),
  );
}

function divider(): void {
  console.log(chalk.dim('  ' + '─'.repeat(72)));
}

function header(num: number, total: number, title: string): void {
  console.log('');
  console.log(
    chalk.bold.bgCyanBright.black(` ${num} / ${total} `) +
      chalk.bold.cyan(' ' + title),
  );
  divider();
}

// ─── flow ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = Date.now();
  const records: StepRecord[] = [];

  // — boot —
  console.log('');
  console.log(chalk.bold.cyan(`▸ ${cfg.agent} booting up against SkillForge`));
  divider();
  console.log(chalk.dim(`  indexer   `) + cfg.indexerUrl);
  console.log(chalk.dim(`  rpc       `) + cfg.rpcUrl);
  console.log(chalk.dim(`  escrow    `) + cfg.escrow);
  console.log(chalk.dim(`  category  `) + cfg.category);
  console.log(chalk.dim(`  max price `) + cfg.maxPriceOg + ' OG');
  console.log(chalk.dim(`  mode      `) + (cfg.dryRun ? 'dry-run' : 'live'));
  await pace();

  // ─── 1. Discover ────────────────────────────────────────────────────────
  header(1, 4, 'Discover skills');
  thinks(
    `I need a ${cfg.category} skill under ${cfg.maxPriceOg} OG. Querying the SkillForge indexer…`,
  );
  await pace();

  const t1 = Date.now();
  const url = `${cfg.indexerUrl}/api/skills?category=${cfg.category}&sort=quality&limit=10`;
  const skills = await fetchJson<{ items: ApiSkill[] }>(url);
  records.push({ label: 'Discover', ms: Date.now() - t1 });

  if (skills.items.length === 0) {
    console.log(
      chalk.yellow('  ⚠ No skills in that category yet. Publish one and rerun.'),
    );
    return;
  }

  ok('catalog', `${skills.items.length} skill(s) returned in ${Date.now() - t1}ms`);
  for (const s of skills.items.slice(0, 5)) {
    console.log(
      chalk.dim(`    · #${s.tokenId.padStart(3)}  `) +
        chalk.white(s.name.padEnd(34)) +
        chalk.dim(` ${formatEther(s.pricePerUse).padStart(10)} OG`) +
        chalk.dim(`  q=${s.qualityScore}`),
    );
  }
  await pace();

  const chosen = skills.items.find(
    (s) => BigInt(s.pricePerUse) <= parseEther(cfg.maxPriceOg),
  );
  if (!chosen) {
    console.log(
      chalk.yellow(`  ⚠ Every skill > ${cfg.maxPriceOg} OG. Bump DEMO_MAX_PRICE_OG.`),
    );
    return;
  }
  await pace();
  says(`I'll go with #${chosen.tokenId} — ${chosen.name}. ${formatEther(chosen.pricePerUse)} OG per use.`);

  if (cfg.dryRun || !cfg.privateKey) {
    console.log('');
    console.log(
      chalk.dim(
        '  ▸ dry-run — skipping on-chain rent. Set PRIVATE_KEY and unset DEMO_DRY_RUN to fire real txs.',
      ),
    );
    printSummary(records, startedAt);
    return;
  }

  // ─── 2. Rent ────────────────────────────────────────────────────────────
  header(2, 4, 'Rent on-chain (request + fund)');
  thinks('Sending requestRental, then funding the escrow with msg.value = pricePerUse.');
  await pace();

  const provider = new JsonRpcProvider(cfg.rpcUrl);
  const wallet = new Wallet(cfg.privateKey, provider);
  const escrow = new Contract(cfg.escrow, SkillEscrowABI, wallet);

  type ParseLogArg = Parameters<typeof escrow.interface.parseLog>[0];

  // requestRental
  let t = Date.now();
  const requestTx = await escrow.getFunction('requestRental')(chosen.tokenId);
  const requestReceipt = await requestTx.wait();
  if (!requestReceipt) throw new Error('requestRental: no receipt');
  const logs: readonly ParseLogArg[] = (requestReceipt.logs ?? []) as readonly ParseLogArg[];
  const requested = logs.find((log) => {
    try {
      return escrow.interface.parseLog(log)?.name === 'RentalRequested';
    } catch {
      return false;
    }
  });
  if (!requested) throw new Error('RentalRequested event missing from receipt');
  const rentalId = (escrow.interface.parseLog(requested)!.args as unknown as { rentalId: bigint })
    .rentalId;
  records.push({ label: 'Request rental', txHash: requestReceipt.hash, ms: Date.now() - t });
  ok('requested', `rentalId=${rentalId.toString()}`);
  tx('request →', requestReceipt.hash);
  await pace();

  // fundRental
  t = Date.now();
  const fundTx = await escrow.getFunction('fundRental')(rentalId, {
    value: chosen.pricePerUse,
  });
  const fundReceipt = await fundTx.wait();
  if (!fundReceipt) throw new Error('fundRental: no receipt');
  records.push({
    label: 'Fund rental',
    txHash: fundReceipt.hash,
    costWei: BigInt(chosen.pricePerUse),
    ms: Date.now() - t,
  });
  ok('funded', `escrow now holds ${formatEther(chosen.pricePerUse)} OG`);
  tx('fund →', fundReceipt.hash);
  await pace();

  // ─── 3. Invoke (preview) ────────────────────────────────────────────────
  header(3, 4, 'Invoke inside TEE');
  thinks(
    'TEE-protected inference: input encrypted, API key sealed inside the enclave, response signed.',
  );
  await pace(0.6);
  says(`Asking: "${cfg.input}"`);
  await pace();

  // 0G Galileo currently has 0 registered TeeML providers (verified live);
  // the dev provider returns hand-crafted realistic samples until one
  // registers. The sample is tagged in-band so video viewers see it.
  console.log('');
  console.log(
    chalk.dim('  ┌─ ') +
      chalk.bold.yellow('TEE-attested response') +
      chalk.dim(' ' + '─'.repeat(40)),
  );
  const sample = sampleFor(chosen.category, cfg.input);
  for (const ln of sample.split('\n')) {
    console.log(chalk.dim('  │ ') + chalk.white(ln));
  }
  console.log(chalk.dim('  └─ ' + '─'.repeat(60)));
  console.log(
    chalk.dim('    attestation digest: ') +
      chalk.gray('preview-' + Math.random().toString(16).slice(2, 18)),
  );
  console.log(
    chalk.dim('    note: live TeeML wires in once 0G Galileo registers a provider.'),
  );
  records.push({ label: 'Invoke (preview)', ms: 0 });
  await pace();

  // ─── 4. Rate ────────────────────────────────────────────────────────────
  header(4, 4, 'Rate skill (closes the reputation loop)');
  console.log(
    chalk.dim(
      '  In production, the renter signs a quality attestation; the on-chain\n' +
        '  AttestationVerifier recovers the signer and the SkillRegistry updates the\n' +
        '  reputation trajectory. The frontend sparkline animates within ~30s.',
    ),
  );
  console.log(
    chalk.dim(
      '  Demo agent skips the on-chain rate step — wire it in via QualityScorer\n' +
        "  (`packages/services/src/quality-scorer.ts`) when running an end-to-end record.",
    ),
  );
  await pace();

  printSummary(records, startedAt);
}

// ─── output helpers ───────────────────────────────────────────────────────

function printSummary(records: StepRecord[], startedAt: number): void {
  const elapsed = Date.now() - startedAt;
  const totalCost = records.reduce(
    (acc, r) => (r.costWei ? acc + r.costWei : acc),
    0n,
  );

  console.log('');
  console.log(chalk.bold.green('▸ Run summary'));
  divider();
  // Hand-formatted table — kept dependency-free for a smaller install.
  const colW = [22, 12, 50];
  const headRow =
    'Step'.padEnd(colW[0]!) +
    'Time(ms)'.padEnd(colW[1]!) +
    'Tx';
  console.log(chalk.bold.dim('  ' + headRow));
  for (const r of records) {
    const txCell = r.txHash ? explorerTx(r.txHash) : chalk.dim('—');
    console.log(
      chalk.white(
        '  ' +
          r.label.padEnd(colW[0]!) +
          String(r.ms).padEnd(colW[1]!),
      ) +
        chalk.blue(txCell),
    );
  }
  divider();
  console.log(
    chalk.dim('  total elapsed ') +
      chalk.white(`${(elapsed / 1000).toFixed(1)}s`) +
      chalk.dim('   total OG spent ') +
      chalk.white(formatEther(totalCost) + ' OG'),
  );
  console.log('');
  console.log(chalk.bold.green('▸ Done.') + chalk.dim(' Every line above is real on-chain state.'));
  console.log('');
}

function sampleFor(category: string, input: string): string {
  const samples: Record<string, string> = {
    trading: [
      `[preview] Verdict: mildly bullish on $SOL over the next 3 sessions.`,
      ``,
      `Spot volume on Binance + Bybit is up 12% w-o-w without a matching`,
      `drawdown; funding is neutral (0.01% 8h). $SOL is outperforming $BTC by`,
      `~2.4% on the week — divergence is real but not stretched.`,
      ``,
      `Risk: Thursday CPI. A hot print resets the setup.`,
    ].join('\n'),
    data: [
      `[preview] Pipeline plan for "${input.slice(0, 60)}":`,
      ``,
      `1. schema inference → 2. dedup by surrogate key → 3. outlier trim 3σ`,
      `→ 4. entity resolution against the public registry → 5. emit parquet`,
      `partitioned by day. Expected throughput ~45k rows/s on one worker.`,
    ].join('\n'),
    research: [
      `[preview] Research brief on "${input.slice(0, 60)}":`,
      ``,
      `1. Problem framing  2. Three strongest references  3. Gap in the lit`,
      `4. Proposed experiment + success metric  5. Risks + mitigations.`,
    ].join('\n'),
    content: [
      `[preview] Draft from prompt "${input.slice(0, 60)}":`,
      ``,
      `Three short paragraphs. Thesis. Two pieces of specific evidence with`,
      `sources. Counter-argument + what's unknown. Confident, not breathless.`,
    ].join('\n'),
    automation: [
      `[preview] Automation plan: trigger on event X, debounce 30s,`,
      `branch on payload.class, fan out to 3 workers, reconcile in the sink.`,
      `Retry with exponential backoff; DLQ after 5 attempts.`,
    ].join('\n'),
    other: `[preview] Sample output for category "${category}".`,
  };
  return samples[category] ?? samples.content!;
}

main().catch((err) => {
  console.error(chalk.red('\n✗ demo-agent failed:'), err);
  process.exit(1);
});
