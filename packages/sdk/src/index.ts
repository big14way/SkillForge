// Public surface of @skillforge/sdk.
//
// Modules are added to this barrel as they're implemented. Anything not yet
// re-exported is internal and subject to churn.

export { SkillForgeClient } from './client.js';
export type { SkillForgeConfig, SkillView } from './client.js';

export * from './types.js';
export * as Contracts from './contracts/index.js';

export { encryptSkill, decryptSkill, computeDataHash, CryptoError } from './crypto/aes.js';
export { sealKeyForRecipient, unsealKey, deriveAddressFromPubKey } from './crypto/keys.js';

export { StorageClient, StorageError } from './storage/StorageClient.js';
export type { StorageClientConfig, StorageUploadResult } from './storage/StorageClient.js';

export { MemoryClient, MemoryError } from './storage/MemoryClient.js';
export type { MemoryClientConfig } from './storage/MemoryClient.js';

export {
  ComputeClient,
  ComputeError,
  InvalidAttestationError,
} from './compute/ComputeClient.js';
export type {
  ComputeClientConfig,
  ProviderInfo,
  Attestation,
  InferenceResult,
} from './compute/ComputeClient.js';

export {
  encodeAttestation,
  decodeAttestation,
  computeAttestationDigest,
  hashRequest,
  hashResponse,
  assertValidSignature,
} from './compute/attestation.js';
export type { SignedAttestation } from './compute/attestation.js';

export { withComputeFallback, withReadFallback } from './fallback.js';
export type { FallbackMode, FallbackResult } from './fallback.js';

export { logger } from './logger.js';
