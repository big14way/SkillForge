'use client';

import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';

/**
 * Click-through privacy badge — the user-facing affordance for the
 * end-to-end-encrypted-invocation pillar. Shows a purple lock + label;
 * modal walks through the 4-step encryption flow with a small ASCII diagram.
 */
export function EncryptedInvocationBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const sizing =
    size === 'sm'
      ? 'gap-1 px-2 py-0.5 text-[11px]'
      : 'gap-1.5 px-2.5 py-1 text-xs';
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center rounded-md border border-purple-500/30 bg-purple-500/10 font-medium text-purple-200 transition-colors hover:brightness-110 ${sizing}`}
        title="End-to-end encrypted invocation"
      >
        <Lock size={size === 'sm' ? 11 : 13} />
        <span>E2E encrypted</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="End-to-End Encrypted Invocation"
      >
        <p className="leading-relaxed">
          Your invocation input never leaves the TEE. The skill creator cannot
          see your queries; the API provider cannot see your wallet. Inputs
          are decrypted only inside the sealed inference, outputs are
          re-encrypted for you.
        </p>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          The 4-step flow
        </h3>
        <ol className="mt-2 space-y-3 text-sm">
          <Step
            num={1}
            label="Rent on-chain"
            detail="SkillEscrow.requestRental + fundRental. The rental id is the only identifier the renter wallet leaks; payment is escrowed until the work is verified."
          />
          <Step
            num={2}
            label="Sealed-key envelope"
            detail="Creator (or oracle) seals the AES-256 skill key for the renter using ECIES on the renter's secp256k1 wallet pubkey. Only the renter can unseal."
          />
          <Step
            num={3}
            label="TEE-protected invocation"
            detail="Renter unseals the key, sends the input encrypted to the skill's TEE-sealed inference. The TEE decrypts inputs + the upstream API key inside the enclave; the upstream API never sees your wallet."
          />
          <Step
            num={4}
            label="Signed output"
            detail="The TEE signs the response with its provider key; the agent verifies the signature before acting on the output. Quality score signed by a whitelisted scorer is recorded on-chain."
          />
        </ol>

        <div className="mt-4 rounded-md border border-bg-border bg-bg p-3 text-[11px] mono leading-snug text-zinc-400">
          renter ─encrypted input─▶ TEE ─decrypts inside enclave─▶ upstream
          API
          <br />
          renter ◀─re-encrypted output, TEE signature─ TEE
          <br />
          on-chain ◀─ECDSA(scorer) over (req, resp, provider, score)─ scorer
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Same encryption primitives used in <code>@skillforge/sdk</code>:
          AES-256-GCM for skill payloads, ECIES (eciesjs) for sealed-key
          envelopes — see{' '}
          <a
            href="https://github.com/big14way/SkillForge/tree/main/packages/sdk/src/crypto"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            packages/sdk/src/crypto/
          </a>
          .
        </p>
      </Modal>
    </>
  );
}

function Step({ num, label, detail }: { num: number; label: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 text-[11px] font-semibold text-purple-200">
        {num}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-1 font-medium text-white">
          {label} <ArrowRight size={12} className="opacity-50" />
        </div>
        <div className="mt-0.5 text-xs text-zinc-400">{detail}</div>
      </div>
    </li>
  );
}
