// @version 2.2.74
import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  negativePrompt: string;
  setNegativePrompt: (negativePrompt: string) => void;

  generatedImages: GeneratedImage[];
  addGeneratedImage: (image: GeneratedImage) => void;
  clearGeneratedImages: () => void;

  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;

  settings: {
    provider: string;
    model: string;
    aspectRatio: string;
    imageSize: string;
    enhancePrompt: boolean;
    useContext: boolean;
    preset?: string;
  };
  updateSettings: (settings: Partial<VisualState["settings"]>) => void;
}

export const useVisualStore = create<VisualState>()(
  persist(
    (set) => ({
      prompt: "",
      setPrompt: (prompt) => set({ prompt }),

      negativePrompt: "",
      setNegativePrompt: (negativePrompt) => set({ negativePrompt }),

      generatedImages: [],
      addGeneratedImage: (image) =>
        set((state) => ({
          generatedImages: [image, ...state.generatedImages],
        })),
      clearGeneratedImages: () => set({ generatedImages: [] }),

      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      settings: {
        provider: "gemini",
        model: "imagen-3.0-generate-001",
        aspectRatio: "1:1",
        imageSize: "1K",
        enhancePrompt: true,
        useContext: true,
        preset: "custom",
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: "visual-store",
      partialize: (state) => ({
        settings: state.settings,
        // We don't persist images in localStorage to avoid quota limits with base64
        // We could use IndexedDB but for now let's keep it simple or just persist settings
      }),
    },
  ),
);
