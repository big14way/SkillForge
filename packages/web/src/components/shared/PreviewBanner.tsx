import { Info } from 'lucide-react';

/**
 * Per section 4 of the Week 3 plan: when a surface is showing data from the
 * soft-fail fallback (e.g. KV read timed out, no TeeML provider available),
 * render this banner so judges see an honest "preview" flag rather than a
 * silent mock.
 */
export function PreviewBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
      <Info size={14} className="mt-0.5 shrink-0 text-amber-400" />
      <span>{children}</span>
    </div>
  );
}
