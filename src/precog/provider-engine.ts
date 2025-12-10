// @version 2.2.248
import LLMProvider from './providers/llm-provider.js';
import { GeminiImageProvider } from './providers/gemini-image.js';
import { OpenAIImageProvider } from './providers/openai-image.js';
import { ImageGenerationRequest, ImageGenerationResponse } from './providers/types.js';
import { CostCalculator } from './engine/cost-calculator.js';
import { TransparencyWrapper } from '../shared/xai/transparency-wrapper.js';
import { XAIMeta, ProviderTrace } from '../shared/xai/schemas.js';
import { getXAIConfig } from '../shared/xai/config.js';
import { synthesizer } from './synthesizer.js';
import fetch from 'node-fetch';

interface OpenAIEmbeddingResponse {
  data: {
    embedding: number[];
  }[];
}

// Track quota warnings to avoid spamming logs
let openaiQuotaWarningShown = false;

export class ProviderEngine {
  private llmProvider: LLMProvider;
  private geminiImageProvider: GeminiImageProvider;
  private openaiImageProvider: OpenAIImageProvider;
  private costCalculator: CostCalculator;

  constructor() {
    this.llmProvider = new LLMProvider();
    this.geminiImageProvider = new GeminiImageProvider();
    this.openaiImageProvider = new OpenAIImageProvider();
    this.costCalculator = new CostCalculator();
  }

  getProviderStatus() {
    return this.llmProvider.getProviderStatus();
  }

  getProvider(name: string) {
    if (name === 'openai') {
      return {
        embed: async (text: string) => {
          // Try OpenAI first
          if (process.env['OPENAI_API_KEY']) {
            try {
              const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env['OPENAI_API_KEY']}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  input: text,
                  model: 'text-embedding-3-small',
                }),
              });

              if (response.ok) {
                const data = (await response.json()) as OpenAIEmbeddingResponse;
                const firstData = data?.data?.[0];
                if (data && data.data && data.data.length > 0 && firstData) {
                  console.log('[ProviderEngine] ✓ OpenAI embedding successful');
                  return firstData.embedding;
                }
              } else if (response.status === 429) {
                if (!openaiQuotaWarningShown) {
                  console.warn('[ProviderEngine] ⚠ OpenAI quota exceeded, using Gemini for embeddings');
                  openaiQuotaWarningShown = true;
                }
              } else {
                const err = await response.text();
                console.error(`[ProviderEngine] OpenAI Embedding Error: ${response.status} ${err}`);
              }
            } catch (e) {
              console.error('[ProviderEngine] OpenAI embedding exception:', e);
            }
          }

          // Fallback to Gemini embeddings
          if (process.env['GEMINI_API_KEY']) {
            try {
              console.log('[ProviderEngine] → Using Gemini embedding API...');
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env['GEMINI_API_KEY']}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    content: {
                      parts: [{ text }],
                    },
                  }),
                }
              );

              if (response.ok) {
                const data: any = await response.json();
                if (data?.embedding?.values) {
                  console.log('[ProviderEngine] ✓ Gemini embedding successful');
                  return data.embedding.values;
                }
              } else {
                const err = await response.text();
                console.error(`[ProviderEngine] Gemini Embedding Error: ${response.status} ${err}`);
              }
            } catch (e) {
              console.error('[ProviderEngine] Gemini embedding exception:', e);
            }
          }

          // Final fallback: DeepSeek (if they support embeddings in the future)
          console.error('[ProviderEngine] ✗ All embedding providers failed');
          return null;
        },
      };
    }
    // Return a dummy for other providers if needed, or null
    return null;
  }

  async generate(params: {
    prompt: string;
    system?: string;
    history?: any[];
    taskType?: string;
    cohortId?: string;
    workflowId?: string;
    sessionId?: string;
    provider?: string; // Override: force specific provider
    model?: string; // Override: force specific model
  }) {
    // Adaptive Routing Logic (unless overridden)
    const complexity = this.classifyComplexity(params.prompt, params.taskType);
    const modelTier = complexity === 'high' ? 'pro' : 'flash';

    // If provider/model override is specified, log it
    if (params.provider || params.model) {
      console.log(
        `[ProviderEngine] Using override: provider=${params.provider ?? 'auto'}, model=${params.model ?? 'auto'}`
      );
    } else {
      console.log(
        `[ProviderEngine] Routing request (Complexity: ${complexity}) to ${modelTier} tier.`
      );
    }

    // Use the class instance which has Amygdala integration and timeouts
    const result = await this.llmProvider.generate({
      prompt: params.prompt,
      system: params.system,
      history: params.history,
      taskType: params.taskType,
      maxTokens: 4096, // Increased default for thinking models
      modelTier: params.model || modelTier, // Use override if provided
      sessionId: params.sessionId,
      provider: params.provider, // Pass provider override
    });

    // Cost Tracking
    let cost = 0;
    if ('usage' in result && result.usage) {
      cost = this.costCalculator.calculateModelCost(
        result.provider, // Using provider as model proxy if model not returned
        result.usage.input,
        result.usage.output
      );
    } else {
      cost = this.costCalculator.getProviderCost(result.provider);
    }

    this.costCalculator.recordWorkflow(
      params.cohortId || 'default',
      params.workflowId || `wf-${Date.now()}`,
      result.provider,
      cost,
      0.5 // Default capability gain
    );

    console.log(`[ProviderEngine] Request completed via ${result.provider}. Est. Cost: $${cost}`);

    return {
      content: result.content,
      provider: result.provider,
      model: result.provider,
      cost_usd: cost,
      complexity,
      reasoning: `Auto-routed to ${result.provider} (${complexity} complexity, ${modelTier} tier)`,
    };
  }

  async stream(params: {
    prompt: string;
    system?: string;
    history?: any[];
    taskType?: string;
    cohortId?: string;
    workflowId?: string;
    sessionId?: string;
    provider?: string;
    model?: string;
    onChunk: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
  }) {
    // Adaptive Routing Logic (unless overridden)
    const complexity = this.classifyComplexity(params.prompt, params.taskType);
    const modelTier = complexity === 'high' ? 'pro' : 'flash';

    if (params.provider || params.model) {
      console.log(
        `[ProviderEngine] Streaming override: provider=${params.provider ?? 'auto'}, model=${params.model ?? 'auto'}`
      );
    } else {
      console.log(
        `[ProviderEngine] Routing stream (Complexity: ${complexity}) to ${modelTier} tier.`
      );
    }

    return this.llmProvider
      .stream(
        {
          prompt: params.prompt,
          system: params.system,
          history: params.history,
          taskType: params.taskType,
          modelTier: params.model || modelTier,
          sessionId: params.sessionId,
          provider: params.provider,
        },
        params.onChunk,
        (fullText) => {
          // Cost Tracking on completion
          // We don't know the provider easily here unless we return it from stream
          // But stream returns a promise that resolves with { content, provider, ... }
          if (params.onComplete) params.onComplete(fullText);
        }
      )
      .then((result) => {
        const cost = this.costCalculator.getProviderCost(result.provider);
        this.costCalculator.recordWorkflow(
          params.cohortId || 'default',
          params.workflowId || `wf-${Date.now()}`,
          result.provider,
          cost,
          0.5
        );
        console.log(
          `[ProviderEngine] Stream completed via ${result.provider}. Est. Cost: $${cost}`
        );
        return {
          ...result,
          cost_usd: cost,
          complexity,
          reasoning: `Auto-routed to ${result.provider} (${complexity} complexity, ${modelTier} tier)`,
        };
      });
  }

  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    console.log(`[ProviderEngine] Generating image with prompt: ${req.prompt.substring(0, 50)}...`);

    if (req.provider === 'openai' || (req.model && req.model.includes('dall-e'))) {
      try {
        const base64Image = await this.openaiImageProvider.generateImage(req.prompt, {
          model: req.model,
          size: req.imageSize,
          quality: 'standard',
          style: 'vivid',
        });

        // Handle data URI format if present
        const splitData = base64Image.split(',');
        const data = base64Image.includes(',') ? (splitData[1] ?? base64Image) : base64Image;

        return {
          images: [
            {
              data: data,
              mimeType: 'image/png',
            },
          ],
        };
      } catch (error: any) {
        console.error('[ProviderEngine] OpenAI generation failed:', error);
        // Fallback to Gemini if OpenAI fails and provider wasn't strictly enforced?
        // For now, just rethrow with a clearer message or let the caller handle it.
        // But if the user explicitly asked for OpenAI, we should probably fail.
        throw new Error(`OpenAI generation failed: ${error.message}`);
      }
    }

    return this.geminiImageProvider.generateImage(req);
  }

  private classifyComplexity(prompt: string, taskType?: string): 'low' | 'high' {
    if (taskType === 'code_generation' || taskType === 'architecting') return 'high';
    if (prompt.length > 1000) return 'high';
    if (prompt.includes('analyze') || prompt.includes('design')) return 'high';
    return 'low';
  }

  /**
   * V3 ENSEMBLE Mode — Query multiple providers in parallel, then synthesize
   * This is what makes TooLoo.ai unique: multi-provider orchestration.
   */
  async generateEnsemble(params: {
    prompt: string;
    system?: string;
    taskType?: string;
    sessionId?: string;
    providers?: string[];
    synthesize?: boolean;
  }) {
    const config = getXAIConfig();
    const wrapper = TransparencyWrapper.create();
    const startTime = Date.now();

    const providersToUse = params.providers || ['gemini', 'anthropic', 'openai'];
    console.log(`[ProviderEngine] ENSEMBLE mode: Querying ${providersToUse.join(', ')}`);

    // Parallel execution
    const promises = providersToUse.map(async (provider) => {
      const providerStart = Date.now();
      try {
        const result = await this.llmProvider.generate({
          prompt: params.prompt,
          system: params.system,
          taskType: params.taskType,
          maxTokens: 2048,
          sessionId: params.sessionId,
          provider, // Force specific provider
        });

        const latencyMs = Date.now() - providerStart;
        const costUsd = this.costCalculator.getProviderCost(provider);

        // Add to wrapper
        wrapper.meta.addProvider({
          provider: provider as ProviderTrace['provider'],
          model: result.provider || provider,
          role: 'generator',
          latency_ms: latencyMs,
          cost_usd: costUsd,
          success: true,
        });

        return {
          provider,
          content: result.content,
          success: true,
          latencyMs,
          costUsd,
        };
      } catch (error: unknown) {
        const latencyMs = Date.now() - providerStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        wrapper.meta.addProvider({
          provider: provider as ProviderTrace['provider'],
          model: provider,
          role: 'generator',
          latency_ms: latencyMs,
          cost_usd: 0,
          success: false,
          error: errorMessage,
        });

        return {
          provider,
          content: '',
          success: false,
          error: errorMessage,
          latencyMs,
          costUsd: 0,
        };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.success);

    if (successful.length === 0) {
      throw new Error('All providers failed in ENSEMBLE mode');
    }

    // Calculate consensus
    const consensusScore = this.calculateEnsembleConsensus(successful.map((r) => r.content));

    // Synthesize if requested and multiple responses
    let finalContent: string;
    let primaryProvider: string;
    let primaryModel: string;

    if (params.synthesize !== false && successful.length > 1) {
      // Use synthesizer to combine responses
      console.log(`[ProviderEngine] Synthesizing ${successful.length} responses...`);
      const synthesisResult = await synthesizer.synthesize(
        params.prompt,
        'context-driven',
        params.sessionId
      );
      finalContent = synthesisResult.response;
      primaryProvider = 'ensemble';
      primaryModel = `${successful.map((r) => r.provider).join('+')}→synthesized`;

      wrapper.meta.addProvider({
        provider: 'gemini' as ProviderTrace['provider'], // Synthesizer uses Gemini
        model: 'gemini-synthesizer',
        role: 'synthesizer',
        latency_ms: Date.now() - startTime,
        cost_usd: this.costCalculator.getProviderCost('gemini'),
        success: true,
      });
    } else {
      // Use best single response (first successful)
      const firstSuccessful = successful[0]!;
      finalContent = firstSuccessful.content;
      primaryProvider = firstSuccessful.provider;
      primaryModel = firstSuccessful.provider;
    }

    // Set metadata
    wrapper.meta
      .setPrimary(primaryProvider, primaryModel)
      .setRouting(
        `ENSEMBLE: ${successful.length}/${providersToUse.length} providers succeeded`,
        this.classifyComplexity(params.prompt, params.taskType) === 'high' ? 'complex' : 'moderate',
        'ensemble'
      )
      .setConfidence(0.9, consensusScore);

    const totalLatency = Date.now() - startTime;
    const totalCost = successful.reduce((sum, r) => sum + r.costUsd, 0);

    console.log(
      `[ProviderEngine] ENSEMBLE complete: ${successful.length} providers | Consensus: ${consensusScore.toFixed(2)} | Cost: $${totalCost.toFixed(4)}`
    );

    return {
      content: finalContent,
      provider: primaryProvider,
      model: primaryModel,
      envelope: wrapper.wrap({
        response: finalContent,
        provider: primaryProvider,
        model: primaryModel,
      }),
      meta: {
        providers: successful.map((r) => r.provider),
        consensus: consensusScore,
        totalCost,
        totalLatency,
      },
    };
  }

  /**
   * Calculate consensus between ensemble responses
   * Uses simple word overlap for now - could be enhanced with embeddings
   */
  private calculateEnsembleConsensus(responses: string[]): number {
    if (responses.length < 2) return 1.0;

    // Tokenize responses
    const tokenSets = responses.map(
      (r) =>
        new Set(
          r
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3)
        )
    );

    // Calculate pairwise Jaccard similarity
    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < tokenSets.length; i++) {
      for (let j = i + 1; j < tokenSets.length; j++) {
        const setI = tokenSets[i];
        const setJ = tokenSets[j];
        if (!setI || !setJ) continue;
        const intersection = new Set([...setI].filter((x) => setJ.has(x)));
        const union = new Set([...setI, ...setJ]);
        totalSimilarity += intersection.size / union.size;
        pairs++;
      }
    }

    return pairs > 0 ? totalSimilarity / pairs : 1.0;
  }

  /**
   * V3 Generate with XAI transparency envelope
   */
  async generateWithTransparency(params: {
    prompt: string;
    system?: string;
    taskType?: string;
    sessionId?: string;
    executionMode?: 'single' | 'fallback' | 'ensemble' | 'validation_loop';
  }) {
    const mode = params.executionMode || 'single';

    if (mode === 'ensemble') {
      return this.generateEnsemble(params);
    }

    // Standard single/fallback mode with transparency
    const wrapper = TransparencyWrapper.create();
    const startTime = Date.now();

    const result = await this.generate(params);
    const latencyMs = Date.now() - startTime;
    const costUsd = this.costCalculator.getProviderCost(result.provider);

    wrapper.meta
      .addProvider({
        provider: result.provider as ProviderTrace['provider'],
        model: result.model,
        role: 'generator',
        latency_ms: latencyMs,
        cost_usd: costUsd,
        success: true,
      })
      .setPrimary(result.provider, result.model)
      .setRouting(
        `${mode} mode - routed to ${result.provider}`,
        this.classifyComplexity(params.prompt, params.taskType) === 'high' ? 'complex' : 'moderate',
        mode
      )
      .setConfidence(0.85);

    return {
      ...result,
      envelope: wrapper.wrap({
        response: result.content,
        provider: result.provider,
        model: result.model,
      }),
    };
  }
}
