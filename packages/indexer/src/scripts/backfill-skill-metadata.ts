#!/usr/bin/env tsx
/**
 * One-time backfill: walks every skill currently in the SQLite indexer DB
 * whose name still looks like the placeholder (`skill-N`) or whose description
 * is empty, and re-fetches the full struct from `SkillRegistry.getSkill(id)`.
 *
 * Safe to run repeatedly — only mutates rows that need enrichment.
 *
 *   set -a && source contracts/.env && set +a
 *   pnpm -F @skillforge/indexer exec tsx src/scripts/backfill-skill-metadata.ts
 *
 * Or after building the package:
 *   node packages/indexer/dist/scripts/backfill-skill-metadata.js
 */
import { createPublicClient, http } from 'viem';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { openDb } from '../db/client.js';
import { Queries } from '../db/queries.js';
import { SkillRegistryWatcher } from '../watchers/SkillRegistryWatcher.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const logger = createLogger(cfg.logLevel);
  const db = openDb({ path: cfg.dbPath });
  const q = new Queries(db);

  const client = createPublicClient({ transport: http(cfg.rpcUrl, { retryCount: 3 }) });
  const watcher = new SkillRegistryWatcher(
    { client, db: q, logger, confirmations: cfg.confirmations },
    cfg.skillRegistry as `0x${string}`,
  );

  // Pull every skill the indexer thinks is active and pick the ones that look
  // un-enriched. We deliberately don't filter on `is_active = 0` so disabled
  // skills also get fixed up (their detail page still renders).
  const placeholders = q.listSkills({ limit: 100, sort: 'recent' }).filter(
    (s) => /^skill-\d+$/.test(s.name) || s.description === '',
  );
  logger.info({ count: placeholders.length }, 'backfill: found skills needing enrichment');

  let ok = 0;
  let failed = 0;
  for (const s of placeholders) {
    const before = { name: s.name, desc: s.description };
    await watcher.enrichFromRegistry(s.token_id);
    const after = q.getSkill(s.token_id);
    if (after && (after.name !== before.name || after.description !== before.desc)) {
      logger.info(
        { tokenId: s.token_id, name: after.name, description: after.description },
        'backfill: enriched',
      );
      ok++;
    } else {
      logger.warn({ tokenId: s.token_id }, 'backfill: row unchanged (rpc failure or already correct)');
      failed++;
    }
  }
  logger.info({ ok, unchanged: failed, total: placeholders.length }, 'backfill: done');

  db.close();
}

main().catch((err) => {
  console.error('backfill crashed:', err);
  process.exit(1);
});
