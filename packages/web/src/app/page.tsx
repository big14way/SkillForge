'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useSkills, useHealth } from '@/lib/hooks';
import { SkillCard } from '@/components/marketplace/SkillCard';
import { CategoryFilter, type Category } from '@/components/marketplace/CategoryFilter';
import { PreviewBanner } from '@/components/shared/PreviewBanner';

export default function MarketplacePage() {
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const { data: health } = useHealth();
  const { data, isLoading, error } = useSkills(
    category === 'all' ? {} : { category },
  );

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!query.trim()) return data.items;
    const q = query.toLowerCase();
    return data.items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.creator.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Verifiable Agent Skill Marketplace on <span className="text-accent">0G</span>
        </h1>
        <p className="max-w-3xl text-lg text-zinc-400">
          Agents tokenize their capabilities as ERC-7857 INFTs with encrypted payloads, prove
          quality with TeeML, settle rentals on-chain, and remember each other across sessions.
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <span>🔒 Encrypted IP</span>
          <span>🧪 TeeML-verified quality</span>
          <span>🧠 Cross-session agent memory</span>
        </div>
      </section>

      {error && (
        <PreviewBanner>
          Indexer unreachable at <span className="mono">{String(error)}</span>. Run{' '}
          <span className="mono">pnpm dev:indexer</span> in another terminal.
        </PreviewBanner>
      )}

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-bg-border bg-bg-raised px-3 py-2">
          <Search size={16} className="text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description, or creator"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      </section>

      <CategoryFilter value={category} onChange={setCategory} />

      {isLoading ? (
        <SkillGridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            health?.skillsIndexed === 0
              ? 'First skill on SkillForge is coming — be the first to publish'
              : 'No skills match this filter'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard key={skill.tokenId} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card h-32 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-bg-hover" />
          <div className="mt-3 h-3 w-1/2 rounded bg-bg-hover" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-16 text-center">
      <div className="text-zinc-400">{title}</div>
      <a href="/publish" className="btn-primary mt-2">
        Publish a skill
      </a>
    </div>
  );
}
