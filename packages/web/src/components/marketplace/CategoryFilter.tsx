'use client';

import { cn } from '@/lib/utils';

export const CATEGORIES = ['all', 'trading', 'data', 'content', 'research', 'automation', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export function CategoryFilter({
  value,
  onChange,
}: {
  value: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === c
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-bg-border bg-bg-raised text-zinc-300 hover:border-bg-hover hover:text-white',
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
