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
  metadata?: Record<string, unknown>;
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
  referenceImages?: string[];
  mode?: 'fast' | 'quality' | 'artistic';
}

export interface ImageGenerationResponse {
  images: {
    data: string; // base64
    mimeType: string;
  }[];
  metadata?: Record<string, unknown>;
}

export interface DesignProvider extends ProviderAdapter {
  generateLayout(prompt: string): Promise<LayoutResponse>;
  generatePalette(prompt: string): Promise<ColorPalette>;
  generateComponent(prompt: string, system: any): Promise<ComponentCode>;
}

export interface LayoutResponse {
  structure: any;
  description: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ComponentCode {
  code: string;
  language: string;
  framework: string;
}

/**
 * Context-aware visual generation interfaces
 * Enables visual providers (DeSign Studio, DALL-E) to generate functional code
 * by analyzing design context and requirements
 */

export interface VisualContext {
  designTokens?: {
    colors?: Record<string, string>;
    typography?: Record<string, unknown>;
    spacing?: Record<string, string>;
    borderRadius?: Record<string, string>;
  };
  uiPatterns?: string[]; // e.g., ["card", "grid", "sidebar", "modal"]
  componentRequirements?: {
    name: string;
    purpose: string;
    props?: Record<string, unknown>;
  }[];
  existingComponents?: {
    name: string;
    code: string;
  }[];
  brandGuidelines?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    tone?: string;
  };
  customInstructions?: string;
}

export interface VisualContextAnalysis {
  extractedTokens: Record<string, unknown>;
  identifiedPatterns: string[];
  requirements: string[];
  recommendations: string[];
  codeGenStrategy: 'component' | 'layout' | 'system' | 'utility';
}

export interface ImageCodeGenerationRequest {
  visualPrompt: string; // Description of visual/design intent
  codePrompt: string; // Specific code generation instructions
  context: VisualContext; // Design tokens, patterns, requirements
  outputFormat: 'html' | 'react' | 'vue' | 'markdown'; // Target language
  provider?: 'gemini-nano' | 'dalle3'; // Force provider (DeSign Studio or DALL-E)
  includeImage?: boolean; // Also generate visual mockup
  temperature?: number;
  maxTokens?: number;
}

export interface ImageCodeGenerationResponse {
  code: string;
  language: string;
  framework: string;
  imageUrl?: string; // Optional visual mockup (base64)
  contextAnalysis: VisualContextAnalysis;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
}

export interface ContextAwareImageProvider extends ProviderAdapter {
  generateCodeFromContext(req: ImageCodeGenerationRequest): Promise<ImageCodeGenerationResponse>;
  analyzeVisualContext(context: VisualContext): Promise<VisualContextAnalysis>;
}
