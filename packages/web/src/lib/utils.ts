import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** 0xAbc…dEf — friendly truncation of an Ethereum address. */
export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Very small bigint-safe ether formatter. Avoids pulling all of viem in. */
export function formatOG(wei: string | bigint, digits = 4): string {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei);
  const base = 10n ** 18n;
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) return `${whole.toString()} OG`;
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, digits).replace(/0+$/, '');
  return `${whole.toString()}${fractionStr ? '.' + fractionStr : ''} OG`;
}

/** Format ms timestamp → "2h ago" / "3d ago" / "just now". */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
