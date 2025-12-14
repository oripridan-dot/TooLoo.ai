// @version 3.3.204
// TooLoo.ai Generative UI - Component Generator
// LLM-powered component generation with sandboxed preview

import React, { useState, useCallback, useEffect } from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';

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
    {
      types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol'],
      style: { color: '#f59e0b' },
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: { color: '#10b981' },
    },
    { types: ['operator', 'entity', 'url', 'variable'], style: { color: '#06b6d4' } },
    { types: ['atrule', 'attr-value', 'keyword'], style: { color: '#a855f7' } },
    { types: ['function', 'class-name'], style: { color: '#3b82f6' } },
    { types: ['regex', 'important'], style: { color: '#f43f5e' } },
  ],
};

// Component preview with live editing
export const ComponentPreview = ({
  code,
  scope = {},
  onCodeChange,
  editable = true,
  showEditor = true,
  showError = true,
  className = '',
}) => {
  const mergedScope = { ...DEFAULT_SCOPE, ...scope };

  return (
    <div className={`rounded-xl border border-white/10 overflow-hidden ${className}`}>
      <LiveProvider code={code} scope={mergedScope} theme={editorTheme} noInline={false}>
        {/* Preview area */}
        <div className="p-4 bg-[#0a0a0a] border-b border-white/10 min-h-[120px]">
          <LivePreview />
        </div>

        {/* Error display */}
        {showError && (
          <LiveError className="px-4 py-2 text-sm text-red-400 bg-red-500/10 border-b border-red-500/20 font-mono" />
        )}

        {/* Code editor */}
        {showEditor && (
          <div className="relative">
            <LiveEditor
              className="font-mono text-sm"
              onChange={onCodeChange}
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

// Design instruction schema for LLM
export const DesignInstruction = {
  // Template describing what to generate
  template: '',

  // Component DNA
  schema: {
    name: '', // Component name
    type: '', // interactive | container | display | feedback | layout
    purpose: '', // What does it do?
    props: {}, // Expected props with types
    variants: [], // Visual variants
    states: [], // Interactive states
    animations: [], // Motion requirements

    // A11y requirements - all components must meet these standards
    accessibility: {
      // WCAG 2.1 AA compliance
      wcagLevel: 'AA',

      // Keyboard navigation requirements
      keyboard: {
        focusable: true, // Must be focusable via Tab
        enterActivates: true, // Enter key triggers action
        escapeCloses: true, // Escape closes modals/dropdowns
        arrowNavigation: false, // For menus/lists only
      },

      // Screen reader requirements
      screenReader: {
        role: '', // ARIA role (button, dialog, alert, etc.)
        label: '', // aria-label or aria-labelledby
        describedBy: '', // aria-describedby for additional context
        liveRegion: '', // aria-live (polite, assertive) for dynamic content
      },

      // Visual requirements
      visual: {
        colorContrastRatio: 4.5, // Minimum contrast ratio
        focusIndicator: true, // Visible focus ring
        motionReduceRespect: true, // prefers-reduced-motion support
        noColorOnly: true, // Don't use color alone to convey meaning
      },

      // Touch targets
      touch: {
        minTapTarget: 44, // Minimum tap target size (px)
        spacing: 8, // Minimum spacing between targets
      },
    },

    // Context constraints
    constraints: {
      maxWidth: null,
      minHeight: null,
      responsive: true,
      darkModeOnly: true,
    },

    // Style tokens to use
    tokens: {
      colors: [],
      spacing: [],
      radii: [],
    },
  },
};

// System prompt for component generation
export const COMPONENT_GENERATION_PROMPT = `You are TooLoo's UI Generator. Generate React components using the TooLoo Skin primitive library.

AVAILABLE PRIMITIVES:
- Button, IconButton: Interactive buttons with variants (primary, secondary, ghost, danger, success, accent)
- Card, CardHeader, CardTitle, CardContent, CardFooter: Container components
- Panel, SimplePanel: Collapsible sections with headers
- StatCard, MiniStat: Metric display cards
- Badge, StatusBadge, CountBadge: Labels and indicators
- Input, SearchInput, Textarea, FormField: Text inputs
- Select, NativeSelect: Dropdown selections
- Toggle, Checkbox, Radio: Boolean controls
- Tabs, TabPanel: Tabbed navigation
- Modal, ConfirmDialog, AlertDialog: Dialogs
- Spinner, Skeleton: Loading states
- Progress, CircularProgress, Steps: Progress indicators
- Tooltip, InfoTooltip: Hover information
- Divider, Spacer: Layout separators

DESIGN TOKENS:
- Colors: obsidian (#0a0a0a), surface (#0f1117), surfaceElevated (#151820)
- Accents: cyan (#06b6d4), purple (#a855f7), rose (#f43f5e), amber (#f59e0b), emerald (#10b981)
- Borders: borderSubtle (white/5), borderMuted (white/10)
- Text: textPrimary (white), textSecondary (gray-400), textMuted (gray-500)

RULES:
1. Use only the primitives listed above
2. Follow the dark theme (obsidian background)
3. Use Tailwind CSS for additional styling
4. Components must be self-contained (no external imports beyond React)
5. Include proper accessibility attributes
6. Return ONLY the component code, no explanation

EXAMPLE OUTPUT:
\`\`\`jsx
function MyWidget() {
  const [count, setCount] = useState(0);
  
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Counter Widget</CardTitle>
      </CardHeader>
      <CardContent>
        <StatCard
          title="Current Count"
          value={count}
          accent="cyan"
        />
        <Button 
          variant="primary" 
          onClick={() => setCount(c => c + 1)}
          className="mt-4"
        >
          Increment
        </Button>
      </CardContent>
    </Card>
  );
}
\`\`\``;

// Generate component from design instruction - using real API
export const generateComponentCode = async (description, name = null) => {
  try {
    const response = await fetch('/api/v1/generate/component', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        name,
        category: 'user-generated',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Generation failed');
    }

    return {
      code: data.component.code,
      id: data.component.id,
      name: data.component.name,
      meta: data.meta,
    };
  } catch (error) {
    console.error('[GenerativeUI] Generation error:', error);
    throw error;
  }
};

// Component Generator UI
export const ComponentGenerator = ({ onGenerate, className = '' }) => {
  const [prompt, setPrompt] = useState('');
  const [componentName, setComponentName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load generation history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/v1/generate/components');
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            setHistory(data.components.slice(0, 10));
          }
        }
      } catch (e) {
        // Ignore history load errors
      }
    };
    loadHistory();
  }, [generatedCode]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateComponentCode(prompt, componentName || undefined);
      setGeneratedCode(result.code);
      setGeneratedMeta(result.meta);
      onGenerate?.(result.code, result);
    } catch (err) {
      setError(err.message);
      // Fallback to local generation if API fails
      try {
        const fallbackCode = generatePlaceholderComponent(prompt);
        setGeneratedCode(fallbackCode);
        setGeneratedMeta({ fallback: true });
        onGenerate?.(fallbackCode, { fallback: true });
      } catch {
        // Ignore fallback errors
      }
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, componentName, onGenerate]);

  const handleImprove = useCallback(
    async (componentId, instructions) => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/generate/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ componentId, instructions }),
        });

        const data = await response.json();

        if (data.ok) {
          setGeneratedCode(data.component.code);
          setGeneratedMeta(data.meta);
          onGenerate?.(data.component.code, data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    },
    [onGenerate]
  );

  const loadFromHistory = (component) => {
    setGeneratedCode(component.code);
    setPrompt(component.description);
    setComponentName(component.name);
    setShowHistory(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with history toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">✨</span>
          Generative UI
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
        >
          {showHistory ? 'Hide History' : `History (${history.length})`}
        </button>
      </div>

      {/* History dropdown */}
      {showHistory && history.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 max-h-48 overflow-y-auto">
          {history.map((comp) => (
            <button
              key={comp.id}
              onClick={() => loadFromHistory(comp)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
            >
              <div className="font-medium text-gray-300">{comp.name}</div>
              <div className="text-xs text-gray-500 truncate">{comp.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Component name input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Component Name (optional)
        </label>
        <Primitives.Input
          value={componentName}
          onChange={(e) => setComponentName(e.target.value)}
          placeholder="e.g., ServerHealthWidget"
        />
      </div>

      {/* Prompt input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Describe what you want to create
        </label>
        <Primitives.Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A status card showing server health with CPU, memory, and disk usage bars with color-coded indicators..."
          rows={4}
        />
      </div>

      {/* Generate button */}
      <Primitives.Button
        variant="accent"
        onClick={handleGenerate}
        loading={isGenerating}
        disabled={!prompt.trim()}
        fullWidth
        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
      >
        {isGenerating ? 'Generating...' : '✨ Generate Component'}
      </Primitives.Button>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Generation meta info */}
      {generatedMeta && !generatedMeta.fallback && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Provider: {generatedMeta.provider}</span>
          <span>Model: {generatedMeta.model}</span>
          {generatedMeta.tokens && <span>Tokens: {generatedMeta.tokens.total}</span>}
        </div>
      )}

      {/* Generated preview */}
      {generatedCode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Live Preview & Editor
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(generatedCode)}
                className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
              >
                Copy Code
              </button>
            </div>
          </div>
          <ComponentPreview code={generatedCode} onCodeChange={setGeneratedCode} editable />
        </div>
      )}
    </div>
  );
};

// Placeholder generator (for demo without LLM)
const generatePlaceholderComponent = (prompt) => {
  // Extract keywords to customize the generated component
  const hasStatus = /status|health|online|offline/i.test(prompt);
  const hasStats = /stat|metric|number|count/i.test(prompt);
  const hasProgress = /progress|bar|percentage/i.test(prompt);
  const hasButtons = /button|action|click/i.test(prompt);

  if (hasStatus && hasProgress) {
    return `function GeneratedWidget() {
  const [health] = useState({
    cpu: 45,
    memory: 72,
    disk: 38,
  });
  
  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Server Health</CardTitle>
          <StatusBadge status="online" pulse />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">CPU</span>
            <span className="text-cyan-400">{health.cpu}%</span>
          </div>
          <Progress value={health.cpu} accent="cyan" size="sm" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Memory</span>
            <span className="text-amber-400">{health.memory}%</span>
          </div>
          <Progress value={health.memory} accent="amber" size="sm" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Disk</span>
            <span className="text-emerald-400">{health.disk}%</span>
          </div>
          <Progress value={health.disk} accent="emerald" size="sm" />
        </div>
      </CardContent>
    </Card>
  );
}`;
  }

  if (hasStats) {
    return `function GeneratedWidget() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        title="Total Requests"
        value="12,847"
        trend="up"
        trendValue="+12%"
        accent="cyan"
      />
      <StatCard
        title="Response Time"
        value="45ms"
        trend="down"
        trendValue="-8%"
        accent="emerald"
      />
      <StatCard
        title="Error Rate"
        value="0.3%"
        trend="neutral"
        accent="amber"
      />
      <StatCard
        title="Active Users"
        value="847"
        trend="up"
        trendValue="+23%"
        accent="purple"
      />
    </div>
  );
}`;
  }

  // Default generic component
  return `function GeneratedWidget() {
  const [value, setValue] = useState('');
  
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Generated Widget</CardTitle>
        <CardDescription>Based on: "${prompt.slice(0, 50)}..."</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Input" hint="Enter something">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type here..."
          />
        </FormField>
        <div className="flex gap-2">
          <Button variant="primary">Submit</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}`;
};

export default {
  ComponentPreview,
  ComponentGenerator,
  DesignInstruction,
  COMPONENT_GENERATION_PROMPT,
  generateComponentCode,
  DEFAULT_SCOPE,
};
