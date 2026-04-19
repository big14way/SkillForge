import { logger } from './logger.js';

/**
 * Soft-fail helper for calls into 0G Compute and KV while those services are
 * intermittently available on Galileo. Every call that would hit external 0G
 * infra goes through this wrapper so the UI and CLI can distinguish live data
 * from fallback data and surface that honestly to the user.
 *
 * Design constraints:
 *   - On-chain state never uses fallback. The contracts are always real.
 *   - `mode` propagates up to React + CLI so the "preview mode" banner is
 *     accurate per-request.
 *   - `reason` is the error message, not a stack trace — safe to render.
 */

export type FallbackMode = 'live' | 'fallback';

export interface FallbackResult<T> {
  result: T;
  mode: FallbackMode;
  reason?: string;
  context: string;
}

/**
 * Try `operation()`. If it rejects, run `fallback()` and tag the result as
 * preview-mode with the original error reason.
 */
export async function withComputeFallback<T>(
  context: string,
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<FallbackResult<T>> {
  try {
    const result = await operation();
    return { result, mode: 'live', context };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn({ context, reason }, '0G infra unavailable — using fallback');
    const result = await fallback();
    return { result, mode: 'fallback', reason, context };
  }
}

/**
 * Narrower helper for reads: returns `null` on success failure, tags mode.
 * Useful for KV reads where "no value" is a valid return and we don't want to
 * fabricate one.
 */
export async function withReadFallback<T>(
  context: string,
  operation: () => Promise<T | null>,
): Promise<FallbackResult<T | null>> {
  try {
    const result = await operation();
    return { result, mode: 'live', context };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn({ context, reason }, '0G read unavailable — returning null');
    return { result: null, mode: 'fallback', reason, context };
  }
}
