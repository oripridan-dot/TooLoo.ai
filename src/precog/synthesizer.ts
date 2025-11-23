// @version 2.1.24
import { generateLLM } from "./providers/llm-provider.js";
import { TOOLOO_PERSONA } from "../cortex/persona.js";

export class Synthesizer {
  
  async synthesize(prompt: string) {
    console.log("[Synthesizer] Starting multi-provider synthesis...");

    const providers = ["gemini", "anthropic", "openai"];
    
    // 1. Parallel Execution
    const promises = providers.map(async (provider) => {
      try {
        const response = await generateLLM({
          prompt,
          provider,
          system: TOOLOO_PERSONA,
          maxTokens: 1024
        });
        return { provider, response, success: true };
      } catch (error: any) {
        console.warn(`[Synthesizer] ${provider} failed: ${error.message}`);
        return { provider, error: error.message, success: false };
      }
    });

    const rawResults = await Promise.all(promises);
    const successful = rawResults.filter(r => r.success);

    if (successful.length === 0) {
      throw new Error("All providers failed to generate a response.");
    }

    // 2. Aggregation / Synthesis
    // We use the "best" provider (Gemini usually) to synthesize the results
    const synthesisPrompt = `
You are the Chief Synthesizer for TooLoo.ai.
You have received responses from multiple AI models to the user's query: "${prompt}".

Here are the responses:
${successful.map(r => `--- PROVIDER: ${r.provider.toUpperCase()} ---\n${r.response}\n`).join("\n")}

Your task:
1. Analyze the responses for consensus and unique insights.
2. Synthesize a single, superior response that combines the best parts of all answers.
3. Resolve any contradictions based on your knowledge.
4. Maintain the TooLoo.ai persona (helpful, concise, structured).

Return ONLY the synthesized response.
`;

    try {
      const finalResponse = await generateLLM({
        prompt: synthesisPrompt,
        provider: "gemini", // Use Gemini as the synthesizer
        system: TOOLOO_PERSONA,
        maxTokens: 2048
      });

      return {
        response: finalResponse,
        meta: {
          providers: successful.map(r => r.provider),
          count: successful.length
        }
      };
    } catch (error) {
      // Fallback: just return the first successful response
      return {
        response: successful[0].response,
        meta: {
          providers: [successful[0].provider],
          note: "Synthesis failed, returning single provider response."
        }
      };
    }
  }
}

export const synthesizer = new Synthesizer();
