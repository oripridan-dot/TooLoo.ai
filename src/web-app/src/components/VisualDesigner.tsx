// @version 2.1.274
import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualStore } from '../store/visual-store';
import { Loader2, Send, Image as ImageIcon, Settings } from 'lucide-react';

const VisualDesigner: React.FC = () => {
    const { 
        prompt, 
        setPrompt, 
        generatedImages, 
        addGeneratedImage, 
        isGenerating, 
        setIsGenerating,
        settings,
        updateSettings
    } = useVisualStore();

    const generateMutation = useMutation({
        mutationFn: async (promptText: string) => {
            const response = await fetch('/api/v1/visuals/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptText,
                    provider: settings.provider,
                    model: settings.model,
                    aspectRatio: settings.aspectRatio,
                    imageSize: settings.imageSize,
                    options: {
                        skipEnhancement: !settings.enhancePrompt
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Generation failed');
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
                        timestamp: Date.now()
                    });
                });
            }
            setIsGenerating(false);
        },
        onError: (error) => {
            console.error('Generation error:', error);
            setIsGenerating(false);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isGenerating) return;
        generateMutation.mutate(prompt);
    };

    return (
        <div className="flex flex-col h-full bg-white text-gray-900 p-6 font-sans rounded-tl-2xl border-t border-l border-gray-200">
            <header className="mb-6 flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Nano Banana Studio
                    </h1>
                    <p className="text-gray-500 mt-1">Cognitive Visual Engine • Gemini & DALL-E</p>
                </div>
                <div className="flex gap-4">
                    <select 
                        value={settings.provider}
                        onChange={(e) => {
                            const newProvider = e.target.value;
                            updateSettings({ 
                                provider: newProvider,
                                model: newProvider === 'openai' ? 'dall-e-3' : 'gemini-2.5-flash-image'
                            });
                        }}
                        className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="gemini">Nano Banana (Gemini)</option>
                        <option value="openai">DELL-E (OpenAI)</option>
                    </select>
                    <select 
                        value={settings.model}
                        onChange={(e) => updateSettings({ model: e.target.value })}
                        className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        {settings.provider === 'gemini' ? (
                            <>
                                <option value="imagen-3.0-generate-001">Imagen 3 (High Quality)</option>
                                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                            </>
                        ) : (
                            <option value="dall-e-3">DALL-E 3</option>
                        )}
                    </select>
                    <select 
                        value={settings.aspectRatio}
                        onChange={(e) => updateSettings({ aspectRatio: e.target.value })}
                        className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                    </select>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Main Canvas / Gallery */}
                <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode='popLayout'>
                            {generatedImages.map((img) => (
                                <motion.div
                                    key={img.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative aspect-square rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <img 
                                        src={`data:${img.mimeType};base64,${img.data}`} 
                                        alt={img.prompt}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                        <p className="text-sm text-white line-clamp-2">{img.prompt}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {generatedImages.length === 0 && !isGenerating && (
                            <div className="col-span-full flex flex-col items-center justify-center h-96 text-gray-400">
                                <ImageIcon size={48} className="mb-4 opacity-50" />
                                <p>Start creating by entering a prompt below</p>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="aspect-square rounded-xl bg-white border border-gray-200 flex items-center justify-center animate-pulse shadow-sm">
                                <Loader2 className="animate-spin text-blue-600" size={32} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Input Area */}
            <div className="mt-6">
                <div className="max-w-4xl mx-auto mb-2 flex justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={settings.enhancePrompt}
                            onChange={(e) => updateSettings({ enhancePrompt: e.target.checked })}
                            className="rounded bg-white border-gray-300 text-blue-600 focus:ring-blue-500/20"
                        />
                        <span>Auto-Enhance Prompt (Creative Director)</span>
                    </label>
                </div>
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your vision... (e.g. 'A futuristic city with neon lights in a cyberpunk style')"
                        className="w-full bg-white border border-gray-300 rounded-xl py-4 pl-6 pr-16 text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        disabled={isGenerating}
                    />
                    <button
                        type="submit"
                        disabled={isGenerating || !prompt.trim()}
                        className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors text-white"
                    >
                        {isGenerating ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VisualDesigner;
