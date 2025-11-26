// @version 2.1.276
import { GoogleGenAI } from "@google/genai";
import { ImageGenerationRequest, ImageGenerationResponse } from "./types.js";

export class GeminiImageProvider {
    private client: GoogleGenAI;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || "";
        if (!this.apiKey) {
            console.warn("[GeminiImageProvider] GEMINI_API_KEY is not set.");
        }
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
        if (!this.isAvailable()) {
            throw new Error("Gemini API key is missing.");
        }

        // Determine model name. Map "gemini" placeholders to actual Imagen models.
        let modelName = req.model || "gemini-2.0-flash-exp";
        
        if (modelName.includes('imagen')) {
             // Fallback: Imagen 3 is not available in v1beta public API yet for all keys.
             // Use Gemini 2.0 Flash Exp which has multimodal generation capabilities
             modelName = "gemini-2.0-flash-exp";
        }

        // Construct parts
        const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
        
        // Add text prompt
        let finalPrompt = req.prompt;
        if (req.negativePrompt) {
            finalPrompt += `\n\nNegative prompt (exclude these elements): ${req.negativePrompt}`;
        }

        if (finalPrompt) {
            parts.push({ text: finalPrompt });
        }

        // Add reference images if any
        if (req.referenceImages && req.referenceImages.length > 0) {
            for (const img of req.referenceImages) {
                parts.push({
                    inlineData: {
                        mimeType: img.mimeType,
                        data: img.data
                    }
                });
            }
        }

        // Config
        const config: Record<string, unknown> = {
            responseModalities: ["IMAGE"], 
        };

        // Only add imageConfig if we have a valid aspect ratio.
        if (req.aspectRatio) {
            // For Gemini 2.0 Flash, aspect ratio might be a prompt instruction or config
            // But let's try to keep it in config if supported, otherwise append to prompt
            // The SDK types suggest imageConfig might be correct for some models
            config.generationConfig = {
                responseModalities: ["IMAGE"],
            };
            // We'll also append it to prompt to be safe for the experimental model
            // parts[0].text += `\n\nAspect Ratio: ${req.aspectRatio}`;
        }

        try {
            console.log(`[GeminiImageProvider] Generating image with model ${modelName}...`);
            
            // Ensure we are passing Content[] not Part[]
            const contents = [{ role: "user", parts: parts }];

            const response = await this.client.models.generateContent({
                model: modelName,
                contents: contents,
                config: config
            });

            const images: { data: string; mimeType: string }[] = [];

            if (response.candidates && response.candidates.length > 0) {
                for (const candidate of response.candidates) {
                    if (candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
                                images.push({
                                    data: part.inlineData.data,
                                    mimeType: part.inlineData.mimeType
                                });
                            }
                        }
                    }
                }
            }

            if (images.length === 0) {
                console.warn("[GeminiImageProvider] No images returned in response:", JSON.stringify(response, null, 2));
                throw new Error("No images generated. The model might have refused the prompt or failed to generate an image.");
            }

            return {
                images,
                metadata: {
                    model: modelName,
                    usage: response.usageMetadata
                }
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[GeminiImageProvider] Generation failed:", error);
            throw new Error(`Gemini image generation failed: ${errorMessage}`);
        }
    }
}
