// @version 2.1.343

import { generateLLM } from "./src/precog/providers/llm-provider.js";
import { TOOLOO_PERSONA } from "./src/cortex/persona.js";

async function test() {
  const providers = ["gemini", "anthropic", "openai"];
  const prompt = "are the providers monitor's a mock?";

  for (const provider of providers) {
    try {
      console.log(`Testing provider: ${provider}`);
      const response = await generateLLM({
        prompt,
        provider,
        system: TOOLOO_PERSONA,
        maxTokens: 100,
      });
      console.log(`Provider: ${provider}`);
      console.log(`Type: ${typeof response}`);
      console.log(`Value:`, response);
      if (typeof response === 'object') {
          console.error("ERROR: Response is an object!");
      }
    } catch (error) {
      console.log(`Provider ${provider} failed:`, error.message);
    }
  }
}

test();
