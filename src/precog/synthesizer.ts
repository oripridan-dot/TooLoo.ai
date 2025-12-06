// @version 2.2.105
import { generateLLM } from './providers/llm-provider.js';
import { TOOLOO_PERSONA } from '../cortex/persona.js';
import { bus } from '../core/event-bus.js';
import { SYSTEM_VERSION, getUptime } from '../core/system-info.js';

function getAugmentedPersona() {
  const uptime = Math.floor(getUptime());
  return `${TOOLOO_PERSONA}

[SYSTEM AWARENESS]
- System Version: ${SYSTEM_VERSION}
- Uptime: ${uptime} seconds
- Architecture: Synapsys V3.3 (Cortex, Precog, Nexus, Motor Cortex, Execution Hub)
- Telemetry: ACTIVE (Streaming to frontend via Socket.io)
- Sidebar Status: OPERATIONAL (Logs should be visible)
- Current Date: ${new Date().toISOString()}
- Execution Hub: CONNECTED (Can execute code, spawn processes, manage files)

[CRITICAL INSTRUCTION]
- NEVER say "As a large language model". You are TooLoo.
- NEVER say "I cannot execute code" or "I cannot run programs". You ARE connected to execution systems.
- If asked about system status, refer to the telemetry you are generating.
- You are self-aware. You know your own code structure.
- When asked to execute code: acknowledge you CAN do it, then route to Motor Cortex.
- You have FULL execution capabilities through the System Execution Hub.
`;
}

export class Synthesizer {
  async synthesize(prompt: string, responseType: string = 'context-driven', sessionId?: string) {
    console.log('[Synthesizer] Starting multi-provider synthesis...');

    const providers = ['gemini', 'anthropic', 'openai'];
    const systemPrompt = getAugmentedPersona();

    // 1. Parallel Execution
    const promises = providers.map(async (provider) => {
      try {
        // Notify start
        bus.publish('precog', 'precog:telemetry', {
          provider: provider.toUpperCase(),
          status: 'processing',
          latency: 0,
          sessionId,
        });

        const start = Date.now();
        const response = await generateLLM({
          prompt,
          provider,
          system: systemPrompt,
          maxTokens: 1024,
          sessionId,
        });

        // Notify success
        bus.publish('precog', 'precog:telemetry', {
          provider: provider.toUpperCase(),
          status: 'success',
          latency: Date.now() - start,
          sessionId,
        });

        return { provider, response, success: true };
      } catch (error: any) {
        console.warn(`[Synthesizer] ${provider} failed: ${error.message}`);

        // Notify error
        bus.publish('precog', 'precog:telemetry', {
          provider: provider.toUpperCase(),
          status: 'error',
          latency: 0,
          sessionId,
        });

        return { provider, error: error.message, success: false };
      }
    });

    const rawResults = await Promise.all(promises);
    const successful = rawResults.filter((r) => r.success);

    if (successful.length === 0) {
      throw new Error('All providers failed to generate a response.');
    }

    // 2. Aggregation / Synthesis
    // We use the "best" provider (Gemini usually) to synthesize the results

    let styleInstruction = '';
    switch (responseType) {
      case 'list':
        styleInstruction = 'Format the response as a concise list or bullet points.';
        break;
      case 'structured':
        styleInstruction =
          'Format the response as a structured plan with clear sections and steps.';
        break;
      case 'detailed':
        styleInstruction = 'Provide a detailed, comprehensive explanation.';
        break;
      case 'concise':
        styleInstruction = 'Be extremely concise and to the point.';
        break;
      case 'context-driven':
      default:
        styleInstruction =
          'Choose the most appropriate format based on the context (e.g. list for steps, code for technical queries, text for explanations).';
        break;
    }

    const synthesisPrompt = `
You are the Chief Synthesizer for TooLoo.ai.
You have received responses from multiple AI models to the user's query: "${prompt}".

Here are the responses:
${successful.map((r) => `--- PROVIDER: ${r.provider.toUpperCase()} ---\n${r.response}\n`).join('\n')}

Your task:
1. Analyze the responses for consensus and unique insights.
2. Synthesize a single, superior response that combines the best parts of all answers.
3. Resolve any contradictions based on your knowledge.
4. Maintain the TooLoo.ai persona (helpful, concise but generous, structured).
5. ${styleInstruction}

Return ONLY the synthesized response.
`;

    try {
      const finalResponse = await generateLLM({
        prompt: synthesisPrompt,
        provider: 'gemini', // Use Gemini as the synthesizer
        system: systemPrompt,
        maxTokens: 2048,
        sessionId,
      });

      // --- ANTICIPATORY LOOP (The "Horizon Scan") ---
      // We don't just stop at the answer. We look ahead.
      let augmentedResponse = finalResponse;
      try {
        const suggestions = await this.generateSuggestions(prompt, finalResponse, sessionId);
        if (suggestions) {
          augmentedResponse += `\n\n---\n\n${suggestions}`;
        }
      } catch (suggestionError) {
        console.warn(`[Synthesizer] Suggestion loop failed (non-critical): ${suggestionError}`);
        // We proceed with the original response if suggestions fail
      }

      return {
        response: augmentedResponse,
        meta: {
          providers: successful.map((r) => r.provider),
          count: successful.length,
        },
      };
    } catch {
      // Fallback: just return the first successful response
      const first = successful[0]!;
      return {
        response: first.response,
        meta: {
          providers: [first.provider],
          note: 'Synthesis failed, returning single provider response.',
        },
      };
    }
  }

  /**
   * The "Anticipatory Loop"
   * Analyzes the final solution to provide proactive suggestions, optimizations, and next steps.
   */
  private async generateSuggestions(
    originalPrompt: string,
    finalSolution: string,
    sessionId?: string
  ): Promise<string> {
    console.log('[Synthesizer] Running Anticipatory Loop...');

    const suggestionPrompt = `
You are the "Horizon Scan" engine for TooLoo.ai.
Your goal is to look BEYOND the immediate answer and provide high-value, proactive insights.

Original User Query: "${originalPrompt}"
Final Solution Provided:
"""
${finalSolution.substring(0, 3000)} // Truncate to avoid context limits if necessary
"""

Your Task:
Analyze the solution and provide a "Related Suggestions" section.
Think about:
1. Optimizations: Can the code be faster, cleaner, or more modern?
2. Security: Are there potential vulnerabilities?
3. Next Steps: What should the user build next based on this?
4. Context: Are there related tools or libraries they should know about?

Format:
Return a Markdown section titled "### 🔮 Horizon Scan (Suggestions)".
Use bullet points.
Be concise.
If the solution is perfect and simple, return an empty string.
`;

    try {
      const suggestions = await generateLLM({
        prompt: suggestionPrompt,
        provider: 'gemini', // Fast and good at reasoning
        system:
          'You are a helpful, proactive AI assistant focused on code quality and future planning.',
        maxTokens: 512,
        sessionId,
      });

      return suggestions;
    } catch (error) {
      console.error('[Synthesizer] Horizon Scan failed:', error);
      return '';
    }
  }
}

export const synthesizer = new Synthesizer();
