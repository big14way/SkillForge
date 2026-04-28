#!/usr/bin/env node
/**
 * Drive the remaining two state transitions on a Submitted rental:
 *   Submitted → Verified  (via verifyWork + dev-scorer attestation)
 *   Verified  → Completed (releases payment 95% creator / 5% treasury)
 *
 *   set -a && source contracts/.env && set +a
 *   node packages/services/scripts/complete-rental.mjs <rentalId>
 *
 * The scorer key MUST be on the SkillEscrow whitelist; on Galileo v2 that's
 * the deployer (set during the redeploy). The attestation is ABI-encoded so
 * AttestationVerifier.verify() can decode + recover the signer on-chain.
 */
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  keccak256,
  solidityPacked,
  toUtf8Bytes,
  AbiCoder,
  getBytes,
  parseEther,
  formatEther,
} from 'ethers';

const RPC = process.env.GALILEO_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';
const ESCROW = process.env.SKILL_ESCROW_ADDRESS ?? '0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1';
const PK = process.env.PRIVATE_KEY;
if (!PK) throw new Error('PRIVATE_KEY missing');
const RENTAL_ID = process.argv[2];
if (!RENTAL_ID) throw new Error('usage: complete-rental.mjs <rentalId>');

const ESCROW_ABI = [
  'function getRental(uint256) view returns (tuple(uint256 rentalId, uint256 skillTokenId, address renter, address creator, uint256 amount, uint8 state, bytes32 workProofHash, uint256 qualityScore, uint256 createdAt, uint256 completedAt))',
  'function verifyWork(uint256 rentalId, uint256 qualityScore, bytes teemlAttestation)',
  'function completeRental(uint256 rentalId)',
  'function whitelistedScorers(address) view returns (bool)',
  'event WorkVerified(uint256 indexed rentalId, uint256 qualityScore)',
  'event RentalCompleted(uint256 indexed rentalId, uint256 creatorPayout, uint256 protocolCut)',
];

const provider = new JsonRpcProvider(RPC);
const wallet = new Wallet(PK, provider);
const escrow = new Contract(ESCROW, ESCROW_ABI, wallet);

const isWhitelisted = await escrow.whitelistedScorers(wallet.address);
if (!isWhitelisted) throw new Error(`scorer ${wallet.address} not on whitelist`);

const rental = await escrow.getRental(RENTAL_ID);
console.log(`rental #${RENTAL_ID} state=${rental.state} creator=${rental.creator} amount=${formatEther(rental.amount)} OG`);
if (Number(rental.state) !== 4) throw new Error(`rental must be Submitted (state=4), got state=${rental.state}`);

// 1. Build + sign attestation. The on-chain digest is
//    keccak256(abi.encodePacked(requestHash, responseHash, provider, qualityScore))
const qualityScore = 9200;
const fakeProvider = '0x00000000000000000000000000000000defea700';
const requestHash = keccak256(toUtf8Bytes('canonical-request:demo-end-to-end'));
const responseHash = keccak256(toUtf8Bytes('canonical-response:realistic-trading-verdict'));
const digest = keccak256(
  solidityPacked(
    ['bytes32', 'bytes32', 'address', 'uint256'],
    [requestHash, responseHash, fakeProvider, qualityScore],
  ),
);
const sigHex = wallet.signingKey.sign(getBytes(digest)).serialized;
const encoded = AbiCoder.defaultAbiCoder().encode(
  ['bytes32', 'bytes32', 'address', 'uint256', 'bytes'],
  [requestHash, responseHash, fakeProvider, qualityScore, sigHex],
);

console.log('→ verifyWork…');
const verifyTx = await escrow.verifyWork(RENTAL_ID, qualityScore, encoded);
const verifyReceipt = await verifyTx.wait();
console.log(`  ok — tx ${verifyReceipt.hash}`);

console.log('→ completeRental…');
const completeTx = await escrow.completeRental(RENTAL_ID);
const completeReceipt = await completeTx.wait();
console.log(`  ok — tx ${completeReceipt.hash}`);

const final = await escrow.getRental(RENTAL_ID);
console.log(`final state=${final.state} qualityScore=${final.qualityScore} completedAt=${final.completedAt}`);
console.log(`view it at http://localhost:3000/rentals/${RENTAL_ID}`);
