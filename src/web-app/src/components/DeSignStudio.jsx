// @version 3.3.408
// TooLoo DeSign Studio - The Visual Cortex Interface
// This is the "steering wheel" for VisualCortex2
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// API base URL
const API_BASE = '/api/v1/visual';

// Export FigmaCopilot for backward compatibility
export { FigmaCopilot } from './FigmaCopilot';

/**
 * TooLoo DeSign Studio
 * Central interface for the Visual Cortex 2.0 design engine
 * 
 * Capabilities:
 * - SVG generation (backgrounds, cards, badges, icons)
 * - Data visualization (charts, gauges, sparklines)
 * - Animation presets and custom keyframes
 * - AI-powered design generation
 */
export const DeSignStudio = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('generate');
  
  // Visual Cortex status
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Generation state
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Chart builder state
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState([
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Apr', value: 40 },
    { label: 'May', value: 75 },
  ]);
  const [chartSvg, setChartSvg] = useState(null);
  
  // Animation state
  const [animations, setAnimations] = useState([]);
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [animationCss, setAnimationCss] = useState(null);
  
  // SVG builder state
  const [svgType, setSvgType] = useState('background');
  const [svgOptions, setSvgOptions] = useState({
    width: 400,
    height: 300,
    style: 'gradient',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  });
  const [builtSvg, setBuiltSvg] = useState(null);

  // Load status on mount
  useEffect(() => {
    loadStatus();
    loadAnimations();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus(data.data || data);
      setLoading(false);
    } catch (err) {
      setError('Failed to connect to Visual Cortex');
      setLoading(false);
    }
  };

  const loadAnimations = async () => {
    try {
      const res = await fetch(`${API_BASE}/animation/presets`);
      const data = await res.json();
      if (data.ok) {
        setAnimations(data.presets);
      }
    } catch (err) {
      console.error('Failed to load animations:', err);
    }
  };

  // AI-powered generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a design prompt');
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options: {
            format: 'svg',
            includeAnimation: true,
          },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setResult(data.result);
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Chart generation
  const generateChart = async () => {
    try {
      const endpoint = `${API_BASE}/${chartType}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: chartData,
          options: {
            width: 600,
            height: 400,
            animated: true,
            palette: 'aurora',
          },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setChartSvg(data.svg);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Load animation details
  const loadAnimation = async (preset) => {
    try {
      const res = await fetch(`${API_BASE}/animation/${preset}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedAnimation(preset);
        setAnimationCss(data);
      }
    } catch (err) {
      console.error('Failed to load animation:', err);
    }
  };

  // Build SVG
  const buildSvg = async () => {
    try {
      const res = await fetch(`${API_BASE}/svg/${svgType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(svgOptions),
      });

      const data = await res.json();
      if (data.ok) {
        setBuiltSvg(data.svg);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Tab content renderers
  const tabs = [
    { id: 'generate', label: '✨ AI Generate', icon: '🧠' },
    { id: 'charts', label: '📊 Charts', icon: '📈' },
    { id: 'svg', label: '🎨 SVG Builder', icon: '🖼️' },
    { id: 'animation', label: '🎬 Animation', icon: '💫' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <span className="text-xl">🎨</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">DeSign Studio</h1>
              <p className="text-sm text-gray-400">Visual Cortex 2.0 Interface</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-gray-400">Connecting...</span>
            ) : status ? (
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-sm">Visual Cortex Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {/* AI Generate Tab */}
          {activeTab === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">🧠 AI-Powered Design Generation</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Describe what you want to create and let the Visual Cortex generate it for you.
                </p>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Create a modern dashboard card with gradient background, showing user statistics with icons..."
                  className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <span className="animate-spin">⚙️</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        Generate Design
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                    {error}
                  </div>
                )}

                {result && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Generated SVG</span>
                        <button
                          onClick={() => copyToClipboard(result.svg || result)}
                          className="text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          Copy SVG
                        </button>
                      </div>
                      <div
                        className="bg-gray-800 rounded-lg p-4 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: result.svg || result }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick templates */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Quick Templates</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Dashboard Card', prompt: 'Create a modern dashboard stat card with gradient' },
                    { label: 'Profile Avatar', prompt: 'Generate a circular profile avatar placeholder with initials' },
                    { label: 'Progress Ring', prompt: 'Create an animated progress ring showing 75% completion' },
                    { label: 'Status Badge', prompt: 'Design a status badge showing "Online" with a green dot' },
                  ].map((template) => (
                    <button
                      key={template.label}
                      onClick={() => setPrompt(template.prompt)}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-left transition-colors"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <motion.div
              key="charts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">📊 Data Visualization</h2>

                {/* Chart type selector */}
                <div className="flex gap-2 mb-4">
                  {['bar', 'line', 'pie', 'gauge', 'sparkline'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-4 py-2 rounded-lg capitalize ${
                        chartType === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Data editor */}
                <div className="mb-4">
                  <label className="text-sm text-gray-400 mb-2 block">Chart Data (JSON)</label>
                  <textarea
                    value={JSON.stringify(chartData, null, 2)}
                    onChange={(e) => {
                      try {
                        setChartData(JSON.parse(e.target.value));
                      } catch {}
                    }}
                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-white resize-none focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={generateChart}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
                >
                  Generate Chart
                </button>

                {/* Chart preview */}
                {chartSvg && (
                  <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Chart Preview</span>
                      <button
                        onClick={() => copyToClipboard(chartSvg)}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        Copy SVG
                      </button>
                    </div>
                    <div
                      className="flex justify-center"
                      dangerouslySetInnerHTML={{ __html: chartSvg }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SVG Builder Tab */}
          {activeTab === 'svg' && (
            <motion.div
              key="svg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">🎨 SVG Builder</h2>

                {/* SVG type selector */}
                <div className="flex gap-2 mb-4">
                  {['background', 'card', 'badge', 'icon'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSvgType(type)}
                      className={`px-4 py-2 rounded-lg capitalize ${
                        svgType === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Width</label>
                    <input
                      type="number"
                      value={svgOptions.width}
                      onChange={(e) => setSvgOptions({ ...svgOptions, width: parseInt(e.target.value) })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Height</label>
                    <input
                      type="number"
                      value={svgOptions.height}
                      onChange={(e) => setSvgOptions({ ...svgOptions, height: parseInt(e.target.value) })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Primary Color</label>
                    <input
                      type="color"
                      value={svgOptions.primaryColor}
                      onChange={(e) => setSvgOptions({ ...svgOptions, primaryColor: e.target.value })}
                      className="w-full h-10 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Secondary Color</label>
                    <input
                      type="color"
                      value={svgOptions.secondaryColor}
                      onChange={(e) => setSvgOptions({ ...svgOptions, secondaryColor: e.target.value })}
                      className="w-full h-10 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={buildSvg}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
                >
                  Build SVG
                </button>

                {/* SVG preview */}
                {builtSvg && (
                  <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">SVG Preview</span>
                      <button
                        onClick={() => copyToClipboard(builtSvg)}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        Copy SVG
                      </button>
                    </div>
                    <div
                      className="flex justify-center"
                      dangerouslySetInnerHTML={{ __html: builtSvg }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Animation Tab */}
          {activeTab === 'animation' && (
            <motion.div
              key="animation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">🎬 Animation Presets</h2>

                {/* Animation grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {animations.map((anim) => (
                    <button
                      key={anim}
                      onClick={() => loadAnimation(anim)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        selectedAnimation === anim
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {anim}
                    </button>
                  ))}
                </div>

                {/* Animation preview */}
                {animationCss && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Preview</span>
                      </div>
                      <div className="flex justify-center p-8">
                        <div
                          className="w-16 h-16 bg-indigo-500 rounded-lg"
                          style={{
                            animation: animationCss.css,
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">CSS Animation</span>
                        <button
                          onClick={() => copyToClipboard(animationCss.css)}
                          className="text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          Copy CSS
                        </button>
                      </div>
                      <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
                        {animationCss.css}
                      </pre>
                    </div>

                    <div className="p-4 bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Keyframes</span>
                        <button
                          onClick={() => copyToClipboard(animationCss.keyframes)}
                          className="text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          Copy Keyframes
                        </button>
                      </div>
                      <pre className="text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                        {animationCss.keyframes}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DeSignStudio;
