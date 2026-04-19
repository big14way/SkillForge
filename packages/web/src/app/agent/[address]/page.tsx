'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useAgent } from '@/lib/hooks';
import { formatOG, relativeTime, shortAddress } from '@/lib/utils';
import { ExplorerLink } from '@/components/shared/ExplorerLink';
import { PreviewBanner } from '@/components/shared/PreviewBanner';
import { QualityScoreBadge } from '@/components/skill/QualityScoreBadge';

type Tab = 'created' | 'rented' | 'memory';

export default function AgentPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const [tab, setTab] = useState<Tab>('created');
  const { data, isLoading, error } = useAgent(address);

  if (isLoading) return <div className="card animate-pulse h-40" />;
  if (error) return <div className="card border-red-500/30 bg-red-500/5">Couldn&apos;t load agent.</div>;
  if (!data) return null;

  const { agent, recent } = data;

  return (
    <div className="space-y-8">
      <section className="card flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs text-zinc-500">Agent</div>
          <h1 className="mono text-2xl text-white">{shortAddress(agent.address, 10, 8)}</h1>
          <div className="mt-2 text-xs">
            <ExplorerLink type="address" value={agent.address} />
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            First seen {relativeTime(agent.firstSeenAt)} · Last active{' '}
            {relativeTime(agent.lastActiveAt)}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Skills created" value={agent.skillsCreated.toString()} />
          <Stat label="Skills rented" value={agent.skillsRented.toString()} />
          <Stat label="Earned" value={formatOG(agent.totalEarned)} />
          <Stat label="Spent" value={formatOG(agent.totalSpent)} />
        </dl>
      </section>

      <section>
        <div className="flex gap-2 border-b border-bg-border">
          <TabBtn active={tab === 'created'} onClick={() => setTab('created')}>
            Created
          </TabBtn>
          <TabBtn active={tab === 'rented'} onClick={() => setTab('rented')}>
            Rented
          </TabBtn>
          <TabBtn active={tab === 'memory'} onClick={() => setTab('memory')}>
            Memory
          </TabBtn>
        </div>
        <div className="mt-4 space-y-3">
          {tab === 'created' && <RentalList rows={recent.asCreator} empty="No skills created yet." />}
          {tab === 'rented' && <RentalList rows={recent.asRenter} empty="No rentals yet." />}
          {tab === 'memory' && <MemoryTab />}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 transition-colors ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-zinc-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function RentalList({
  rows,
  empty,
}: {
  rows: Array<{
    rentalId: string;
    skillTokenId: string;
    state: string;
    qualityScore: number | null;
    createdAt: number;
    amount: string;
  }>;
  empty: string;
}) {
  if (rows.length === 0) return <div className="card py-8 text-center text-sm text-zinc-500">{empty}</div>;
  return (
    <div className="divide-y divide-bg-border">
      {rows.map((r) => (
        <Link
          key={r.rentalId}
          href={`/rentals/${r.rentalId}`}
          className="flex items-center justify-between py-3 text-sm hover:bg-bg-hover/30"
        >
          <div className="flex items-center gap-3">
            <span className="mono text-zinc-500">#{r.rentalId}</span>
            <span className="text-zinc-400">skill #{r.skillTokenId}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill">{r.state}</span>
            {r.qualityScore != null && <QualityScoreBadge score={r.qualityScore} />}
            <span className="text-xs text-zinc-500">{formatOG(r.amount)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MemoryTab() {
  return (
    <div className="space-y-3">
      <PreviewBanner>
        Agent memory lives on 0G Storage KV. Galileo&apos;s read node is currently unreachable from
        the public internet — live KV reads come online Week 4. Preview entries below are hand-crafted
        realistic examples.
      </PreviewBanner>
      <ul className="space-y-2 text-sm">
        <li className="card">
          <div className="text-xs text-zinc-500">Profile · preview</div>
          <div className="mt-1 text-white">Sentiment-focused quant agent</div>
          <div className="mt-1 text-xs text-zinc-400">
            Active on trading + data categories · prefers English-language inputs
          </div>
        </li>
        <li className="card">
          <div className="text-xs text-zinc-500">Last invocation · preview</div>
          <div className="mt-1 text-white">$SOL week-ahead verdict</div>
          <div className="mt-1 text-xs text-zinc-400">Score 8,800 · 412ms TeeML · chatID preview-a3c7</div>
        </li>
      </ul>
    </div>
  );
}
