/**
 * @file RealityRenderer - The Chameleon UI
 * @description Universal renderer that morphs based on skill output
 * @version 2.0.0
 *
 * SYNAPSYS SINGULARITY ARCHITECTURE
 * =================================
 * The frontend becomes a "Reality Renderer." It doesn't know what it's
 * displaying until the Nucleus tells it. The UI is 100% data-driven.
 *
 * Two modes:
 * - Static: Pre-built React components (fast, optimized)
 * - Generative: AI-generated UI (flexible, dynamic)
 */

import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface InvokeResponse {
  ok: boolean;
  skillId: string | null;
  skillName: string | null;
  data?: unknown;
  ui: {
    type: 'static' | 'generative' | 'headless';
    component?: string;
    designPrompt?: string;
    layout?: {
      position?: 'main' | 'sidebar' | 'modal' | 'toast' | 'floating';
      size?: 'sm' | 'md' | 'lg' | 'full';
      animate?: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    duration: number;
    routing?: {
      confidence: number;
      matchType: string;
    };
  };
}

export interface RealityRendererProps {
  /** The response from /synapsys/invoke */
  response: InvokeResponse | null;

  /** Loading state */
  isLoading?: boolean;

  /** Callback to send messages back to the kernel */
  onEmit?: (intent: string, payload?: unknown) => void;

  /** Custom error renderer */
  errorComponent?: React.ComponentType<{ error: InvokeResponse['error'] }>;

  /** Custom loading renderer */
  loadingComponent?: React.ComponentType;
}

// =============================================================================
// SKILL FACE REGISTRY
// =============================================================================

/**
 * Registry of pre-built skill UI components
 * These are lazy-loaded for optimal performance
 */
const SkillFaces: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'core.chat': lazy(() => import('../skills/ChatFace.jsx')),
  'core.system': lazy(() => import('../skills/SystemFace.jsx')),
  // Add more skill faces here as needed
  // 'core.code': lazy(() => import('../skills/CodeFace.jsx')),
  // 'core.weather': lazy(() => import('../skills/WeatherFace.jsx')),
};

// =============================================================================
// GENERATIVE UI COMPONENT
// =============================================================================

interface GenerativeUIProps {
  prompt: string;
  data: unknown;
  onEmit?: (intent: string, payload?: unknown) => void;
}

/**
 * GenerativeUI - AI-generated interface
 * This component uses AI to generate UI based on the design prompt
 */
function GenerativeUI({ prompt, data, onEmit }: GenerativeUIProps) {
  const [generatedUI, setGeneratedUI] = useState<React.ReactNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    // TODO: Implement actual AI UI generation
    // For now, render a placeholder with the data
    setIsGenerating(false);
    setGeneratedUI(
      <div className="generative-ui p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20">
        <div className="text-xs text-purple-400 mb-2">✨ Generative UI</div>
        <div className="text-sm text-gray-300 mb-3 italic">"{prompt}"</div>
        <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-60">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }, [prompt, data]);

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-purple-400">Generating interface...</span>
      </div>
    );
  }

  return <>{generatedUI}</>;
}

// =============================================================================
// DEFAULT COMPONENTS
// =============================================================================

function DefaultLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-pulse flex space-x-2">
        <div
          className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="ml-3 text-gray-400">Processing...</span>
    </div>
  );
}

function DefaultError({ error }: { error: InvokeResponse['error'] }) {
  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-center text-red-400 mb-2">
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-medium">{error?.code ?? 'ERROR'}</span>
      </div>
      <p className="text-gray-300">{error?.message ?? 'An unknown error occurred'}</p>
      {error?.details && (
        <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-auto">
          {JSON.stringify(error.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

function HeadlessOutput({ data, skillName }: { data: unknown; skillName: string | null }) {
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="text-xs text-gray-500 mb-2">
        Headless output from: {skillName ?? 'unknown'}
      </div>
      <pre className="text-sm text-gray-300 overflow-auto max-h-60">
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function WaitingState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
      <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <p className="text-lg font-medium">Waiting for Cortex...</p>
      <p className="text-sm text-gray-600 mt-1">Send a message to activate a skill</p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RealityRenderer - The Universal Chameleon UI
 *
 * This component morphs based on the skill's output and UI instructions.
 * It doesn't know what it's rendering until the Nucleus tells it.
 */
export function RealityRenderer({
  response,
  isLoading = false,
  onEmit,
  errorComponent: ErrorComponent = DefaultError,
  loadingComponent: LoadingComponent = DefaultLoading,
}: RealityRendererProps) {
  // Handle loading state
  if (isLoading) {
    return <LoadingComponent />;
  }

  // Handle no response
  if (!response) {
    return <WaitingState />;
  }

  // Handle error
  if (!response.ok && response.error) {
    return <ErrorComponent error={response.error} />;
  }

  // Handle UI type
  const { ui, data, skillId, skillName } = response;

  // Mode A: Generative UI - AI draws the interface
  if (ui.type === 'generative' && ui.designPrompt) {
    return <GenerativeUI prompt={ui.designPrompt} data={data} onEmit={onEmit} />;
  }

  // Mode B: Static UI - Pre-built components
  if (ui.type === 'static' && skillId && SkillFaces[skillId]) {
    const Component = SkillFaces[skillId];

    return (
      <Suspense fallback={<LoadingComponent />}>
        <Component data={data} emit={onEmit} layout={ui.layout} />
      </Suspense>
    );
  }

  // Mode C: Headless - Just output the data
  return <HeadlessOutput data={data} skillName={skillName} />;
}

// =============================================================================
// HOOK: useSynapsysInvoke
// =============================================================================

interface UseSynapsysOptions {
  baseUrl?: string;
  onResponse?: (response: InvokeResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for invoking skills and managing state
 */
export function useSynapsysInvoke(options: UseSynapsysOptions = {}) {
  const { baseUrl = 'http://localhost:4002', onResponse, onError } = options;

  const [response, setResponse] = useState<InvokeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const invoke = useCallback(
    async (intent: string, payload?: unknown, skillId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`${baseUrl}/synapsys/invoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent,
            payload,
            skillId,
            context: {
              sessionId: sessionStorage.getItem('synapsys_session') ?? `sess_${Date.now()}`,
            },
          }),
        });

        const data = (await res.json()) as InvokeResponse;
        setResponse(data);
        onResponse?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, onResponse, onError]
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return {
    invoke,
    reset,
    response,
    isLoading,
    error,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default RealityRenderer;
