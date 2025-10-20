/**
 * Intent Bus Engine
 * 
 * Central nervous system for TooLoo Parallel Multi-Station OS.
 * Normalizes all user inputs into rich Intent Packets.
 * Routes to appropriate stations, tracks confidence, orchestrates tournaments.
 * 
 * Intent Packet structure:
 * {
 *   id: unique identifier,
 *   timestamp: ISO string,
 *   prompt: user-facing text,
 *   screenContext: { screenshot, ocrTags, visualMetadata },
 *   segmentationContext: [tier1, tier2, tier3],
 *   metadata: { userId, sessionId, source },
 *   executionPlan: {
 *     candidatePlans: [ { lane, models, tools, dod } ],
 *     selectedPlan: {},
 *     tournamentConfig: {}
 *   },
 *   artifacts: [],
 *   verdicts: [],
 *   confidence: 0.0,
 *   status: 'pending|running|complete|failed'
 * }
 */

import { v4 as uuidv4 } from 'uuid';

export class IntentPacket {
  constructor(prompt, options = {}) {
    this.id = options.id || uuidv4();
    this.timestamp = new Date().toISOString();
    this.prompt = prompt;
    this.originalPrompt = prompt;
    
    // Context layers
    this.screenContext = options.screenContext || {};
    this.segmentationContext = options.segmentationContext || []; // [tier1, tier2, tier3]
    this.metadata = {
      userId: options.userId || 'anonymous',
      sessionId: options.sessionId || uuidv4(),
      source: options.source || 'chat',
      priority: options.priority || 'normal',
      ...options.metadata
    };
    
    // Execution plan (built by chooser)
    this.executionPlan = {
      candidatePlans: [],
      selectedPlan: null,
      tournamentConfig: {
        size: 3,
        minConfidence: 0.82,
        maxRetries: 2,
        maxParallel: 8,
        timeCapMs: 6 * 60 * 1000 // 6 minutes
      }
    };
    
    // Results
    this.artifacts = [];
    this.verdicts = [];
    this.confidence = 0;
    this.status = 'pending';
    this.startTime = Date.now();
    this.errors = [];
  }
  
  /**
   * Add screen context (screenshot + OCR)
   */
  withScreenContext(screenshot, ocrTags = []) {
    this.screenContext = {
      screenshot,
      ocrTags,
      capturedAt: new Date().toISOString(),
      isPrimary: true
    };
    return this;
  }
  
  /**
   * Add segmentation context (3-tier memory)
   */
  withSegmentationContext(tier1, tier2, tier3) {
    this.segmentationContext = [tier1, tier2, tier3].filter(Boolean);
    return this;
  }
  
  /**
   * Build augmented prompt with context
   */
  getAugmentedPrompt() {
    let aug = this.originalPrompt;
    
    if (this.segmentationContext.length > 0) {
      aug += '\n\n[CONTEXT (3-tier memory)]';
      this.segmentationContext.forEach((ctx, idx) => {
        aug += `\nTier ${idx + 1}: ${typeof ctx === 'string' ? ctx : JSON.stringify(ctx).substring(0, 200)}`;
      });
    }
    
    if (this.screenContext && this.screenContext.ocrTags && this.screenContext.ocrTags.length > 0) {
      aug += '\n\n[SCREEN CONTEXT (OCR)]';
      aug += '\nVisible elements: ' + this.screenContext.ocrTags.join(', ');
    }
    
    return aug;
  }
  
  /**
   * Record a candidate plan
   */
  addCandidatePlan(plan) {
    this.executionPlan.candidatePlans.push({
      id: uuidv4(),
      lane: plan.lane || 'focus',
      models: plan.models || [],
      tools: plan.tools || [],
      dod: plan.dod || {},
      estimatedCostUsd: plan.estimatedCostUsd || 0,
      estimatedTimeMs: plan.estimatedTimeMs || 0,
      ...plan
    });
    return this;
  }
  
  /**
   * Record an artifact + verdict
   */
  addArtifact(artifact, verdict) {
    this.artifacts.push({
      id: artifact.id || uuidv4(),
      type: artifact.type || 'text',
      content: artifact.content || '',
      modelSource: artifact.modelSource,
      createdAt: new Date().toISOString(),
      verdict: verdict || {}
    });
    return this;
  }
  
  /**
   * Calculate overall confidence
   */
  calculateConfidence() {
    if (this.verdicts.length === 0) {
      this.confidence = 0;
      return 0;
    }
    
    const weights = {
      deterministic: 0.30,
      grounding: 0.20,
      critic: 0.15,
      semantic: 0.15,
      reliability: 0.10,
      cost: -0.10
    };
    
    let score = 0;
    let count = 0;
    
    this.verdicts.forEach(v => {
      for (const [key, weight] of Object.entries(weights)) {
        if (v[key] !== undefined && v[key] !== null) {
          score += (v[key] || 0) * weight;
          count++;
        }
      }
    });
    
    this.confidence = Math.min(1, Math.max(0, count > 0 ? score / count : 0));
    return this.confidence;
  }
  
  /**
   * Mark as complete
   */
  complete(finalConfidence = null) {
    this.status = 'complete';
    if (finalConfidence !== null) this.confidence = finalConfidence;
    this.endTime = Date.now();
    return this;
  }
  
  /**
   * Mark as failed
   */
  fail(error) {
    this.status = 'failed';
    this.errors.push({
      message: error.message || String(error),
      stack: error.stack,
      at: new Date().toISOString()
    });
    return this;
  }
  
  /**
   * Get elapsed time
   */
  getElapsedMs() {
    return (this.endTime || Date.now()) - this.startTime;
  }
}

export class IntentBus {
  constructor(options = {}) {
    this.config = {
      storageDir: options.storageDir || process.cwd() + '/data/intent-bus',
      maxHistorySize: options.maxHistorySize || 1000,
      enablePersist: options.enablePersist !== false,
      ...options
    };
    
    this.history = [];
    this.handlers = new Map(); // status -> [handlers]
    this.middlewares = [];
  }
  
  /**
   * Create a new Intent Packet
   */
  createIntent(prompt, options = {}) {
    return new IntentPacket(prompt, options);
  }
  
  /**
   * Register a middleware to enrich intents
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }
  
  /**
   * Register a status change handler
   */
  on(status, handler) {
    if (!this.handlers.has(status)) {
      this.handlers.set(status, []);
    }
    this.handlers.get(status).push(handler);
    return this;
  }
  
  /**
   * Process an intent through the bus
   */
  async process(intent) {
    try {
      intent.status = 'running';
      this.emit('running', intent);
      
      // Apply middlewares
      for (const mw of this.middlewares) {
        await mw(intent);
      }
      
      this.history.push(intent);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
      
      return intent;
    } catch (error) {
      intent.fail(error);
      this.emit('failed', intent);
      throw error;
    }
  }
  
  /**
   * Emit event to handlers
   */
  emit(status, intent) {
    const handlers = this.handlers.get(status) || [];
    handlers.forEach(h => {
      try {
        h(intent);
      } catch (e) {
        console.error(`Intent bus handler error (${status}):`, e.message);
      }
    });
  }
  
  /**
   * Get intent history (optional filtering)
   */
  getHistory(filter = {}) {
    let results = this.history;
    
    if (filter.status) {
      results = results.filter(i => i.status === filter.status);
    }
    if (filter.sessionId) {
      results = results.filter(i => i.metadata.sessionId === filter.sessionId);
    }
    if (filter.limit) {
      results = results.slice(-filter.limit);
    }
    
    return results;
  }
}

export default IntentBus;
