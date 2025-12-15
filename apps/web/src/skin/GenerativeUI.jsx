// @version 3.3.577 - Self-Healing Enabled
// TooLoo.ai Generative UI - Component Generator with Auto-Repair
// LLM-powered component generation with sandboxed preview

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import { apiRequest } from '../utils/api';

// Import primitives for scope injection
import * as Primitives from './primitives';
import tokens from './tokens';

// Default scope for generated components
const DEFAULT_SCOPE = {
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,
  ...Primitives,
  tokens,
};

// Theme for code editor
const editorTheme = {
  plain: {
    backgroundColor: '#0f1117',
    color: '#e5e7eb',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '13px',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6b7280' } },
    { types: ['punctuation'], style: { color: '#9ca3af' } },
    { types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol'], style: { color: '#f59e0b' } },
    { types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'], style: { color: '#10b981' } },
    { types: ['operator', 'entity', 'url', 'variable'], style: { color: '#06b6d4' } },
    { types: ['atrule', 'attr-value', 'keyword'], style: { color: '#a855f7' } },
    { types: ['function', 'class-name'], style: { color: '#3b82f6' } },
    { types: ['regex', 'important'], style: { color: '#f43f5e' } },
  ],
};

// Self-Healing Error Boundary
class SelfHealingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.toString() };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GenerativeUI Error:', error, errorInfo);
    this.props.onError?.(error.toString());
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

// Component preview with live editing and Self-Healing
export const ComponentPreview = ({
  code,
  scope = {},
  onCodeChange,
  editable = true,
  showEditor = true,
  showError = true,
  className = '',
  id,
}) => {
  const mergedScope = { ...DEFAULT_SCOPE, ...scope };
  const [error, setError] = useState(null);
  const [repairing, setRepairing] = useState(false);
  const [repairSuccess, setRepairSuccess] = useState(false);
  const errorRef = useRef(null);

  // Watch for LiveError content changes
  useEffect(() => {
    const checkError = () => {
      if (errorRef.current) {
        const errorText = errorRef.current.textContent;
        if (errorText && errorText.trim()) {
          setError(errorText.trim());
        } else {
          setError(null);
          setRepairSuccess(false);
        }
      }
    };
    
    const observer = new MutationObserver(checkError);
    if (errorRef.current) {
      observer.observe(errorRef.current, { childList: true, subtree: true, characterData: true });
    }
    checkError();
    return () => observer.disconnect();
  }, [code]);

  const handleRepair = async () => {
    if (!error) return;
    setRepairing(true);
    setRepairSuccess(false);
    
    try {
      const response = await apiRequest('/generate/improve', {
        method: 'POST',
        body: JSON.stringify({
          componentId: id,
          instructions: `Fix this React component error: ${error}\n\nCode causing error:\n${code}`,
          repairMode: true
        }),
        complexity: 'complex'
      });
      
      if (response.component?.code || response.code) {
        const newCode = response.component?.code || response.code;
        onCodeChange?.(newCode);
        setError(null);
        setRepairSuccess(true);
        setTimeout(() => setRepairSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Auto-repair failed:", e);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className={`rounded-xl border border-white/10 overflow-hidden ${className}`}>
      <LiveProvider code={code} scope={mergedScope} theme={editorTheme} noInline={false}>
        {/* Preview area */}
        <div className="p-4 bg-[#0a0a0a] border-b border-white/10 min-h-[120px]">
          <SelfHealingErrorBoundary onError={setError}>
            <LivePreview />
          </SelfHealingErrorBoundary>
        </div>

        {/* Error display with Self-Healing button */}
        {showError && (
          <div className="relative" ref={errorRef}>
            <LiveError className="px-4 py-2 text-sm text-red-400 bg-red-500/10 border-b border-red-500/20 font-mono pr-32" />
            
            {/* Auto-Repair Button - Appears when there's an error */}
            {error && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                {repairSuccess && (
                  <span className="text-green-400 text-xs">✓ Fixed!</span>
                )}
                <button 
                  onClick={handleRepair}
                  disabled={repairing}
                  className={`text-white text-xs px-3 py-1.5 rounded flex items-center gap-1.5 font-medium transition ${
                    repairing 
                      ? 'bg-yellow-600 cursor-wait' 
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {repairing ? (
                    <>
                      <span className="animate-spin">🔧</span>
                      REPAIRING...
                    </>
                  ) : (
                    <>
                      🔧 AUTO-REPAIR
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Code editor */}
        {showEditor && (
          <div className="relative">
            <LiveEditor
              className="font-mono text-sm"
              onChange={(newCode) => {
                onCodeChange?.(newCode);
              }}
              disabled={!editable}
              style={{
                backgroundColor: '#0f1117',
                padding: '1rem',
                minHeight: '200px',
              }}
            />
          </div>
        )}
      </LiveProvider>
    </div>
  );
};

// Component generator with AI
export const ComponentGenerator = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [componentId, setComponentId] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await apiRequest('/generate/component', {
        method: 'POST',
        body: JSON.stringify({ description: prompt }),
        complexity: 'creative'
      });
      
      const code = result.component?.code || result.code;
      if (code) {
        setGeneratedCode(code);
        setComponentId(result.component?.id || `gen_${Date.now()}`);
        onGenerate?.(code);
      } else {
        setError('No code was generated. Please try a different description.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate component');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          placeholder="Describe the UI component to generate..."
        />
        <button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt.trim()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⚙️</span>
              Generating...
            </>
          ) : (
            <>
              ✨ Create
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}
      
      {generatedCode && (
        <ComponentPreview 
          code={generatedCode} 
          id={componentId}
          onCodeChange={setGeneratedCode} 
        />
      )}
    </div>
  );
};

export default { ComponentPreview, ComponentGenerator };
