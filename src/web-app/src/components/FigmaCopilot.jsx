// @version 3.3.301
// TooLoo Copilot - Figma Make Style Component
import React, { useState, useEffect, useCallback, useRef } from 'react';

// API base URL
const API_BASE = '/api/v1/design';

/**
 * TooLoo Copilot - Design to Code Component
 * Combines Figma Make's ease of use with TooLoo's AI superpowers
 */
export const FigmaCopilot = () => {
  // Connection state
  const [figmaStatus, setFigmaStatus] = useState({ connected: false, user: null, loading: true });
  
  // Input state
  const [figmaUrl, setFigmaUrl] = useState('');
  const [options, setOptions] = useState({
    framework: 'react',
    styling: 'tailwind',
    typescript: true,
    includeTests: false,
    includeStorybook: false,
  });
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ stage: '', message: '', progress: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  
  // Presets
  const [presets, setPresets] = useState(null);
  
  // Cache
  const [recentImports, setRecentImports] = useState([]);

  // Check Figma connection on mount
  useEffect(() => {
    checkFigmaConnection();
    loadPresets();
    loadRecentImports();
  }, []);

  const checkFigmaConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/figma/status`);
      const data = await res.json();
      setFigmaStatus({ ...data, loading: false });
    } catch (err) {
      setFigmaStatus({ connected: false, loading: false, error: err.message });
    }
  };

  const loadPresets = async () => {
    try {
      const res = await fetch(`${API_BASE}/presets`);
      const data = await res.json();
      if (data.ok) setPresets(data.presets);
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  };

  const loadRecentImports = async () => {
    try {
      const res = await fetch(`${API_BASE}/figma/cache`);
      const data = await res.json();
      if (data.ok) setRecentImports(data.imports || []);
    } catch (err) {
      console.error('Failed to load recent imports:', err);
    }
  };

  /**
   * The "Make" action - generate code from Figma
   */
  const handleMake = async () => {
    if (!figmaUrl.trim()) {
      setError('Please enter a Figma URL');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setProgress({ stage: 'starting', message: 'Starting...', progress: 0 });

    try {
      // Use streaming endpoint for live feedback
      const eventSource = new EventSource(
        `${API_BASE}/figma/make/stream?url=${encodeURIComponent(figmaUrl)}`
      );

      const components = [];

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        setProgress(data);
      });

      eventSource.addEventListener('component', (e) => {
        const data = JSON.parse(e.data);
        components.push(data);
      });

      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        setResult({
          ...data,
          components,
        });
        setIsGenerating(false);
        eventSource.close();
        loadRecentImports(); // Refresh cache
      });

      eventSource.addEventListener('error', (e) => {
        if (e.data) {
          const data = JSON.parse(e.data);
          setError(data.message);
        } else {
          setError('Connection error');
        }
        setIsGenerating(false);
        eventSource.close();
      });

      eventSource.onerror = () => {
        setError('Stream connection failed');
        setIsGenerating(false);
        eventSource.close();
      };
    } catch (err) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  /**
   * Quick make without streaming
   */
  const handleQuickMake = async () => {
    if (!figmaUrl.trim()) {
      setError('Please enter a Figma URL');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/figma/make`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: figmaUrl, options }),
      });

      const data = await res.json();

      if (data.ok) {
        setResult(data.generation);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xl">🎨</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">TooLoo Copilot</h1>
              <p className="text-sm text-gray-400">Design to Code with AI</p>
            </div>
          </div>
          
          {/* Figma Connection Status */}
          <div className="flex items-center gap-2">
            {figmaStatus.loading ? (
              <span className="text-gray-400">Checking Figma...</span>
            ) : figmaStatus.connected ? (
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span>Connected as {figmaStatus.user?.handle || figmaStatus.user?.email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <span>Figma not connected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input */}
        <div className="w-1/3 border-r border-gray-700 p-4 overflow-y-auto">
          {/* URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Figma URL
            </label>
            <input
              type="text"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://figma.com/file/..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste a Figma file or frame URL
            </p>
          </div>

          {/* Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Options
            </label>
            
            {/* Framework */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Framework</label>
              <div className="flex gap-2 flex-wrap">
                {presets?.frameworks?.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setOptions({ ...options, framework: fw.id })}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      options.framework === fw.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {fw.icon} {fw.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Styling */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Styling</label>
              <div className="flex gap-2 flex-wrap">
                {presets?.styling?.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setOptions({ ...options, styling: style.id })}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      options.styling === style.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {style.icon} {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.typescript}
                  onChange={(e) => setOptions({ ...options, typescript: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm">TypeScript</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTests}
                  onChange={(e) => setOptions({ ...options, includeTests: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm">Include Tests</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeStorybook}
                  onChange={(e) => setOptions({ ...options, includeStorybook: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm">Include Storybook</span>
              </label>
            </div>
          </div>

          {/* Make Button */}
          <button
            onClick={handleMake}
            disabled={isGenerating || !figmaStatus.connected}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isGenerating
                ? 'bg-gray-600 cursor-wait'
                : figmaStatus.connected
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-purple-500/25'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              '✨ Make with TooLoo'
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Progress */}
          {isGenerating && progress.stage && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{progress.message}</span>
                <span className="text-purple-400">{Math.round(progress.progress)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Recent Imports */}
          {recentImports.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Recent Imports
              </label>
              <div className="space-y-2">
                {recentImports.slice(0, 5).map((imp, i) => (
                  <button
                    key={`recent-import-${imp.fileId || i}`}
                    onClick={() => setFigmaUrl(`https://figma.com/file/${imp.fileId}`)}
                    className="w-full text-left p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="text-sm font-medium truncate">{imp.fileName || imp.fileId}</div>
                    <div className="text-xs text-gray-500">
                      {imp.componentCount} components • {new Date(imp.importedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Panel - Code Preview */}
        <div className="flex-1 flex flex-col">
          {/* Component Tabs */}
          {result?.components?.length > 0 && (
            <div className="border-b border-gray-700 flex overflow-x-auto">
              {result.components.map((comp, i) => (
                <button
                  key={`comp-tab-${comp.name || i}`}
                  onClick={() => setSelectedComponent(i)}
                  className={`px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                    selectedComponent === i || (selectedComponent === null && i === 0)
                      ? 'bg-gray-800 border-b-2 border-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {comp.name}
                  <span className="ml-2 text-xs text-purple-400">
                    {Math.round(comp.qualityScore * 100)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Code Display */}
          <div className="flex-1 overflow-auto p-4">
            {result?.components?.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(result.components[selectedComponent || 0]?.code)}
                  className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                >
                  📋 Copy
                </button>
                <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm">
                  <code className="text-gray-300">
                    {result.components[selectedComponent || 0]?.code}
                  </code>
                </pre>
              </div>
            ) : !isGenerating ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-lg mb-2">Paste a Figma URL to get started</p>
                  <p className="text-sm">TooLoo will analyze your design and generate production-ready code</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">🧠</div>
                  <p className="text-lg text-gray-400">{progress.message || 'Processing...'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Quality & Suggestions */}
        {result && (
          <div className="w-72 border-l border-gray-700 p-4 overflow-y-auto">
            {/* Quality Score */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Quality Score</h3>
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeDasharray={`${result.totalQualityScore * 100}, 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{Math.round(result.totalQualityScore * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{result.componentCount}</div>
                <div className="text-xs text-gray-500">Components</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{result.warnings?.length || 0}</div>
                <div className="text-xs text-gray-500">Warnings</div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Warnings</h3>
                <div className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <div key={`warning-${w.message?.slice(0,20) || i}`} className="p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-sm text-yellow-200">
                      {w.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Suggestions</h3>
                <div className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div key={`suggestion-${s.message?.slice(0,20) || i}`} className="p-2 bg-blue-900/30 border border-blue-700/50 rounded text-sm text-blue-200">
                      💡 {s.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                💾 Export All
              </button>
              <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                🔀 Create PR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FigmaCopilot;
