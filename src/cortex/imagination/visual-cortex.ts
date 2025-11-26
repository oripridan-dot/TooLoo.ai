// @version 2.1.309
import { bus, SynapsysEvent } from "../../core/event-bus.js";
import { precog } from "../../precog/index.js";
import { ImageGenerationResponse } from "../../precog/providers/types.js";
import { contextResonance } from "../index.js";

export interface VisualOptions {
  provider?: "gemini" | "openai";
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  skipEnhancement?: boolean;
  useContext?: boolean;
  negativePrompt?: string;
  referenceImages?: { data: string; mimeType: string }[];
  mode?: "generate" | "edit";
}

export class VisualCortex {
  constructor() {
    console.log("[VisualCortex] Initializing Imagination Engine...");
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for visual intents
    bus.on("cortex:visual_request", async (event: SynapsysEvent) => {
      try {
        const result = await this.imagine(
          event.payload.prompt,
          event.payload.options,
        );
        bus.publish("cortex", "cortex:visual_response", {
          requestId: event.payload.requestId,
          data: result,
        });
      } catch (error: unknown) {
        console.error("[VisualCortex] Error processing visual request:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        bus.publish("cortex", "cortex:visual_response", {
          requestId: event.payload.requestId,
          error: errorMessage,
        });
      }
    });
  }

  public async imagine(
    prompt: string,
    options: VisualOptions = {},
  ): Promise<ImageGenerationResponse> {
    console.log(`[VisualCortex] Dreaming about: ${prompt}`);

    // 0. Context Resonance
    let contextInfo = "";
    if (options.useContext !== false && contextResonance) {
      try {
        const memories = contextResonance.retrieveResonantMemory(
          {
            currentTask: prompt,
            recentTopics: [],
            activeFiles: [],
          },
          3,
        );

        if (memories.length > 0) {
          contextInfo =
            "\n\nRelevant Context:\n" +
            memories.map((m) => `- ${m.memory.content}`).join("\n");
          console.log(
            `[VisualCortex] Resonated with ${memories.length} memories.`,
          );
        }
      } catch (e) {
        console.warn("[VisualCortex] Context resonance failed:", e);
      }
    }

    // 1. Enhance Prompt (The "Dreaming" Phase)
    // We'll use the LLM to expand the prompt if it's short and user didn't opt-out
    let enhancedPrompt = prompt;
    if ((prompt.length < 50 && !options.skipEnhancement) || contextInfo) {
      try {
        const enhancement = await precog.providers.generate({
          prompt: `You are a visual prompt engineer. Expand this short description into a detailed image generation prompt optimized for DALL-E 3 and Imagen 3. Keep it under 75 words. Focus on lighting, style, and composition. Description: "${prompt}"${contextInfo}`,
          taskType: "creative",
        });
        if (enhancement && enhancement.content) {
          enhancedPrompt = enhancement.content;
          console.log(`[VisualCortex] Enhanced prompt: ${enhancedPrompt}`);
        }
      } catch (e) {
        console.warn(
          "[VisualCortex] Prompt enhancement failed, using original prompt.",
          e,
        );
      }
    }

    // 2. Select Artist (Provider)
    // If provider is explicit, use it. Otherwise, decide based on prompt content.
    let provider = options.provider;
    let model = options.model;

    if (!provider) {
      // Simple logic for now: "photo" -> Gemini, "logo/icon" -> DALL-E
      if (
        prompt.toLowerCase().includes("photo") ||
        prompt.toLowerCase().includes("realistic")
      ) {
        provider = "gemini";
        model = "imagen-3.0-generate-001";
      } else {
        provider = "openai";
        model = "dall-e-3";
      }
      console.log(`[VisualCortex] Selected artist: ${provider} (${model})`);
    }

    // 3. Execute
    return precog.providers.generateImage({
      prompt: enhancedPrompt,
      provider: provider,
      model: model,
      aspectRatio: options.aspectRatio,
      imageSize: options.imageSize,
      negativePrompt: options.negativePrompt,
      referenceImages: options.referenceImages?.map((img) => img.data),
      mode: options.mode === "generate" ? "quality" : "fast", // Map to provider modes
    });
  }

  public async design(
    prompt: string,
    type: "layout" | "palette" | "component",
    _system?: any,
  ): Promise<any> {
    console.log(`[VisualCortex] Designing ${type}: ${prompt}`);

    // In a real implementation, this would call a DesignProvider
    // For now, we'll use the text generator to create a JSON structure

    const designPrompt = `You are a UI/UX Design Engine. Generate a ${type} for: "${prompt}".
    Return ONLY valid JSON.
    ${type === "layout" ? 'Format: { structure: [], description: "" }' : ""}
    ${type === "palette" ? 'Format: { primary: "", secondary: "", accent: "", background: "", text: "" }' : ""}
    ${type === "component" ? 'Format: { code: "", language: "jsx", framework: "react" }' : ""}
    `;

    const response = await precog.providers.generate({
      prompt: designPrompt,
      taskType: "creative",
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        error: "Failed to parse design response",
        raw: response.content,
      };
    } catch (e) {
      return { error: "Design generation failed", details: e };
    }
  }
}

export const visualCortex = new VisualCortex();
