// @version 2.1.47
/**
 * LLM Provider Orchestrator (Real Providers)
 * Uses available API keys to select the cheapest suitable provider.
 * Fallback chain: DeepSeek → Anthropic Claude → OpenAI → Google Gemini.
 * If no keys are available, returns a clear configuration message.
 */

import DomainExpertise from "../../nexus/engine/domain-expertise.js";
import ContinuousLearning from "../../nexus/engine/continuous-learning.js";
import fetch from "node-fetch";
import ensureEnvLoaded from "../../nexus/engine/env-loader.js";
import { amygdala, AmygdalaState } from "../../cortex/amygdala/index.js";
import { bus } from "../../core/event-bus.js";

ensureEnvLoaded();

const env = (name: string, def: unknown = undefined) => process.env[name] ?? def;

export default class LLMProvider {
  constructor() {
    Object.defineProperty(this, "providers", {
      get() {
        return {
          deepseek: providerAvailable("deepseek"),
          anthropic: providerAvailable("anthropic"),
          openai: providerAvailable("openai"),
          gemini: providerAvailable("gemini"),
          // ollama: providerAvailable("ollama"), // Dropped
          localai: providerAvailable("localai"),
          openinterpreter: providerAvailable("openinterpreter"),
          huggingface: providerAvailable("huggingface"),
        };
      },
    });

    Object.defineProperty(this, "defaultModel", {
      get() {
        return {
          deepseek: env("DEEPSEEK_MODEL", "deepseek-chat"),
          anthropic: env("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022"),
          openai: env("OPENAI_MODEL", "gpt-4o-mini"),
          gemini: env("GEMINI_MODEL", "gemini-3-pro-preview"), // Gemini 3 Pro
          // ollama: env("OLLAMA_MODEL", "llama3.2:latest"), // Dropped
          localai: env("LOCALAI_MODEL", "gpt-4"),
          openinterpreter: env("OI_MODEL", "ollama/llama3.2"),
          huggingface: env("HF_MODEL", "microsoft/DialoGPT-large"),
        };
      },
    });

    Object.defineProperty(this, "baseUrls", {
      get() {
        return {
          ollama: env("OLLAMA_BASE_URL", "http://localhost:11434"),
          localai: env("LOCALAI_BASE_URL", "http://localhost:8080"),
          openinterpreter: env("OI_BASE_URL", "http://localhost:8000"),
          huggingface: "https://api-inference.huggingface.co",
        };
      },
    });

    // Initialize domain expertise system
    this.domainExpertise = new DomainExpertise();

    // Initialize continuous learning system
    this.learning = new ContinuousLearning();
  }

  // Check if Ollama is running locally
  checkOllamaAvailable() {
    // In production, you'd want to ping the endpoint
    // For now, assume available if base URL is configured or default port might be open
    return !!env("OLLAMA_BASE_URL") || env("ENABLE_OLLAMA") === "true";
  }

  // Check if LocalAI is running
  checkLocalAIAvailable() {
    return !!env("LOCALAI_BASE_URL") || env("ENABLE_LOCALAI") === "true";
  }

  // Check if Open Interpreter server is available
  checkOpenInterpreterAvailable() {
    return !!env("OI_BASE_URL") || env("ENABLE_OPEN_INTERPRETER") === "true";
  }

  available() {
    return Object.values(this.providers).some(Boolean);
  }

  selectProvider(taskType = "chat") {
    // Default chat: Prefer Gemini 3 Pro, then others
    const order = [
      "gemini", // Gemini 3 Pro (Default)
      // "ollama", // Dropped
      "anthropic", // Premium reasoning (Claude)
      "openai", // Premium reliable
      "localai", // Free local OpenAI-compatible
      "huggingface", // Free tier (with limits)
      "openinterpreter", // Local with code execution
      "deepseek", // Fallback only
    ];

    // For code tasks, prefer local code-capable models
    if (taskType === "code" || taskType === "programming") {
      const codeOrder = [
        "gemini",
        "openinterpreter",
        "ollama",
        "deepseek",
        "openai",
        "anthropic",
      ];
      for (const p of codeOrder) {
        if (this.providers[p]) return p;
      }
    }

    // For reasoning tasks, prefer premium models
    if (taskType === "reasoning" || taskType === "analysis") {
      const reasoningOrder = [
        "gemini",
        "anthropic",
        "openai",
        "deepseek",
        "ollama",
      ];
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
  async generate(request) {
    return this.generateSmartLLM(request);
  }

  async generateSmartLLM(request) {
    const {
      prompt,
      system,
      taskType = "chat",
      context = {},
      modelTier,
    } = request || {};
    if (!prompt || typeof prompt !== "string") {
      return {
        content:
          "Missing prompt. Please provide a text prompt to generate a response.",
        provider: "validation",
        confidence: 0.0,
      };
    }

    // Detect domain expertise from the prompt
    const detectedDomain = this.domainExpertise.detectDomain(prompt, context);

    // Get domain-specific system prompt if available
    let enhancedSystem = system;
    if (detectedDomain !== "general") {
      const domainPrompt = this.domainExpertise.getDomainPrompt(detectedDomain);
      if (domainPrompt) {
        enhancedSystem = domainPrompt + (system ? "\n\n" + system : "");
      }
    }

    // Select provider considering domain expertise and learning data
    const availableProviders = Object.keys(this.providers).filter(
      (p) => this.providers[p],
    );
    let provider;

    if (detectedDomain !== "general") {
      // First try learning-based recommendation for this domain
      provider = this.learning.getBestProviderForDomain(
        detectedDomain,
        availableProviders,
      );

      // Fallback to domain expertise preferences
      if (!provider) {
        provider = this.domainExpertise.selectProviderForDomain(
          detectedDomain,
          taskType,
          availableProviders,
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
          "No AI provider configured. Add API keys or enable local providers in .env:\n" +
          "PAID: DEEPSEEK_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY\n" +
          "FREE: ENABLE_OLLAMA=true, ENABLE_LOCALAI=true, HF_API_KEY (free tier)",
        provider: "unconfigured",
        confidence: 0.0,
      };
    }

    const fns = {
      deepseek: () =>
        this.callDeepSeek(prompt, enhancedSystem, taskType, context),
      anthropic: () =>
        this.callClaude(prompt, enhancedSystem, taskType, context),
      openai: () => this.callOpenAI(prompt, enhancedSystem, taskType, context),
      gemini: () =>
        this.callGemini(prompt, enhancedSystem, taskType, context, modelTier),

      // OSS providers
      ollama: () => this.callOllama(prompt, enhancedSystem, taskType, context),
      localai: () =>
        this.callLocalAI(prompt, enhancedSystem, taskType, context),
      openinterpreter: () =>
        this.callOpenInterpreter(prompt, enhancedSystem, taskType, context),
      huggingface: () =>
        this.callHuggingFace(prompt, enhancedSystem, taskType, context),
    };

    // Default chat fallback: Gemini first
    const order = [
      "gemini",
      "ollama",
      "anthropic",
      "openai",
      "localai",
      "huggingface",
      "openinterpreter",
      "deepseek",
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
        `[LLMProvider] System Stress High (${amygdala.currentState}). Proceeding with caution.`,
      );
    }

    for (const p of tryOrder) {
      if (!this.providers[p]) continue;
      try {
        const result = await fns[p]();
        const latency = Date.now() - startTime;
        const success =
          result.content &&
          result.content.length > 10 &&
          !result.content.includes("error"); // Basic success detection

        // Record the interaction for learning
        this.learning.recordInteraction(
          prompt,
          detectedDomain,
          p,
          success,
          latency,
        );

        return { ...result, provider: p, domain: detectedDomain, latency };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn(
          `[LLMProvider] Provider ${p} failed: ${errorMessage}. Falling back...`,
        );

        // Amygdala Feedback Loop
        if (
          errorMessage.includes("503") ||
          errorMessage.includes("429") ||
          errorMessage.includes("Overloaded")
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
      content: `All providers failed. ${lastError ? "Last error: " + (lastError.message || lastError) : ""}`,
      provider: "failed",
      confidence: 0.0,
    };
  }

  async callDeepSeek(prompt, system) {
    const apiKey = env("DEEPSEEK_API_KEY");
    const model = this.defaultModel.deepseek;
    if (!apiKey) throw new Error("DeepSeek not configured");

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`DeepSeek error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { content: text, confidence: 0.85 };
  }

  async callClaude(prompt, system) {
    const apiKey = env("ANTHROPIC_API_KEY");
    const model = this.defaultModel.anthropic;
    if (!apiKey) throw new Error("Anthropic not configured");

    // Build messages array with proper system/user roles
    const messages = [{ role: "user", content: prompt }];

    // Construct request with system parameter (Claude expects it separately, not in messages)
    const requestBody = {
      model,
      max_tokens: 1024,
      messages,
    };

    // Add system prompt if provided (Claude API accepts system as top-level parameter)
    if (system) {
      requestBody.system = system;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`Claude error ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const text =
      data?.content?.[0]?.text || data?.content?.[0]?.content?.[0]?.text || "";
    return { content: text, confidence: 0.9 };
  }

  async callOpenAI(prompt, system) {
    const apiKey = env("OPENAI_API_KEY");
    const model = this.defaultModel.openai;
    if (!apiKey) throw new Error("OpenAI not configured");

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { content: text, confidence: 0.88 };
  }

  async callGemini(prompt, system, taskType, context, modelTier) {
    const apiKey = env("GEMINI_API_KEY");
    let model = this.defaultModel.gemini;

    if (modelTier === "flash") {
      model = "gemini-2.0-flash-exp";
    }

    if (!apiKey) throw new Error("Gemini not configured");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [
        {
          role: "user",
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
    bus.publish("synapsys", "synapsys:event", {
      type: "thought",
      payload: {
        text: `Consulting Gemini 3 Pro (${model})... This may take a moment.`,
      },
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minutes for deep reasoning

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { content: text, confidence: 0.75 };
    } finally {
      clearTimeout(timeout);
    }
  }

  // OSS Provider implementations
  async callOllama(prompt, system) {
    const baseUrl = this.baseUrls.ollama;
    const model = this.defaultModel.ollama;

    if (!this.providers.ollama) {
      throw new Error("Ollama not enabled. Set ENABLE_OLLAMA=true in .env");
    }

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const text = data?.message?.content || "";
      return { content: text, confidence: 0.8 }; // Local models often good quality
    } catch (error) {
      throw new Error(
        `Ollama connection failed: ${error.message}. Ensure Ollama is running on ${baseUrl}`,
      );
    }
  }

  async callLocalAI(prompt, system) {
    const baseUrl = this.baseUrls.localai;
    const model = this.defaultModel.localai;

    if (!this.providers.localai) {
      throw new Error("LocalAI not enabled. Set ENABLE_LOCALAI=true in .env");
    }

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer not-needed", // LocalAI doesn't require real auth
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

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";
      return { content: text, confidence: 0.75 };
    } catch (error) {
      throw new Error(
        `LocalAI connection failed: ${error.message}. Ensure LocalAI is running on ${baseUrl}`,
      );
    }
  }

  async callOpenInterpreter(prompt, system) {
    const baseUrl = this.baseUrls.openinterpreter;
    const model = this.defaultModel.openinterpreter;

    if (!this.providers.openinterpreter) {
      throw new Error(
        "Open Interpreter not enabled. Set ENABLE_OPEN_INTERPRETER=true in .env",
      );
    }

    try {
      // Open Interpreter specific API for code execution + chat
      const res = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${system ? system + "\n\n" : ""}${prompt}`,
          model: model,
          auto_run: false, // Safety: don't auto-execute code
          display: false, // Return structured response
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Open Interpreter error ${res.status}: ${await res.text()}`,
        );
      }

      const data = await res.json();
      // Open Interpreter returns array of message chunks
      const text = Array.isArray(data)
        ? data.map((chunk) => chunk.content || chunk.message || "").join("")
        : data.content || data.message || "";

      return {
        content: text,
        confidence: 0.85, // High for code tasks
        canExecuteCode: true, // Special capability
      };
    } catch (error) {
      throw new Error(
        `Open Interpreter connection failed: ${error.message}. Ensure OI server is running on ${baseUrl}`,
      );
    }
  }

  async callHuggingFace(prompt, system) {
    const apiKey = env("HF_API_KEY");
    const model = this.defaultModel.huggingface;
    const baseUrl = this.baseUrls.huggingface;

    if (!apiKey) {
      throw new Error(
        "HuggingFace API key not configured. Set HF_API_KEY in .env",
      );
    }

    try {
      // Use inference API for text generation
      const fullPrompt = system
        ? `${system}\n\nUser: ${prompt}\nAssistant:`
        : `User: ${prompt}\nAssistant:`;

      const res = await fetch(`${baseUrl}/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
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

      const data = await res.json();
      const text = Array.isArray(data)
        ? data[0]?.generated_text || ""
        : data.generated_text || "";

      return {
        content: text.replace(/^User:.*?Assistant:\s*/s, "").trim(),
        confidence: 0.65, // Free tier, variable quality
        costUSD: 0, // Free tier
      };
    } catch (error) {
      throw new Error(`HuggingFace API failed: ${error.message}`);
    }
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}
const providerBuilders = {
  deepseek: () => {
    const key = (process.env.DEEPSEEK_API_KEY || "").trim();
    const model = env("DEEPSEEK_MODEL", "deepseek-chat");
    return {
      name: "deepseek",
      url: "https://api.deepseek.com/v1/chat/completions",
      key,
      header: "Authorization",
      model,
      requiresKey: true,
      format: (prompt) => ({
        messages: [{ role: "user", content: prompt }],
        model,
        max_tokens: 512,
      }),
    };
  },
  gemini: () => {
    const rawKey = (process.env.GEMINI_API_KEY || "").trim();
    const key = rawKey.startsWith("sk-") ? rawKey.slice(3) : rawKey;
    const model = env("GEMINI_MODEL", "gemini-3-pro-preview");
    return {
      name: "gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      key,
      header: "x-goog-api-key",
      model,
      requiresKey: true,
      appendKeyAsQuery: true,
      format: (prompt) => ({ contents: [{ parts: [{ text: prompt }] }] }),
    };
  },
  claude: () => {
    const key = (process.env.ANTHROPIC_API_KEY || "").trim();
    const model = env("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022");
    return {
      name: "claude",
      url: "https://api.anthropic.com/v1/messages",
      key,
      header: "x-api-key",
      model,
      requiresKey: true,
      format: (prompt) => ({
        model,
        max_tokens: 512,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    };
  },
  openai: () => {
    const key = (process.env.OPENAI_API_KEY || "").trim();
    const model = env("OPENAI_MODEL", "gpt-4o-mini");
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key,
      header: "Authorization",
      model,
      requiresKey: true,
      format: (prompt) => ({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
      }),
    };
  },
  huggingface: () => {
    const key = (process.env.HF_API_KEY || "").trim();
    const model = env("HF_MODEL", "microsoft/DialoGPT-large");
    return {
      name: "huggingface",
      url: "https://api-inference.huggingface.co/models/gpt2",
      key,
      header: "Authorization",
      model,
      requiresKey: true,
      format: (prompt) => ({ inputs: prompt }),
    };
  },
  ollama: () => {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = env("OLLAMA_MODEL", "llama3.2:latest");
    return {
      name: "ollama",
      url: `${baseUrl}/api/chat`,
      key: "not-needed",
      header: "Authorization",
      model,
      requiresKey: false,
      format: (prompt) => ({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    };
  },
  localai: () => {
    const baseUrl = process.env.LOCALAI_BASE_URL || "http://localhost:8080";
    const model = env("LOCALAI_MODEL", "gpt-4");
    return {
      name: "localai",
      url: `${baseUrl}/v1/chat/completions`,
      key: "not-needed",
      header: "Authorization",
      model,
      requiresKey: false,
      format: (prompt) => ({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
      }),
    };
  },
  openinterpreter: () => {
    const baseUrl = process.env.OI_BASE_URL || "http://localhost:8000";
    const model = env("OI_MODEL", "ollama/llama3.2");
    return {
      name: "openinterpreter",
      url: `${baseUrl}/chat`,
      key: "not-needed",
      header: "Authorization",
      model,
      requiresKey: false,
      format: (prompt) => ({
        message: prompt,
        model,
        auto_run: false,
        display: false,
      }),
    };
  },
};

providerBuilders.anthropic = () => {
  const base = providerBuilders.claude();
  return { ...base, name: "anthropic" };
};

function getProviderConfig(name) {
  const builder = providerBuilders[name];
  if (!builder) {
    return null;
  }
  const config = builder();
  if (!config) {
    return null;
  }
  if (typeof config.key === "string") {
    config.key = config.key.trim();
  }
  if (config.requiresKey === undefined) {
    config.requiresKey = true;
  }
  return config;
}

function hasProviderCredentials(config) {
  if (!config) {
    return false;
  }
  if (config.requiresKey === false) {
    return true;
  }
  return !!config.key;
}

export async function generateLLM({ prompt, provider, system, maxTokens }) {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error("Provider not supported");
  }
  if (config.requiresKey !== false && !config.key) {
    throw new Error("Provider or API key missing");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.header && config.key) {
    headers[config.header] =
      config.header === "Authorization" ? `Bearer ${config.key}` : config.key;
  }

  if (provider === "openai") {
    if (process.env.OPENAI_ORG)
      headers["OpenAI-Organization"] = process.env.OPENAI_ORG;
    if (process.env.OPENAI_PROJECT)
      headers["OpenAI-Project"] = process.env.OPENAI_PROJECT;
  }
  if (provider === "claude" || provider === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
  }

  let requestUrl = config.url;
  if (config.appendKeyAsQuery && config.key) {
    const separator = requestUrl.includes("?") ? "&" : "?";
    requestUrl = `${requestUrl}${separator}key=${encodeURIComponent(config.key)}`;
  }

  let bodyObj = config.format(prompt);

  if (system) {
    if (["deepseek", "openai", "ollama", "localai"].includes(provider)) {
      if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
        bodyObj.messages.unshift({ role: "system", content: system });
      }
    } else if (provider === "claude" || provider === "anthropic") {
      bodyObj.system = system;
    } else if (provider === "gemini") {
      bodyObj.systemInstruction = { parts: [{ text: system }] };
    }
  }

  if (maxTokens && maxTokens > 0) {
    if (provider === "gemini") {
      bodyObj.generationConfig = { maxOutputTokens: maxTokens };
    } else {
      bodyObj.max_tokens = maxTokens;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

  try {
    const res = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data: any = await res.json();
    if (provider === "gemini")
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (provider === "deepseek")
      return data.choices?.[0]?.message?.content || "";
    if (provider === "claude" || provider === "anthropic")
      return data.content?.[0]?.text || "";
    if (provider === "openai") return data.choices?.[0]?.message?.content || "";
    if (provider === "huggingface") return data[0]?.generated_text || "";
    if (provider === "ollama") return data.message?.content || "";
    if (provider === "localai")
      return data.choices?.[0]?.message?.content || "";
    if (provider === "openinterpreter") {
      return Array.isArray(data)
        ? data
            .map((chunk: Record<string, unknown>) => (chunk.content as string) || (chunk.message as string) || "")
            .join("")
        : data.content || data.message || "";
    }

    return "";
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function providerEnabled(name) {
  const upper = name.toUpperCase();
  const envKey = `${upper}_ENABLED`;

  // Check for explicit ENABLED flag first (all providers)
  const enabledFlag = process.env[envKey];
  if (enabledFlag !== undefined && enabledFlag !== null) {
    return String(enabledFlag).toLowerCase() === "true";
  }

  // Alternative flag names for specific providers
  if (name === "anthropic" || name === "claude") {
    const alt = process.env.CLAUDE_ENABLED;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "gemini") {
    const alt = process.env.GEMINI_ENABLED;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "openai" || name === "gpt") {
    const alt = process.env.OPENAI_ENABLED;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "deepseek") {
    const alt = process.env.DEEPSEEK_ENABLED;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "ollama") {
    const alt = process.env.ENABLE_OLLAMA;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "localai") {
    const alt = process.env.ENABLE_LOCALAI;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "openinterpreter") {
    const alt = process.env.ENABLE_OPEN_INTERPRETER;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  if (name === "huggingface") {
    const alt = process.env.ENABLE_HUGGINGFACE;
    if (alt !== undefined) return String(alt).toLowerCase() === "true";
  }

  // Default: enabled if we have credentials
  return true;
}

function providerAvailable(name) {
  const config = getProviderConfig(name);
  if (!config) {
    return false;
  }
  if (!providerEnabled(name)) {
    return false;
  }
  return hasProviderCredentials(config);
}

function detectTaskType(prompt = "") {
  const p = prompt.toLowerCase();
  const creativeHints = [
    "story",
    "poem",
    "lyrics",
    "narrative",
    "creative",
    "write a",
    "script",
    "fiction",
    "metaphor",
    "haiku",
    "limerick",
  ];
  const reasoningHints = [
    "explain why",
    "analyze",
    "analysis",
    "evaluate",
    "compare",
    "trade-off",
    "reason",
    "step by step",
    "proof",
    "derive",
  ];
  const creativeMatches = creativeHints.filter((k) => p.includes(k)).length;
  const reasoningMatches = reasoningHints.filter((k) => p.includes(k)).length;
  if (creativeMatches > reasoningMatches && creativeMatches > 0)
    return { type: "creative", matches: creativeMatches };
  if (reasoningMatches > 0)
    return { type: "reasoning", matches: reasoningMatches };
  return { type: "general", matches: 0 };
}

function computeConfidencePercent({
  detectedType,
  providerUsed,
  order,
  matches,
}) {
  // Simple heuristic: first choice with matches -> 90, second -> 75, others -> 60; general -> 70; explicit -> 100 (handled elsewhere)
  if (detectedType === "general") return 70;
  const idx = order.indexOf(providerUsed);
  if (matches > 0 && idx === 0) return 90;
  if (idx === 1) return 75;
  return 60;
}

export async function generateSmartLLM({
  prompt,
  system,
  taskType,
  criticality = "normal",
  maxTokens,
}) {
  // Amygdala Integration: Check stress levels
  if (
    amygdala.currentState === AmygdalaState.CRITICAL ||
    amygdala.currentState === AmygdalaState.PANIC
  ) {
    console.warn(
      `[LLMProvider] Amygdala High Stress (${amygdala.currentState}). Downgrading criticality to 'low'.`,
    );
    criticality = "low"; // Force cheaper/faster models to reduce load/cost
  }

  const det = taskType
    ? { type: taskType, matches: 0 }
    : detectTaskType(prompt);
  const detected = det.type;

  // Criticality-based provider ordering (including OSS)
  const criticalityRouting = {
    low: {
      creative: [
        "gemini",
        "ollama",
        "huggingface",
        "localai",
        "deepseek",
        "openai",
        "claude",
      ],
      reasoning: [
        "gemini",
        "ollama",
        "huggingface",
        "deepseek",
        "claude",
        "openai",
      ],
      general: [
        "gemini",
        "ollama",
        "huggingface",
        "localai",
        "deepseek",
        "openai",
        "claude",
      ],
    },
    normal: {
      creative: [
        "gemini",
        "deepseek",
        "ollama",
        "huggingface",
        "claude",
        "openai",
      ],
      reasoning: [
        "gemini",
        "deepseek",
        "claude",
        "ollama",
        "openai",
        "huggingface",
      ],
      general: [
        "gemini",
        "deepseek",
        "ollama",
        "openai",
        "claude",
        "huggingface",
        "localai",
      ],
    },
    high: {
      creative: ["gemini", "claude", "openai", "deepseek", "ollama"],
      reasoning: ["gemini", "claude", "openai", "deepseek", "ollama"],
      general: ["gemini", "openai", "claude", "deepseek", "ollama"],
    },
    critical: {
      creative: ["gemini", "openai", "claude", "deepseek"],
      reasoning: ["gemini", "claude", "openai", "deepseek"],
      general: ["gemini", "openai", "claude", "deepseek"],
    },
  };

  const routing = criticalityRouting[criticality] || criticalityRouting.normal;
  const order = routing[detected] || routing.general;

  const tried = [];
  for (const name of order) {
    if (!providerAvailable(name)) {
      tried.push({ name, available: false });
      continue;
    }
    try {
      const text = await generateLLM({
        prompt,
        provider: name,
        system,
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
        errorMessage.includes("503") ||
        e.message.includes("429") ||
        e.message.includes("overloaded")
      ) {
        amygdala.spikeCortisol(0.2); // Significant stress for overload
      } else {
        amygdala.spikeCortisol(0.05); // Minor stress for other errors
      }

      tried.push({ name, available: true, error: e.message?.slice(0, 200) });
    }
  }
  const err = new Error("All providers failed") as Error & { details: unknown[] };
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
    }),
  );
}
