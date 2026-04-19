import { describe, it, expect } from 'vitest';
import { withComputeFallback, withReadFallback } from '../src/fallback.js';

describe('withComputeFallback', () => {
  it('returns mode=live when the operation succeeds', async () => {
    const res = await withComputeFallback(
      'test',
      async () => ({ hello: 'world' }),
      () => ({ hello: 'fallback' }),
    );
    expect(res.mode).toBe('live');
    expect(res.result.hello).toBe('world');
    expect(res.reason).toBeUndefined();
  });

  it('falls back with the error reason when operation throws', async () => {
    const res = await withComputeFallback(
      'infer',
      async () => {
        throw new Error('broker offline');
      },
      () => ({ mock: true }),
    );
    expect(res.mode).toBe('fallback');
    expect(res.reason).toBe('broker offline');
    expect(res.result.mock).toBe(true);
  });

  it('awaits async fallbacks', async () => {
    const res = await withComputeFallback(
      'kv',
      async () => {
        throw new Error('kv down');
      },
      async () => 'async-fallback',
    );
    expect(res.result).toBe('async-fallback');
  });

  it('coerces non-Error throws to a string reason', async () => {
    const res = await withComputeFallback(
      'odd',
      async () => {
        throw 42;
      },
      () => 'ok',
    );
    expect(res.reason).toBe('42');
  });
});

describe('withReadFallback', () => {
  it('returns null with mode=fallback on error', async () => {
    const res = await withReadFallback<string>('kv-read', async () => {
      throw new Error('timeout');
    });
    expect(res.result).toBeNull();
    expect(res.mode).toBe('fallback');
  });

  it('passes through null results as live', async () => {
    const res = await withReadFallback<string>('kv-read', async () => null);
    expect(res.result).toBeNull();
    expect(res.mode).toBe('live');
  });
});
