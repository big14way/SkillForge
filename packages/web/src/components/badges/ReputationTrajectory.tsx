'use client';

import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/env';
import { relativeTime } from '@/lib/utils';

/**
 * Reputation-trajectory sparkline. Renders the last N quality scores (0-10000
 * bps) as a tiny inline SVG plus the rolling average + a "last updated"
 * timestamp. No charting library — keeps the bundle small and the rendering
 * deterministic.
 *
 * Data source: indexer's `/api/skills/:id/scores`. The sparkline gracefully
 * collapses to "no ratings yet" when a skill hasn't been rented.
 */

interface ScorePoint {
  score: number;
  ts: number;
  rentalId: string;
}

async function fetchScores(tokenId: string, limit: number): Promise<ScorePoint[]> {
  const res = await fetch(`${env.indexerUrl}/api/skills/${tokenId}/scores?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`indexer returned ${res.status}`);
  const body = (await res.json()) as { items: ScorePoint[] };
  return body.items;
}

export function ReputationTrajectory({
  tokenId,
  limit = 10,
  size = 'md',
}: {
  tokenId: string;
  limit?: number;
  size?: 'sm' | 'md';
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['scores', tokenId, limit],
    queryFn: () => fetchScores(tokenId, limit),
    staleTime: 30_000,
  });

  const points = data ?? [];
  // Indexer returns newest-first; sparkline reads left-to-right oldest-to-newest.
  const series = points.slice().reverse();
  const count = series.length;
  const avg = count > 0 ? Math.round(series.reduce((a, p) => a + p.score, 0) / count) : 0;
  const latest = points[0];

  const compact = size === 'sm';
  const w = compact ? 80 : 120;
  const h = compact ? 24 : 32;

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
        <span className={`block animate-pulse rounded bg-bg-hover`} style={{ width: w, height: h }} />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
        <span className="pill">no ratings yet</span>
      </div>
    );
  }

  return (
    <div className={compact ? 'inline-flex items-center gap-2' : 'flex flex-col gap-1'}>
      <div className="inline-flex items-center gap-2">
        <Sparkline series={series.map((p) => p.score)} width={w} height={h} />
        <div className="leading-tight">
          <div className={compact ? 'text-xs font-semibold text-white' : 'text-sm font-semibold text-white'}>
            {(avg / 100).toFixed(0)}
            <span className="text-zinc-500">/100</span>
          </div>
          <div className="text-[10px] text-zinc-500">
            {count} rating{count === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      {!compact && latest && (
        <div className="text-[11px] text-zinc-500">
          last updated {relativeTime(latest.ts)}
        </div>
      )}
    </div>
  );
}

/**
 * Inline-SVG sparkline. Maps scores 0..10000 to the y-axis and treats the
 * series as evenly spaced (we don't have enough points to bother plotting on
 * actual time). Renders both a line and a faint area fill below it.
 */
function Sparkline({
  series,
  width,
  height,
}: {
  series: number[];
  width: number;
  height: number;
}) {
  if (series.length < 2) {
    // Single point — render a dot at the value.
    const y = height - (series[0]! / 10_000) * height;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <circle cx={width / 2} cy={y} r="2" fill="#00FFB2" />
      </svg>
    );
  }

  const stepX = width / (series.length - 1);
  const points = series.map((s, i) => {
    const x = i * stepX;
    const y = height - (s / 10_000) * height;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`reputation trajectory across ${series.length} ratings`}
    >
      <path d={areaPath} fill="rgba(0, 255, 178, 0.12)" />
      <path d={linePath} fill="none" stroke="#00FFB2" strokeWidth="1.5" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 2 : 1.2} fill="#00FFB2" />
      ))}
    </svg>
  );
}
