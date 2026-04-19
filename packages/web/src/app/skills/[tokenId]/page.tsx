'use client';

import { use } from 'react';
import Link from 'next/link';
import { useSkill } from '@/lib/hooks';
import { ExplorerLink } from '@/components/shared/ExplorerLink';
import { QualityScoreBadge } from '@/components/skill/QualityScoreBadge';
import { formatOG, relativeTime, shortAddress } from '@/lib/utils';
import { env } from '@/lib/env';

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  const { data, isLoading, error } = useSkill(tokenId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <div className="card">Not found</div>;

  const { skill, recentRentals } = data;

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="pill">{skill.category}</span>
              <span className="mono">#{skill.tokenId}</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-white">{skill.name}</h1>
            {skill.description && (
              <p className="mt-2 max-w-2xl text-zinc-400">{skill.description}</p>
            )}
          </div>
          <div className="text-right">
            <QualityScoreBadge score={skill.qualityScore} />
            <div className="mt-2 text-2xl font-semibold text-white">
              {formatOG(skill.pricePerUse)}
            </div>
            <div className="text-xs text-zinc-500">per invocation</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-bg-border pt-4 text-sm">
          <div>
            <div className="text-xs text-zinc-500">Creator</div>
            <Link
              href={`/agent/${skill.creator}`}
              className="mono text-zinc-200 hover:text-accent"
            >
              {shortAddress(skill.creator, 8, 6)}
            </Link>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Total rentals</div>
            <div className="text-zinc-200">{skill.totalRentals}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Published</div>
            <div className="text-zinc-200">{relativeTime(skill.createdAt)}</div>
          </div>
          <div className="ml-auto">
            <Link href={`/skills/${skill.tokenId}/rent`} className="btn-primary">
              Rent this skill
            </Link>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold text-white">ERC-7857 INFT</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <InftRow label="Token ID" value={`#${skill.tokenId}`} mono />
          <InftRow
            label="INFT contract"
            value={<ExplorerLink type="address" value={env.skillINFT} />}
          />
          <InftRow
            label="Data hash"
            value={<span className="mono text-zinc-300">{shortAddress(skill.dataHash, 10, 8)}</span>}
          />
          <InftRow label="Storage URI" value={<span className="mono break-all">{skill.storageURI}</span>} />
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent rentals</h2>
          <span className="text-xs text-zinc-500">{recentRentals.length} shown</span>
        </div>
        {recentRentals.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No rentals yet. Be the first.
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {recentRentals.map((r) => (
              <Link
                key={r.rentalId}
                href={`/rentals/${r.rentalId}`}
                className="flex items-center justify-between py-3 text-sm hover:bg-bg-hover/30"
              >
                <div className="flex items-center gap-3">
                  <span className="mono text-zinc-500">#{r.rentalId}</span>
                  <span className="mono text-zinc-300">{shortAddress(r.renter)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <StatePill state={r.state} />
                  {r.qualityScore != null && (
                    <QualityScoreBadge score={r.qualityScore} />
                  )}
                  <span className="text-xs text-zinc-500">
                    {relativeTime(r.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InftRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={mono ? 'mono text-zinc-200' : 'text-zinc-200'}>{value}</div>
    </div>
  );
}

function StatePill({ state }: { state: string }) {
  const tone: Record<string, string> = {
    Requested: 'text-zinc-300 bg-bg-hover',
    Funded: 'text-sky-300 bg-sky-500/10',
    Active: 'text-accent bg-accent/10',
    Submitted: 'text-indigo-300 bg-indigo-500/10',
    Verified: 'text-emerald-300 bg-emerald-500/10',
    Completed: 'text-zinc-400 bg-bg-hover',
    Disputed: 'text-amber-300 bg-amber-500/10',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone[state] ?? 'bg-bg-hover text-zinc-300'}`}>
      {state}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-6 w-2/3 rounded bg-bg-hover" />
      <div className="h-4 w-1/2 rounded bg-bg-hover" />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="card border-red-500/30 bg-red-500/5 text-red-200">
      <h2 className="font-medium">Couldn&apos;t load skill</h2>
      <p className="mt-1 text-sm opacity-80">{msg}</p>
    </div>
  );
}
