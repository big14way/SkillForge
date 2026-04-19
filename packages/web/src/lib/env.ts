/**
 * Frontend env — all vars must be `NEXT_PUBLIC_` since they're read in the
 * browser. Centralised here so fallback defaults live in one place.
 */

const DEFAULTS = {
  chainId: 16602,
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  explorerUrl: 'https://chainscan-galileo.0g.ai',
  skillINFT: '0x8486E62b5975A4241818b564834A5f51ae2540B6',
  skillRegistry: '0xe3D37E5c036CC0bb4E0A170D49cc9212ABc8f985',
  skillEscrow: '0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1',
  indexerUrl: 'http://localhost:4000',
  walletConnectProjectId: '',
} as const;

export const env = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? DEFAULTS.chainId),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULTS.rpcUrl,
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL ?? DEFAULTS.explorerUrl,
  skillINFT: (process.env.NEXT_PUBLIC_SKILL_INFT_ADDRESS ??
    DEFAULTS.skillINFT) as `0x${string}`,
  skillRegistry: (process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS ??
    DEFAULTS.skillRegistry) as `0x${string}`,
  skillEscrow: (process.env.NEXT_PUBLIC_SKILL_ESCROW_ADDRESS ??
    DEFAULTS.skillEscrow) as `0x${string}`,
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_API_URL ?? DEFAULTS.indexerUrl,
  walletConnectProjectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? DEFAULTS.walletConnectProjectId,
};
