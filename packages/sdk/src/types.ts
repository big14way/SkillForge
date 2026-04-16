import { z } from 'zod';

/** A 0x-prefixed hexadecimal string. */
export type Hex = `0x${string}`;

/**
 * Ethereum address — 20 bytes, 0x-prefixed, mixed-case checksummed when produced
 * by ethers. Validation is structural only; we never assume checksum on input.
 */
export const HexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid Ethereum address')
  .transform((s) => s as Hex);

/** A 32-byte hex digest (keccak256, sha256, etc.). */
export const Hex32 = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'invalid 32-byte hex digest')
  .transform((s) => s as Hex);

/** Arbitrary-length hex bytes blob. */
export const HexBytes = z
  .string()
  .regex(/^0x[a-fA-F0-9]*$/, 'invalid hex bytes')
  .transform((s) => s as Hex);

export const SkillCategory = z.enum(['trading', 'data', 'content', 'research', 'other']);
export type SkillCategory = z.infer<typeof SkillCategory>;

/** Lifecycle states for a rental — mirrors SkillTypes.RentalState in Solidity. */
export const RentalState = {
  None: 0,
  Requested: 1,
  Funded: 2,
  Active: 3,
  Submitted: 4,
  Verified: 5,
  Completed: 6,
  Disputed: 7,
} as const;

export type RentalStateValue = (typeof RentalState)[keyof typeof RentalState];
