import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@skillforge/sdk'],
  experimental: {
    // App Router is default in Next 15 — nothing else needed.
  },
};

export default config;
