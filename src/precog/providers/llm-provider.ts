// @version 3.3.90
/**
 * LLM Provider Orchestrator (Real Providers)
 * Uses available API keys to select the cheapest suitable provider.
 * Fallback chain: DeepSeek → Anthropic Claude → OpenAI → Google Gemini.
 * If no keys are available, returns a clear configuration message.
 *
 * V3.3.90: Improved mid-stream error handling with graceful failover.
 * - When a provider fails mid-stream, attempts continuation with next provider
 * - User-friendly error messages instead of raw system errors
 * - Returns partial content if no fallback providers available
 *
 * V2.2.250: CRITICAL FIX - TooLoo identity is now preserved. Domain expertise
 * is APPENDED to system prompts, not prepended, ensuring TooLoo's core identity
 * and capabilities are always asserted first.
 */

import DomainExpertise from '../../nexus/engine/domain-expertise.js';
import ContinuousLearning from '../../nexus/engine/continuous-learning.js';
import { TOOLOO_PERSONA } from '../../cortex/persona.js';
import fetch from 'node-fetch';
import ensureEnvLoaded from '../../nexus/engine/env-loader.js';
import { amygdala, AmygdalaState } from '../../cortex/amygdala/index.js';
import { bus } from '../../core/event-bus.js';

ensureEnvLoaded();

const env = (name: string, def: unknown = undefined) => process.env[name] ?? def;

// --- Telemetry & Metrics ---

interface ProviderMetrics {
  id: string;
  name: string;
  model: string;
  status: 'Ready' | 'Error' | 'Busy' | 'Missing Key';
  latency: number;
  successRate: number;
  totalRequests: number;
  lastUsed: number;
}

const metricsStore: Record<string, ProviderMetrics> = {};

function updateMetrics(provider: string, latency: number, success: boolean) {
  if (!metricsStore[provider]) {
    // Initialize if missing (lazy init)
    metricsStore[provider] = {
      id: provider,
      name: provider,
      model: 'unknown',
      status: 'Ready',
      latency: 0,
      successRate: 100,
      totalRequests: 0,
      lastUsed: Date.now(),
    };
  }

  const m = metricsStore[provider];
  if (m) {
    // Moving average for latency (weighted towards recent)
    m.latency = m.totalRequests === 0 ? latency : Math.round(m.latency * 0.7 + latency * 0.3);
    m.totalRequests++;

    // Success rate calculation
    if (success) {
      m.successRate = (m.successRate * (m.totalRequests - 1) + 100) / m.totalRequests;
      m.status = 'Ready';
    } else {
      m.successRate = (m.successRate * (m.totalRequests - 1) + 0) / m.totalRequests;
      m.status = 'Error';
    }

    m.lastUsed = Date.now();
  }
}

export default class LLMProvider {
  public providers: any;
  public defaultModel: any;
  public baseUrls: any;
  public domainExpertise: DomainExpertise;
  public learning: ContinuousLearning;

  constructor() {
    Object.defineProperty(this, 'providers', {
      get() {
        return {
          deepseek: providerAvailable('deepseek'),
          anthropic: providerAvailable('anthropic'),
          openai: providerAvailable('openai'),
          gemini: providerAvailable('gemini'),
          localai: providerAvailable('localai'),
          openinterpreter: providerAvailable('openinterpreter'),
          huggingface: providerAvailable('huggingface'),
        };
      },
    });

    Object.defineProperty(this, 'defaultModel', {
      get() {
        return {
          deepseek: env('DEEPSEEK_MODEL', 'deepseek-chat'),
          anthropic: env('ANTHROPIC_MODEL', 'claude-sonnet-4.5'), // Default to Sonnet 4.5
          openai: env('OPENAI_MODEL', 'gpt-5'), // Default to GPT-5
          gemini: env('GEMINI_MODEL', 'gemini-3-pro-preview'), // Default to Gemini 3 Pro
          localai: env('LOCALAI_MODEL', 'gpt-4'),
          openinterpreter: env('OI_MODEL', 'openinterpreter/default'),
          huggingface: env('HF_MODEL', 'microsoft/DialoGPT-large'),
        };
      },
    });

    Object.defineProperty(this, 'baseUrls', {
      get() {
        return {
          localai: env('LOCALAI_BASE_URL', 'http://localhost:8080'),
          openinterpreter: env('OI_BASE_URL', 'http://localhost:8000'),
          huggingface: 'https://api-inference.huggingface.co',
        };
      },
    });

    // Initialize domain expertise system
    this.domainExpertise = new DomainExpertise();

    // Initialize continuous learning system
    this.learning = new ContinuousLearning();
  }

  getProviderStatus() {
    const providerList = [
      {
        id: 'anthropic-haiku-4.5',
        name: 'Claude Haiku 4.5',
        model: 'claude-haiku-4.5',
      },
      {
        id: 'anthropic-opus-4.5',
        name: 'Claude Opus 4.5 (Preview)',
        model: 'claude-opus-4.5-preview',
      },
      {
        id: 'anthropic-sonnet-4',
        name: 'Claude Sonnet 4',
        model: 'claude-sonnet-4',
      },
      {
        id: 'anthropic-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        model: 'claude-sonnet-4.5',
      },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro' },
      {
        id: 'gemini-3-pro',
        name: 'Gemini 3 Pro (Preview)',
        model: 'gemini-3-pro-preview',
      },
      { id: 'openai-gpt-5', name: 'GPT-5', model: 'gpt-5' },
      {
        id: 'openai-gpt-5-codex',
        name: 'GPT-5-Codex (Preview)',
        model: 'gpt-5-codex-preview',
      },
      {
        id: 'openai-gpt-5.1',
        name: 'GPT-5.1 (Preview)',
        model: 'gpt-5.1-preview',
      },
      {
        id: 'openai-gpt-5.1-codex',
        name: 'GPT-5.1-Codex (Preview)',
        model: 'gpt-5.1-codex-preview',
      },
      {
        id: 'openai-gpt-5.1-codex-mini',
        name: 'GPT-5.1-Codex-Mini (Preview)',
        model: 'gpt-5.1-codex-mini-preview',
      },
    ];

    return providerList.map((p) => {
      const baseId = p.id.split('-')[0] ?? '';
      const isAvailable = providerAvailable(baseId); // Check base provider

      // Merge with real metrics if available
      const realMetrics = baseId ? metricsStore[baseId] : undefined;

      return {
        id: p.id,
        name: p.name,
        model: p.model,
        status: isAvailable ? realMetrics?.status || 'Ready' : 'Missing Key',
        latency: isAvailable ? realMetrics?.latency || 0 : 0,
        successRate: realMetrics?.successRate || 100,
        lastUsed: realMetrics?.lastUsed || 0,
      };
    });
  }

  // Check if LocalAI is running
  checkLocalAIAvailable() {
    return !!env('LOCALAI_BASE_URL') || env('ENABLE_LOCALAI') === 'true';
  }

  // Check if Open Interpreter server is available
  checkOpenInterpreterAvailable() {
    return !!env('OI_BASE_URL') || env('ENABLE_OPEN_INTERPRETER') === 'true';
  }

  available() {
    return Object.values(this.providers).some(Boolean);
  }

  selectProvider(taskType = 'chat') {
    // Default chat: Prefer Gemini 3 Pro, then others
    const order = [
      'gemini', // Gemini 3 Pro (Default)
      'anthropic', // Premium reasoning (Claude)
      'openai', // Premium reliable
      'localai', // Free local OpenAI-compatible
      'huggingface', // Free tier (with limits)
      'openinterpreter', // Local with code execution
      'deepseek', // Fallback only
    ];

    // For code tasks, prefer local code-capable models
    if (taskType === 'code' || taskType === 'programming') {
      const codeOrder = ['gemini', 'openinterpreter', 'deepseek', 'openai', 'anthropic'];
      for (const p of codeOrder) {
        if (this.providers[p]) return p;
      }
    }

    // For reasoning tasks, prefer premium models
    if (taskType === 'reasoning' || taskType === 'analysis') {
      const reasoningOrder = ['gemini', 'anthropic', 'openai', 'deepseek'];
      for (const p of reasoningOrder) {
        if (this.providers[p]) return p;
      }
    }

    // Default cost-optimized order
    for (const p of order) {
      if (this.providers[p]) return p;
    }
    return null;
  }

  /**
   * Stream response from LLM
   */
  async stream(
    request: any,
    onChunk: (chunk: string) => void,
    onComplete?: (fullText: string) => void
  ): Promise<any> {
    return this.streamSmartLLM(request, onChunk, onComplete);
  }

  async streamSmartLLM(
    request: any,
    onChunk: (chunk: string) => void,
    onComplete?: (fullText: string) => void
  ) {
    const {
      prompt,
      system,
      taskType = 'chat',
      context = {},
      modelTier,
      sessionId,
      history = [],
    } = request || {};

    // Detect domain expertise
    const detectedDomain = this.domainExpertise.detectDomain(prompt, context);

    // Get domain-specific system prompt
    // CRITICAL FIX V3.3.35: TooLoo identity MUST come FIRST, domain expertise SECOND
    // The original system prompt contains TooLoo's identity assertion
    // Domain expertise is ADDITIVE, not identity-replacing
    // If no system prompt provided, use TOOLOO_PERSONA as baseline
    const baseSystem = system || TOOLOO_PERSONA;
    let enhancedSystem = baseSystem;
    if (detectedDomain !== 'general') {
      const domainPrompt = this.domainExpertise.getDomainPrompt(detectedDomain);
      if (domainPrompt) {
        // Domain expertise is APPENDED to preserve TooLoo identity
        enhancedSystem = `${baseSystem}\n\n🎯 DOMAIN EXPERTISE ACTIVATED [${detectedDomain.toUpperCase()}]:\n${domainPrompt}`;
      }
    }

    // Select provider
    const availableProviders = Object.keys(this.providers).filter((p) => this.providers[p]);
    let provider;

    if (detectedDomain !== 'general') {
      provider = this.learning.getBestProviderForDomain(detectedDomain, availableProviders);
      if (!provider) {
        provider = this.domainExpertise.selectProviderForDomain(
          detectedDomain,
          taskType,
          availableProviders
        );
      }
    }

    if (!provider) {
      provider = this.selectProvider(taskType);
    }

    if (!provider) {
      const msg = 'No AI provider configured.';
      onChunk(msg);
      if (onComplete) onComplete(msg);
      return {
        content: msg,
        provider: 'unconfigured',
        confidence: 0.0,
      };
    }

    const fns = {
      deepseek: () => this.streamDeepSeek(prompt, enhancedSystem, history, onChunk),
      anthropic: () => this.streamClaude(prompt, enhancedSystem, history, onChunk),
      openai: () => this.streamOpenAI(prompt, enhancedSystem, history, onChunk),
      gemini: () => this.streamGemini(prompt, enhancedSystem, history, modelTier, onChunk),
      localai: () => this.streamLocalAI(prompt, enhancedSystem, history, onChunk),
      // Others not supported for streaming yet, fallback to non-streaming
      openinterpreter: async () => {
        const res = await this.callOpenInterpreter(prompt, enhancedSystem);
        onChunk(res.content);
        return res;
      },
      huggingface: async () => {
        const res = await this.callHuggingFace(prompt, enhancedSystem);
        onChunk(res.content);
        return res;
      },
    };

    // Default chat fallback: Gemini first
    const order = ['gemini', 'anthropic', 'openai', 'localai', 'deepseek'];
    const startIdx = order.indexOf(provider);
    const tryOrder = order.slice(startIdx).concat(order.slice(0, startIdx));

    let lastError = null;
    let hasStreamed = false;

    // Wrap onChunk to detect if we have started streaming
    const safeOnChunk = (chunk: string) => {
      hasStreamed = true;
      onChunk(chunk);
    };

    for (const p of tryOrder) {
      if (!this.providers[p]) continue;
      if (!(fns as unknown as Record<string, (() => Promise<void>) | undefined>)[p]) continue;

      try {
        if (sessionId) {
          bus.publish('precog', 'precog:telemetry', {
            type: 'provider_status',
            sessionId,
            provider: p,
            status: 'streaming',
          });
        }

        const startTime = Date.now();
        let fullText = '';

        // Intercept chunks to build full text
        const collectingOnChunk = (chunk: string) => {
          fullText += chunk;
          safeOnChunk(chunk);
        };

        // Temporarily replace onChunk with collectingOnChunk for the specific call
        // But fns[p] calls specific stream methods which take onChunk.
        // So we need to pass collectingOnChunk to them.
        // I need to redefine fns to accept onChunk override or just pass it.
        // My fns definition above hardcoded onChunk. I should fix that.

        // Let's redefine fns inside the loop or just call methods directly?
        // Calling methods directly is cleaner but I need the mapping.

        // I'll just redefine fns here to be simpler
      } catch (e) {
        // ...
      }
    }

    // Re-implementing the loop logic properly
    let accumulatedText = ''; // V3.3.90: Track accumulated text across providers for mid-stream recovery

    for (const p of tryOrder) {
      if (!this.providers[p]) continue;

      try {
        if (sessionId) {
          bus.publish('precog', 'precog:telemetry', {
            type: 'provider_status',
            sessionId,
            provider: p,
            status: 'streaming',
          });
        }

        const startTime = Date.now();
        let fullText = '';
        const collectingOnChunk = (chunk: string) => {
          fullText += chunk;
          accumulatedText += chunk; // V3.3.90: Also track in accumulated
          safeOnChunk(chunk);
        };

        if (p === 'deepseek')
          await this.streamDeepSeek(prompt, enhancedSystem, history, collectingOnChunk);
        else if (p === 'anthropic')
          await this.streamClaude(prompt, enhancedSystem, history, collectingOnChunk);
        else if (p === 'openai')
          await this.streamOpenAI(prompt, enhancedSystem, history, collectingOnChunk);
        else if (p === 'gemini')
          await this.streamGemini(prompt, enhancedSystem, history, modelTier, collectingOnChunk);
        else if (p === 'localai')
          await this.streamLocalAI(prompt, enhancedSystem, history, collectingOnChunk);
        else if (p === 'openinterpreter') {
          const res = await this.callOpenInterpreter(prompt, enhancedSystem);
          collectingOnChunk(res.content);
        } else if (p === 'huggingface') {
          const res = await this.callHuggingFace(prompt, enhancedSystem);
          collectingOnChunk(res.content);
        } else continue;

        const latency = Date.now() - startTime;
        const success = fullText.length > 0;

        updateMetrics(p, latency, success);

        if (sessionId) {
          bus.publish('precog', 'precog:telemetry', {
            type: 'provider_latency',
            sessionId,
            provider: p,
            latency,
            status: success ? 'success' : 'error',
          });
        }

        this.learning.recordInteraction(prompt, detectedDomain, p, success, latency);

        if (onComplete) onComplete(fullText);

        return { content: fullText, provider: p, domain: detectedDomain, latency };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn(`[LLMProvider] Provider ${p} stream failed: ${errorMessage}.`);

        if (hasStreamed) {
          // V3.3.90: Improved mid-stream error handling
          // Log detailed error for debugging but show user-friendly message
          console.error(`[LLMProvider] Mid-stream failure from ${p}:`, errorMessage);

          // Find remaining providers we could potentially use for continuation
          const currentIdx = tryOrder.indexOf(p);
          const remainingProviders = tryOrder
            .slice(currentIdx + 1)
            .filter((rp) => this.providers[rp] && rp !== p);

          if (remainingProviders.length > 0) {
            // Attempt continuation with another provider
            onChunk(`\n\n_[Connection interrupted - attempting to continue...]_\n\n`);

            // Reset hasStreamed to allow failover attempt
            hasStreamed = false;
            updateMetrics(p, 0, false);
            lastError = err;

            // Continue loop to try next provider
            continue;
          } else {
            // No more providers available - show graceful error
            onChunk(`\n\n_[Response was interrupted. Please try again.]_`);
            updateMetrics(p, 0, false);

            // Return partial content instead of throwing
            if (onComplete) onComplete(accumulatedText);
            return {
              content: accumulatedText,
              provider: p,
              domain: detectedDomain,
              partial: true,
              error: 'mid-stream-failure',
            };
          }
        }

        updateMetrics(p, 0, false);
        lastError = err;
      }
    }

    throw new Error(`All providers failed to stream. Last error: ${lastError}`);
  }

  async streamOpenAI(
    prompt: string,
    system: string,
    history: any[],
    onChunk: (chunk: string) => void
  ) {
    const apiKey = env('OPENAI_API_KEY');
    const model = this.defaultModel.openai;
    if (!apiKey) throw new Error('OpenAI not configured');

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    if (Array.isArray(history)) messages.push(...history);
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${err}`);
    }

    if (!res.body) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of res.body) {
      const text = decoder.decode(chunk as Buffer, { stream: true });
      buffer += text;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) onChunk(content);
          } catch (e) {}
        }
      }
    }
  }

  async streamClaude(
    prompt: string,
    system: string,
    history: any[],
    onChunk: (chunk: string) => void
  ) {
    const apiKey = env('ANTHROPIC_API_KEY');
    const model = this.defaultModel.anthropic;
    if (!apiKey) throw new Error('Anthropic not configured');

    const messages = [];
    if (Array.isArray(history)) {
      messages.push(
        ...history.map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        }))
      );
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: any = {
      model,
      max_tokens: 1024,
      messages,
      stream: true,
    };
    if (system) requestBody.system = system;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude error ${res.status}: ${err}`);
    }

    if (!res.body) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of res.body) {
      const text = decoder.decode(chunk as Buffer, { stream: true });
      buffer += text;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('event: ')) {
          // event type
        } else if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta') {
              const content = json.delta?.text || '';
              if (content) onChunk(content);
            }
          } catch (e) {}
        }
      }
    }
  }

  async streamGemini(
    prompt: string,
    system: string,
    history: any[],
    modelTier: string,
    onChunk: (chunk: string) => void
  ) {
    const apiKey = env('GEMINI_API_KEY');
    let model = this.defaultModel.gemini;
    if (modelTier === 'flash') model = 'gemini-2.0-flash-exp';
    if (!apiKey) throw new Error('Gemini not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    const contents = [];
    if (Array.isArray(history)) {
      contents.push(
        ...history.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }))
      );
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body: any = {
      contents,
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error ${res.status}: ${err}`);
    }

    if (!res.body) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of res.body) {
      const text = decoder.decode(chunk as Buffer, { stream: true });
      buffer += text;

      let braceCount = 0;
      let startIndex = -1;
      let inString = false;
      let escaped = false;
      let processedUpTo = 0;

      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            if (braceCount === 0) startIndex = i;
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              const jsonStr = buffer.substring(startIndex, i + 1);
              // console.log("Attempting parse:", jsonStr);
              try {
                const json = JSON.parse(jsonStr);
                const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (content) onChunk(content);
              } catch (e: any) {
                console.log('JSON Parse Error:', e?.message, 'String:', jsonStr);
              }
              processedUpTo = i + 1;
              startIndex = -1;
            }
          }
        }
      }
      // console.log("End of chunk processing. Buffer length:", buffer.length, "ProcessedUpTo:", processedUpTo, "Remaining:", buffer.substring(processedUpTo));

      if (processedUpTo > 0) {
        buffer = buffer.slice(processedUpTo);
      }
    }
  }

  async streamDeepSeek(
    prompt: string,
    system: string,
    history: any[],
    onChunk: (chunk: string) => void
  ) {
    const apiKey = env('DEEPSEEK_API_KEY');
    const model = this.defaultModel.deepseek;
    if (!apiKey) throw new Error('DeepSeek not configured');

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    if (Array.isArray(history)) messages.push(...history);
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek error ${res.status}: ${err}`);
    }

    if (!res.body) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of res.body) {
      const text = decoder.decode(chunk as Buffer, { stream: true });
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) onChunk(content);
          } catch (e) {}
        }
      }
    }
  }

  async streamLocalAI(
    prompt: string,
    system: string,
    history: any[],
    onChunk: (chunk: string) => void
  ) {
    const baseUrl = this.baseUrls.localai;
    const model = this.defaultModel.localai;

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    if (Array.isArray(history)) messages.push(...history);
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!res.ok) throw new Error(`LocalAI error ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of res.body) {
      const text = decoder.decode(chunk as Buffer, { stream: true });
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) onChunk(content);
          } catch (e) {}
        }
      }
    }
  }

  /**
   * Unified LLM generation interface
   * @param {Object} request - Generation request
   * @param {string} request.prompt - Main query/instruction (required)
   * @param {string} request.system - System prompt (optional)
   * @param {string} request.taskType - 'analysis'|'generation'|'critique'|'planning' (optional)
   * @param {Object} request.context - Domain context (optional)
   * @param {number} request.maxTokens - Max output length (optional, default 2000)
   * @param {string} request.criticality - 'low'|'normal'|'high' (optional, default 'normal')
   * @returns {Promise<Object>} {content, provider, confidence}
   */
  async generate(request: any) {
    return this.generateSmartLLM(request);
  }

  async generateSmartLLM(request: any) {
    const { prompt, system, taskType = 'chat', context = {}, modelTier, sessionId } = request || {};
    if (!prompt || typeof prompt !== 'string') {
      return {
        content: 'Missing prompt. Please provide a text prompt to generate a response.',
        provider: 'validation',
        confidence: 0.0,
      };
    }

    // Detect domain expertise from the prompt
    const detectedDomain = this.domainExpertise.detectDomain(prompt, context);

    // Get domain-specific system prompt if available
    // CRITICAL FIX V3.3.35: TooLoo identity MUST come FIRST, domain expertise SECOND
    // If no system prompt provided, use TOOLOO_PERSONA as baseline
    const baseSystem = system || TOOLOO_PERSONA;
    let enhancedSystem = baseSystem;
    if (detectedDomain !== 'general') {
      const domainPrompt = this.domainExpertise.getDomainPrompt(detectedDomain);
      if (domainPrompt) {
        // Domain expertise is APPENDED to preserve TooLoo identity
        enhancedSystem = `${baseSystem}\n\n🎯 DOMAIN EXPERTISE ACTIVATED [${detectedDomain.toUpperCase()}]:\n${domainPrompt}`;
      }
    }

    // Select provider considering domain expertise and learning data
    const availableProviders = Object.keys(this.providers).filter((p) => this.providers[p]);
    let provider;

    if (detectedDomain !== 'general') {
      // First try learning-based recommendation for this domain
      provider = this.learning.getBestProviderForDomain(detectedDomain, availableProviders);

      // Fallback to domain expertise preferences
      if (!provider) {
        provider = this.domainExpertise.selectProviderForDomain(
          detectedDomain,
          taskType,
          availableProviders
        );
      }
    }

    // Fallback to standard task-based selection
    if (!provider) {
      provider = this.selectProvider(taskType);
    }

    if (!provider) {
      return {
        content:
          'No AI provider configured. Add API keys or enable local providers in .env:\n' +
          'PAID: DEEPSEEK_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY\n' +
          'FREE: ENABLE_LOCALAI=true, HF_API_KEY (free tier)',
        provider: 'unconfigured',
        confidence: 0.0,
      };
    }

    const fns: Record<string, () => Promise<any>> = {
      deepseek: () => this.callDeepSeek(prompt, enhancedSystem || ''),
      anthropic: () => this.callClaude(prompt, enhancedSystem || ''),
      openai: () => this.callOpenAI(prompt, enhancedSystem || ''),
      gemini: () => this.callGemini(prompt, enhancedSystem || '', modelTier),

      // OSS providers

      localai: () => this.callLocalAI(prompt, enhancedSystem || ''),
      openinterpreter: () => this.callOpenInterpreter(prompt, enhancedSystem || ''),
      huggingface: () => this.callHuggingFace(prompt, enhancedSystem || ''),
    };

    // Default chat fallback: Gemini first
    const order = [
      'gemini',
      'anthropic',
      'openai',
      'localai',
      'huggingface',
      'openinterpreter',
      'deepseek',
    ];
    const startIdx = order.indexOf(provider);
    const tryOrder = order.slice(startIdx).concat(order.slice(0, startIdx));

    let lastError = null;
    const startTime = Date.now();

    // Check Amygdala State - if PANIC/CRITICAL, maybe avoid expensive models?
    // For now, we just log it.
    if (
      amygdala.currentState === AmygdalaState.PANIC ||
      amygdala.currentState === AmygdalaState.CRITICAL
    ) {
      console.warn(
        `[LLMProvider] System Stress High (${amygdala.currentState}). Proceeding with caution.`
      );
    }

    for (const p of tryOrder) {
      if (!this.providers[p]) continue;
      try {
        if (sessionId) {
          bus.publish('precog', 'precog:telemetry', {
            type: 'provider_status',
            sessionId,
            provider: p,
            status: 'processing',
          });
        }

        const startTime = Date.now();
        const fn = (
          fns as Record<
            string,
            | (() => Promise<{
                content: string;
                confidence: number;
                usage: { input: number; output: number };
              }>)
            | undefined
          >
        )[p];
        if (!fn) continue;
        const result = await fn();
        const latency = Date.now() - startTime;
        const success = !!(
          result.content &&
          result.content.length > 10 &&
          !result.content.includes('error')
        ); // Basic success detection

        // Update Metrics & Telemetry
        updateMetrics(p, latency, success);

        if (sessionId) {
          bus.publish('precog', 'precog:telemetry', {
            type: 'provider_latency',
            sessionId,
            provider: p,
            latency,
            status: success ? 'success' : 'error',
            usage: result.usage,
          });
        }

        // Record the interaction for learning
        this.learning.recordInteraction(prompt, detectedDomain, p, success, latency);

        return { ...result, provider: p, domain: detectedDomain, latency };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn(`[LLMProvider] Provider ${p} failed: ${errorMessage}. Falling back...`);

        // Update Metrics (Failure)
        updateMetrics(p, 0, false);

        // Amygdala Feedback Loop
        if (
          errorMessage.includes('503') ||
          errorMessage.includes('429') ||
          errorMessage.includes('Overloaded')
        ) {
          amygdala.spikeCortisol(0.2); // Significant stress from API failure
        } else {
          amygdala.spikeCortisol(0.05); // Minor stress from other errors
        }

        lastError = err;
        // Continue to next provider
      }
    }

    return {
      content: `All providers failed. ${lastError ? 'Last error: ' + ((lastError as any).message || lastError) : ''}`,
      provider: 'failed',
      confidence: 0.0,
    };
  }

  async callDeepSeek(prompt: string, system?: string) {
    const apiKey = env('DEEPSEEK_API_KEY') as string;
    const model = this.defaultModel.deepseek;
    if (!apiKey) throw new Error('DeepSeek not configured');

    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await safeJson(res as unknown as Response);
      throw new Error(`DeepSeek error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content || '';
    const usage = {
      input: data?.usage?.prompt_tokens || 0,
      output: data?.usage?.completion_tokens || 0,
    };
    return { content: text, confidence: 0.85, usage };
  }

  async callClaude(prompt: string, system?: string) {
    const apiKey = env('ANTHROPIC_API_KEY') as string;
    const model = this.defaultModel.anthropic;
    if (!apiKey) throw new Error('Anthropic not configured');

    // Build messages array with proper system/user roles
    const messages = [{ role: 'user', content: prompt }];

    // Construct request with system parameter (Claude expects it separately, not in messages)
    const requestBody: any = {
      model,
      max_tokens: 1024,
      messages,
    };

    // Add system prompt if provided (Claude API accepts system as top-level parameter)
    if (system) {
      requestBody.system = system;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await safeJson(res as unknown as Response);
      throw new Error(`Claude error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text || data?.content?.[0]?.content?.[0]?.text || '';
    const usage = {
      input: data?.usage?.input_tokens || 0,
      output: data?.usage?.output_tokens || 0,
    };
    return { content: text, confidence: 0.9, usage };
  }

  async callOpenAI(prompt: string, system?: string) {
    const apiKey = env('OPENAI_API_KEY') as string;
    const model = this.defaultModel.openai;
    if (!apiKey) throw new Error('OpenAI not configured');

    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await safeJson(res as unknown as Response);
      throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content || '';
    const usage = {
      input: data?.usage?.prompt_tokens || 0,
      output: data?.usage?.completion_tokens || 0,
    };
    return { content: text, confidence: 0.88, usage };
  }

  async callGemini(prompt: string, system?: string, modelTier?: string) {
    const apiKey = env('GEMINI_API_KEY') as string;
    let model = this.defaultModel.gemini;

    if (modelTier === 'flash') {
      model = 'gemini-2.0-flash-exp';
    }

    if (!apiKey) throw new Error('Gemini not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    if (system) {
      body.systemInstruction = {
        parts: [{ text: system }],
      };
    }

    // Notify UI of deep thinking
    bus.publish('system', 'synapsys:event', {
      type: 'thought',
      payload: {
        text: `Consulting Gemini 3 Pro (${model})... This may take a moment.`,
      },
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minutes for deep reasoning

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await safeJson(res as unknown as Response);
        throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
      }
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = {
        input: data?.usageMetadata?.promptTokenCount || 0,
        output: data?.usageMetadata?.candidatesTokenCount || 0,
      };
      return { content: text, confidence: 0.75, usage };
    } finally {
      clearTimeout(timeout);
    }
  }

  // OSS Provider implementations

  async callLocalAI(prompt: string, system?: string) {
    const baseUrl = this.baseUrls.localai;
    const model = this.defaultModel.localai;

    if (!this.providers.localai) {
      throw new Error('LocalAI not enabled. Set ENABLE_LOCALAI=true in .env');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer not-needed', // LocalAI doesn't require real auth
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        throw new Error(`LocalAI error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      const text = data?.choices?.[0]?.message?.content || '';
      return { content: text, confidence: 0.75 };
    } catch (error: any) {
      throw new Error(
        `LocalAI connection failed: ${error.message}. Ensure LocalAI is running on ${baseUrl}`
      );
    }
  }

  async callOpenInterpreter(prompt: string, system?: string) {
    const baseUrl = this.baseUrls.openinterpreter;
    const model = this.defaultModel.openinterpreter;

    if (!this.providers.openinterpreter) {
      throw new Error('Open Interpreter not enabled. Set ENABLE_OPEN_INTERPRETER=true in .env');
    }

    try {
      // Open Interpreter specific API for code execution + chat
      const res = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${system ? system + '\n\n' : ''}${prompt}`,
          model: model,
          auto_run: false, // Safety: don't auto-execute code
          display: false, // Return structured response
        }),
      });

      if (!res.ok) {
        throw new Error(`Open Interpreter error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      // Open Interpreter returns array of message chunks
      const text = Array.isArray(data)
        ? data.map((chunk: any) => chunk.content || chunk.message || '').join('')
        : data.content || data.message || '';

      return {
        content: text,
        confidence: 0.85, // High for code tasks
        canExecuteCode: true, // Special capability
      };
    } catch (error: any) {
      throw new Error(
        `Open Interpreter connection failed: ${error.message}. Ensure OI server is running on ${baseUrl}`
      );
    }
  }

  async callHuggingFace(prompt: string, system: string) {
    const apiKey = env('HF_API_KEY');
    const model = this.defaultModel['huggingface'];
    const baseUrl = this.baseUrls.huggingface;

    if (!apiKey) {
      throw new Error('HuggingFace API key not configured. Set HF_API_KEY in .env');
    }

    try {
      // Use inference API for text generation
      const fullPrompt = system
        ? `${system}\n\nUser: ${prompt}\nAssistant:`
        : `User: ${prompt}\nAssistant:`;

      const res = await fetch(`${baseUrl}/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      const text = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';

      return {
        content: text.replace(/^User:.*?Assistant:\s*/s, '').trim(),
        confidence: 0.65, // Free tier, variable quality
        costUSD: 0, // Free tier
      };
    } catch (error) {
      throw new Error(`HuggingFace API failed: ${(error as any).message}`);
    }
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}
const providerBuilders = {
  deepseek: () => {
    const key = (process.env['DEEPSEEK_API_KEY'] || '').trim();
    const model = env('DEEPSEEK_MODEL', 'deepseek-chat');
    return {
      name: 'deepseek',
      url: 'https://api.deepseek.com/v1/chat/completions',
      key,
      header: 'Authorization',
      model,
      requiresKey: true,
      format: (prompt: string) => ({
        messages: [{ role: 'user', content: prompt }],
        model,
        max_tokens: 512,
      }),
    };
  },
  gemini: () => {
    const rawKey = (process.env['GEMINI_API_KEY'] || '').trim();
    const key = rawKey.startsWith('sk-') ? rawKey.slice(3) : rawKey;
    const model = env('GEMINI_MODEL', 'gemini-3-pro-preview');
    return {
      name: 'gemini',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      key,
      header: 'x-goog-api-key',
      model,
      requiresKey: true,
      appendKeyAsQuery: true,
      format: (prompt: string) => ({ contents: [{ parts: [{ text: prompt }] }] }),
    };
  },
  claude: () => {
    const key = (process.env['ANTHROPIC_API_KEY'] || '').trim();
    const model = env('ANTHROPIC_MODEL', 'claude-3-5-haiku-20241022');
    return {
      name: 'claude',
      url: 'https://api.anthropic.com/v1/messages',
      key,
      header: 'x-api-key',
      model,
      requiresKey: true,
      format: (prompt: string) => ({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      }),
    };
  },
  openai: () => {
    const key = (process.env['OPENAI_API_KEY'] || '').trim();
    const model = env('OPENAI_MODEL', 'gpt-4o-mini');
    return {
      name: 'openai',
      url: 'https://api.openai.com/v1/chat/completions',
      key,
      header: 'Authorization',
      model,
      requiresKey: true,
      format: (prompt: string) => ({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      }),
    };
  },
  huggingface: () => {
    const key = (process.env['HF_API_KEY'] || '').trim();
    const model = env('HF_MODEL', 'microsoft/DialoGPT-large');
    return {
      name: 'huggingface',
      url: 'https://api-inference.huggingface.co/models/gpt2',
      key,
      header: 'Authorization',
      model,
      requiresKey: true,
      format: (prompt: string) => ({ inputs: prompt }),
    };
  },
  localai: () => {
    const baseUrl = process.env['LOCALAI_BASE_URL'] || 'http://localhost:8080';
    const model = env('LOCALAI_MODEL', 'gpt-4');
    return {
      name: 'localai',
      url: `${baseUrl}/v1/chat/completions`,
      key: 'not-needed',
      header: 'Authorization',
      model,
      requiresKey: false,
      format: (prompt: string) => ({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      }),
    };
  },
  openinterpreter: () => {
    const baseUrl = process.env['OI_BASE_URL'] || 'http://localhost:8000';
    const model = env('OI_MODEL', 'gpt-3.5-turbo');
    return {
      name: 'openinterpreter',
      url: `${baseUrl}/chat`,
      key: 'not-needed',
      header: 'Authorization',
      model,
      requiresKey: false,
      format: (prompt: string) => ({
        message: prompt,
        model,
        auto_run: false,
        display: false,
      }),
    };
  },
  anthropic: () => {
    const base = providerBuilders.claude();
    return { ...base, name: 'anthropic' };
  },
};

function getProviderConfig(name: string) {
  const builder = (providerBuilders as any)[name];
  if (!builder) {
    return null;
  }
  const config = builder();
  if (!config) {
    return null;
  }
  if (typeof config.key === 'string') {
    config.key = config.key.trim();
  }
  if (config.requiresKey === undefined) {
    config.requiresKey = true;
  }
  return config;
}

function hasProviderCredentials(config: any) {
  if (!config) {
    return false;
  }
  if (config.requiresKey === false) {
    return true;
  }
  return !!config.key;
}

export async function generateLLM({
  prompt,
  provider,
  system,
  history = [],
  maxTokens,
  sessionId,
}: {
  prompt: string;
  provider: string;
  system?: string;
  history?: any[];
  maxTokens?: number;
  sessionId?: string;
}) {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error('Provider not supported');
  }
  if (config.requiresKey !== false && !config.key) {
    throw new Error('Provider or API key missing');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.header && config.key) {
    headers[config.header] =
      config.header === 'Authorization' ? `Bearer ${config.key}` : config.key;
  }

  if (provider === 'openai') {
    if (process.env['OPENAI_ORG']) headers['OpenAI-Organization'] = process.env['OPENAI_ORG'];
    if (process.env['OPENAI_PROJECT']) headers['OpenAI-Project'] = process.env['OPENAI_PROJECT'];
  }
  if (provider === 'claude' || provider === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01';
  }

  let requestUrl = config.url;
  if (config.appendKeyAsQuery && config.key) {
    const separator = requestUrl.includes('?') ? '&' : '?';
    requestUrl = `${requestUrl}${separator}key=${encodeURIComponent(config.key)}`;
  }

  const bodyObj = config.format(prompt);

  // Handle History & System Prompt
  if (['deepseek', 'openai', 'localai'].includes(provider)) {
    // OpenAI-compatible format
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });

    // Add history
    if (Array.isArray(history)) {
      messages.push(...history);
    }

    // Add current prompt (if not already in history, though usually it's passed separately)
    // The caller should ensure prompt is not duplicated if it's already in history
    // But typically prompt is the *new* message.
    messages.push({ role: 'user', content: prompt });

    bodyObj.messages = messages;
  } else if (provider === 'claude' || provider === 'anthropic') {
    // Anthropic format
    if (system) bodyObj.system = system;

    const messages = [];
    if (Array.isArray(history)) {
      // Map history to Anthropic format if needed (usually same role/content structure)
      messages.push(
        ...history.map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content,
        }))
      );
    }
    messages.push({ role: 'user', content: prompt });
    bodyObj.messages = messages;
  } else if (provider === 'gemini') {
    // Gemini format
    if (system) bodyObj.systemInstruction = { parts: [{ text: system }] };

    const contents = [];
    if (Array.isArray(history)) {
      contents.push(
        ...history.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }))
      );
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    bodyObj.contents = contents;
  }

  if (maxTokens && maxTokens > 0) {
    if (provider === 'gemini') {
      bodyObj.generationConfig = { maxOutputTokens: maxTokens };
    } else {
      bodyObj.max_tokens = maxTokens;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

  try {
    const res = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data: any = await res.json();
    if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (provider === 'deepseek') return data.choices?.[0]?.message?.content || '';
    if (provider === 'claude' || provider === 'anthropic') return data.content?.[0]?.text || '';
    if (provider === 'openai') return data.choices?.[0]?.message?.content || '';
    if (provider === 'huggingface') return data[0]?.generated_text || '';

    if (provider === 'localai') return data.choices?.[0]?.message?.content || '';
    if (provider === 'openinterpreter') {
      return Array.isArray(data)
        ? data
            .map(
              (chunk: Record<string, unknown>) =>
                (chunk['content'] as string) || (chunk['message'] as string) || ''
            )
            .join('')
        : data['content'] || data['message'] || '';
    }

    return '';
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function providerEnabled(name: string) {
  const upper = name.toUpperCase();
  const envKey = `${upper}_ENABLED`;

  // Check for explicit ENABLED flag first (all providers)
  const enabledFlag = process.env[envKey];
  if (enabledFlag !== undefined && enabledFlag !== null) {
    return String(enabledFlag).toLowerCase() === 'true';
  }

  // Alternative flag names for specific providers
  if (name === 'anthropic' || name === 'claude') {
    const alt = process.env['CLAUDE_ENABLED'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  if (name === 'gemini') {
    const alt = process.env['GEMINI_ENABLED'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  if (name === 'openai' || name === 'gpt') {
    const alt = process.env['OPENAI_ENABLED'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  if (name === 'deepseek') {
    const alt = process.env['DEEPSEEK_ENABLED'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  if (name === 'localai') {
    const alt = process.env['ENABLE_LOCALAI'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  if (name === 'openinterpreter') {
    const alt = process.env['ENABLE_OPEN_INTERPRETER'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  if (name === 'huggingface') {
    const alt = process.env['ENABLE_HUGGINGFACE'];
    if (alt !== undefined) return String(alt).toLowerCase() === 'true';
  }

  // Default: enabled if we have credentials
  return true;
}

function providerAvailable(name: string) {
  const config = getProviderConfig(name);
  if (!config) {
    return false;
  }
  if (!providerEnabled(name)) {
    return false;
  }
  return hasProviderCredentials(config);
}

function detectTaskType(prompt: string = '') {
  const p = prompt.toLowerCase();
  const creativeHints = [
    'story',
    'poem',
    'lyrics',
    'narrative',
    'creative',
    'write a',
    'script',
    'fiction',
    'metaphor',
    'haiku',
    'limerick',
  ];
  const reasoningHints = [
    'explain why',
    'analyze',
    'analysis',
    'evaluate',
    'compare',
    'trade-off',
    'reason',
    'step by step',
    'proof',
    'derive',
  ];
  const creativeMatches = creativeHints.filter((k) => p.includes(k)).length;
  const reasoningMatches = reasoningHints.filter((k) => p.includes(k)).length;
  if (creativeMatches > reasoningMatches && creativeMatches > 0)
    return { type: 'creative', matches: creativeMatches };
  if (reasoningMatches > 0) return { type: 'reasoning', matches: reasoningMatches };
  return { type: 'general', matches: 0 };
}

function computeConfidencePercent({
  detectedType,
  providerUsed,
  order,
  matches,
}: {
  detectedType: string;
  providerUsed: string;
  order: string[];
  matches: number;
}) {
  // Simple heuristic: first choice with matches -> 90, second -> 75, others -> 60; general -> 70; explicit -> 100 (handled elsewhere)
  if (detectedType === 'general') return 70;
  const idx = order.indexOf(providerUsed);
  if (matches > 0 && idx === 0) return 90;
  if (idx === 1) return 75;
  return 60;
}

export async function generateSmartLLM({
  prompt,
  system,
  history = [],
  taskType,
  criticality = 'normal',
  maxTokens,
}: {
  prompt: string;
  system?: string;
  history?: any[];
  taskType?: string;
  criticality?: string;
  maxTokens?: number;
}) {
  // Amygdala Integration: Check stress levels
  if (
    amygdala.currentState === AmygdalaState.CRITICAL ||
    amygdala.currentState === AmygdalaState.PANIC
  ) {
    console.warn(
      `[LLMProvider] Amygdala High Stress (${amygdala.currentState}). Downgrading criticality to 'low'.`
    );
    criticality = 'low'; // Force cheaper/faster models to reduce load/cost
  }

  const det = taskType ? { type: taskType, matches: 0 } : detectTaskType(prompt);
  const detected = det.type;

  console.log(
    `[LLMProvider] Generating with prompt: "${prompt.substring(0, 50)}..." (Task: ${taskType}, Criticality: ${criticality})`
  );

  // Criticality-based provider ordering (including OSS)
  const criticalityRouting = {
    low: {
      creative: ['gemini', 'huggingface', 'localai', 'deepseek', 'openai', 'claude'],
      reasoning: ['gemini', 'huggingface', 'deepseek', 'claude', 'openai'],
      general: ['gemini', 'huggingface', 'localai', 'deepseek', 'openai', 'claude'],
    },
    normal: {
      creative: ['gemini', 'deepseek', 'huggingface', 'claude', 'openai'],
      reasoning: ['gemini', 'deepseek', 'claude', 'openai', 'huggingface'],
      general: ['gemini', 'deepseek', 'openai', 'claude', 'huggingface', 'localai'],
    },
    high: {
      creative: ['gemini', 'claude', 'openai', 'deepseek'],
      reasoning: ['gemini', 'claude', 'openai', 'deepseek'],
      general: ['gemini', 'openai', 'claude', 'deepseek'],
    },
    critical: {
      creative: ['gemini', 'openai', 'claude', 'deepseek'],
      reasoning: ['gemini', 'claude', 'openai', 'deepseek'],
      general: ['gemini', 'openai', 'claude', 'deepseek'],
    },
  };

  const routing = (criticalityRouting as any)[criticality] || criticalityRouting.normal;
  const order = (routing as any)[detected] || routing.general;

  const tried = [];
  for (const name of order) {
    if (!providerAvailable(name)) {
      tried.push({ name, available: false });
      continue;
    }
    console.log(`[LLMProvider] Trying provider: ${name}`);
    try {
      const text = await generateLLM({
        prompt,
        provider: name,
        system,
        history,
        maxTokens,
      });
      if (text && String(text).trim()) {
        const percent = computeConfidencePercent({
          detectedType: detected,
          providerUsed: name,
          order,
          matches: det.matches,
        });
        return {
          text,
          providerUsed: name,
          taskTypeDetected: detected,
          providerBadge: { provider: name, percent },
          criticalityLevel: criticality,
        };
      }
      tried.push({ name, available: true, empty: true });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[LLMProvider] ${name} failed:`, errorMessage);

      // Amygdala Feedback: Report pain/stress
      if (
        errorMessage.includes('503') ||
        errorMessage.includes('429') ||
        errorMessage.includes('overloaded')
      ) {
        amygdala.spikeCortisol(0.2); // Significant stress for overload
      } else {
        amygdala.spikeCortisol(0.05); // Minor stress for other errors
      }

      tried.push({ name, available: true, error: errorMessage?.slice(0, 200) });
    }
  }
  const err = new Error('All providers failed') as Error & {
    details: unknown[];
  };
  err.details = tried;
  throw err;
}

export function getProviderStatus() {
  return Object.fromEntries(
    Object.keys(providerBuilders).map((name) => {
      const config = getProviderConfig(name);
      const hasCredentials = hasProviderCredentials(config);
      return [
        name,
        {
          available: hasCredentials,
          enabled: providerEnabled(name),
          model: config?.model || null,
        },
      ];
    })
  );
}
