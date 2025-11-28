import LLMProvider from "./src/precog/providers/llm-provider.js";
import ensureEnvLoaded from "./src/nexus/engine/env-loader.js";

ensureEnvLoaded();

const provider = new LLMProvider();
const status = provider.getProviderStatus();

console.log(JSON.stringify(status, null, 2));
