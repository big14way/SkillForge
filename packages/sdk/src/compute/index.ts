export {
  ComputeClient,
  ComputeError,
  InvalidAttestationError,
} from './ComputeClient.js';
export type {
  ComputeClientConfig,
  ProviderInfo,
  Attestation,
  InferenceResult,
} from './ComputeClient.js';

export {
  encodeAttestation,
  decodeAttestation,
  computeAttestationDigest,
  hashRequest,
  hashResponse,
  assertValidSignature,
} from './attestation.js';
export type { SignedAttestation } from './attestation.js';
