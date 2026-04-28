'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { parseEther } from 'viem';
import { useAccount } from 'wagmi';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '@/components/marketplace/CategoryFilter';
import { TxStatus, type TxStep } from '@/components/shared/TxStatus';
import { PreviewBanner } from '@/components/shared/PreviewBanner';
import { TEEVerifiedBadge } from '@/components/badges/TEEVerifiedBadge';
import { EncryptedInvocationBadge } from '@/components/badges/EncryptedInvocationBadge';
import { env } from '@/lib/env';

/**
 * Multi-step publish wizard. Writes client-side, then hands the transaction
 * to whichever connected wallet the user has. The actual encrypt → upload →
 * mint → register pipeline lives in `@skillforge/services`'s `SkillPublisher`
 * — we can't run that in the browser (needs Node `crypto` + the 0G SDK), so
 * this wizard is explicit about the "browser-side publishing is Week 4".
 * Today the flow is:
 *   1. user drafts skill content + metadata in browser
 *   2. we download a `publish-plan.json` they feed to `skillforge publish`
 *      from the CLI (see `@skillforge/cli`)
 *
 * When Week 4 adds the browser-safe SDK variant, the "Publishing" step turns
 * into live progress. For now it hands off to the CLI honestly.
 */
const STEPS = ['Content', 'Metadata', 'Preview', 'Publish'] as const;
type StepIndex = 0 | 1 | 2 | 3;

interface Draft {
  name: string;
  description: string;
  category: string;
  priceOg: string;
  content: string;
}

export default function PublishPage() {
  const [step, setStep] = useState<StepIndex>(0);
  const [draft, setDraft] = useState<Draft>({
    name: '',
    description: '',
    category: 'trading',
    priceOg: '0.01',
    content: '',
  });
  const { address, isConnected } = useAccount();

  const priceValid = useMemo(() => {
    try {
      parseEther(draft.priceOg);
      return true;
    } catch {
      return false;
    }
  }, [draft.priceOg]);

  const canGoNext = (() => {
    if (step === 0) return draft.content.trim().length > 20;
    if (step === 1) return draft.name.trim() && draft.category && priceValid;
    return true;
  })();

  function next() {
    if (step < 3 && canGoNext) setStep((step + 1) as StepIndex);
  }
  function prev() {
    if (step > 0) setStep((step - 1) as StepIndex);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-white">Publish a skill</h1>
        <p className="text-sm text-zinc-400">
          Encrypt your skill, upload to 0G Storage, and mint an ERC-7857 INFT.
        </p>
      </div>

      <Stepper step={step} />

      {!isConnected && (
        <PreviewBanner>
          Connect a wallet on <span className="mono">chainId {env.chainId}</span> to publish.
        </PreviewBanner>
      )}

      <div className="card space-y-5">
        {step === 0 && <ContentStep draft={draft} onChange={setDraft} />}
        {step === 1 && <MetadataStep draft={draft} onChange={setDraft} priceValid={priceValid} />}
        {step === 2 && <PreviewStep draft={draft} />}
        {step === 3 && <PublishStep draft={draft} address={address} />}
      </div>

      <div className="flex justify-between">
        <button
          onClick={prev}
          disabled={step === 0}
          className="btn-ghost"
        >
          Back
        </button>
        {step < 3 ? (
          <button onClick={next} disabled={!canGoNext || (step === 1 && !isConnected)} className="btn-primary">
            {step === 2 ? 'Publish' : 'Next'} <ArrowRight size={14} className="ml-1" />
          </button>
        ) : (
          <Link href="/" className="btn-secondary">
            Back to marketplace
          </Link>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-3 text-xs">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={`flex items-center gap-2 ${i <= step ? 'text-accent' : 'text-zinc-500'}`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
              i < step
                ? 'border-accent bg-accent/10'
                : i === step
                  ? 'border-accent'
                  : 'border-bg-border'
            }`}
          >
            {i < step ? <CheckCircle2 size={12} /> : i + 1}
          </span>
          <span className="hidden md:inline">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function ContentStep({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-white">Skill content</label>
      <p className="text-xs text-zinc-500">
        This is the prompt or configuration that will be encrypted and stored on 0G. Only renters
        who complete an on-chain rental receive the decryption key.
      </p>
      <textarea
        rows={10}
        value={draft.content}
        onChange={(e) => onChange({ ...draft, content: e.target.value })}
        placeholder="You are Alpha Hunter v1. Given a ticker, emit a JSON verdict…"
        className="input font-mono text-sm"
      />
      <div className="text-xs text-zinc-500">
        {draft.content.length} characters · minimum 20 to continue
      </div>
    </div>
  );
}

function MetadataStep({
  draft,
  onChange,
  priceValid,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  priceValid: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-white">Name</label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="input mt-1"
          placeholder="Alpha Hunter v1"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-white">Description (optional)</label>
        <input
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          className="input mt-1"
          placeholder="One-line sentiment verdicts on any ticker."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white">Category</label>
        <select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value })}
          className="input mt-1"
        >
          {CATEGORIES.filter((c) => c !== 'all').map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white">Price per use (OG)</label>
        <input
          value={draft.priceOg}
          onChange={(e) => onChange({ ...draft, priceOg: e.target.value })}
          className="input mt-1"
          placeholder="0.01"
        />
        {!priceValid && (
          <p className="mt-1 text-xs text-red-400">Enter a valid OG amount (e.g. 0.01)</p>
        )}
      </div>
    </div>
  );
}

function PreviewStep({ draft }: { draft: Draft }) {
  return (
    <div className="space-y-3 text-sm">
      <h3 className="text-white font-medium">Ready to publish</h3>
      <div className="flex flex-wrap gap-2">
        <TEEVerifiedBadge attestation={{ live: false }} />
        <EncryptedInvocationBadge />
      </div>
      <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Row label="Name" value={draft.name} />
        <Row label="Category" value={draft.category} />
        <Row label="Price" value={`${draft.priceOg} OG / invocation`} />
        <Row label="Content size" value={`${draft.content.length} characters`} />
      </dl>
      <pre className="card max-h-40 overflow-auto bg-bg text-xs text-zinc-400">
        {draft.content.slice(0, 400)}
        {draft.content.length > 400 ? '…' : ''}
      </pre>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}

function PublishStep({
  draft,
  address,
}: {
  draft: Draft;
  address: string | undefined;
}) {
  const [steps, setSteps] = useState<TxStep[]>([
    { label: 'Encrypt payload with AES-256-GCM', status: 'pending' },
    { label: 'Upload ciphertext to 0G Storage', status: 'pending' },
    { label: 'Mint ERC-7857 INFT', status: 'pending' },
    { label: 'Register with SkillRegistry', status: 'pending' },
  ]);
  const [started, setStarted] = useState(false);

  const planBlob = useMemo(
    () => new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }),
    [draft],
  );

  function simulate() {
    setStarted(true);
    // Walk through the step markers purely visually. Real publishing runs from
    // the CLI in Week 3; Week 4 moves it into the browser.
    const sequence = [0, 1, 2, 3];
    sequence.forEach((i, idx) => {
      setTimeout(() => {
        setSteps((cur) => {
          const next = cur.slice();
          if (next[i]) next[i] = { ...next[i], status: 'active' };
          return next;
        });
      }, idx * 600);
      setTimeout(() => {
        setSteps((cur) => {
          const next = cur.slice();
          if (next[i]) next[i] = { ...next[i], status: 'ok' };
          return next;
        });
      }, idx * 600 + 400);
    });
  }

  return (
    <div className="space-y-4">
      <PreviewBanner>
        Browser publishing lands Week 4. For now, download the publish plan and run{' '}
        <span className="mono">skillforge publish plan.json</span> from the CLI — it executes the
        real encrypt→upload→mint→register pipeline against live Galileo.
      </PreviewBanner>

      <div className="flex flex-wrap gap-3">
        <a
          href={URL.createObjectURL(planBlob)}
          download={`publish-plan-${Date.now()}.json`}
          className="btn-secondary"
        >
          Download plan.json
        </a>
        <button onClick={simulate} disabled={started} className="btn-primary">
          Preview publish animation
        </button>
      </div>

      <div className="card bg-bg">
        <TxStatus steps={steps} />
      </div>

      {address && (
        <p className="text-xs text-zinc-500">
          Connected as <span className="mono">{address}</span>
        </p>
      )}
    </div>
  );
}
