// @version 2.1.247
import { SynapseBus } from "../core/bus/event-bus.js";
import {
  ProviderAdapter,
  GenerationRequest,
  GenerationResponse,
} from "./providers/types.js";
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OllamaProvider,
} from "./providers/adapters.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export class ProviderEngine {
  private providers: Map<string, ProviderAdapter> = new Map();
  private bus: SynapseBus;

  constructor() {
    this.bus = SynapseBus.getInstance();
    this.initializeProviders();
    this.setupListeners();
  }

  public getProvider(name: string): ProviderAdapter | undefined {
    return this.providers.get(name);
  }

  private initializeProviders() {
    // Load from env
    const env = process.env;
    console.log("🔍 Precog: Loading providers...");

    this.register(
      new OpenAIProvider({
        name: "openai",
        enabled: env.OPENAI_ENABLED !== "false",
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        type: "paid",
      }),
    );

    this.register(
      new AnthropicProvider({
        name: "anthropic",
        enabled: env.ANTHROPIC_ENABLED !== "false",
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
        type: "paid",
      }),
    );

    this.register(
      new GeminiProvider({
        name: "gemini",
        enabled: env.GEMINI_ENABLED !== "false",
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL || "gemini-2.5-pro-preview-03-25",
        type: "paid",
      }),
    );

    this.register(
      new OllamaProvider({
        name: "ollama",
        enabled: env.ENABLE_OLLAMA === "true",
        baseUrl: env.OLLAMA_BASE_URL || "http://localhost:11434",
        model: env.OLLAMA_MODEL || "llama3.2:latest",
        type: "local",
      }),
    );

    // Log status
    for (const [name, provider] of this.providers) {
      console.log(
        `   - ${name}: ${provider.isAvailable() ? "✅ Ready" : "❌ Unavailable"}`,
      );
    }
  }

  private register(provider: ProviderAdapter) {
    this.providers.set(provider.name, provider);
  }

  private setupListeners() {
    this.bus.subscribe<GenerationRequest>("provider:request", async (event) => {
      try {
        const response = await this.generate(event.data);
        this.bus.publish(
          "provider:response",
          {
            requestId: event.data.id || event.id, // Handle passed-through ID
            response,
          },
          "precog",
        );
      } catch (error: any) {
        this.bus.publish(
          "provider:error",
          {
            requestId: event.data.id || event.id,
            error: error.message,
          },
          "precog",
        );
      }
    });
  }

  public async generate(req: GenerationRequest): Promise<GenerationResponse> {
    // 1. Check for Ensemble Request
    if (req.mode === "ensemble") {
      return await this.generateEnsemble(req);
    }

    // 2. Select Provider
    const providerName = req.provider || this.selectBestProvider(req);
    const provider = this.providers.get(providerName);

    if (!provider || !provider.isAvailable()) {
      throw new Error(`Provider ${providerName} not available`);
    }

    // 3. Execute
    return await provider.generate(req);
  }

  public async generateEnsemble(
    req: GenerationRequest
  ): Promise<GenerationResponse> {
    console.log(`[Precog] Starting Ensemble Generation for: ${req.taskType}`);

    // 1. Select Candidates (All available paid providers)
    const candidates = Array.from(this.providers.values()).filter(
      (p) => p.isAvailable() && p.type === "paid"
    );

    if (candidates.length < 2) {
      console.warn(
        "[Precog] Not enough providers for ensemble. Falling back to single."
      );
      return this.generate({ ...req, mode: "fast" });
    }

    // 2. Parallel Execution
    const promises = candidates.map((p) =>
      p
        .generate(req)
        .then((res) => ({
          provider: p.name,
          content: res.content,
          error: undefined,
        }))
        .catch((err) => ({
          provider: p.name,
          content: undefined,
          error: err.message,
        }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter(
      (r): r is { provider: string; content: string; error: undefined } =>
        !r.error && !!r.content
    );

    if (successful.length === 0) {
      throw new Error("Ensemble generation failed: All providers failed.");
    }

    // 3. Synthesis
    const synthesisPrompt = `You are the Synthesis Engine. 
I have queried multiple AI models with the same prompt. Your job is to synthesize the best possible answer from their responses.

ORIGINAL PROMPT:
${req.prompt}

RESPONSES:
${successful
  .map(
    (r, i) => `--- MODEL ${i + 1} (${r.provider}) ---\n${r.content}\n------\n`
  )
  .join("\n")}

INSTRUCTIONS:
- Combine the strengths of each response.
- Resolve conflicts by choosing the most logical/accurate information.
- Eliminate hallucinations or weak reasoning.
- Return a single, cohesive, high-quality response.
`;

    // Use the strongest model for synthesis (Gemini or Anthropic)
    const synthesizerName = this.providers.get("gemini")?.isAvailable()
      ? "gemini"
      : "anthropic";
    const synthesizer = this.providers.get(synthesizerName);

    if (!synthesizer) {
      // Fallback: just return the first one if synthesizer is somehow missing
      return {
        content: successful[0].content,
        provider: successful[0].provider,
        model: "ensemble-fallback",
        latency: 0,
      };
    }

    console.log(`[Precog] Synthesizing with ${synthesizerName}...`);
    return await synthesizer.generate({
      ...req,
      prompt: synthesisPrompt,
      system: "You are an expert synthesizer.",
    });
  }

  private selectBestProvider(req: GenerationRequest): string {
    // Simple logic for now, can be enhanced with "Precog" logic later
    if (req.taskType === "code") return "anthropic";
    if (req.taskType === "creative") return "gemini";

    // Default fallback chain
    if (this.providers.get("gemini")?.isAvailable()) return "gemini";
    if (this.providers.get("anthropic")?.isAvailable()) return "anthropic";
    if (this.providers.get("openai")?.isAvailable()) return "openai";
    if (this.providers.get("ollama")?.isAvailable()) return "ollama";

    throw new Error("No providers available");
  }
}
