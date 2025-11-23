// @version 2.1.55
import { SynapseBus } from "../core/bus/event-bus";
import {
  ProviderAdapter,
  GenerationRequest,
  GenerationResponse,
} from "./providers/types";
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OllamaProvider,
} from "./providers/adapters";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export class ProviderEngine {
  private providers: Map<string, ProviderAdapter> = new Map();
  private bus: SynapseBus;

  constructor() {
    this.bus = SynapseBus.getInstance();
    this.initializeProviders();
    this.setupListeners();
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
    // 1. Select Provider
    const providerName = req.provider || this.selectBestProvider(req);
    const provider = this.providers.get(providerName);

    if (!provider || !provider.isAvailable()) {
      throw new Error(`Provider ${providerName} not available`);
    }

    // 2. Execute
    return await provider.generate(req);
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
