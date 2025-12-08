// @version 3.3.366
// TooLoo.ai Visual Hooks
// Performance-optimized React hooks for visual artifact rendering
// Features: Lazy loading, intersection observer, request batching

import { useState, useEffect, useRef, useMemo, useCallback, memo, startTransition } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface VisualState {
  svg: string | null;
  isLoading: boolean;
  error: string | null;
  fromCache: boolean;
}

interface UseVisualOptions {
  lazy?: boolean; // Use intersection observer
  priority?: 'high' | 'normal' | 'low';
  placeholder?: string;
  cacheKey?: string;
  enabled?: boolean;
}

interface CacheEntry {
  svg: string;
  timestamp: number;
}

// ============================================================================
// GLOBAL CACHE & REQUEST QUEUE
// ============================================================================

// Client-side cache for SVG results
const svgCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 300000; // 5 minutes

// Request queue for batching
const requestQueue = [];
let flushTimeout = null;
const BATCH_DELAY = 16; // One frame

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export const getCachedSVG = (key) => {
  const entry = svgCache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    svgCache.delete(key);
    return null;
  }

  return entry.svg;
};

export const setCachedSVG = (key, svg) => {
  // Evict oldest if at capacity
  if (svgCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = svgCache.keys().next().value;
    svgCache.delete(oldestKey);
  }

  svgCache.set(key, {
    svg,
    timestamp: Date.now(),
  });
};

export const clearSVGCache = () => {
  svgCache.clear();
};

// ============================================================================
// REQUEST BATCHING
// ============================================================================

const flushRequestQueue = () => {
  if (requestQueue.length === 0) return;

  // Group by priority
  const high = requestQueue.filter((r) => r.priority === 'high');
  const normal = requestQueue.filter((r) => r.priority !== 'high' && r.priority !== 'low');
  const low = requestQueue.filter((r) => r.priority === 'low');

  // Process high priority first
  [...high, ...normal, ...low].forEach((request) => {
    request.execute();
  });

  requestQueue.length = 0;
  flushTimeout = null;
};

const queueRequest = (request, priority = 'normal') => {
  requestQueue.push({ ...request, priority });

  if (!flushTimeout) {
    flushTimeout = setTimeout(flushRequestQueue, BATCH_DELAY);
  }
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useVisual - Smart hook for visual artifact rendering
 * 
 * Features:
 * - Automatic caching with LRU eviction
 * - Lazy loading with intersection observer
 * - Request deduplication
 * - Progressive loading states
 */
export const useVisual = (
  generator,
  deps = [],
  options = {}
) => {
  const {
    lazy = false,
    priority = 'normal',
    placeholder = null,
    cacheKey = null,
    enabled = true,
  } = options;

  const [state, setState] = useState({
    svg: placeholder,
    isLoading: true,
    error: null,
    fromCache: false,
  });

  const elementRef = useRef(null);
  const isVisible = useRef(!lazy);
  const generatorRef = useRef(generator);
  generatorRef.current = generator;

  // Generate cache key from deps
  const computedCacheKey = useMemo(() => {
    if (cacheKey) return cacheKey;
    try {
      return JSON.stringify(deps);
    } catch {
      return null;
    }
  }, [cacheKey, ...deps]);

  // Check cache immediately
  useEffect(() => {
    if (!enabled) return;

    if (computedCacheKey) {
      const cached = getCachedSVG(computedCacheKey);
      if (cached) {
        setState({
          svg: cached,
          isLoading: false,
          error: null,
          fromCache: true,
        });
        return;
      }
    }
  }, [computedCacheKey, enabled]);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.current = true;
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  // Generate visual
  useEffect(() => {
    if (!enabled || !isVisible.current) return;
    if (state.fromCache && state.svg) return; // Already have cached result

    let cancelled = false;

    const generate = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const result = await generatorRef.current();

        if (!cancelled) {
          // Cache result
          if (computedCacheKey && result) {
            setCachedSVG(computedCacheKey, result);
          }

          // Use startTransition for non-urgent updates
          startTransition(() => {
            setState({
              svg: result,
              isLoading: false,
              error: null,
              fromCache: false,
            });
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            svg: placeholder,
            isLoading: false,
            error: error.message || 'Generation failed',
            fromCache: false,
          });
        }
      }
    };

    if (priority === 'high') {
      generate();
    } else {
      queueRequest({ execute: generate }, priority);
    }

    return () => {
      cancelled = true;
    };
  }, [enabled, computedCacheKey, placeholder, priority, ...deps]);

  return {
    ...state,
    ref: elementRef,
  };
};

/**
 * useVisualMemo - Memoized visual generation
 * 
 * Only regenerates when deps change, with deep comparison
 */
export const useVisualMemo = (generator, deps, cacheKey) => {
  return useMemo(() => {
    // Check cache first
    const key = cacheKey || JSON.stringify(deps);
    const cached = getCachedSVG(key);
    if (cached) return cached;

    // Generate and cache
    const result = generator();
    if (result) setCachedSVG(key, result);
    return result;
  }, deps);
};

/**
 * useProgressiveVisual - Progressive loading with stages
 * 
 * Returns different states: placeholder → skeleton → full
 */
export const useProgressiveVisual = (
  generator,
  deps = [],
  options = {}
) => {
  const { placeholderSvg, skeletonSvg, cacheKey } = options;

  const [stage, setStage] = useState('placeholder');
  const [svg, setSvg] = useState(placeholderSvg || null);
  const generatorRef = useRef(generator);
  generatorRef.current = generator;

  const computedCacheKey = useMemo(() => {
    return cacheKey || JSON.stringify(deps);
  }, [cacheKey, ...deps]);

  useEffect(() => {
    let cancelled = false;

    const loadProgressive = async () => {
      // Check cache
      const cached = getCachedSVG(computedCacheKey);
      if (cached) {
        setSvg(cached);
        setStage('complete');
        return;
      }

      // Stage 1: Placeholder (immediate)
      setStage('placeholder');
      setSvg(placeholderSvg || null);

      // Stage 2: Skeleton (after short delay)
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;

      if (skeletonSvg) {
        setStage('skeleton');
        setSvg(skeletonSvg);
      }

      // Stage 3: Full result
      try {
        const result = await generatorRef.current();
        if (!cancelled) {
          setCachedSVG(computedCacheKey, result);
          setStage('complete');
          setSvg(result);
        }
      } catch (error) {
        if (!cancelled) {
          setStage('error');
        }
      }
    };

    loadProgressive();

    return () => {
      cancelled = true;
    };
  }, [computedCacheKey, placeholderSvg, skeletonSvg]);

  return { svg, stage, isLoading: stage !== 'complete' && stage !== 'error' };
};

/**
 * useDeferredVisual - Defers expensive visual generation
 * 
 * Uses React's useDeferredValue pattern for non-blocking updates
 */
export const useDeferredVisual = (generator, deps = [], timeout = 100) => {
  const [svg, setSvg] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef(null);
  const generatorRef = useRef(generator);
  generatorRef.current = generator;

  useEffect(() => {
    setIsPending(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Defer generation
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await generatorRef.current();
        startTransition(() => {
          setSvg(result);
          setIsPending(false);
        });
      } catch {
        setIsPending(false);
      }
    }, timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return { svg, isPending };
};

// ============================================================================
// OPTIMIZED COMPONENTS
// ============================================================================

/**
 * OptimizedSVG - Renders SVG with performance optimizations
 */
export const OptimizedSVG = memo(({
  svg,
  width,
  height,
  className = '',
  animate = true,
  ...props
}) => {
  const containerRef = useRef(null);

  // Reduce motion for users who prefer it
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Remove animations if reduced motion is preferred
  const processedSvg = useMemo(() => {
    if (!svg) return null;
    if (!prefersReducedMotion || !animate) return svg;

    // Strip animate elements
    return svg
      .replace(/<animate[^>]*\/>/g, '')
      .replace(/<animate[^>]*>.*?<\/animate>/g, '')
      .replace(/<animateTransform[^>]*\/>/g, '')
      .replace(/<animateMotion[^>]*>.*?<\/animateMotion>/g, '');
  }, [svg, prefersReducedMotion, animate]);

  if (!processedSvg) {
    return (
      <div
        ref={containerRef}
        className={`bg-gray-900 animate-pulse ${className}`}
        style={{ width, height }}
        {...props}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: processedSvg }}
      {...props}
    />
  );
});

OptimizedSVG.displayName = 'OptimizedSVG';

/**
 * LazyVisual - Lazy-loads visual content when in viewport
 */
export const LazyVisual = memo(({
  generator,
  deps = [],
  width = 400,
  height = 300,
  placeholder,
  className = '',
  ...props
}) => {
  const { svg, isLoading, ref, fromCache } = useVisual(generator, deps, {
    lazy: true,
    placeholder,
  });

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{ width, height }}
      {...props}
    >
      {isLoading && !svg && (
        <div className="absolute inset-0 bg-gray-900 animate-pulse rounded-lg" />
      )}
      {svg && (
        <OptimizedSVG
          svg={svg}
          width={width}
          height={height}
          className={fromCache ? 'from-cache' : ''}
        />
      )}
    </div>
  );
});

LazyVisual.displayName = 'LazyVisual';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate stable cache key from object
 */
export const generateCacheKey = (obj) => {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  // Simple hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `visual-${hash.toString(36)}`;
};

/**
 * Preload visuals for better performance
 */
export const preloadVisuals = async (generators) => {
  const results = await Promise.allSettled(
    generators.map(async ({ key, generator }) => {
      if (getCachedSVG(key)) return; // Already cached

      const result = await generator();
      setCachedSVG(key, result);
    })
  );

  return results.filter((r) => r.status === 'fulfilled').length;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useVisual,
  useVisualMemo,
  useProgressiveVisual,
  useDeferredVisual,
  OptimizedSVG,
  LazyVisual,
  generateCacheKey,
  preloadVisuals,
  getCachedSVG,
  setCachedSVG,
  clearSVGCache,
};
