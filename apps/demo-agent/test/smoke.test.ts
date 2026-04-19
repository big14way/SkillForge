import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The demo agent is a live script — its behaviour gets exercised via the
 * e2e integration test (packages/services/test/integration/). For CI hygiene
 * we just assert the module's top-level shape doesn't drift: it must read
 * PRIVATE_KEY from env and target SkillEscrow.
 */

describe('demo-agent script shape', () => {
  it('references the required env vars and SkillEscrow ABI', () => {
    const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/process\.env\.PRIVATE_KEY/);
    expect(src).toMatch(/SkillEscrowABI/);
    expect(src).toMatch(/requestRental/);
    expect(src).toMatch(/fundRental/);
  });

  it('guards against running on-chain when PRIVATE_KEY is missing', () => {
    const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/!cfg\.privateKey/);
  });
});
