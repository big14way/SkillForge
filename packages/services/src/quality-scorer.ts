import type { Wallet} from 'ethers';
import { getBytes, keccak256, toUtf8Bytes } from 'ethers';
import {
  computeAttestationDigest,
  encodeAttestation,
  logger,
  type SkillForgeClient,
  type SignedAttestation,
  type Hex,
} from '@skillforge/sdk';

export interface ScoreParams {
  rentalId: bigint;
  skillDescription: string;
  invocationInput: string;
  output: string;
  provider: Hex;
  /** keccak256 of the canonical request JSON (model + messages). */
  requestHash: Hex;
}

export interface ScoreResult {
  score: number;
  reasoning: string;
  encodedAttestation: Hex;
  txHash: Hex;
}

const SYSTEM_PROMPT = `You are an impartial evaluator of AI-generated output.
Rate the output on a scale of 0-10000 basis points (10000 = perfect) based on:
  - relevance to the input,
  - correctness / factuality,
  - quality of reasoning or output structure.
Respond with a JSON object ONLY, no prose before or after:
  {"score": <integer 0-10000>, "reasoning": "<one sentence>"}`;

/**
 * QualityScorer runs a separate TeeML inference that grades a rental's
 * output, signs the result as a scorer-oracle, and submits it to SkillEscrow
 * so the verifier contract can recover our address on-chain.
 *
 * Week 2 model: the scorer oracle = the wallet configured in the SDK client.
 * AttestationVerifier checks that the recovered signer is in the contract's
 * whitelist. Week 4 moves the scoring call itself inside a TEE.
 */
export class QualityScorer {
  constructor(
    private readonly sdk: SkillForgeClient,
    private readonly scorerKey: Wallet,
  ) {}

  async score(params: ScoreParams): Promise<ScoreResult> {
    const userPrompt = [
      `Skill description: ${params.skillDescription}`,
      `Input: ${params.invocationInput}`,
      `Output: ${params.output}`,
    ].join('\n\n');

    const inference = await this.sdk.compute.infer({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const parsed = this._parseJSONScore(inference.content);
    logger.info(
      { rentalId: params.rentalId.toString(), score: parsed.score },
      'quality score computed',
    );

    const responseHash = keccak256(toUtf8Bytes(params.output)) as Hex;
    const digest = computeAttestationDigest({
      requestHash: params.requestHash,
      responseHash,
      provider: params.provider,
      qualityScore: parsed.score,
    });
    const signature = this.scorerKey.signingKey.sign(getBytes(digest)).serialized as Hex;

    const signed: SignedAttestation = {
      requestHash: params.requestHash,
      responseHash,
      provider: params.provider,
      qualityScore: parsed.score,
      signature,
    };
    const encoded = encodeAttestation(signed);

    const tx = await this.sdk.contracts.skillEscrow.getFunction('verifyWork')(
      params.rentalId,
      parsed.score,
      encoded,
    );
    const receipt = await tx.wait();
    if (!receipt) throw new Error('verifyWork receipt missing');

    return {
      score: parsed.score,
      reasoning: parsed.reasoning,
      encodedAttestation: encoded,
      txHash: receipt.hash as Hex,
    };
  }

  private _parseJSONScore(raw: string): { score: number; reasoning: string } {
    // TeeML providers sometimes wrap JSON in code fences.
    const stripped = raw.replace(/```json\s*|\s*```/g, '').trim();
    const braceStart = stripped.indexOf('{');
    const braceEnd = stripped.lastIndexOf('}');
    if (braceStart === -1 || braceEnd === -1) {
      throw new Error(`scorer response had no JSON object: ${raw.slice(0, 200)}`);
    }
    let parsed: { score: unknown; reasoning?: unknown };
    try {
      parsed = JSON.parse(stripped.slice(braceStart, braceEnd + 1));
    } catch (err) {
      throw new Error(`scorer JSON parse failed: ${(err as Error).message}`);
    }
    const score = Number(parsed.score);
    if (!Number.isInteger(score) || score < 0 || score > 10_000) {
      throw new Error(`scorer returned invalid score: ${String(parsed.score)}`);
    }
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
    return { score, reasoning };
  }
}
