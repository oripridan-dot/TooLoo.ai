// @version 2.0.0-alpha.0
/**
 * SafeRender Component
 * Error boundary wrapper for AI-generated UI with Cortex feedback loop
 * 
 * @description Wraps dynamic/generated components in error handling that:
 *   1. Catches render errors without crashing the app
 *   2. Reports failures back to Cortex for self-healing
 *   3. Provides retry and fallback mechanisms
 *   4. Tracks error patterns for learning
 * 
 * @intent Enable safe execution of LLM-generated code with automatic
 *         error recovery and feedback to the AI system
 */

import React, { Component, useState, useCallback } from 'react';
import { apiRequest, ComplexityLevel } from '../utils/api.js';

// =============================================================================
// ERROR REPORTING TO CORTEX
// =============================================================================

/**
 * Report a generation error to Cortex for learning
 * @param {Object} errorData - Error details
 */
async function reportToCortex(errorData) {
  try {
    await apiRequest('/system/report-error', {
      method: 'POST',
      body: JSON.stringify({
        type: 'generation_error',
        component: errorData.componentName,
        error: errorData.message,
        stack: errorData.stack,
        code: errorData.generatedCode,
        timestamp: new Date().toISOString(),
        context: {
          prompt: errorData.originalPrompt,
          retryCount: errorData.retryCount,
        },
      }),
      complexity: ComplexityLevel.LOW, // Error reporting is simple
    });
    console.log('[SafeRender] Error reported to Cortex');
  } catch (e) {
    // Don't crash if reporting fails
    console.warn('[SafeRender] Failed to report error to Cortex:', e.message);
  }
}

/**
 * Request a regeneration from Cortex
 * @param {Object} context - Context for regeneration
 * @returns {Promise<string|null>} New generated code or null
 */
async function requestRegeneration(context) {
  try {
    const response = await apiRequest('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: `The previous generated code failed with error: "${context.error}". 
                  Please fix the following code:\n\`\`\`jsx\n${context.code}\n\`\`\`
                  Original request was: ${context.originalPrompt}`,
        sessionId: context.sessionId,
        metadata: {
          regenerationAttempt: context.retryCount + 1,
          previousError: context.error,
        },
      }),
      complexity: ComplexityLevel.HIGH, // Fixing code is complex
    });
    
    // Extract code from response
    const codeMatch = response.data?.content?.match(/```(?:jsx|javascript)?\n([\s\S]*?)```/);
    return codeMatch?.[1] || null;
  } catch (e) {
    console.warn('[SafeRender] Failed to request regeneration:', e.message);
    return null;
  }
}

// =============================================================================
// SAFE RENDER CLASS COMPONENT (Error Boundary)
// =============================================================================

/**
 * Error Boundary for AI-generated components
 */
class SafeRenderBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRegenerating: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { componentName, generatedCode, originalPrompt, onError } = this.props;
    
    console.error(`[SafeRender] Error in ${componentName}:`, error);
    
    this.setState({ errorInfo });
    
    // Report to Cortex
    reportToCortex({
      componentName,
      message: error.message,
      stack: error.stack,
      generatedCode,
      originalPrompt,
      retryCount: this.state.retryCount,
    });
    
    // Call optional error callback
    onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleRegenerate = async () => {
    const { generatedCode, originalPrompt, sessionId, onRegenerate } = this.props;
    
    this.setState({ isRegenerating: true });
    
    const newCode = await requestRegeneration({
      code: generatedCode,
      error: this.state.error?.message,
      originalPrompt,
      sessionId,
      retryCount: this.state.retryCount,
    });
    
    this.setState({ isRegenerating: false });
    
    if (newCode && onRegenerate) {
      onRegenerate(newCode);
      this.handleRetry();
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount, isRegenerating } = this.state;
    const { 
      children, 
      componentName, 
      fallback, 
      showDetails = process.env.NODE_ENV === 'development',
      maxRetries = 3,
    } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback({ error, retry: this.handleRetry, regenerate: this.handleRegenerate })
          : fallback;
      }

      // Default error UI
      return (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-400 mb-1">
                {componentName || 'Component'} failed to render
              </h3>
              <p className="text-sm text-red-300/80 mb-3">
                {error?.message || 'An unexpected error occurred'}
              </p>
              
              {showDetails && errorInfo && (
                <details className="mb-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                    Stack trace
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-red-400/70 overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                {retryCount < maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    Retry ({maxRetries - retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleRegenerate}
                  disabled={isRegenerating}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
                >
                  {isRegenerating ? 'Regenerating...' : '🔄 Ask AI to Fix'}
                </button>
              </div>
              
              {retryCount >= maxRetries && (
                <p className="mt-2 text-xs text-yellow-400">
                  Max retries reached. Try regenerating with AI.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// =============================================================================
// FUNCTIONAL WRAPPER WITH HOOKS
// =============================================================================

/**
 * SafeRender functional component with hooks support
 * 
 * @example
 * <SafeRender 
 *   componentName="GeneratedButton"
 *   generatedCode={code}
 *   originalPrompt="Create a blue button"
 * >
 *   <GeneratedButton />
 * </SafeRender>
 */
export default function SafeRender({
  children,
  componentName = 'GeneratedComponent',
  generatedCode,
  originalPrompt,
  sessionId,
  fallback,
  showDetails,
  maxRetries,
  onError,
  onRegenerate,
}) {
  const [currentCode, setCurrentCode] = useState(generatedCode);
  
  const handleRegenerate = useCallback((newCode) => {
    setCurrentCode(newCode);
    onRegenerate?.(newCode);
  }, [onRegenerate]);

  return (
    <SafeRenderBoundary
      componentName={componentName}
      generatedCode={currentCode}
      originalPrompt={originalPrompt}
      sessionId={sessionId}
      fallback={fallback}
      showDetails={showDetails}
      maxRetries={maxRetries}
      onError={onError}
      onRegenerate={handleRegenerate}
    >
      {children}
    </SafeRenderBoundary>
  );
}

// =============================================================================
// HIGHER-ORDER COMPONENT VERSION
// =============================================================================

/**
 * HOC to wrap any component in SafeRender
 * 
 * @example
 * const SafeButton = withSafeRender(GeneratedButton, { componentName: 'Button' });
 */
export function withSafeRender(WrappedComponent, options = {}) {
  return function SafeWrappedComponent(props) {
    return (
      <SafeRender {...options}>
        <WrappedComponent {...props} />
      </SafeRender>
    );
  };
}

export { SafeRenderBoundary, reportToCortex, requestRegeneration };
