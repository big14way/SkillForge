'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { ExplorerLink } from '@/components/shared/ExplorerLink';
import { shortAddress } from '@/lib/utils';

/**
 * Click-through TEE attestation badge — the user-facing affordance for the
 * verifiable-output pillar. Shows a green shield + label on every skill /
 * rental page. Click opens a modal with the actual attestation fields the
 * `AttestationVerifier` library uses to recover the scorer signature
 * on-chain.
 */
export interface TEEAttestation {
  /** Address of the TEE that produced the response (or the dev sentinel in preview). */
  provider?: string;
  /** keccak256 of the canonical request JSON. */
  requestHash?: string;
  /** keccak256 of the response content. */
  responseHash?: string;
  /** ECDSA signature recovered on-chain in `verifyWork`. */
  signature?: string;
  /** Tx hash of the on-chain `verifyWork` call. */
  verifyTxHash?: string;
  /** True when this attestation is from the live TeeML provider, false in dev/preview. */
  live?: boolean;
}

export function TEEVerifiedBadge({
  attestation,
  size = 'md',
}: {
  attestation?: TEEAttestation;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const live = attestation?.live ?? false;
  const sizing =
    size === 'sm'
      ? 'gap-1 px-2 py-0.5 text-[11px]'
      : 'gap-1.5 px-2.5 py-1 text-xs';
  const tone = live
    ? 'border-accent/40 bg-accent/10 text-accent'
    : 'border-amber-500/30 bg-amber-500/5 text-amber-200';
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center rounded-md border font-medium transition-colors hover:brightness-110 ${tone} ${sizing}`}
        title={
          live
            ? 'Output verified by TEE attestation'
            : 'Preview-mode attestation — live TeeML connects when 0G Galileo registers a provider'
        }
      >
        <ShieldCheck size={size === 'sm' ? 11 : 13} />
        <span>{live ? 'TEE-verified' : 'TEE-verified (preview)'}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="TEE-Verified Output"
      >
        <p className="leading-relaxed">
          Output verified by TEE attestation. The model ran inside a
          hardware-isolated environment (Intel TDX + NVIDIA H100 on 0G
          Compute); the response signature recovers to a whitelisted provider
          on-chain via{' '}
          <a
            href="https://github.com/big14way/SkillForge/blob/main/contracts/src/libraries/AttestationVerifier.sol"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <code>AttestationVerifier.sol</code>
          </a>
          .
        </p>

        {!live && (
          <div className="my-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
            Preview mode — 0G Galileo currently has 0 registered TeeML
            providers. The signature comes from a whitelisted dev scorer; the
            on-chain verifier still accepts it on testnet. Live TeeML wires in
            when a provider registers.
          </div>
        )}

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Attestation
        </h3>
        <dl className="mt-2 space-y-1.5 text-xs">
          <Row
            label="Provider"
            value={
              attestation?.provider ? (
                <span className="mono text-zinc-200">
                  {shortAddress(attestation.provider, 8, 6)}
                </span>
              ) : (
                <span className="text-zinc-500">unavailable</span>
              )
            }
          />
          <Row
            label="Request hash"
            value={
              attestation?.requestHash ? (
                <span className="mono break-all text-zinc-300">
                  {attestation.requestHash.slice(0, 18)}…{attestation.requestHash.slice(-6)}
                </span>
              ) : (
                <span className="text-zinc-500">—</span>
              )
            }
          />
          <Row
            label="Response hash"
            value={
              attestation?.responseHash ? (
                <span className="mono break-all text-zinc-300">
                  {attestation.responseHash.slice(0, 18)}…{attestation.responseHash.slice(-6)}
                </span>
              ) : (
                <span className="text-zinc-500">—</span>
              )
            }
          />
          {attestation?.verifyTxHash && (
            <Row
              label="Verify tx"
              value={<ExplorerLink type="tx" value={attestation.verifyTxHash} />}
            />
          )}
        </dl>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-bg-border pt-1.5">
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
