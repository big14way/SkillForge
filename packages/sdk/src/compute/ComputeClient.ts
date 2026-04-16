import OpenAI from 'openai';
import { JsonRpcProvider, Wallet } from 'ethers';
import { createZGComputeNetworkBroker, type ZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
import { logger } from '../logger.js';
import type { Hex } from '../types.js';

/**
 * Wraps the 0G Compute broker to a shape the SkillForge service layer uses.
 *
 * Flow of a single inference call:
 *   1. broker.inference.listService() — find a verifiable (TeeML) provider.
 *   2. broker.inference.acknowledgeProviderSigner(provider) — one-time per wallet.
 *   3. broker.inference.getServiceMetadata(provider) — get OpenAI-compat endpoint.
 *   4. broker.inference.getRequestHeaders(provider, content) — billing + auth.
 *   5. OpenAI SDK call against the provider's endpoint with the headers.
 *   6. broker.inference.processResponse(provider, responseContent, chatID) — the
 *      broker verifies the TEE signature and returns true iff the response was
 *      produced by the attested TEE.
 *
 * The return tuple includes the provider, chatID, and verification bit so the
 * caller can later fetch the signed attestation via
 * {@link ComputeClient.getAttestationLink} and submit it on-chain.
 */

export interface ComputeClientConfig {
  evmRpc: string;
  privateKey: Hex;
  /** Ledger deposit in OG (default 0.1). Skipped if ledger already funded. */
  defaultLedgerBalance?: number;
  /** Provider address to use. If unset, the first TeeML provider is picked on demand. */
  preferredProvider?: Hex;
}

export interface ProviderInfo {
  provider: Hex;
  model: string;
  endpoint: string;
  verifiability: string;
  teeEnabled: boolean;
}

export interface Attestation {
  /** keccak256 of the serialized request (model + messages). */
  requestHash: Hex;
  /** keccak256 of the raw response content. */
  responseHash: Hex;
  /** The TeeML provider that produced the response. */
  provider: Hex;
  /** 0–10000 bps score; meaningful only when paired with a signature. */
  qualityScore: number;
  /** Opaque chatID from the provider — used to retrieve the full signature. */
  chatID: string;
  /** Provider-produced TEE signature link. */
  signatureLink?: string;
}

export interface InferenceResult {
  content: string;
  chatID: string;
  provider: Hex;
  verified: boolean | null;
  usage?: { promptTokens: number; completionTokens: number } | undefined;
}

export class ComputeError extends Error {
  override name = 'ComputeError';
}
export class InvalidAttestationError extends Error {
  override name = 'InvalidAttestationError';
}

export class ComputeClient {
  private readonly signer: Wallet;
  private readonly cfg: ComputeClientConfig;
  private broker?: ZGComputeNetworkBroker;
  private acknowledgedProviders = new Set<string>();

  constructor(config: ComputeClientConfig) {
    const provider = new JsonRpcProvider(config.evmRpc);
    this.signer = new Wallet(config.privateKey, provider);
    this.cfg = config;
  }

  /** Lazy-init the broker — network calls happen here, not in the constructor. */
  async init(): Promise<ZGComputeNetworkBroker> {
    if (this.broker) return this.broker;
    // Dual ESM/CJS in the broker package makes Wallet types nominally
    // distinct from ours — safe cast.
    this.broker = await createZGComputeNetworkBroker(this.signer as never);
    logger.debug('ComputeClient broker initialized');
    return this.broker;
  }

  /**
   * Fund the compute ledger if it has no balance yet. Idempotent: if a ledger
   * already exists the call is skipped.
   */
  async ensureLedgerFunded(amountOG?: number): Promise<void> {
    const broker = await this.init();
    const amount = amountOG ?? this.cfg.defaultLedgerBalance ?? 0.1;
    try {
      const ledger = await broker.ledger.getLedger();
      logger.debug({ balance: ledger.totalBalance.toString() }, 'ledger already exists');
      return;
    } catch {
      logger.info({ amount }, 'creating + funding new compute ledger');
      await broker.ledger.addLedger(amount);
    }
  }

  /** Return the list of available inference providers, flagging TeeML ones. */
  async listProviders(): Promise<ProviderInfo[]> {
    const broker = await this.init();
    const services = await broker.inference.listService();
    return services.map((s) => ({
      provider: s.provider as Hex,
      model: s.model,
      endpoint: s.url,
      verifiability: s.verifiability,
      // Any non-empty verifiability string means the service uses a TEE.
      teeEnabled: Boolean(s.verifiability) && s.verifiability !== 'None',
    }));
  }

  /**
   * Pick a provider: explicit arg → config.preferredProvider → first TeeML
   * provider on-network. Throws if none are available and `requireTee=true`.
   */
  async pickProvider(requireTee = true, explicit?: Hex): Promise<ProviderInfo> {
    const providers = await this.listProviders();
    const pool = requireTee ? providers.filter((p) => p.teeEnabled) : providers;
    if (pool.length === 0) {
      throw new ComputeError(`no ${requireTee ? 'TeeML ' : ''}providers available`);
    }
    const wanted = explicit ?? this.cfg.preferredProvider;
    if (wanted) {
      const match = pool.find((p) => p.provider.toLowerCase() === wanted.toLowerCase());
      if (!match) {
        throw new ComputeError(`provider ${wanted} not present or not TeeML`);
      }
      return match;
    }
    return pool[0]!;
  }

  /**
   * Run a single inference against a TeeML provider. Returns the response plus
   * metadata sufficient to build an on-chain attestation via
   * {@link encodeAttestation}.
   */
  async infer(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    provider?: Hex;
    requireTee?: boolean;
  }): Promise<InferenceResult> {
    const broker = await this.init();
    const prov = await this.pickProvider(params.requireTee ?? true, params.provider);

    if (!this.acknowledgedProviders.has(prov.provider)) {
      const already = await broker.inference.userAcknowledged(prov.provider);
      if (!already) {
        logger.info({ provider: prov.provider }, 'acknowledging provider signer');
        await broker.inference.acknowledgeProviderSigner(prov.provider);
      }
      this.acknowledgedProviders.add(prov.provider);
    }

    const { endpoint, model } = await broker.inference.getServiceMetadata(prov.provider);
    // Use the last user message as the `content` string for billing / signature.
    const content = params.messages.map((m) => `${m.role}:${m.content}`).join('\n');
    const headers = await broker.inference.getRequestHeaders(prov.provider, content);

    const openai = new OpenAI({ baseURL: endpoint, apiKey: '' });
    const completion = await openai.chat.completions.create(
      { messages: params.messages, model },
      { headers: headers as unknown as Record<string, string> },
    );

    const choice = completion.choices[0];
    if (!choice || !choice.message?.content) {
      throw new ComputeError('empty completion from provider');
    }
    const responseText = choice.message.content;
    const chatID = completion.id;

    // Ask the broker to settle + verify. Returns true iff the provider's TEE
    // signature over the response matches the advertised signer address.
    const verified = await broker.inference.processResponse(prov.provider, responseText, chatID);
    if (verified === false) {
      throw new InvalidAttestationError(
        `TeeML verification failed for provider ${prov.provider} chatID ${chatID}`,
      );
    }

    return {
      content: responseText,
      chatID,
      provider: prov.provider,
      verified,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
          }
        : undefined,
    };
  }

  /** URL to download the TEE signature for a specific chat. */
  async getAttestationLink(provider: Hex, chatID: string): Promise<string> {
    const broker = await this.init();
    return broker.inference.getChatSignatureDownloadLink(provider, chatID);
  }
}
