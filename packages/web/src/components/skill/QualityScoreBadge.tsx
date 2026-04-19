import { ShieldCheck } from 'lucide-react';

/**
 * Renders a skill's TeeML-verified quality score (0-10000 bps → 0-100).
 * The shield icon is a deliberate signal: this score is on-chain and signed
 * by a whitelisted scorer, not a review-farmable star rating.
 */
export function QualityScoreBadge({ score, preview = false }: { score: number; preview?: boolean }) {
  const pct = (score / 100).toFixed(0);
  const tone = preview
    ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
    : score >= 8500
      ? 'text-accent bg-accent/10 border-accent/30'
      : score >= 7000
        ? 'text-sky-300 bg-sky-500/10 border-sky-500/30'
        : 'text-zinc-300 bg-bg-hover border-bg-border';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${tone}`}
      title={preview ? 'Preview-mode score — live TeeML verification Week 4' : 'TeeML-verified quality score'}
    >
      <ShieldCheck size={12} />
      {pct}
      {preview && <span className="ml-0.5 opacity-70">preview</span>}
    </span>
  );
}
