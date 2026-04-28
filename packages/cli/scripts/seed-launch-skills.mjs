#!/usr/bin/env node
/**
 * Seeder for the 8 launch-lineup API wrapper skills.
 *
 * Imports `@skillforge/sdk` + `@skillforge/services` from their compiled dist
 * to avoid the @0glabs/0g-serving-broker@0.4.4 ESM-re-export bug that breaks
 * `tsx` runs of TS source. Build the SDK + services packages once before
 * running:
 *
 *   pnpm -r build
 *   set -a && source contracts/.env && set +a
 *   export OAI_API_KEY=sk-...
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   export COINGECKO_API_KEY=CG-...
 *   export TAVILY_API_KEY=tvly-...
 *   export FIRECRAWL_API_KEY=fc-...
 *   export TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=+1...
 *   export NANSEN_API_KEY=...
 *   export WEATHERAPI_API_KEY=...
 *   node packages/cli/scripts/seed-launch-skills.mjs
 *
 * Flags:
 *   --dry-run            Validate payloads + show plan; no on-chain writes.
 *   --only=oai-chat      Publish a single skill by id.
 *   --skip=twilio-sms    Comma-separated list of ids to skip.
 *
 * Each payload is encrypted with AES-256-GCM, uploaded to 0G Storage, the
 * INFT is minted, and the skill is registered with `marketplace.name`,
 * `marketplace.description`, etc. Skill keys persist to
 * `.skillforge/keys/<tokenId>.key` for later sealing to renters.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEther } from 'ethers';
import { SkillForgeClient } from '@skillforge/sdk';
import { SkillPublisher } from '@skillforge/services';

const here = dirname(fileURLToPath(import.meta.url));
const PAYLOAD_DIR = join(here, 'skill-payloads');

function parseArgs(argv) {
  const opts = { dryRun: false, skip: new Set() };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--only=')) opts.only = arg.slice('--only='.length);
    else if (arg.startsWith('--skip=')) {
      arg
        .slice('--skip='.length)
        .split(',')
        .forEach((s) => opts.skip.add(s.trim()));
    }
  }
  return opts;
}

function loadPayloads(opts) {
  const files = readdirSync(PAYLOAD_DIR).filter((f) => f.endsWith('.json'));
  const out = [];
  const missingEnv = [];

  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    if (opts.only && opts.only !== id) continue;
    if (opts.skip.has(id)) continue;
    const raw = JSON.parse(readFileSync(join(PAYLOAD_DIR, f), 'utf8'));
    const wrapper = { ...raw.wrapper };

    if (raw.wrapper.apiKeyEnvVar) {
      const v = process.env[raw.wrapper.apiKeyEnvVar];
      if (!v) missingEnv.push(`${id} → ${raw.wrapper.apiKeyEnvVar}`);
      else wrapper.apiKey = v;
    }
    if (raw.wrapper.credentialEnvVars) {
      const expected = Object.entries(raw.wrapper.credentialEnvVars);
      const creds = {};
      for (const [k, env] of expected) {
        const v = process.env[env];
        if (!v) missingEnv.push(`${id} → ${env}`);
        else creds[k] = v;
      }
      // Only attach `credentials` if every expected env var resolved — otherwise
      // the dry-run "have key" indicator misleads.
      if (Object.keys(creds).length === expected.length) {
        wrapper.credentials = creds;
      }
    }

    out.push({ ...raw, wrapper, id });
  }

  if (missingEnv.length > 0 && !opts.dryRun) {
    console.error('\n✗ Missing API-key env vars:');
    for (const line of missingEnv) console.error('   ' + line);
    console.error(
      '\n  Set them and re-run, OR pass --dry-run to preview the plan, OR --skip=<id> to skip.\n',
    );
    process.exit(1);
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv);
  const payloads = loadPayloads(opts);

  console.log(`\n— SkillForge launch-skills seeder —`);
  console.log(`  payloads dir: ${PAYLOAD_DIR}`);
  console.log(`  dry-run     : ${opts.dryRun}`);
  console.log(`  count       : ${payloads.length}\n`);

  for (const p of payloads) {
    const haveKey = Boolean(p.wrapper.apiKey || p.wrapper.credentials);
    console.log(
      `  · ${p.id.padEnd(22)} ${p.marketplace.pricePerUseOG.padStart(8)} OG  ${
        haveKey ? '🔑' : '🚫 no-key'
      }  — ${p.marketplace.name}`,
    );
  }
  console.log('');

  if (opts.dryRun) {
    console.log('Dry-run only — no on-chain writes. Re-run without --dry-run to publish.');
    return;
  }

  const sdk = SkillForgeClient.fromEnv();
  const publisher = new SkillPublisher(sdk);
  const keyDir = join(process.cwd(), '.skillforge', 'keys');
  mkdirSync(keyDir, { recursive: true });

  const results = [];

  for (const p of payloads) {
    console.log(`\n→ publishing ${p.id} (${p.marketplace.name})…`);
    const content = Buffer.from(
      JSON.stringify({ id: p.id, wrapper: p.wrapper, demo: p.demo }, null, 2),
    );

    try {
      const result = await publisher.publish({
        name: p.marketplace.name,
        description: p.marketplace.description,
        category: p.marketplace.category,
        pricePerUse: parseEther(p.marketplace.pricePerUseOG),
        content,
      });
      console.log(`  tokenId   : ${result.tokenId.toString()}`);
      console.log(`  storage   : ${result.storageURI}`);
      console.log(`  mint  tx  : ${result.txHashes.mint}`);
      console.log(`  reg   tx  : ${result.txHashes.register}`);
      writeFileSync(
        join(keyDir, `${result.tokenId.toString()}.key`),
        result.skillKey,
        { mode: 0o600 },
      );
      results.push({
        id: p.id,
        tokenId: result.tokenId.toString(),
        storageURI: result.storageURI,
        txHashes: result.txHashes,
      });
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
      console.error('  Continuing with the next skill…');
    }
  }

  const manifestPath = join(keyDir, '..', 'launch-manifest.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        skills: results.map((r) => ({
          id: r.id,
          tokenId: r.tokenId,
          storageURI: r.storageURI,
          mintTx: r.txHashes.mint,
          registerTx: r.txHashes.register,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\n✓ Done. Manifest: ${manifestPath}`);
  console.log(`  ${results.length}/${payloads.length} skills published.`);
}

main().catch((err) => {
  console.error('seeder crashed:', err);
  process.exit(1);
});
