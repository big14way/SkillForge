import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { StorageClient } from './storage/StorageClient.js';
import { MemoryClient, type MemoryClientConfig } from './storage/MemoryClient.js';
import { ComputeClient } from './compute/ComputeClient.js';
import { SkillINFTABI, SkillRegistryABI, SkillEscrowABI } from './contracts/index.js';
import { logger } from './logger.js';
import type { Hex } from './types.js';

/**
 * Top-level config surface. `memory` is optional because KV stream creation is
 * still a pre-flight step — the CLI provisions it via `skillforge init` and
 * writes the streamId back into .env.
 */
export interface SkillForgeConfig {
  chain: {
    rpcUrl: string;
    chainId: number;
    privateKey: Hex;
  };
  contracts: {
    skillINFT: Hex;
    skillRegistry: Hex;
    skillEscrow: Hex;
  };
  storage: {
    indexerRpc: string;
  };
  memory?: Omit<MemoryClientConfig, 'evmRpc' | 'privateKey' | 'indexerRpc'>;
  compute?: {
    preferredProvider?: Hex;
    defaultLedgerBalance?: number;
    /** Override the inference registry contract. Defaults to the canonical Galileo address. */
    inferenceContract?: Hex;
    /** Override the ledger contract. Defaults to the canonical Galileo address. */
    ledgerContract?: Hex;
    /** Override the fine-tuning contract. Defaults to the canonical Galileo address. */
    fineTuningContract?: Hex;
  };
}

export interface SkillView {
  tokenId: bigint;
  creator: Hex;
  name: string;
  description: string;
  category: string;
  pricePerUse: bigint;
  qualityScore: bigint;
  totalRentals: bigint;
  storageURI: string;
  isActive: boolean;
  createdAt: bigint;
}

/**
 * Convenience aggregator over Storage, Memory, Compute, and the three
 * SkillForge contracts. Services compose this client — callers should rarely
 * need to reach into sub-clients directly.
 */
export class SkillForgeClient {
  readonly storage: StorageClient;
  readonly memory: MemoryClient | null;
  readonly compute: ComputeClient;
  readonly provider: JsonRpcProvider;
  readonly signer: Wallet;

  readonly contracts: {
    skillINFT: Contract;
    skillRegistry: Contract;
    skillEscrow: Contract;
  };

  constructor(readonly config: SkillForgeConfig) {
    this.provider = new JsonRpcProvider(config.chain.rpcUrl);
    this.signer = new Wallet(config.chain.privateKey, this.provider);

    this.storage = new StorageClient({
      indexerRpc: config.storage.indexerRpc,
      evmRpc: config.chain.rpcUrl,
      privateKey: config.chain.privateKey,
    });

    this.memory = config.memory
      ? new MemoryClient({
          ...config.memory,
          evmRpc: config.chain.rpcUrl,
          indexerRpc: config.storage.indexerRpc,
          privateKey: config.chain.privateKey,
        })
      : null;

    this.compute = new ComputeClient({
      evmRpc: config.chain.rpcUrl,
      privateKey: config.chain.privateKey,
      ...(config.compute?.preferredProvider !== undefined && {
        preferredProvider: config.compute.preferredProvider,
      }),
      ...(config.compute?.defaultLedgerBalance !== undefined && {
        defaultLedgerBalance: config.compute.defaultLedgerBalance,
      }),
      ...(config.compute?.inferenceContract !== undefined && {
        inferenceContract: config.compute.inferenceContract,
      }),
      ...(config.compute?.ledgerContract !== undefined && {
        ledgerContract: config.compute.ledgerContract,
      }),
      ...(config.compute?.fineTuningContract !== undefined && {
        fineTuningContract: config.compute.fineTuningContract,
      }),
    });

    this.contracts = {
      skillINFT: new Contract(config.contracts.skillINFT, SkillINFTABI, this.signer),
      skillRegistry: new Contract(config.contracts.skillRegistry, SkillRegistryABI, this.signer),
      skillEscrow: new Contract(config.contracts.skillEscrow, SkillEscrowABI, this.signer),
    };
  }

  /**
   * Build a client from environment variables. See `.env.example` for the
   * complete list.
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): SkillForgeClient {
    const requireEnv = (k: string): string => {
      const v = env[k];
      if (!v) throw new Error(`missing env var: ${k}`);
      return v;
    };

    const memoryStreamId = env.OG_KV_STREAM_ID as Hex | undefined;
    const memoryNodeRpc = env.OG_KV_NODE_RPC;
    const flowAddress = env.OG_FLOW_CONTRACT_ADDRESS as Hex | undefined;

    const cfg: SkillForgeConfig = {
      chain: {
        rpcUrl: requireEnv('GALILEO_RPC_URL'),
        chainId: Number(env.GALILEO_CHAIN_ID ?? 16602),
        privateKey: requireEnv('PRIVATE_KEY') as Hex,
      },
      contracts: {
        skillINFT: requireEnv('SKILL_INFT_ADDRESS') as Hex,
        skillRegistry: requireEnv('SKILL_REGISTRY_ADDRESS') as Hex,
        skillEscrow: requireEnv('SKILL_ESCROW_ADDRESS') as Hex,
      },
      storage: {
        indexerRpc: env.OG_STORAGE_INDEXER_RPC ?? 'https://indexer-storage-testnet-turbo.0g.ai',
      },
    };

    if (memoryStreamId && memoryNodeRpc && flowAddress) {
      cfg.memory = {
        streamId: memoryStreamId,
        kvNodeRpc: memoryNodeRpc,
        flowContractAddress: flowAddress,
      };
    }

    const preferredProvider = env.TEEML_PROVIDER_ADDRESS as Hex | undefined;
    const ledgerBalance = env.OG_COMPUTE_LEDGER_OG;
    const inferenceContract = env.OG_COMPUTE_INFERENCE_CONTRACT as Hex | undefined;
    const ledgerContract = env.OG_COMPUTE_LEDGER_CONTRACT as Hex | undefined;
    const fineTuningContract = env.OG_COMPUTE_FINETUNING_CONTRACT as Hex | undefined;
    if (preferredProvider || ledgerBalance || inferenceContract || ledgerContract || fineTuningContract) {
      cfg.compute = {};
      if (preferredProvider) cfg.compute.preferredProvider = preferredProvider;
      if (ledgerBalance) cfg.compute.defaultLedgerBalance = Number(ledgerBalance);
      if (inferenceContract) cfg.compute.inferenceContract = inferenceContract;
      if (ledgerContract) cfg.compute.ledgerContract = ledgerContract;
      if (fineTuningContract) cfg.compute.fineTuningContract = fineTuningContract;
    }

    logger.debug({ chainId: cfg.chain.chainId }, 'SkillForgeClient.fromEnv');
    return new SkillForgeClient(cfg);
  }

  /** Read a skill by token id via the registry. */
  async getSkill(tokenId: bigint): Promise<SkillView> {
    const s = await this.contracts.skillRegistry.getFunction('getSkill').staticCall(tokenId) as unknown as {
      creator: string;
      name: string;
      description: string;
      category: string;
      pricePerUse: bigint;
      qualityScore: bigint;
      totalRentals: bigint;
      storageURI: string;
      metadataHash: string;
      isActive: boolean;
      createdAt: bigint;
    };
    return {
      tokenId,
      creator: s.creator as Hex,
      name: s.name,
      description: s.description,
      category: s.category,
      pricePerUse: s.pricePerUse,
      qualityScore: s.qualityScore,
      totalRentals: s.totalRentals,
      storageURI: s.storageURI,
      isActive: s.isActive,
      createdAt: s.createdAt,
    };
  }

  /** Basic listing — by category or by creator. Expensive queries go through a subgraph in Week 3. */
  async listSkills(filter: { category?: string; creator?: Hex } = {}): Promise<SkillView[]> {
    const registry = this.contracts.skillRegistry;
    let ids: bigint[] = [];
    if (filter.creator) {
      ids = (await registry.getFunction('getSkillsByCreator').staticCall(filter.creator)) as bigint[];
    } else if (filter.category) {
      ids = (await registry.getFunction('getSkillsByCategory').staticCall(filter.category)) as bigint[];
    } else {
      ids = (await registry.getFunction('getTopSkills').staticCall(100n)) as bigint[];
    }
    const skills = await Promise.all(ids.filter((id) => id !== 0n).map((id) => this.getSkill(id)));
    return skills;
  }
}
