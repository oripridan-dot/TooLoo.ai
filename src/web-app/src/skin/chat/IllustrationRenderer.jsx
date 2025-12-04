// @version 3.1.0
// TooLoo.ai Illustration Renderer
// Human-like AI illustration display with interactive features
// Features: Zoom, download, regenerate, style switching, art effects

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// ============================================================================
// ILLUSTRATION RENDERER - Main component for displaying AI illustrations
// ============================================================================

export const IllustrationRenderer = memo(
  ({
    data, // Base64 image data or SVG string
    mimeType = 'image/png',
    altText = 'AI Illustration',
    metadata = {},
    onRegenerate,
    onStyleChange,
    className = '',
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentFilter, setCurrentFilter] = useState('none');
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // Zoom controls
    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
    const handleZoomReset = () => setZoomLevel(1);

    // Download functionality
    const handleDownload = useCallback(() => {
      if (!data) return;

      const link = document.createElement('a');

      if (mimeType === 'image/svg+xml' || (typeof data === 'string' && data.startsWith('<svg'))) {
        // SVG download
        const blob = new Blob([data], { type: 'image/svg+xml' });
        link.href = URL.createObjectURL(blob);
        link.download = `tooloo-illustration-${Date.now()}.svg`;
      } else {
        // Image download (base64)
        link.href = `data:${mimeType};base64,${data}`;
        link.download = `tooloo-illustration-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [data, mimeType]);

    // Copy to clipboard
    const handleCopy = useCallback(async () => {
      if (!data) return;

      try {
        if (mimeType.includes('svg') || (typeof data === 'string' && data.startsWith('<svg'))) {
          await navigator.clipboard.writeText(data);
        } else {
          // For images, copy the data URL
          await navigator.clipboard.writeText(`data:${mimeType};base64,${data}`);
        }
        // Show success feedback (you'd want a toast here)
        console.log('Copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }, [data, mimeType]);

    // Toggle fullscreen
    const handleFullscreen = useCallback(() => {
      if (!containerRef.current) return;

      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }, []);

    // Apply CSS filter based on selection
    const filterStyles = {
      none: '',
      grayscale: 'grayscale(100%)',
      sepia: 'sepia(80%)',
      vintage: 'sepia(30%) contrast(110%) saturate(80%)',
      vibrant: 'saturate(150%) contrast(110%)',
      cool: 'hue-rotate(180deg) saturate(80%)',
      warm: 'sepia(20%) saturate(120%)',
      dramatic: 'contrast(130%) brightness(90%)',
    };

    // Detect if SVG
    const isSVG =
      mimeType === 'image/svg+xml' || (typeof data === 'string' && data.trim().startsWith('<svg'));

    useEffect(() => {
      if (data) {
        setIsLoading(false);
      }
    }, [data]);

    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative group rounded-2xl overflow-hidden bg-[#0a0a0f] border border-gray-800/50 ${className}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Loading state */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-20"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-sm text-gray-400">Creating illustration...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main image/SVG container */}
        <motion.div
          className="relative overflow-auto max-h-[600px]"
          style={{
            cursor: zoomLevel > 1 ? 'move' : 'default',
          }}
        >
          {isSVG ? (
            // SVG Rendering
            <div
              className="flex items-center justify-center p-4 min-h-[300px]"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                filter: filterStyles[currentFilter],
                transition: 'transform 0.2s ease-out, filter 0.3s ease',
              }}
              dangerouslySetInnerHTML={{ __html: data }}
            />
          ) : (
            // Image Rendering
            <img
              ref={imageRef}
              src={`data:${mimeType};base64,${data}`}
              alt={altText}
              className="w-full h-auto object-contain"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                filter: filterStyles[currentFilter],
                transition: 'transform 0.2s ease-out, filter 0.3s ease',
              }}
              onLoad={() => setIsLoading(false)}
            />
          )}
        </motion.div>

        {/* Controls overlay */}
        <AnimatePresence>
          {(showControls || isFullscreen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Top bar with title and info */}
              <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎨</span>
                    <span className="text-sm font-medium text-white truncate max-w-[200px]">
                      {altText}
                    </span>
                    {metadata.style && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {metadata.style}
                      </span>
                    )}
                    {metadata.type && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {metadata.type}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleFullscreen}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {isFullscreen ? '⛶' : '⛶'}
                  </button>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center justify-between gap-2">
                  {/* Zoom controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                      disabled={zoomLevel <= 0.5}
                    >
                      −
                    </button>
                    <button
                      onClick={handleZoomReset}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                      disabled={zoomLevel >= 3}
                    >
                      +
                    </button>
                  </div>

                  {/* Filter dropdown */}
                  <select
                    value={currentFilter}
                    onChange={(e) => setCurrentFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-white/10 text-white text-xs border-none outline-none cursor-pointer"
                  >
                    <option value="none">No Filter</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="sepia">Sepia</option>
                    <option value="vintage">Vintage</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="cool">Cool</option>
                    <option value="warm">Warm</option>
                    <option value="dramatic">Dramatic</option>
                  </select>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                      title="Copy"
                    >
                      📋
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                      title="Download"
                    >
                      ↓
                    </button>
                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm transition-colors"
                        title="Regenerate"
                      >
                        ↻
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

IllustrationRenderer.displayName = 'IllustrationRenderer';

// ============================================================================
// ILLUSTRATION GALLERY - Display multiple illustrations
// ============================================================================

export const IllustrationGallery = memo(
  ({ illustrations = [], columns = 2, onSelect, className = '' }) => {
    const [selectedId, setSelectedId] = useState(null);

    const handleSelect = (illustration) => {
      setSelectedId(illustration.id);
      onSelect?.(illustration);
    };

    return (
      <div
        className={`grid gap-4 ${className}`}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {illustrations.map((illustration, index) => (
          <motion.div
            key={illustration.id || index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(illustration)}
            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
              selectedId === illustration.id
                ? 'border-purple-500 ring-2 ring-purple-500/30'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <IllustrationRenderer
              data={illustration.data}
              mimeType={illustration.mimeType}
              altText={illustration.altText}
              metadata={illustration.metadata}
              className="pointer-events-none"
            />
          </motion.div>
        ))}
      </div>
    );
  }
);

IllustrationGallery.displayName = 'IllustrationGallery';

// ============================================================================
// ILLUSTRATION REQUEST CARD - UI for requesting illustrations
// ============================================================================

export const IllustrationRequestCard = memo(({ onSubmit, isLoading = false, className = '' }) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('auto');
  const [type, setType] = useState('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const styles = [
    { value: 'auto', label: '✨ Auto-detect' },
    { value: 'minimalist', label: '○ Minimalist' },
    { value: 'detailed', label: '◉ Detailed' },
    { value: 'cartoon', label: '🎪 Cartoon' },
    { value: 'realistic', label: '📷 Realistic' },
    { value: 'watercolor', label: '🎨 Watercolor' },
    { value: 'sketch', label: '✏️ Sketch' },
    { value: 'neon', label: '💫 Neon' },
    { value: 'blueprint', label: '📐 Blueprint' },
    { value: 'isometric', label: '📦 Isometric' },
  ];

  const types = [
    { value: 'auto', label: '✨ Auto-detect' },
    { value: 'character', label: '👤 Character' },
    { value: 'scene', label: '🎬 Scene' },
    { value: 'diagram', label: '📊 Diagram' },
    { value: 'abstract', label: '🌀 Abstract' },
    { value: 'icon', label: '🎯 Icon' },
    { value: 'landscape', label: '🏔️ Landscape' },
    { value: 'portrait', label: '🖼️ Portrait' },
    { value: 'architecture', label: '🏛️ Architecture' },
    { value: 'infographic', label: '📈 Infographic' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    onSubmit?.({
      prompt: prompt.trim(),
      style,
      type,
    });
  };

  const quickPrompts = [
    '🚀 Futuristic AI brain network',
    '🌊 Calm ocean at sunset',
    '🏙️ Cyberpunk cityscape',
    '🌸 Cherry blossom garden',
    '🔮 Magic crystal formation',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/30 p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎨</span>
        <h3 className="text-lg font-semibold text-white">Create Illustration</h3>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Main prompt input */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to see... e.g., 'A majestic dragon flying over a mountain range at golden hour'"
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-gray-700 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 transition-colors"
            rows={3}
          />
        </div>

        {/* Quick prompts */}
        <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(qp)}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Style and Type selection */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {styles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 hover:text-gray-300 mb-3 flex items-center gap-1"
        >
          {showAdvanced ? '▼' : '▶'} Advanced options
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-3 rounded-lg bg-black/20 border border-gray-800">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1">Width</label>
                    <input
                      type="number"
                      defaultValue={1024}
                      min={256}
                      max={2048}
                      step={256}
                      className="w-full px-2 py-1 rounded bg-black/30 border border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Height</label>
                    <input
                      type="number"
                      defaultValue={1024}
                      min={256}
                      max={2048}
                      step={256}
                      className="w-full px-2 py-1 rounded bg-black/30 border border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
            !prompt.trim() || isLoading
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⏳
              </motion.span>
              Creating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🎨</span>
              Generate Illustration
            </span>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
});

IllustrationRequestCard.displayName = 'IllustrationRequestCard';

// ============================================================================
// INLINE ILLUSTRATION BLOCK - For rendering in chat messages
// ============================================================================

export const InlineIllustrationBlock = memo(({ content, onExpand }) => {
  // Parse illustration block from markdown-like syntax
  // Format: ```illustration style="minimalist" type="diagram"
  const [expanded, setExpanded] = useState(false);

  // Extract metadata from content if present
  const parseMetadata = (str) => {
    const styleMatch = str.match(/style="([^"]+)"/);
    const typeMatch = str.match(/type="([^"]+)"/);
    const promptMatch = str.match(/prompt="([^"]+)"/);

    return {
      style: styleMatch?.[1] || 'auto',
      type: typeMatch?.[1] || 'auto',
      prompt:
        promptMatch?.[1] ||
        str
          .replace(/style="[^"]+"\s*/g, '')
          .replace(/type="[^"]+"\s*/g, '')
          .trim(),
    };
  };

  const metadata = parseMetadata(content);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="my-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <span className="text-sm font-medium text-purple-300">Illustration Request</span>
          {metadata.style !== 'auto' && (
            <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-200">
              {metadata.style}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setExpanded(!expanded);
            onExpand?.();
          }}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          {expanded ? 'Collapse' : 'Generate'}
        </button>
      </div>

      <p className="text-sm text-gray-300 mb-2">{metadata.prompt}</p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <IllustrationRequestCard
              onSubmit={(data) => console.log('Generate:', data)}
              className="mt-3"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

InlineIllustrationBlock.displayName = 'InlineIllustrationBlock';

export default {
  IllustrationRenderer,
  IllustrationGallery,
  IllustrationRequestCard,
  InlineIllustrationBlock,
};
