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
