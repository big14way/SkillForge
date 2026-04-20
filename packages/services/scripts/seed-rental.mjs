#!/usr/bin/env node
/**
 * Seed a rental against a live Galileo skill so the Week 3 screenshots have
 * actual data. Picks the first active skill in the indexer's /api/skills
 * list and walks request → fund → (optionally) authorize.
 *
 * Usage (from repo root):
 *   set -a && source contracts/.env && set +a
 *   node scripts/seed-rental.mjs                    # request + fund
 *   node scripts/seed-rental.mjs --authorize        # also authorize + submit
 */
import { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes } from 'ethers';

const INDEXER = process.env.SKILLFORGE_INDEXER_URL ?? 'http://127.0.0.1:4000';
const RPC = process.env.GALILEO_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ESCROW = process.env.SKILL_ESCROW_ADDRESS ?? '0x6e6e076893c6b9eAc90463cd0E3021404F9B27B1';
const INFT = process.env.SKILL_INFT_ADDRESS ?? '0x8486E62b5975A4241818b564834A5f51ae2540B6';

if (!PRIVATE_KEY) {
  console.error('PRIVATE_KEY missing; `source contracts/.env` first');
  process.exit(1);
}

const ESCROW_ABI = [
  'function requestRental(uint256) returns (uint256)',
  'function fundRental(uint256) payable',
  'function authorizeAccess(uint256)',
  'function submitWork(uint256, bytes32)',
  'event RentalRequested(uint256 indexed rentalId, uint256 indexed skillTokenId, address indexed renter)',
];
const INFT_ABI = [
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
];

async function main() {
  const authorize = process.argv.includes('--authorize');

  const res = await fetch(`${INDEXER}/api/skills?limit=5&sort=recent`);
  if (!res.ok) throw new Error(`indexer at ${INDEXER} returned ${res.status}`);
  const { items } = await res.json();
  if (!items.length) throw new Error('indexer has no skills to rent');
  const skill = items[0];
  console.log(`→ renting skill #${skill.tokenId} "${skill.name}" @ ${skill.pricePerUse} wei`);

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  const escrow = new Contract(ESCROW, ESCROW_ABI, wallet);
  const inft = new Contract(INFT, INFT_ABI, wallet);

  const reqTx = await escrow.requestRental(BigInt(skill.tokenId));
  const reqReceipt = await reqTx.wait();
  let rentalId = null;
  for (const log of reqReceipt.logs) {
    try {
      const parsed = escrow.interface.parseLog(log);
      if (parsed?.name === 'RentalRequested') {
        rentalId = parsed.args.rentalId;
        break;
      }
    } catch {}
  }
  if (!rentalId) throw new Error('RentalRequested event not found in receipt');
  console.log(`  requested rental #${rentalId.toString()} — tx ${reqReceipt.hash}`);

  const fundTx = await escrow.fundRental(rentalId, { value: BigInt(skill.pricePerUse) });
  const fundReceipt = await fundTx.wait();
  console.log(`  funded — tx ${fundReceipt.hash}`);

  if (!authorize) {
    console.log('\nDone. Rental sits in state Funded. Pass --authorize to continue.');
    console.log(`View it at http://localhost:3000/rentals/${rentalId.toString()}`);
    return;
  }

  const approved = await inft.isApprovedForAll(wallet.address, ESCROW);
  if (!approved) {
    console.log('  granting escrow approvalForAll on SkillINFT…');
    const apTx = await inft.setApprovalForAll(ESCROW, true);
    await apTx.wait();
  }

  const authTx = await escrow.authorizeAccess(rentalId);
  const authReceipt = await authTx.wait();
  console.log(`  authorized (state → Active) — tx ${authReceipt.hash}`);

  const subTx = await escrow.submitWork(rentalId, keccak256(toUtf8Bytes(`seed-${Date.now()}`)));
  const subReceipt = await subTx.wait();
  console.log(`  submitted work (state → Submitted) — tx ${subReceipt.hash}`);
  console.log(`\nDone. Rental sits in state Submitted.`);
  console.log(`View it at http://localhost:3000/rentals/${rentalId.toString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
