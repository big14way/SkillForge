import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPublicClient, http } from 'viem';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { openDb } from './db/client.js';
import { Queries } from './db/queries.js';
import {
  SkillEscrowWatcher,
  SkillINFTWatcher,
  SkillRegistryWatcher,
} from './watchers/index.js';
import { buildApi } from './api/server.js';

/**
 * Indexer entrypoint. Starts the watchers, brings up the HTTP API, and waits
 * for a termination signal to shut everything down cleanly.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  logger.info({ cfg: { ...config, chainId: config.chainId } }, 'indexer starting');

  mkdirSync(dirname(config.dbPath), { recursive: true });
  const db = openDb({ path: config.dbPath });
  const q = new Queries(db);

  const client = createPublicClient({
    transport: http(config.rpcUrl, { retryCount: 3 }),
  });

  const watcherDeps = {
    client,
    db: q,
    logger,
    confirmations: config.confirmations,
  };

  const watchers = [
    new SkillRegistryWatcher(watcherDeps, config.skillRegistry as `0x${string}`),
    new SkillEscrowWatcher(watcherDeps, config.skillEscrow as `0x${string}`),
    new SkillINFTWatcher(watcherDeps, config.skillINFT as `0x${string}`),
  ];

  await Promise.all(watchers.map((w) => w.start(config.startBlock)));
  logger.info('all watchers caught up and listening');

  const api = await buildApi({ db: q, chainId: config.chainId, logger });
  await api.listen({ host: config.apiHost, port: config.apiPort });
  logger.info({ host: config.apiHost, port: config.apiPort }, 'api listening');

  const shutdown = async (sig: string) => {
    logger.info({ sig }, 'shutting down');
    try {
      await Promise.all(watchers.map((w) => w.stop()));
      await api.close();
      db.close();
    } catch (err) {
      logger.error({ err }, 'shutdown error');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('indexer crashed:', err);
  process.exit(1);
});
