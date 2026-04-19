'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { decodeEventLog, type Hex } from 'viem';
// Import only the ABIs via the subpath so we don't pull Node `crypto` into the browser bundle.
import { SkillEscrowABI } from '@skillforge/sdk/contracts';
import { useSkill } from '@/lib/hooks';
import { formatOG } from '@/lib/utils';
import { env } from '@/lib/env';
import { TxStatus, type TxStep } from '@/components/shared/TxStatus';

/**
 * Rental flow — walks the user through requestRental → fundRental on-chain.
 * The subsequent Active / Submitted / Verified / Completed transitions are
 * creator-driven and surfaced on the rental detail page.
 */
export default function RentPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  const { address, isConnected } = useAccount();
  const { data } = useSkill(tokenId);
  const [steps, setSteps] = useState<TxStep[]>([
    { label: 'Request rental', status: 'pending' },
    { label: 'Fund rental', status: 'pending' },
  ]);
  const [rentalId, setRentalId] = useState<string | null>(null);

  const requestWrite = useWriteContract();
  const requestReceipt = useWaitForTransactionReceipt({ hash: requestWrite.data });

  const fundWrite = useWriteContract();
  const fundReceipt = useWaitForTransactionReceipt({ hash: fundWrite.data });

  async function kickOff() {
    if (!data?.skill) return;
    setSteps([{ label: 'Request rental', status: 'active' }, { label: 'Fund rental', status: 'pending' }]);
    requestWrite.writeContract({
      abi: SkillEscrowABI,
      address: env.skillEscrow,
      functionName: 'requestRental',
      args: [BigInt(tokenId)],
    });
  }

  // When request receipt arrives, pull rentalId and fund.
  if (requestReceipt.data && !rentalId && data?.skill) {
    for (const log of requestReceipt.data.logs) {
      try {
        const parsed = decodeEventLog({
          abi: SkillEscrowABI,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: { rentalId: bigint } };
        if (parsed.eventName === 'RentalRequested') {
          const id = parsed.args.rentalId.toString();
          setRentalId(id);
          setSteps([
            { label: 'Request rental', status: 'ok', txHash: requestWrite.data },
            { label: 'Fund rental', status: 'active' },
          ]);
          fundWrite.writeContract({
            abi: SkillEscrowABI,
            address: env.skillEscrow,
            functionName: 'fundRental',
            args: [BigInt(id)],
            value: BigInt(data.skill.pricePerUse),
          });
          break;
        }
      } catch {
        /* not a SkillEscrow event */
      }
    }
  }

  if (fundReceipt.data && rentalId && steps[1]?.status !== 'ok') {
    setSteps([
      { label: 'Request rental', status: 'ok', txHash: requestWrite.data },
      { label: 'Fund rental', status: 'ok', txHash: fundWrite.data as Hex },
    ]);
  }

  if (!data?.skill) return <div className="card">Loading…</div>;
  const skill = data.skill;
  const done = rentalId && fundReceipt.data;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold text-white">
        Rent <span className="text-accent">{skill.name}</span>
      </h1>

      <div className="card space-y-2">
        <Row label="Price per use" value={formatOG(skill.pricePerUse)} />
        <Row label="Token ID" value={`#${skill.tokenId}`} />
        <Row label="Connected wallet" value={isConnected ? (address ?? '—') : 'not connected'} mono />
      </div>

      {!isConnected ? (
        <div className="card">Connect a wallet to continue.</div>
      ) : !requestWrite.data ? (
        <button onClick={kickOff} className="btn-primary">
          Request + fund rental
        </button>
      ) : (
        <div className="card space-y-3">
          <TxStatus steps={steps} />
          {done && (
            <Link href={`/rentals/${rentalId}`} className="btn-primary">
              View rental #{rentalId}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={mono ? 'mono text-zinc-200' : 'text-zinc-200'}>{value}</span>
    </div>
  );
}
