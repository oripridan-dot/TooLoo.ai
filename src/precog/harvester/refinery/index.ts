import { ProviderEngine } from '../../provider-engine.js';
import { IRefinery } from '../types.js';

export class Refinery implements IRefinery {
  private providers: ProviderEngine;

  constructor(providers: ProviderEngine) {
    this.providers = providers;
  }

  async refine(content: string, type: string = 'general'): Promise<any> {
    console.log(`[Refinery] Refining content of type: ${type}`);

    // 0. Security Scan (Immune System)
    if (await this.scanForThreats(content)) {
      throw new Error('Security Threat Detected: Content contains malicious patterns.');
    }

    // Truncate content if too long for a single pass (simple heuristic for now)
    const maxLength = 15000;
    const truncatedContent =
      content.length > maxLength ? content.substring(0, maxLength) + '...(truncated)' : content;

    const prompt = `
        You are a Data Refinery AI. Your job is to clean, normalize, and structure raw web content.
        
        Input Content:
        """
        ${truncatedContent}
        """
        
        Instructions:
        1. Remove all boilerplate, ads, navigation text, and fluff.
        2. Extract key entities (People, Organizations, Dates).
        3. Summarize the main points.
        4. Return the result as a valid JSON object with the following structure:
        {
            "summary": "Concise summary...",
            "markdown": "Cleaned content in Markdown format...",
            "entities": ["Entity1", "Entity2"],
            "sentiment": "positive|neutral|negative"
        }
        `;

    try {
      const result = await this.providers.generate({
        prompt: prompt,
        taskType: 'analysis', // Use a smart model
        system: 'You are a data cleaning expert.',
      });

      // Attempt to parse JSON from the response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        return {
          summary: 'Failed to parse structured output',
          markdown: result.content,
          entities: [],
          sentiment: 'neutral',
        };
      }
    } catch (error) {
      console.error('[Refinery] Refinement failed:', error);
      return {
        summary: 'Refinement failed',
        markdown: content, // Fallback to raw
        entities: [],
        sentiment: 'neutral',
      };
    }
  }

  private async scanForThreats(content: string): Promise<boolean> {
    // Quick heuristic scan for obvious threats
    const threatPatterns = [
      /<script>[\s\S]*?eval\(/i,
      /base64,[\s\S]*?exec/i,
      /javascript:/i,
      /vbscript:/i,
    ];

    if (threatPatterns.some((p) => p.test(content))) {
      console.warn('[Refinery] Security Threat Detected: Malicious patterns found.');
      return true;
    }
    return false;
  }
}
