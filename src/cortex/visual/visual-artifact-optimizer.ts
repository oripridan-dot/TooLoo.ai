// @version 3.3.365
// TooLoo.ai Visual Artifact Optimizer
// Intelligent caching, memoization, and progressive rendering for visual artifacts
// Dramatically improves performance through smart precomputation and lazy evaluation

import { bus } from '../../core/event-bus.js';
import crypto from 'crypto';

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  size: number;
  key: string;
}

/**
 * High-performance LRU Cache with size-based eviction
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private currentSize: number = 0;
  private maxEntries: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: { maxSizeBytes?: number; maxEntries?: number } = {}) {
    this.maxSize = options.maxSizeBytes || 50 * 1024 * 1024; // 50MB default
    this.maxEntries = options.maxEntries || 1000;
  }

  /**
   * Get item from cache with access tracking
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Update access metadata
    entry.accessCount++;
    entry.timestamp = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Set item in cache with size tracking
   */
  set(key: string, value: T, sizeEstimate?: number): void {
    const size = sizeEstimate || this.estimateSize(value);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
      this.cache.delete(key);
    }

    // Evict entries if needed
    while (
      (this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size,
      key,
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      const entry = this.cache.get(firstKey)!;
      this.currentSize -= entry.size;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    return JSON.stringify(value).length * 2;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    sizeBytes: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    const total = this.hits + this.misses;
    return {
      entries: this.cache.size,
      sizeBytes: this.currentSize,
      hitRate: total > 0 ? this.hits / total : 0,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// ============================================================================
// PRECOMPUTED VISUAL TEMPLATES
// ============================================================================

/**
 * Pre-generated SVG templates for common patterns
 * These are generated once and reused with variable interpolation
 */
export const PRECOMPUTED_TEMPLATES = {
  // Gradient definitions - most commonly used
  gradients: {
    primary: `<linearGradient id="grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>`,
    secondary: `<linearGradient id="grad-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06B6D4"/>
      <stop offset="100%" style="stop-color:#8B5CF6"/>
    </linearGradient>`,
    accent: `<linearGradient id="grad-accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f093fb"/>
      <stop offset="100%" style="stop-color:#f5576c"/>
    </linearGradient>`,
  },

  // Common filter effects
  filters: {
    glow: `<filter id="filter-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>`,
    shadow: `<filter id="filter-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.3"/>
    </filter>`,
    softBlur: `<filter id="filter-softBlur"><feGaussianBlur stdDeviation="8"/></filter>`,
  },

  // Background patterns
  backgrounds: {
    dark: '<rect width="100%" height="100%" fill="#0a0a0f"/>',
    gradient: '<rect width="100%" height="100%" fill="url(#grad-primary)"/>',
    dots: `<pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.1)"/>
    </pattern><rect width="100%" height="100%" fill="#0a0a0f"/><rect width="100%" height="100%" fill="url(#dots)"/>`,
  },
} as const;

// ============================================================================
// VISUAL ARTIFACT OPTIMIZER
// ============================================================================

export interface OptimizationOptions {
  enableCaching?: boolean;
  enableMemoization?: boolean;
  enableProgressive?: boolean;
  enablePrecomputation?: boolean;
  cacheMaxSize?: number;
  cacheTTL?: number;
}

export interface GenerationRequest {
  type: 'chart' | 'diagram' | 'animation' | 'svg' | 'component';
  data?: unknown;
  options?: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}

export interface GenerationResult {
  svg: string;
  fromCache: boolean;
  generationTime: number;
  cacheKey?: string;
}

/**
 * Visual Artifact Optimizer
 * 
 * Provides intelligent caching, memoization, and progressive rendering
 * for visual artifact generation. Key optimizations:
 * 
 * 1. LRU Cache - Stores generated SVGs with smart eviction
 * 2. Content-addressable keys - Same input = same output = cache hit
 * 3. Template interpolation - Pre-built templates for common patterns
 * 4. Progressive loading - Show placeholders while generating
 * 5. Request deduplication - Prevents duplicate work for same requests
 */
export class VisualArtifactOptimizer {
  private static instance: VisualArtifactOptimizer;

  // Caches for different artifact types
  private svgCache: LRUCache<string>;
  private templateCache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<GenerationResult>> = new Map();

  // Precomputed defs block
  private precomputedDefs: string;

  // Statistics
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgGenerationTime: 0,
    deduplicatedRequests: 0,
  };

  // Configuration
  private options: Required<OptimizationOptions> = {
    enableCaching: true,
    enableMemoization: true,
    enableProgressive: true,
    enablePrecomputation: true,
    cacheMaxSize: 50 * 1024 * 1024, // 50MB
    cacheTTL: 300000, // 5 minutes
  };

  static getInstance(): VisualArtifactOptimizer {
    if (!this.instance) {
      this.instance = new VisualArtifactOptimizer();
    }
    return this.instance;
  }

  constructor(options?: OptimizationOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Initialize cache
    this.svgCache = new LRUCache({ maxSizeBytes: this.options.cacheMaxSize });

    // Precompute common defs block
    this.precomputedDefs = this.buildPrecomputedDefs();

    // Initialize template cache
    this.initializeTemplates();

    // Subscribe to optimization events
    bus.on('cortex:visual_cache_clear', () => {
      this.clearCache();
    });

    console.log('[VisualOptimizer] ✓ Initialized with intelligent caching');
  }

  // -------------------------------------------------------------------------
  // CORE OPTIMIZATION METHODS
  // -------------------------------------------------------------------------

  /**
   * Generate a cache key from request parameters
   * Uses content-addressable hashing for deduplication
   */
  generateCacheKey(request: GenerationRequest): string {
    const normalized = JSON.stringify({
      type: request.type,
      data: request.data,
      options: request.options,
    });
    return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Get or generate SVG with intelligent caching
   */
  async getOrGenerate(
    request: GenerationRequest,
    generator: () => Promise<string> | string
  ): Promise<GenerationResult> {
    this.stats.totalRequests++;
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.svgCache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return {
          svg: cached,
          fromCache: true,
          generationTime: performance.now() - startTime,
          cacheKey,
        };
      }
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      this.stats.deduplicatedRequests++;
      return this.pendingRequests.get(cacheKey)!;
    }

    // Generate new result
    this.stats.cacheMisses++;
    const generationPromise = (async () => {
      const result = await generator();
      const generationTime = performance.now() - startTime;

      // Update average generation time
      this.stats.avgGenerationTime =
        (this.stats.avgGenerationTime * (this.stats.totalRequests - 1) + generationTime) /
        this.stats.totalRequests;

      // Cache result
      if (this.options.enableCaching) {
        this.svgCache.set(cacheKey, result);
      }

      // Remove from pending
      this.pendingRequests.delete(cacheKey);

      return {
        svg: result,
        fromCache: false,
        generationTime,
        cacheKey,
      };
    })();

    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, generationPromise);

    return generationPromise;
  }

  // -------------------------------------------------------------------------
  // TEMPLATE-BASED GENERATION
  // -------------------------------------------------------------------------

  /**
   * Build precomputed defs block with common gradients and filters
   */
  private buildPrecomputedDefs(): string {
    const gradients = Object.values(PRECOMPUTED_TEMPLATES.gradients).join('\n    ');
    const filters = Object.values(PRECOMPUTED_TEMPLATES.filters).join('\n    ');

    return `<defs>
    ${gradients}
    ${filters}
  </defs>`;
  }

  /**
   * Initialize template cache with common patterns
   */
  private initializeTemplates(): void {
    // Bar chart template
    this.templateCache.set(
      'bar-chart',
      `<svg viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">
  ${this.precomputedDefs}
  <rect width="{{width}}" height="{{height}}" fill="{{background}}"/>
  {{bars}}
  {{labels}}
</svg>`
    );

    // Line chart template
    this.templateCache.set(
      'line-chart',
      `<svg viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">
  ${this.precomputedDefs}
  <rect width="{{width}}" height="{{height}}" fill="{{background}}"/>
  {{grid}}
  <path d="{{path}}" fill="none" stroke="url(#grad-primary)" stroke-width="2"/>
  {{points}}
</svg>`
    );

    // Pie chart template
    this.templateCache.set(
      'pie-chart',
      `<svg viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">
  ${this.precomputedDefs}
  <rect width="{{width}}" height="{{height}}" fill="{{background}}"/>
  <g transform="translate({{cx}}, {{cy}})">{{slices}}</g>
  {{legend}}
</svg>`
    );

    // Progress indicator template
    this.templateCache.set(
      'progress',
      `<svg viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">
  ${this.precomputedDefs}
  <rect x="0" y="{{trackY}}" width="{{width}}" height="{{trackHeight}}" rx="{{radius}}" fill="{{trackColor}}"/>
  <rect x="0" y="{{trackY}}" width="{{progress}}" height="{{trackHeight}}" rx="{{radius}}" fill="url(#grad-primary)"/>
</svg>`
    );

    // Shimmer loading skeleton template (used during progressive loading)
    this.templateCache.set(
      'placeholder',
      `<svg viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1">
        <animate attributeName="offset" values="-2;1" dur="1.5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" style="stop-color:#2a2a4e;stop-opacity:1">
        <animate attributeName="offset" values="-1;2" dur="1.5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1">
        <animate attributeName="offset" values="0;3" dur="1.5s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
  </defs>
  <rect width="{{width}}" height="{{height}}" fill="url(#shimmer)"/>
</svg>`
    );
  }

  /**
   * Interpolate template with values
   */
  interpolateTemplate(templateName: string, values: Record<string, string | number>): string {
    let template = this.templateCache.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    for (const [key, value] of Object.entries(values)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return template;
  }

  /**
   * Get precomputed defs block
   */
  getPrecomputedDefs(): string {
    return this.precomputedDefs;
  }

  // -------------------------------------------------------------------------
  // PROGRESSIVE RENDERING
  // -------------------------------------------------------------------------

  /**
   * Generate a placeholder SVG for progressive loading
   */
  generatePlaceholder(width: number, height: number): string {
    return this.interpolateTemplate('placeholder', { width, height });
  }

  /**
   * Generate progressive loading stages
   */
  generateProgressiveStages(
    request: GenerationRequest,
    generator: () => Promise<string>
  ): AsyncGenerator<string> {
    const self = this;
    const width = (request.options?.['width'] as number) || 800;
    const height = (request.options?.['height'] as number) || 600;

    return (async function* () {
      // Stage 1: Immediate placeholder
      yield self.generatePlaceholder(width, height);

      // Stage 2: Skeleton with basic structure
      yield self.generateSkeleton(request.type, width, height);

      // Stage 3: Full result
      const result = await generator();
      yield result;
    })();
  }

  /**
   * Generate skeleton SVG based on type
   */
  private generateSkeleton(type: string, width: number, height: number): string {
    const background = '#0a0a0f';
    const skeletonColor = '#1a1a2e';

    switch (type) {
      case 'chart':
        // Bar chart skeleton
        const bars = Array.from({ length: 6 })
          .map((_, i) => {
            const x = 80 + i * 100;
            const barHeight = 50 + Math.random() * 200;
            return `<rect x="${x}" y="${height - 60 - barHeight}" width="60" height="${barHeight}" fill="${skeletonColor}" rx="4"/>`;
          })
          .join('\n  ');
        return `<svg viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/>${bars}</svg>`;

      case 'diagram':
        // Node diagram skeleton
        const nodes = Array.from({ length: 4 })
          .map((_, i) => {
            const x = 100 + (i % 2) * 300;
            const y = 100 + Math.floor(i / 2) * 200;
            return `<rect x="${x}" y="${y}" width="200" height="80" fill="${skeletonColor}" rx="8"/>`;
          })
          .join('\n  ');
        return `<svg viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/>${nodes}</svg>`;

      default:
        return this.generatePlaceholder(width, height);
    }
  }

  // -------------------------------------------------------------------------
  // MEMOIZATION HELPERS
  // -------------------------------------------------------------------------

  /**
   * Create a memoized version of a generator function
   */
  memoize<T extends (...args: unknown[]) => string>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const memo = new Map<string, string>();

    return ((...args: Parameters<T>): string => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      if (memo.has(key)) {
        return memo.get(key)!;
      }

      const result = fn(...args);
      memo.set(key, result);

      // Limit memo size
      if (memo.size > 500) {
        const firstKey = memo.keys().next().value;
        if (firstKey) memo.delete(firstKey);
      }

      return result;
    }) as T;
  }

  // -------------------------------------------------------------------------
  // OPTIMIZED ELEMENT GENERATORS
  // -------------------------------------------------------------------------

  /**
   * Generate optimized bar elements (batched for performance)
   */
  generateOptimizedBars(
    data: Array<{ value: number; label: string; color?: string }>,
    options: { width: number; height: number; padding?: number; animate?: boolean } = {
      width: 800,
      height: 600,
    }
  ): string {
    const { width, height, padding = 60, animate = true } = options;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barCount = data.length;
    const barWidth = Math.min(60, (chartWidth / barCount) * 0.7);
    const gap = (chartWidth - barWidth * barCount) / (barCount + 1);
    const maxValue = Math.max(...data.map((d) => d.value));

    // Use string builder pattern for performance
    const parts: string[] = [];
    parts.push(`<g transform="translate(${padding}, ${padding})">`);

    for (let i = 0; i < barCount; i++) {
      const d = data[i]!;
      const x = gap + i * (barWidth + gap);
      const barHeight = (d.value / maxValue) * chartHeight;
      const y = chartHeight - barHeight;
      const color = d.color || '#667eea';

      parts.push(
        `<rect x="${x}" y="${animate ? chartHeight : y}" width="${barWidth}" height="${animate ? 0 : barHeight}" fill="${color}" rx="4">`
      );

      if (animate) {
        parts.push(
          `<animate attributeName="y" from="${chartHeight}" to="${y}" dur="0.5s" begin="${i * 0.05}s" fill="freeze"/>`
        );
        parts.push(
          `<animate attributeName="height" from="0" to="${barHeight}" dur="0.5s" begin="${i * 0.05}s" fill="freeze"/>`
        );
      }

      parts.push('</rect>');

      // Label
      parts.push(
        `<text x="${x + barWidth / 2}" y="${chartHeight + 20}" text-anchor="middle" fill="#94a3b8" font-size="12">${d.label}</text>`
      );
    }

    parts.push('</g>');
    return parts.join('');
  }

  /**
   * Generate optimized line path (using simplified path when zoomed out)
   */
  generateOptimizedPath(
    points: Array<{ x: number; y: number }>,
    options: { simplify?: boolean; threshold?: number } = {}
  ): string {
    const { simplify = true, threshold = 2 } = options;

    let processedPoints = points;

    // Douglas-Peucker simplification for zoomed out views
    if (simplify && points.length > 50) {
      processedPoints = this.simplifyPath(points, threshold);
    }

    if (processedPoints.length === 0) return '';

    // Build path string - first point is guaranteed by length check
    const firstPoint = processedPoints[0]!;
    const pathParts = [`M${firstPoint.x},${firstPoint.y}`];

    for (let i = 1; i < processedPoints.length; i++) {
      const pt = processedPoints[i]!;
      pathParts.push(`L${pt.x},${pt.y}`);
    }

    return pathParts.join(' ');
  }

  /**
   * Douglas-Peucker path simplification
   */
  private simplifyPath(
    points: Array<{ x: number; y: number }>,
    epsilon: number
  ): Array<{ x: number; y: number }> {
    if (points.length <= 2) return points;

    // Find point with max distance
    let maxDist = 0;
    let maxIndex = 0;

    const start = points[0]!;
    const end = points[points.length - 1]!;

    for (let i = 1; i < points.length - 1; i++) {
      const pt = points[i]!;
      const dist = this.perpendicularDistance(pt, start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance > epsilon, recursively simplify
    if (maxDist > epsilon) {
      const left = this.simplifyPath(points.slice(0, maxIndex + 1), epsilon);
      const right = this.simplifyPath(points.slice(maxIndex), epsilon);
      return [...left.slice(0, -1), ...right];
    }

    return [start, end];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
      );
    }

    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const nearestX = lineStart.x + t * dx;
    const nearestY = lineStart.y + t * dy;

    return Math.sqrt(Math.pow(point.x - nearestX, 2) + Math.pow(point.y - nearestY, 2));
  }

  // -------------------------------------------------------------------------
  // STATISTICS & MANAGEMENT
  // -------------------------------------------------------------------------

  /**
   * Get optimization statistics
   */
  getStats(): typeof this.stats & { cacheStats: ReturnType<LRUCache<string>['getStats']> } {
    return {
      ...this.stats,
      cacheStats: this.svgCache.getStats(),
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.svgCache.clear();
    this.pendingRequests.clear();
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
    console.log('[VisualOptimizer] Cache cleared');
  }

  /**
   * Warm up cache with common patterns
   */
  async warmUpCache(): Promise<void> {
    console.log('[VisualOptimizer] Warming up cache...');

    // Pre-generate common placeholders
    const sizes: Array<[number, number]> = [
      [400, 300],
      [800, 600],
      [1200, 800],
    ];

    for (const size of sizes) {
      const w = size[0];
      const h = size[1];
      const key = `placeholder-${w}x${h}`;
      if (!this.svgCache.has(key)) {
        this.svgCache.set(key, this.generatePlaceholder(w, h));
      }
    }

    console.log('[VisualOptimizer] ✓ Cache warmed up');
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const visualOptimizer = VisualArtifactOptimizer.getInstance();

export default visualOptimizer;
