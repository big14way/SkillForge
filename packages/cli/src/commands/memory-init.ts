import { randomBytes } from 'node:crypto';
import ora from 'ora';
import { hexlify, Wallet } from 'ethers';
import { MemoryClient, type Hex } from '@skillforge/sdk';
import { ui } from '../ui.js';

/**
 * Known Flow contract address on 0G Galileo testnet (chainId 16602). This is
 * where KV writes are anchored on-chain. Overridable via env for other nets.
 */
const GALILEO_FLOW_CONTRACT = '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296';

export interface MemoryInitOpts {
  streamId?: string;
}

/**
 * `skillforge memory init` — establishes a fresh 0G KV stream for the current
 * wallet by doing a no-op write. The streamId is randomly generated if not
 * supplied. Prints the `.env` lines the user should persist.
 */
export async function runMemoryInit(opts: MemoryInitOpts): Promise<void> {
  ui.heading('0G KV memory init');

  const privateKey = process.env.PRIVATE_KEY as Hex | undefined;
  if (!privateKey) ui.fatal('PRIVATE_KEY missing — source contracts/.env first');

  const streamId = (opts.streamId ?? hexlify(randomBytes(32))) as Hex;
  const flowAddr = (process.env.OG_FLOW_CONTRACT_ADDRESS as Hex) || (GALILEO_FLOW_CONTRACT as Hex);
  const kvNode = process.env.OG_KV_NODE_RPC ?? 'http://3.101.147.150:6789';
  const indexer = process.env.OG_STORAGE_INDEXER_RPC ?? 'https://indexer-storage-testnet-turbo.0g.ai';
  const rpc = process.env.GALILEO_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';

  const addr = new Wallet(privateKey!).address;
  ui.info(`Wallet:     ${addr}`);
  ui.info(`StreamId:   ${streamId}`);
  ui.info(`Flow:       ${flowAddr}`);
  ui.info(`KV node:    ${kvNode}`);

  const client = new MemoryClient({
    privateKey: privateKey!,
    streamId,
    flowContractAddress: flowAddr,
    kvNodeRpc: kvNode,
    indexerRpc: indexer,
    evmRpc: rpc,
  });

  const spinner = ora('writing stream-seed entry…').start();
  try {
    await client.set(`agent:${addr.toLowerCase()}:seed`, {
      createdAt: Date.now(),
      note: 'SkillForge stream seed — written by skillforge memory init',
    });
    spinner.succeed('stream seeded');
  } catch (err) {
    spinner.fail(`stream write failed: ${(err as Error).message}`);
    throw err;
  }

  console.log('');
  ui.ok('Add these lines to your .env:');
  console.log(`  OG_KV_STREAM_ID=${streamId}`);
  console.log(`  OG_KV_NODE_RPC=${kvNode}`);
  console.log(`  OG_FLOW_CONTRACT_ADDRESS=${flowAddr}`);
}
