// @version 2.2.51

import { ProviderEngine } from "../src/precog/provider-engine.js";
import ensureEnvLoaded from "../src/nexus/engine/env-loader.js";

ensureEnvLoaded();

async function test() {
  console.log("Testing Provider Engine...");
  const engine = new ProviderEngine();
  
  const status = engine.getProviderStatus();
  console.log("Provider Status:", JSON.stringify(status, null, 2));

  console.log("\nAttempting generation with Gemini...");
  try {
    const res = await engine.generate({
      prompt: "Hello, are you online?",
      taskType: "chat",
      sessionId: "test-session"
    });
    console.log("Generation Result:", res);
  } catch (err) {
    console.error("Generation Failed:", err);
  }
}

test().catch(console.error);
