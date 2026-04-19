import { Wallet, getBytes, keccak256, toUtf8Bytes } from 'ethers';
import {
  computeAttestationDigest,
  encodeAttestation,
  type Hex,
  type SignedAttestation,
  type SkillForgeClient,
} from '@skillforge/sdk';

/**
 * Dev-only TeeML provider.
 *
 * Motivation: while 0G Galileo has zero live TeeML inference providers
 * registered (see WEEK2_DELIVERABLES "Live infrastructure findings"),
 * the `SkillEscrow.verifyWork` flow still needs to be exercisable end-to-end.
 * This module produces **hand-crafted realistic sample outputs** plus a
 * scorer-signed attestation that passes on-chain verification — because the
 * scorer key is whitelisted via `setScorerWhitelisted` on testnet deploys.
 *
 * Hard rules (enforced below):
 *   1. Never run against mainnet (chainId 16661). The constructor throws.
 *   2. Every sample response is tagged `"mode": "preview"` in the result
 *      payload so consumers can mirror that in the UI.
 *   3. Never fabricate on-chain txs. The scorer key is used only to sign
 *      attestations that the on-chain verifier would accept regardless of the
 *      provider's actual source — but every inference CALL is clearly labeled
 *      preview in-band.
 */

const MAINNET_CHAIN_ID = 16661;

const PREVIEW_CATALOG: Record<string, (input: string) => string> = {
  trading: (input) =>
    [
      `[preview] Analyzing "${input.slice(0, 120)}"…`,
      '',
      'Verdict: mildly bullish over the next 3 sessions. Flow on Binance + Bybit has',
      'been net-long since Monday, funding is neutral (0.01% 8h), and spot volume',
      'is up 12% week-on-week without a matching drawdown. Main risk: macro print',
      'on Thursday — a hot CPI would erase the setup.',
    ].join('\n'),
  data: (input) =>
    [
      `[preview] Cleaning + enriching the dataset described by "${input.slice(0, 80)}".`,
      '',
      'Pipeline plan: (1) schema inference with heuristic-first typing, (2) dedup',
      'by surrogate key, (3) outlier trim at 3σ on numeric columns, (4) join the',
      'public registry for entity resolution, (5) emit to parquet partitioned by',
      'day. Expected throughput ~45k rows/s on a single worker.',
    ].join('\n'),
  content: (input) =>
    [
      `[preview] Draft from prompt "${input.slice(0, 80)}":`,
      '',
      'Three short paragraphs. First states the thesis. Second gives two pieces of',
      'specific evidence with sources. Third frames the counter-argument and',
      'concedes what is unknown. Tone is confident but not breathless.',
    ].join('\n'),
  research: (input) =>
    [
      `[preview] Research brief on "${input.slice(0, 80)}":`,
      '',
      '1. Problem framing. 2. Prior art (3 strongest references). 3. Gap in the',
      'literature. 4. Proposed experiment + success metric. 5. Risks + mitigations.',
    ].join('\n'),
};

export interface DevProviderOptions {
  sdk: SkillForgeClient;
  /** Wallet used to sign attestations. Must be on the scorer whitelist. */
  scorerWallet: Wallet;
  /** Fake TeeML provider address, for the attestation's `provider` field. */
  fakeProviderAddress?: Hex;
}

export interface DevInferenceResult {
  content: string;
  /** Deterministic chatID so a test asserting on it can check equality. */
  chatID: string;
  provider: Hex;
  mode: 'preview';
  usage: { promptTokens: number; completionTokens: number };
}

/**
 * Stand-in for `ComputeClient.infer` that returns a realistic sample and
 * refuses to run on mainnet.
 */
export class DevTeeMLProvider {
  readonly fakeProviderAddress: Hex;

  constructor(private readonly opts: DevProviderOptions) {
    const chainId = opts.sdk.config.chain.chainId;
    if (chainId === MAINNET_CHAIN_ID) {
      throw new Error(
        `DevTeeMLProvider refuses to run on mainnet (chainId ${chainId}). ` +
          'Remove the dev provider from any mainnet deployment config.',
      );
    }
    // Valid-hex sentinel — "dEFEa7" is the 6-char trailing hint. UI should
    // display the `mode: preview` tag on any result whose provider matches.
    // Lowercase so ethers doesn't enforce EIP-55 checksum — it's a sentinel,
    // not a real account. "defea7" is the recognizable trailing hint.
    this.fakeProviderAddress =
      opts.fakeProviderAddress ?? ('0x00000000000000000000000000000000defea700' as Hex);
  }

  /** Produce a preview-mode inference result + realistic sample output. */
  async infer(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    category?: string;
  }): Promise<DevInferenceResult> {
    const user = params.messages.find((m) => m.role === 'user')?.content ?? '';
    const catKey = (params.category ?? 'content').toLowerCase();
    const generator = PREVIEW_CATALOG[catKey] ?? PREVIEW_CATALOG.content!;
    const content = generator(user);
    const seed = keccak256(
      toUtf8Bytes(JSON.stringify({ messages: params.messages, ts: Date.now() })),
    );
    return {
      content,
      chatID: `preview-${seed.slice(2, 18)}`,
      provider: this.fakeProviderAddress,
      mode: 'preview',
      usage: {
        promptTokens: Math.ceil(user.length / 4),
        completionTokens: Math.ceil(content.length / 4),
      },
    };
  }

  /**
   * Sign a preview-mode quality attestation that the on-chain
   * `AttestationVerifier` will accept iff the wallet is whitelisted.
   * Returns both the raw signed attestation and the ABI-encoded bytes
   * ready to hand to `SkillEscrow.verifyWork`.
   */
  signAttestation(params: {
    requestHash: Hex;
    responseHash: Hex;
    qualityScore: number;
    provider?: Hex;
  }): { attestation: SignedAttestation; encoded: Hex } {
    const provider = params.provider ?? this.fakeProviderAddress;
    const digest = computeAttestationDigest({
      requestHash: params.requestHash,
      responseHash: params.responseHash,
      provider,
      qualityScore: params.qualityScore,
    });
    const signature = this.opts.scorerWallet.signingKey.sign(getBytes(digest))
      .serialized as Hex;
    const attestation: SignedAttestation = {
      requestHash: params.requestHash,
      responseHash: params.responseHash,
      provider,
      qualityScore: params.qualityScore,
      signature,
    };
    return { attestation, encoded: encodeAttestation(attestation) };
  }
}
