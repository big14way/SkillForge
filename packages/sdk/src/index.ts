// Public surface of @skillforge/sdk.
//
// Modules are added to this barrel as they're implemented. Anything not yet
// re-exported is internal and subject to churn.

export * from './types.js';
export * as Contracts from './contracts/index.js';

export { encryptSkill, decryptSkill, computeDataHash, CryptoError } from './crypto/aes.js';
export { sealKeyForRecipient, unsealKey, deriveAddressFromPubKey } from './crypto/keys.js';

export { StorageClient, StorageError } from './storage/StorageClient.js';
export type { StorageClientConfig, StorageUploadResult } from './storage/StorageClient.js';

export { MemoryClient, MemoryError } from './storage/MemoryClient.js';
export type { MemoryClientConfig } from './storage/MemoryClient.js';

export { logger } from './logger.js';
