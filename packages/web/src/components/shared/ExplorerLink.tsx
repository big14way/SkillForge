import { ExternalLink } from 'lucide-react';
import { env } from '@/lib/env';
import { shortAddress } from '@/lib/utils';

export interface ExplorerLinkProps {
  type: 'address' | 'tx' | 'block';
  value: string;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

/**
 * Renders a chainscan link — judges want to click through and see real
 * on-chain activity, so every on-chain identifier in the UI uses this.
 */
export function ExplorerLink({ type, value, label, showIcon = true, className = '' }: ExplorerLinkProps) {
  const path = type === 'address' ? 'address' : type === 'tx' ? 'tx' : 'block';
  const href = `${env.explorerUrl}/${path}/${value}`;
  const display = label ?? (type === 'address' ? shortAddress(value) : shortAddress(value, 10, 6));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 mono text-zinc-400 hover:text-accent transition-colors ${className}`}
    >
      {display}
      {showIcon && <ExternalLink size={12} className="opacity-70" />}
    </a>
  );
}
