import { z } from 'zod';

/**
 * Runtime config for the indexer — validated via zod at startup so misconfigs
 * surface as a single readable error instead of undefined access later.
 */

const HEX_ADDR = /^0x[a-fA-F0-9]{40}$/;

const Schema = z.object({
  rpcUrl: z.string().url().default('https://evmrpc-testnet.0g.ai'),
  chainId: z.coerce.number().int().default(16602),
  skillINFT: z.string().regex(HEX_ADDR),
  skillRegistry: z.string().regex(HEX_ADDR),
  skillEscrow: z.string().regex(HEX_ADDR),
  /** Block to start back-filling from. Defaults to 0 (full history). */
  startBlock: z.coerce.bigint().default(0n),
  /** Reorg safety buffer. 5 blocks is plenty for 0G Galileo. */
  confirmations: z.coerce.number().int().default(5),
  dbPath: z.string().default('./data/indexer.db'),
  apiHost: z.string().default('127.0.0.1'),
  apiPort: z.coerce.number().int().default(4000),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export type IndexerConfig = z.infer<typeof Schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): IndexerConfig {
  return Schema.parse({
    rpcUrl: env.GALILEO_RPC_URL,
    chainId: env.GALILEO_CHAIN_ID,
    skillINFT: env.SKILL_INFT_ADDRESS ?? '0x8486E62b5975A4241818b564834A5f51ae2540B6',
    skillRegistry: env.SKILL_REGISTRY_ADDRESS ?? '0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985',
    skillEscrow: env.SKILL_ESCROW_ADDRESS ?? '0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1',
    startBlock: env.INDEXER_START_BLOCK,
    confirmations: env.INDEXER_CONFIRMATIONS,
    dbPath: env.INDEXER_DB_PATH,
    apiHost: env.INDEXER_API_HOST,
    apiPort: env.INDEXER_API_PORT,
    logLevel: env.LOG_LEVEL,
  });
}
