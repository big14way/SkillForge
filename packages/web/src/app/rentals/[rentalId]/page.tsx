'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRental } from '@/lib/hooks';
import { formatOG, relativeTime, shortAddress } from '@/lib/utils';
import { QualityScoreBadge } from '@/components/skill/QualityScoreBadge';

/**
 * 8-state rental lifecycle viewer. Shows the machine visually, highlights the
 * current state, and exposes context-appropriate actions.
 */
const STATES = [
  'Requested',
  'Funded',
  'Active',
  'Submitted',
  'Verified',
  'Completed',
] as const;

export default function RentalDetailPage({
  params,
}: {
  params: Promise<{ rentalId: string }>;
}) {
  const { rentalId } = use(params);
  const { data, isLoading } = useRental(rentalId);

  if (isLoading) return <div className="card animate-pulse h-32" />;
  if (!data) return <div className="card">Not found</div>;
  const r = data.rental;
  const currentIndex = STATES.indexOf(r.state as (typeof STATES)[number]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <div className="text-xs text-zinc-500 mono">Rental #{r.rentalId}</div>
        <h1 className="text-2xl font-semibold text-white">
          {r.state === 'Disputed' ? 'Disputed rental' : 'Rental'}
        </h1>
      </div>

      <section className="card space-y-4">
        <StateMachine
          currentIndex={currentIndex}
          disputed={r.state === 'Disputed'}
        />
        <div className="grid grid-cols-1 gap-4 border-t border-bg-border pt-4 text-sm md:grid-cols-2">
          <Row label="Skill">
            <Link href={`/skills/${r.skillTokenId}`} className="text-accent">
              #{r.skillTokenId}
            </Link>
          </Row>
          <Row label="Amount">{formatOG(r.amount)}</Row>
          <Row label="Renter">
            <Link href={`/agent/${r.renter}`} className="mono hover:text-white">
              {shortAddress(r.renter, 8, 6)}
            </Link>
          </Row>
          <Row label="Creator">
            <Link href={`/agent/${r.creator}`} className="mono hover:text-white">
              {shortAddress(r.creator, 8, 6)}
            </Link>
          </Row>
          <Row label="Opened">{relativeTime(r.createdAt)}</Row>
          <Row label="Completed">
            {r.completedAt ? relativeTime(r.completedAt) : <span className="text-zinc-500">—</span>}
          </Row>
          {r.qualityScore != null && (
            <Row label="Quality score">
              <QualityScoreBadge score={r.qualityScore} />
            </Row>
          )}
        </div>
      </section>
    </div>
  );
}

function StateMachine({
  currentIndex,
  disputed,
}: {
  currentIndex: number;
  disputed: boolean;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STATES.map((s, i) => (
        <li
          key={s}
          className={`flex items-center gap-2 rounded-full border px-2 py-1 ${
            i < currentIndex
              ? 'border-accent/40 bg-accent/5 text-accent'
              : i === currentIndex
                ? 'border-accent bg-accent/10 text-accent'
                : disputed && i > currentIndex
                  ? 'border-bg-border bg-bg-hover text-zinc-500 line-through'
                  : 'border-bg-border bg-bg-raised text-zinc-500'
          }`}
        >
          <span className="mono text-[10px] opacity-60">{i + 1}</span>
          {s}
        </li>
      ))}
      {disputed && (
        <li className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">
          ⚠ Disputed — awaiting resolution
        </li>
      )}
    </ol>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-zinc-200">{children}</div>
    </div>
  );
}
