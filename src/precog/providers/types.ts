// @version 2.1.28
export interface ProviderConfig {
    name: string;
    enabled: boolean;
    apiKey?: string;
    baseUrl?: string;
    model: string;
    type: 'paid' | 'local' | 'free';
}

export interface GenerationRequest {
    id?: string; // Optional ID for tracking
    prompt: string;
    system?: string;
    taskType?: 'creative' | 'reasoning' | 'general' | 'code' | 'planning';
    maxTokens?: number;
    temperature?: number;
    provider?: string; // Force specific provider
    mode?: 'fast' | 'ensemble' | 'deep'; // Execution mode
}

export interface GenerationResponse {
    content: string;
    provider: string;
    model: string;
    latency: number;
    cost?: number;
    metadata?: any;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ProviderAdapter {
    name: string;
    type?: 'paid' | 'local' | 'free'; // Added type
    isAvailable(): boolean;
    generate(req: GenerationRequest): Promise<GenerationResponse>;
    embed?(text: string): Promise<number[]>; // Optional embedding support
}

export interface ImageGenerationRequest {
    prompt: string;
    provider?: 'gemini' | 'openai'; // Select provider
    model?: string; // 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' | 'dall-e-3'
    aspectRatio?: string; // "1:1", "16:9", etc.
    imageSize?: string; // "1K", "2K", "4K" (for Pro)
    negativePrompt?: string;
    referenceImages?: {
        data: string; // base64
        mimeType: string;
    }[];
    mode?: 'generate' | 'edit';
}

export interface ImageGenerationResponse {
    images: {
        data: string; // base64
        mimeType: string;
    }[];
    metadata?: any;
}
