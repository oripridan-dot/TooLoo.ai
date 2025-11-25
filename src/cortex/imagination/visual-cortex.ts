import { bus } from "../../core/event-bus.js";
import { precog } from "../../precog/index.js";
import { ImageGenerationRequest, ImageGenerationResponse } from "../../precog/providers/types.js";

export class VisualCortex {
    constructor() {
        console.log("[VisualCortex] Initializing Imagination Engine...");
        this.setupListeners();
    }

    private setupListeners() {
        // Listen for visual intents
        bus.on("cortex:visual_request", async (event: any) => {
            try {
                const result = await this.imagine(event.payload.prompt, event.payload.options);
                bus.publish("cortex", "cortex:visual_response", {
                    requestId: event.payload.requestId,
                    data: result
                });
            } catch (error: any) {
                console.error("[VisualCortex] Error processing visual request:", error);
                bus.publish("cortex", "cortex:visual_response", {
                    requestId: event.payload.requestId,
                    error: error.message
                });
            }
        });
    }

    public async imagine(prompt: string, options: any = {}): Promise<ImageGenerationResponse> {
        console.log(`[VisualCortex] Dreaming about: ${prompt}`);

        // 1. Enhance Prompt (The "Dreaming" Phase)
        // We'll use the LLM to expand the prompt if it's short and user didn't opt-out
        let enhancedPrompt = prompt;
        if (prompt.length < 50 && !options.skipEnhancement) {
             try {
                 const enhancement = await precog.providers.generate({
                    prompt: `You are a visual prompt engineer. Expand this short description into a detailed image generation prompt optimized for DALL-E 3 and Imagen 3. Keep it under 75 words. Focus on lighting, style, and composition. Description: "${prompt}"`,
                    taskType: 'creative'
                });
                if (enhancement && enhancement.content) {
                    enhancedPrompt = enhancement.content;
                    console.log(`[VisualCortex] Enhanced prompt: ${enhancedPrompt}`);
                }
             } catch (e) {
                 console.warn("[VisualCortex] Prompt enhancement failed, using original prompt.", e);
             }
        }

        // 2. Select Artist (Provider)
        // If provider is explicit, use it. Otherwise, decide based on prompt content.
        let provider = options.provider;
        let model = options.model;

        if (!provider) {
            // Simple logic for now: "photo" -> Gemini, "logo/icon" -> DALL-E
            if (prompt.toLowerCase().includes("photo") || prompt.toLowerCase().includes("realistic")) {
                provider = 'gemini';
                model = 'imagen-3.0-generate-001';
            } else {
                provider = 'openai';
                model = 'dall-e-3';
            }
            console.log(`[VisualCortex] Selected artist: ${provider} (${model})`);
        }

        // 3. Execute
        return precog.providers.generateImage({
            prompt: enhancedPrompt,
            provider: provider,
            model: model,
            aspectRatio: options.aspectRatio,
            imageSize: options.imageSize
        });
    }
}

export const visualCortex = new VisualCortex();
