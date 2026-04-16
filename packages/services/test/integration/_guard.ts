/**
 * Gate every integration suite behind `SKILLFORGE_INTEGRATION=1` so CI doesn't
 * pay for testnet gas on every commit.
 *
 * The caller is expected to source `contracts/.env` (or set env vars directly)
 * before invoking vitest, e.g.:
 *
 *   set -a && source contracts/.env && set +a
 *   SKILLFORGE_INTEGRATION=1 pnpm --filter @skillforge/services test:integration
 */

export function integrationEnabled(): boolean {
  return process.env.SKILLFORGE_INTEGRATION === '1';
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`integration env var missing: ${name}`);
  return v;
}
