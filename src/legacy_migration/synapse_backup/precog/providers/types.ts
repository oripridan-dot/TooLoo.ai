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
    taskType?: 'creative' | 'reasoning' | 'general' | 'code';
    maxTokens?: number;
    temperature?: number;
    provider?: string; // Force specific provider
}

export interface GenerationResponse {
    content: string;
    provider: string;
    model: string;
    latency: number;
    cost?: number;
    metadata?: any;
}

export interface ProviderAdapter {
    name: string;
    isAvailable(): boolean;
    generate(req: GenerationRequest): Promise<GenerationResponse>;
}
