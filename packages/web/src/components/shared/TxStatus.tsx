import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ExplorerLink } from './ExplorerLink';

export type TxStep = {
  label: string;
  status: 'pending' | 'active' | 'ok' | 'error';
  txHash?: string;
  detail?: string;
};

/**
 * Vertical pipeline view used by the publish wizard + rental flow. Each step
 * shows a status icon, label, optional tx link, and optional detail text.
 */
export function TxStatus({ steps }: { steps: TxStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5">
            {step.status === 'ok' ? (
              <CheckCircle2 size={18} className="text-accent" />
            ) : step.status === 'active' ? (
              <Loader2 size={18} className="animate-spin text-accent" />
            ) : step.status === 'error' ? (
              <XCircle size={18} className="text-red-400" />
            ) : (
              <span className="inline-block h-[18px] w-[18px] rounded-full border border-bg-border" />
            )}
          </span>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{step.label}</div>
            {step.detail && <div className="text-xs text-zinc-400">{step.detail}</div>}
            {step.txHash && (
              <div className="mt-1 text-xs">
                <ExplorerLink type="tx" value={step.txHash} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
