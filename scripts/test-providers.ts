// @version 2.1.252

import "dotenv/config";
import LLMProvider, {
  getProviderStatus,
  generateSmartLLM,
} from "../src/precog/providers/llm-provider.js";

async function test() {
  console.log("Checking provider status...");
  const status = getProviderStatus();
  console.log(JSON.stringify(status, null, 2));

  console.log("\nTesting generation with Gemini...");
  try {
    const result = await generateSmartLLM({
      prompt: "are all providers back?",
      system:
        "You are a helpful assistant. You have access to the system status. All systems are operational.",
      taskType: "chat",
      maxTokens: 2048,
    });
    console.log("\nResult:");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Generation failed:", e);
  }
}

test();
