'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { decodeEventLog, type Hex } from 'viem';
// Subpath import so we don't pull Node `crypto` into the browser bundle.
import { SkillEscrowABI } from '@skillforge/sdk/contracts';
import { useSkill } from '@/lib/hooks';
import { formatOG } from '@/lib/utils';
import { env } from '@/lib/env';
import { TxStatus, type TxStep } from '@/components/shared/TxStatus';

/**
 * Rental flow — walks the user through requestRental → fundRental on-chain.
 * The subsequent Active / Submitted / Verified / Completed transitions are
 * creator-driven and surfaced on the rental detail page.
 *
 * State-machine sequence (each transition runs in its own `useEffect`, never
 * during render — that was the bug that disconnected wallets in the previous
 * version):
 *
 *   idle              ──[user clicks button]─→  requesting
 *   requesting        ──[requestReceipt]──────→  funding
 *   funding           ──[fundReceipt]──────────→  done
 *
 * Errors at any step move us to `error` and surface the message.
 */

type Phase = 'idle' | 'requesting' | 'funding' | 'done' | 'error';

export default function RentPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data } = useSkill(tokenId);

  const [phase, setPhase] = useState<Phase>('idle');
  const [rentalId, setRentalId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const requestWrite = useWriteContract();
  const requestReceipt = useWaitForTransactionReceipt({ hash: requestWrite.data });

  const fundWrite = useWriteContract();
  const fundReceipt = useWaitForTransactionReceipt({ hash: fundWrite.data });

  const wrongChain = isConnected && chainId !== env.chainId;

  // ──────────────────────────────────────────────────────────────────────
  // Effect 1: kick off `fundRental` once `requestRental` is mined.
  //
  // We pull `rentalId` from the RentalRequested event in the receipt logs,
  // then fire fundRental with the skill's price as msg.value. Runs once per
  // unique receipt (the dependency on requestReceipt.data + rentalId guard).
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!requestReceipt.data || rentalId || !data?.skill) return;
    let foundId: string | null = null;
    for (const log of requestReceipt.data.logs) {
      try {
        const parsed = decodeEventLog({
          abi: SkillEscrowABI,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: { rentalId: bigint } };
        if (parsed.eventName === 'RentalRequested') {
          foundId = parsed.args.rentalId.toString();
          break;
        }
      } catch {
        /* not a SkillEscrow event — keep scanning */
      }
    }
    if (!foundId) {
      setPhase('error');
      setErrMsg('RentalRequested event not found in receipt — the indexer should still pick this up shortly.');
      return;
    }
    setRentalId(foundId);
    setPhase('funding');
    fundWrite.writeContract({
      abi: SkillEscrowABI,
      address: env.skillEscrow,
      functionName: 'fundRental',
      args: [BigInt(foundId)],
      value: BigInt(data.skill.pricePerUse),
    });
  }, [requestReceipt.data, rentalId, data?.skill, fundWrite]);

  // Effect 2: mark done once fundRental confirms.
  useEffect(() => {
    if (fundReceipt.data && phase === 'funding') {
      setPhase('done');
    }
  }, [fundReceipt.data, phase]);

  // Effect 3: surface any wallet/contract errors uniformly.
  useEffect(() => {
    const err = requestWrite.error ?? fundWrite.error;
    if (err) {
      setPhase('error');
      // wagmi errors are typed via viem `BaseError`; .shortMessage is what
      // RainbowKit also surfaces in its toast.
      const e = err as Error & { shortMessage?: string };
      setErrMsg(e.shortMessage ?? e.message);
    }
  }, [requestWrite.error, fundWrite.error]);

  // ──────────────────────────────────────────────────────────────────────
  // Steps view, derived from phase + receipts so the UI is one render-pure
  // function of state.
  // ──────────────────────────────────────────────────────────────────────
  const steps = useMemo<TxStep[]>(() => {
    const requestStep: TxStep =
      phase === 'idle'
        ? { label: 'Request rental', status: 'pending' }
        : requestReceipt.data
          ? { label: 'Request rental', status: 'ok', txHash: requestWrite.data }
          : { label: 'Request rental', status: phase === 'error' ? 'error' : 'active' };

    const fundStep: TxStep =
      phase === 'done'
        ? { label: 'Fund rental', status: 'ok', txHash: fundWrite.data as Hex | undefined }
        : phase === 'funding'
          ? { label: 'Fund rental', status: 'active' }
          : phase === 'error' && fundWrite.data
            ? { label: 'Fund rental', status: 'error' }
            : { label: 'Fund rental', status: 'pending' };

    return [requestStep, fundStep];
  }, [phase, requestReceipt.data, requestWrite.data, fundWrite.data]);

  function kickOff(): void {
    if (!data?.skill) return;
    setErrMsg(null);
    setRentalId(null);
    setPhase('requesting');
    requestWrite.writeContract({
      abi: SkillEscrowABI,
      address: env.skillEscrow,
      functionName: 'requestRental',
      args: [BigInt(tokenId)],
    });
  }

  if (!data?.skill) return <div className="card animate-pulse h-32" />;
  const skill = data.skill;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold text-white">
        Rent <span className="text-accent">{skill.name}</span>
      </h1>

      <div className="card space-y-2">
        <Row label="Price per use" value={formatOG(skill.pricePerUse)} />
        <Row label="Token ID" value={`#${skill.tokenId}`} />
        <Row
          label="Connected wallet"
          value={isConnected ? (address ?? '—') : 'not connected'}
          mono
        />
        {isConnected && (
          <Row label="Network" value={wrongChain ? `wrong chain (${chainId})` : `Galileo (${chainId})`} />
        )}
      </div>

      {!isConnected ? (
        <div className="card text-sm text-zinc-300">
          Connect a wallet (top-right) to continue.
        </div>
      ) : wrongChain ? (
        <div className="card space-y-3">
          <p className="text-sm text-amber-200">
            Your wallet is on chain {chainId}. This dapp talks to 0G Galileo (chainId{' '}
            <span className="mono">{env.chainId}</span>).
          </p>
          <button
            onClick={() => switchChain({ chainId: env.chainId })}
            disabled={isSwitching}
            className="btn-primary"
          >
            {isSwitching ? 'Switching…' : `Switch to Galileo (${env.chainId})`}
          </button>
        </div>
      ) : phase === 'idle' ? (
        <button onClick={kickOff} className="btn-primary">
          Request + fund rental ({formatOG(skill.pricePerUse)})
        </button>
      ) : (
        <div className="card space-y-3">
          <TxStatus steps={steps} />

          {phase === 'error' && (
            <div className="rounded border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200">
              <div className="font-medium">Transaction failed</div>
              <div className="mt-1 text-xs opacity-80">{errMsg ?? 'unknown error'}</div>
              <button
                onClick={kickOff}
                className="btn-secondary mt-3"
              >
                Try again
              </button>
            </div>
          )}

          {phase === 'done' && rentalId && (
            <div className="space-y-2 pt-2">
              <p className="text-sm text-zinc-300">
                Rental funded. State machine: <span className="text-accent">Funded</span>. The
                creator authorizes access next.
              </p>
              <Link href={`/rentals/${rentalId}`} className="btn-primary">
                View rental #{rentalId}
              </Link>
            </div>
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
