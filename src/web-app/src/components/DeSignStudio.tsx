// @version 2.2.36
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useVisualStore } from "../store/visual-store";
import {
  Loader2,
  Send,
  Image as ImageIcon,
  Settings,
  PenTool,
  Palette,
  Layout,
  Wand2,
  Monitor,
  Smartphone,
  Type,
  Grid,
} from "lucide-react";
import DesignTools from "./DesignTools.jsx";

const DeSignStudio: React.FC = () => {
  const [showTools, setShowTools] = useState(true);
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    generatedImages,
    addGeneratedImage,
    clearGeneratedImages,
    isGenerating,
    setIsGenerating,
    settings,
    updateSettings,
  } = useVisualStore();

  const generateMutation = useMutation({
    mutationFn: async (promptText: string) => {
      const response = await fetch("/api/v1/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          negativePrompt: negativePrompt,
          provider: settings.provider,
          model: settings.model,
          aspectRatio: settings.aspectRatio,
          imageSize: settings.imageSize,
          options: {
            skipEnhancement: !settings.enhancePrompt,
            useContext: settings.useContext,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || "Generation failed",
        );
      }

      return response.json();
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (data) => {
      if (data.images && data.images.length > 0) {
        data.images.forEach((img: any) => {
          addGeneratedImage({
            id: Math.random().toString(36).substring(7),
            data: img.data,
            mimeType: img.mimeType,
            prompt: prompt,
            timestamp: Date.now(),
          });
        });
      }
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      console.error("Generation error:", error);
      setIsGenerating(false);
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    generateMutation.mutate(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1117] text-gray-100">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Studio Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#1e293b]/80 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/5 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">
                  DeSign
                </span>{" "}
                Studio
              </h1>
            </div>
            <p className="text-sm text-gray-400 ml-1 flex items-center gap-2">
              <Wand2 className="w-3 h-3" /> Cognitive Visual Engine • Gemini &
              DALL-E
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center bg-black/20 p-2 rounded-xl border border-white/5">
            <button
              onClick={() => setShowTools(!showTools)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                showTools
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layout className="w-4 h-4" />
              Studio Tools
            </button>

            <div className="h-6 w-px bg-white/10 mx-1"></div>

            <select
              value={settings.preset || "custom"}
              onChange={(e) => {
                const preset = e.target.value;
                if (preset === "ui-design") {
                  updateSettings({
                    preset: "ui-design",
                    aspectRatio: "16:9",
                    enhancePrompt: true,
                  });
                  setPrompt(
                    "Modern dashboard interface for Tooloo.ai, dark mode, cybernetic aesthetic, data visualization widgets",
                  );
                } else if (preset === "icon") {
                  updateSettings({
                    preset: "icon",
                    aspectRatio: "1:1",
                    enhancePrompt: false,
                  });
                  setPrompt("Minimalist app icon, vector style, flat design");
                } else {
                  updateSettings({ preset: "custom" });
                }
              }}
              className="bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none hover:border-gray-600 transition-colors"
            >
              <option value="custom">Custom Preset</option>
              <option value="ui-design">UI Design (Tooloo)</option>
              <option value="icon">App Icon</option>
            </select>

            <select
              value={settings.provider}
              onChange={(e) => {
                const newProvider = e.target.value;
                updateSettings({
                  provider: newProvider,
                  model:
                    newProvider === "openai"
                      ? "dall-e-3"
                      : "gemini-2.0-flash-exp",
                });
              }}
              className="bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
            >
              <option value="gemini">Nano Banana (Gemini)</option>
              <option value="openai">DALL-E (OpenAI)</option>
            </select>

            {generatedImages.length > 0 && (
              <button
                onClick={clearGeneratedImages}
                className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Clear Gallery
              </button>
            )}
          </div>
        </header>

        {/* Tools Panel */}
        <AnimatePresence>
          {showTools && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <DesignTools />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Canvas / Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {generatedImages.map((img) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-[#1e293b] border border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt={img.prompt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <p className="text-sm text-white line-clamp-2 font-medium">
                    {img.prompt}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded">
                      Upscale
                    </button>
                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded">
                      Variations
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {generatedImages.length === 0 && !isGenerating && (
            <div className="col-span-full flex flex-col items-center justify-center h-96 text-gray-500 bg-[#1e293b]/50 rounded-xl border border-dashed border-gray-700">
              <div className="p-4 bg-gray-800/50 rounded-full mb-4">
                <ImageIcon
                  size={48}
                  className="opacity-50 text-rose-500/50"
                />
              </div>
              <p className="text-lg font-medium text-gray-400">
                Your canvas is empty
              </p>
              <p className="text-sm text-gray-600">
                Start creating by entering a prompt below
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="aspect-square rounded-xl bg-[#1e293b] border border-gray-800 flex flex-col items-center justify-center animate-pulse shadow-lg">
              <Loader2 className="animate-spin text-rose-500 mb-2" size={32} />
              <p className="text-sm text-gray-400 font-medium">Dreaming...</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-[#1e293b]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3 flex justify-between items-center">
            <div className="flex gap-4">
               <select
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  {settings.provider === "gemini" ? (
                    <>
                      <option value="imagen-3.0-generate-001">
                        Imagen 3 (High Quality)
                      </option>
                      <option value="gemini-2.0-flash-exp">
                        Nano Banana (Gemini 2.0 Flash)
                      </option>
                    </>
                  ) : (
                    <option value="dall-e-3">DALL-E 3</option>
                  )}
                </select>
                <select
                  value={settings.aspectRatio}
                  onChange={(e) => updateSettings({ aspectRatio: e.target.value })}
                  className="bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 focus:ring-1 focus:ring-rose-500 outline-none"
                >
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="4:3">4:3 Standard</option>
                </select>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={settings.useContext}
                  onChange={(e) =>
                    updateSettings({ useContext: e.target.checked })
                  }
                  className="rounded border-gray-600 bg-gray-800 text-rose-500 focus:ring-rose-500"
                />
                <span>Use Context</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={settings.enhancePrompt}
                  onChange={(e) =>
                    updateSettings({ enhancePrompt: e.target.checked })
                  }
                  className="rounded border-gray-600 bg-gray-800 text-rose-500 focus:ring-rose-500"
                />
                <span>Auto-Enhance</span>
              </label>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision... (e.g. 'A futuristic city with neon lights in a cyberpunk style')"
                className="w-full p-4 pr-16 border border-gray-700 bg-[#0f1117] rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-inner transition-all"
                disabled={isGenerating}
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-rose-600 hover:bg-rose-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors text-white shadow-lg"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (what to avoid)..."
              className="w-full p-3 border border-gray-700 bg-[#0f1117] rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent shadow-inner transition-all"
              disabled={isGenerating}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeSignStudio;
