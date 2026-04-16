import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Hex } from '@skillforge/sdk';

/**
 * Per-user CLI state, stored at ~/.skillforge/config.json. Holds the wallet's
 * private key, the KV stream id, and any cached preferences.
 */

const CONFIG_DIR = join(homedir(), '.skillforge');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  privateKey?: Hex;
  kvStreamId?: Hex;
  teemlProvider?: Hex;
  createdAt?: number;
}

export function loadConfig(): CliConfig {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function saveConfig(cfg: CliConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function configPath(): string {
  return CONFIG_PATH;
}
