// Public surface of @skillforge/sdk.

export { SkillForgeClient } from './client.js';
export type { SkillForgeConfig, SkillView } from './client.js';

export * from './types.js';
export * as Contracts from './contracts/index.js';

export { encryptSkill, decryptSkill, computeDataHash } from './crypto/aes.js';
export { sealKeyForRecipient, unsealKey, deriveAddressFromPubKey } from './crypto/keys.js';

export { StorageClient } from './storage/StorageClient.js';
export type { StorageUploadResult } from './storage/StorageClient.js';

export { MemoryClient } from './storage/MemoryClient.js';

export { ComputeClient, InvalidAttestationError } from './compute/ComputeClient.js';
export type { Attestation, InferenceResult } from './compute/ComputeClient.js';
export { encodeAttestation, decodeAttestation, computeAttestationDigest } from './compute/attestation.js';

export { logger } from './logger.js';
