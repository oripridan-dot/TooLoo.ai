// @version 2.1.265
import LLMProvider from "./providers/llm-provider.js";
import fetch from "node-fetch";

export class ProviderEngine {
  private llmProvider: LLMProvider;

  constructor() {
    this.llmProvider = new LLMProvider();
  }

  getProvider(name: string) {
    if (name === "openai") {
      return {
        embed: async (text: string) => {
          if (!process.env.OPENAI_API_KEY) {
            console.warn(
              "[ProviderEngine] OpenAI API key missing for embeddings",
            );
            return null;
          }
          try {
            const response = await fetch(
              "https://api.openai.com/v1/embeddings",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  input: text,
                  model: "text-embedding-3-small",
                }),
              },
            );

            if (!response.ok) {
              const err = await response.text();
              console.error(
                `[ProviderEngine] OpenAI Embedding Error: ${response.status} ${err}`,
              );
              return null;
            }

            const data: any = await response.json();
            if (data && data.data && data.data.length > 0) {
              return data.data[0].embedding;
            }
            return null;
          } catch (e) {
            console.error("[ProviderEngine] Embedding exception", e);
            return null;
          }
        },
      };
    }
    // Return a dummy for other providers if needed, or null
    return null;
  }

  async generate(params: {
    prompt: string;
    system?: string;
    taskType?: string;
  }) {
    // Adaptive Routing Logic
    const complexity = this.classifyComplexity(params.prompt, params.taskType);
    const modelTier = complexity === 'high' ? 'pro' : 'flash';
    
    console.log(`[ProviderEngine] Routing request (Complexity: ${complexity}) to ${modelTier} tier.`);

    // Use the class instance which has Amygdala integration and timeouts
    const result = await this.llmProvider.generate({
      prompt: params.prompt,
      system: params.system,
      taskType: params.taskType,
      maxTokens: 4096, // Increased default for thinking models
      modelTier // Pass tier to provider (needs implementation in LLMProvider)
    });

    return {
      content: result.content,
      provider: result.provider,
      model: result.provider, 
    };
  }

  private classifyComplexity(prompt: string, taskType?: string): 'low' | 'high' {
      if (taskType === 'code_generation' || taskType === 'architecting') return 'high';
      if (prompt.length > 1000) return 'high';
      if (prompt.includes('analyze') || prompt.includes('design')) return 'high';
      return 'low';
  }
}
