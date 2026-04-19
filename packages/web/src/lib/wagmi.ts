'use client';

import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { env } from './env';

/**
 * 0G Galileo testnet definition. 0G's RPC currently rejects sub-2-gwei
 * priority fees — wagmi's default gas estimator is fine for now, the legacy
 * gas floor is enforced by the RPC itself.
 */
export const galileo = defineChain({
  id: env.chainId,
  name: 'Galileo Testnet',
  nativeCurrency: { name: '0G', symbol: 'OG', decimals: 18 },
  rpcUrls: {
    default: { http: [env.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'ChainScan Galileo', url: env.explorerUrl },
  },
  testnet: true,
});

/**
 * RainbowKit's getDefaultConfig wires a sensible connector set when a
 * WalletConnect project id is supplied; otherwise we fall back to the bare
 * wagmi config so at least injected wallets (MetaMask) still work offline.
 */
export const wagmiConfig = env.walletConnectProjectId
  ? getDefaultConfig({
      appName: 'SkillForge',
      projectId: env.walletConnectProjectId,
      chains: [galileo],
      transports: { [galileo.id]: http(env.rpcUrl) },
      ssr: true,
    })
  : createConfig({
      chains: [galileo],
      transports: { [galileo.id]: http(env.rpcUrl) },
      ssr: true,
    });
