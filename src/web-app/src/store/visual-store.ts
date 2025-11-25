import { create } from 'zustand';

export interface GeneratedImage {
    id: string;
    data: string; // base64
    mimeType: string;
    prompt: string;
    timestamp: number;
}

interface VisualState {
    prompt: string;
    setPrompt: (prompt: string) => void;
    
    generatedImages: GeneratedImage[];
    addGeneratedImage: (image: GeneratedImage) => void;
    
    isGenerating: boolean;
    setIsGenerating: (isGenerating: boolean) => void;

    settings: {
        provider: string;
        model: string;
        aspectRatio: string;
        imageSize: string;
        enhancePrompt: boolean;
    };
    updateSettings: (settings: Partial<VisualState['settings']>) => void;
}

export const useVisualStore = create<VisualState>((set) => ({
    prompt: '',
    setPrompt: (prompt) => set({ prompt }),
    
    generatedImages: [],
    addGeneratedImage: (image) => set((state) => ({ 
        generatedImages: [image, ...state.generatedImages] 
    })),
    
    isGenerating: false,
    setIsGenerating: (isGenerating) => set({ isGenerating }),

    settings: {
        provider: 'gemini',
        model: 'imagen-3.0-generate-001',
        aspectRatio: '1:1',
        imageSize: '1K',
        enhancePrompt: true
    },
    updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
    }))
}));
