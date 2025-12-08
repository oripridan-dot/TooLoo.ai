// @version 3.1.0
/**
 * CuriosityEngine (Enhanced)
 * Multi-dimensional intrinsic motivation system for autonomous exploration.
 * Detects novelty, uncertainty, surprise, complexity, cognitive dissonance,
 * capability gaps, and emergence precursors.
 *
 * NEW in v3.0.0:
 * - Bayesian surprise calculation with actual embedding distances
 * - Cognitive dissonance detection (conflicting knowledge)
 * - Capability gap identification (unused combinations)
 * - Emergence precursor detection (breakthrough signals)
 * - Enhanced temporal analysis
 *
 * NEW in v3.1.0:
 * - Multi-dimensional intrinsic reward vectors
 * - Information gain calculation
 * - Empowerment estimation
 * - Progress-based rewards
 * - Competence tracking
 * - Coordinator integration for reward signals
 */

import { bus } from '../../core/event-bus.js';
import { VectorStore } from '../memory/vector-store.js';

// ============================================================================
// ENHANCED TYPES
// ============================================================================

export type CuriosityType =
  | 'novelty'
  | 'uncertainty'
  | 'surprise'
  | 'complexity'
  | 'dissonance'
  | 'capability_gap'
  | 'emergence_precursor';

export interface CuriositySignal {
  id: string;
  type: CuriosityType;
  description: string;
  score: number; // 0-1, higher = more curious
  context: Record<string, unknown>;
  timestamp: Date;
  dimensions?: CuriosityDimensions;
}

export interface CuriosityDimensions {
  noveltyScore: number;
  uncertaintyScore: number;
  surpriseScore: number;
  complexityScore: number;
  dissonanceScore: number;
  capabilityGapScore: number;
  emergencePotential: number;
}

export interface NoveltyDetection {
  content: string;
  similarityToKnown: number; // 0-1, lower = more novel
  isNovel: boolean;
  embeddingDistance?: number; // actual distance from nearest neighbor
  clusterAssignment?: string;
}

export interface CognitiveDissonance {
  statement1: string;
  statement2: string;
  conflictScore: number; // 0-1, higher = more conflict
  domain: string;
  resolution?: string;
}

export interface CapabilityGap {
  capability1: string;
  capability2: string;
  combinationScore: number; // how rarely combined
  potentialValue: number; // estimated value if explored
}

export interface EmergencePrecursor {
  signals: CuriositySignal[];
  clusterStrength: number;
  emergenceType: 'knowledge' | 'capability' | 'pattern' | 'insight';
  confidence: number;
  predictedTimeframe: number; // ms until emergence
}

// ============================================================================
// INTRINSIC REWARD TYPES (NEW)
// ============================================================================

export type IntrinsicRewardType =
  | 'information_gain'
  | 'empowerment'
  | 'progress'
  | 'novelty'
  | 'competence'
  | 'curiosity_satisfied';

export interface IntrinsicRewardVector {
  informationGain: number; // Reduction in uncertainty
  empowerment: number; // Ability to influence outcomes
  progress: number; // Movement toward goals
  novelty: number; // Exposure to new information
  competence: number; // Mastery demonstration
  curiositySatisfied: number; // Resolution of curiosity
  composite: number; // Weighted combination
}

export interface IntrinsicRewardSignal {
  id: string;
  type: IntrinsicRewardType;
  value: number; // -1 to 1
  vector: IntrinsicRewardVector;
  source: string;
  context: Record<string, unknown>;
  timestamp: Date;
  linkedCuriositySignal?: string;
}

export interface CompetenceState {
  domain: string;
  level: number; // 0-1
  recentSuccesses: number;
  recentFailures: number;
  lastUpdated: Date;
}

export interface ProgressTracker {
  goalId: string;
  goalDescription: string;
  startDistance: number;
  currentDistance: number;
  bestDistance: number;
  lastUpdated: Date;
}

export class CuriosityEngine {
  private vectorStore: VectorStore;
  private curiosityHistory: CuriositySignal[] = [];
  private knowledgeStatements: Map<string, string[]> = new Map(); // domain -> statements
  private capabilityUsage: Map<string, number> = new Map(); // capability combination -> usage count
  private emergenceBuffer: CuriositySignal[] = []; // signals for emergence detection

  // Intrinsic reward state (new)
  private intrinsicRewardHistory: IntrinsicRewardSignal[] = [];
  private competenceByDomain: Map<string, CompetenceState> = new Map();
  private progressTrackers: Map<string, ProgressTracker> = new Map();
  private priorUncertainty: Map<string, number> = new Map(); // domain -> uncertainty level
  private actionableStatesCount: number = 0;

  private readonly MAX_HISTORY = 1000;
  private readonly MAX_REWARD_HISTORY = 500;
  private readonly NOVELTY_THRESHOLD = 0.3; // Below this similarity = novel
  private readonly UNCERTAINTY_THRESHOLD = 0.5; // Below this confidence = uncertain
  private readonly DISSONANCE_THRESHOLD = 0.6; // Above this = cognitive conflict
  private readonly EMERGENCE_CLUSTER_THRESHOLD = 5; // signals needed for emergence
  private readonly EMERGENCE_TIME_WINDOW = 300000; // 5 minutes

  // Intrinsic reward weights
  private readonly REWARD_WEIGHTS = {
    informationGain: 0.25,
    empowerment: 0.15,
    progress: 0.2,
    novelty: 0.2,
    competence: 0.1,
    curiositySatisfied: 0.1,
  };

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
    this.setupListeners();
    this.startEmergenceDetectionCycle();
    console.log(
      '[CuriosityEngine] v3.1.0 - Multi-dimensional curiosity + intrinsic rewards enabled'
    );
  }

  // ============================================================================
  // MULTI-DIMENSIONAL CURIOSITY CALCULATION
  // ============================================================================

  /**
   * Calculate comprehensive curiosity score across all dimensions
   */
  async calculateMultiDimensionalCuriosity(
    context: string,
    metadata: Record<string, unknown> = {}
  ): Promise<CuriositySignal | null> {
    const dimensions: CuriosityDimensions = {
      noveltyScore: 0,
      uncertaintyScore: 0,
      surpriseScore: 0,
      complexityScore: 0,
      dissonanceScore: 0,
      capabilityGapScore: 0,
      emergencePotential: 0,
    };

    // Calculate all dimensions
    const novelty = await this.detectNoveltyEnhanced(context);
    dimensions.noveltyScore = 1 - novelty.similarityToKnown;

    dimensions.uncertaintyScore = this.detectUncertainty(metadata);
    dimensions.complexityScore = this.calculateComplexityScore(context);
    dimensions.dissonanceScore = await this.detectCognitiveDissonance(context, metadata);
    dimensions.capabilityGapScore = this.detectCapabilityGaps(metadata);
    dimensions.emergencePotential = this.calculateEmergencePotential();

    // Calculate Bayesian surprise if we have prior expectations
    if (metadata['expected'] !== undefined && metadata['actual'] !== undefined) {
      dimensions.surpriseScore = this.calculateBayesianSurprise(
        metadata['expected'] as number,
        metadata['actual'] as number
      );
    }

    // Find dominant dimension and overall score
    const dominantType = this.findDominantCuriosityType(dimensions);
    const overallScore = this.calculateOverallCuriosityScore(dimensions);

    // Only create signal if curiosity is significant
    if (overallScore > 0.4) {
      const signal: CuriositySignal = {
        id: `curiosity-${dominantType}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: dominantType,
        description: this.generateCuriosityDescription(dominantType, context, dimensions),
        score: overallScore,
        context: { ...metadata, dimensions },
        timestamp: new Date(),
        dimensions,
      };

      this.recordCuriosity(signal);
      this.addToEmergenceBuffer(signal);

      // Active Curiosity: Trigger hypothesis generation for high uncertainty/gaps
      if (dominantType === 'uncertainty' || dominantType === 'capability_gap') {
        bus.publish('cortex', 'curiosity:gap_detected', {
          signalId: signal.id,
          type: dominantType,
          context: context,
          score: overallScore
        });
      }

      return signal;
    }

    return null;
  }

  /**
   * Calculate curiosity score for a given situation (backwards compatible)
   */
  async calculateCuriosity(
    context: string,
    metadata: Record<string, unknown> = {}
  ): Promise<CuriositySignal | null> {
    // Use enhanced multi-dimensional calculation
    return this.calculateMultiDimensionalCuriosity(context, metadata);
  }

  // ============================================================================
  // BAYESIAN SURPRISE
  // ============================================================================

  /**
   * Calculate Bayesian surprise using KL divergence approximation
   * Measures how much the actual outcome differs from prior expectation
   */
  private calculateBayesianSurprise(expected: number, actual: number): number {
    // Avoid division by zero
    const epsilon = 0.001;
    const p = Math.max(epsilon, Math.min(1 - epsilon, expected));
    const q = Math.max(epsilon, Math.min(1 - epsilon, actual));

    // Simplified KL divergence: D(P||Q) = p*log(p/q) + (1-p)*log((1-p)/(1-q))
    const klDiv = p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q));

    // Normalize to 0-1 range (KL divergence can be unbounded)
    return Math.min(1, Math.tanh(klDiv));
  }

  // ============================================================================
  // COGNITIVE DISSONANCE DETECTION
  // ============================================================================

  /**
   * Detect cognitive dissonance - conflicting knowledge in the system
   */
  private async detectCognitiveDissonance(
    content: string,
    metadata: Record<string, unknown>
  ): Promise<number> {
    const domain = (metadata['domain'] as string) || 'general';

    // Get existing statements for this domain
    const existingStatements = this.knowledgeStatements.get(domain) || [];

    if (existingStatements.length === 0) {
      // Store this statement for future comparison
      if (!this.knowledgeStatements.has(domain)) {
        this.knowledgeStatements.set(domain, []);
      }
      this.knowledgeStatements.get(domain)!.push(content.substring(0, 500));

      // Limit stored statements per domain
      const statements = this.knowledgeStatements.get(domain)!;
      if (statements.length > 100) {
        this.knowledgeStatements.set(domain, statements.slice(-100));
      }

      return 0;
    }

    // Check for potential conflicts using semantic search
    const similar = await this.vectorStore.search(content, 5);

    // Look for contradictory patterns
    let maxDissonance = 0;
    const contradictionPatterns = [
      { positive: /always|never|must|cannot|impossible/i, negative: /sometimes|can|may|possible/i },
      { positive: /best|only|perfect/i, negative: /worst|alternative|flawed/i },
      { positive: /increase|grow|more/i, negative: /decrease|shrink|less/i },
    ];

    for (const doc of similar) {
      const docContent = (doc as { content?: string }).content || '';

      for (const pattern of contradictionPatterns) {
        const contentHasPositive = pattern.positive.test(content);
        const contentHasNegative = pattern.negative.test(content);
        const docHasPositive = pattern.positive.test(docContent);
        const docHasNegative = pattern.negative.test(docContent);

        // Contradiction: one says positive, other says negative
        if ((contentHasPositive && docHasNegative) || (contentHasNegative && docHasPositive)) {
          maxDissonance = Math.max(maxDissonance, 0.7);
        }
      }
    }

    // Emit dissonance event if significant
    if (maxDissonance > this.DISSONANCE_THRESHOLD) {
      bus.publish('cortex', 'curiosity:dissonance_detected', {
        content: content.substring(0, 200),
        domain,
        dissonanceScore: maxDissonance,
        timestamp: new Date().toISOString(),
        reason: 'Contradictory patterns detected in knowledge base',
      });
    }

    // Store this statement
    this.knowledgeStatements.get(domain)!.push(content.substring(0, 500));

    return maxDissonance;
  }

  // ============================================================================
  // CAPABILITY GAP DETECTION
  // ============================================================================

  /**
   * Detect underutilized capability combinations
   */
  private detectCapabilityGaps(metadata: Record<string, unknown>): number {
    const capabilities = (metadata['capabilities'] as string[]) || [];
    if (capabilities.length < 2) return 0;

    // Track capability combinations
    const combinationKey = capabilities.sort().join('+');
    const currentUsage = this.capabilityUsage.get(combinationKey) || 0;
    this.capabilityUsage.set(combinationKey, currentUsage + 1);

    // Calculate how rare this combination is
    const totalUsage = Array.from(this.capabilityUsage.values()).reduce((a, b) => a + b, 0);
    if (totalUsage < 10) return 0; // Need baseline data

    const usageRatio = currentUsage / totalUsage;

    // Rare combinations are interesting capability gaps
    if (usageRatio < 0.05) {
      bus.publish('cortex', 'curiosity:capability_gap_detected', {
        capabilities,
        combinationKey,
        usageRatio,
        timestamp: new Date().toISOString(),
        reason: `Capability combination used only ${(usageRatio * 100).toFixed(1)}% of the time`,
      });

      return 1 - Math.min(1, usageRatio * 10); // Higher score for rarer combinations
    }

    return 0;
  }

  // ============================================================================
  // EMERGENCE PRECURSOR DETECTION
  // ============================================================================

  /**
   * Start periodic emergence detection
   */
  private startEmergenceDetectionCycle(): void {
    setInterval(() => this.detectEmergencePrecursors(), 30000); // Check every 30s
  }

  /**
   * Add signal to emergence buffer for temporal clustering
   */
  private addToEmergenceBuffer(signal: CuriositySignal): void {
    this.emergenceBuffer.push(signal);

    // Remove old signals outside time window
    const cutoff = Date.now() - this.EMERGENCE_TIME_WINDOW;
    this.emergenceBuffer = this.emergenceBuffer.filter((s) => s.timestamp.getTime() > cutoff);
  }

  /**
   * Calculate emergence potential from recent signal clustering
   */
  private calculateEmergencePotential(): number {
    if (this.emergenceBuffer.length < 3) return 0;

    // Look for signal clustering (multiple high-curiosity signals in short time)
    const recentSignals = this.emergenceBuffer.filter(
      (s) => Date.now() - s.timestamp.getTime() < 60000 // last minute
    );

    if (recentSignals.length < 3) return 0;

    // Calculate clustering score
    const avgScore = recentSignals.reduce((sum, s) => sum + s.score, 0) / recentSignals.length;
    const typeVariety = new Set(recentSignals.map((s) => s.type)).size;

    // High emergence potential when:
    // 1. Multiple high-score signals cluster together
    // 2. Signals span multiple curiosity types (cross-domain emergence)
    const clusteringFactor = Math.min(1, recentSignals.length / this.EMERGENCE_CLUSTER_THRESHOLD);
    const varietyFactor = Math.min(1, typeVariety / 4);

    return avgScore * clusteringFactor * (0.5 + varietyFactor * 0.5);
  }

  /**
   * Detect emergence precursors - patterns that predict breakthroughs
   */
  private detectEmergencePrecursors(): EmergencePrecursor | null {
    if (this.emergenceBuffer.length < this.EMERGENCE_CLUSTER_THRESHOLD) return null;

    const potential = this.calculateEmergencePotential();
    if (potential < 0.5) return null;

    // Cluster signals by type
    const byType: Record<string, CuriositySignal[]> = {};
    for (const signal of this.emergenceBuffer) {
      const signalType = signal.type;
      if (!byType[signalType]) byType[signalType] = [];
      const arr = byType[signalType];
      if (arr) arr.push(signal);
    }

    // Find dominant emergence type
    const dominantType = Object.entries(byType).sort((a, b) => b[1].length - a[1].length)[0]?.[0];

    const emergenceType: EmergencePrecursor['emergenceType'] =
      dominantType === 'capability_gap'
        ? 'capability'
        : dominantType === 'novelty'
          ? 'knowledge'
          : dominantType === 'dissonance'
            ? 'insight'
            : 'pattern';

    const precursor: EmergencePrecursor = {
      signals: [...this.emergenceBuffer],
      clusterStrength: potential,
      emergenceType,
      confidence: Math.min(0.95, potential + 0.1),
      predictedTimeframe: (1 - potential) * 300000, // inverse relationship
    };

    // Emit emergence precursor event
    bus.publish('cortex', 'curiosity:emergence_precursor_detected', {
      signalCount: precursor.signals.length,
      clusterStrength: precursor.clusterStrength,
      emergenceType: precursor.emergenceType,
      confidence: precursor.confidence,
      predictedTimeframe: precursor.predictedTimeframe,
      timestamp: new Date().toISOString(),
      reason: `${precursor.signals.length} signals clustering with ${(precursor.clusterStrength * 100).toFixed(0)}% emergence potential`,
    });

    // Clear buffer after detecting precursor to avoid duplicate detections
    if (potential > 0.8) {
      this.emergenceBuffer = [];
    }

    return precursor;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Find the dominant curiosity type from dimensions
   */
  private findDominantCuriosityType(dimensions: CuriosityDimensions): CuriosityType {
    const scores: [CuriosityType, number][] = [
      ['novelty', dimensions.noveltyScore],
      ['uncertainty', dimensions.uncertaintyScore],
      ['surprise', dimensions.surpriseScore],
      ['complexity', dimensions.complexityScore],
      ['dissonance', dimensions.dissonanceScore],
      ['capability_gap', dimensions.capabilityGapScore],
      ['emergence_precursor', dimensions.emergencePotential],
    ] as const;

    const sorted = scores.sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'novelty';
  }

  /**
   * Calculate overall curiosity score with dimension weighting
   */
  private calculateOverallCuriosityScore(dimensions: CuriosityDimensions): number {
    // Weighted combination with emergence potential as multiplier
    const baseScore =
      dimensions.noveltyScore * 0.25 +
      dimensions.uncertaintyScore * 0.15 +
      dimensions.surpriseScore * 0.2 +
      dimensions.complexityScore * 0.15 +
      dimensions.dissonanceScore * 0.15 +
      dimensions.capabilityGapScore * 0.1;

    // Emergence potential boosts overall curiosity
    const emergenceBoost = 1 + dimensions.emergencePotential * 0.5;

    return Math.min(1, baseScore * emergenceBoost);
  }

  /**
   * Generate descriptive text for curiosity signal
   */
  private generateCuriosityDescription(
    type: CuriosityType,
    context: string,
    dimensions: CuriosityDimensions
  ): string {
    const descriptions: Record<CuriosityType, string> = {
      novelty: `Novel pattern detected (${(dimensions.noveltyScore * 100).toFixed(0)}% novel)`,
      uncertainty: `High uncertainty zone (${(dimensions.uncertaintyScore * 100).toFixed(0)}% uncertain)`,
      surprise: `Unexpected outcome (${(dimensions.surpriseScore * 100).toFixed(0)}% surprising)`,
      complexity: `Complex situation (${(dimensions.complexityScore * 100).toFixed(0)}% complex)`,
      dissonance: `Cognitive conflict detected (${(dimensions.dissonanceScore * 100).toFixed(0)}% dissonance)`,
      capability_gap: `Underexplored capability combination (${(dimensions.capabilityGapScore * 100).toFixed(0)}% gap)`,
      emergence_precursor: `Emergence potential building (${(dimensions.emergencePotential * 100).toFixed(0)}% potential)`,
    };

    return `${descriptions[type]}: ${context.substring(0, 80)}...`;
  }

  /**
   * Calculate complexity score from content
   */
  private calculateComplexityScore(content: string): number {
    const wordCount = content.split(/\s+/).length;
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
    const vocabularyDiversity = uniqueWords / Math.max(1, wordCount);

    const hasNesting = content.includes('{') && content.includes('}');
    const hasMultipleSteps = content.split(/step|phase|stage/i).length > 3;
    const hasConditionals = /if|when|unless|otherwise/i.test(content);
    const hasQuantifiers = /all|every|none|some|many|few/i.test(content);

    return Math.min(
      1,
      vocabularyDiversity * 0.2 +
        (hasNesting ? 0.2 : 0) +
        (hasMultipleSteps ? 0.25 : 0) +
        (hasConditionals ? 0.2 : 0) +
        (hasQuantifiers ? 0.15 : 0)
    );
  }

  /**
   * Detect if content is novel (not similar to existing knowledge) - Enhanced with embedding distance
   */
  private async detectNoveltyEnhanced(content: string): Promise<NoveltyDetection> {
    // Search vector store for similar content with actual similarity scores
    const similar = await this.vectorStore.search(content, 5);

    if (similar.length === 0) {
      return {
        content,
        similarityToKnown: 0,
        isNovel: true,
        embeddingDistance: 1.0, // maximum distance
        clusterAssignment: 'unknown',
      };
    }

    // Calculate actual similarity from vector store results
    // The VectorStore.search returns results with similarity metadata
    let totalSimilarity = 0;
    let minDistance = 1.0;

    for (const doc of similar) {
      const docData = doc as { similarity?: number; distance?: number; content?: string };
      const similarity = docData.similarity ?? 1 - (docData.distance ?? 0.5);
      totalSimilarity += similarity;
      minDistance = Math.min(minDistance, docData.distance ?? 1 - similarity);
    }

    const avgSimilarity = totalSimilarity / similar.length;

    // Determine cluster assignment based on most similar document
    const topMatch = similar[0] as { metadata?: { category?: string; domain?: string } };
    const clusterAssignment =
      topMatch?.metadata?.category || topMatch?.metadata?.domain || 'general';

    return {
      content,
      similarityToKnown: avgSimilarity,
      isNovel: avgSimilarity < this.NOVELTY_THRESHOLD,
      embeddingDistance: minDistance,
      clusterAssignment,
    };
  }

  /**
   * Detect if content is novel (backwards compatible)
   */
  private async detectNovelty(content: string): Promise<NoveltyDetection> {
    return this.detectNoveltyEnhanced(content);
  }

  /**
   * Detect uncertainty in system responses
   */
  private detectUncertainty(metadata: Record<string, unknown>): number {
    // Check for confidence indicators in metadata
    const confidence = metadata['confidence'] as number | undefined;
    const successRate = metadata['successRate'] as number | undefined;

    if (confidence !== undefined) {
      return 1 - confidence;
    }

    if (successRate !== undefined) {
      return 1 - successRate;
    }

    // Default to medium uncertainty
    return 0.5;
  }

  /**
   * Detect surprise (expectation violation)
   */
  detectSurprise(expected: number, actual: number, context: string): CuriositySignal | null {
    const deviation = Math.abs(expected - actual);
    const surpriseScore = Math.min(1, deviation / Math.max(expected, actual));

    if (surpriseScore > 0.3) {
      const signal: CuriositySignal = {
        id: `curiosity-surprise-${Date.now()}`,
        type: 'surprise',
        description: `Unexpected outcome: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)} - ${context}`,
        score: surpriseScore,
        context: { expected, actual, deviation },
        timestamp: new Date(),
      };

      this.recordCuriosity(signal);
      return signal;
    }

    return null;
  }

  /**
   * Detect complexity that might warrant deeper exploration
   */
  detectComplexity(content: string, metadata: Record<string, unknown>): CuriositySignal | null {
    // Simple complexity heuristics
    const wordCount = content.split(/\s+/).length;
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
    const vocabularyDiversity = uniqueWords / wordCount;

    const hasNesting = content.includes('{') && content.includes('}');
    const hasMultipleSteps = content.split(/step|phase|stage/i).length > 3;

    const complexityScore =
      vocabularyDiversity * 0.3 + (hasNesting ? 0.3 : 0) + (hasMultipleSteps ? 0.4 : 0);

    if (complexityScore > 0.6) {
      const signal: CuriositySignal = {
        id: `curiosity-complexity-${Date.now()}`,
        type: 'complexity',
        description: `High complexity detected: ${content.substring(0, 100)}...`,
        score: complexityScore,
        context: {
          ...metadata,
          wordCount,
          vocabularyDiversity,
          hasNesting,
          hasMultipleSteps,
        },
        timestamp: new Date(),
      };

      this.recordCuriosity(signal);
      return signal;
    }

    return null;
  }

  /**
   * Record curiosity signal and publish event
   */
  private recordCuriosity(signal: CuriositySignal) {
    this.curiosityHistory.push(signal);

    if (this.curiosityHistory.length > this.MAX_HISTORY) {
      this.curiosityHistory.shift();
    }

    console.log(
      `[CuriosityEngine] ${signal.type.toUpperCase()} detected (score: ${signal.score.toFixed(2)}): ${signal.description}`
    );

    bus.publish('cortex', 'curiosity:signal_generated', {
      signalId: signal.id,
      type: signal.type,
      score: signal.score,
      description: signal.description,
      context: signal.context,
    });

    // If curiosity is high enough, suggest exploration
    if (signal.score > 0.7) {
      console.log(
        `[CuriosityEngine] High curiosity triggering exploration (score: ${signal.score.toFixed(2)})`
      );

      // Detailed telemetry: high curiosity triggers exploration
      bus.publish('cortex', 'curiosity:exploration_triggered', {
        signalId: signal.id,
        type: signal.type,
        score: signal.score,
        description: signal.description,
        timestamp: new Date().toISOString(),
        reason: `Curiosity score ${signal.score.toFixed(2)} exceeds threshold 0.7`,
      });

      bus.publish('cortex', 'exploration:opportunity_detected', {
        description: `Curiosity-driven: ${signal.description}`,
        targetArea: signal.type,
        expectedImpact: 'medium',
        source: 'curiosity_engine',
        curiosityScore: signal.score,
      });
    }
  }

  /**
   * Setup event listeners for autonomous curiosity generation
   */
  private setupListeners() {
    // Monitor responses for surprising outcomes
    bus.on('cortex:response', async (event) => {
      const { data } = event.payload;

      if (data && data.response) {
        // Check for novelty in response
        await this.calculateCuriosity(data.response, {
          provider: data.provider,
          confidence: data.confidence || 0.5,
        });

        // Check for complexity
        this.detectComplexity(data.response, {
          provider: data.provider,
        });
      }
    });

    // Monitor planning for unexpected outcomes
    bus.on('planning:plan:completed', (event) => {
      const { plan } = event.payload;

      if (plan) {
        // Analyze plan complexity
        const planDescription = `Goal: ${plan.goal}, Steps: ${plan.steps?.length || 0}`;
        this.detectComplexity(planDescription, {
          goal: plan.goal,
          stepCount: plan.steps?.length || 0,
        });
      }
    });

    // Monitor errors as learning opportunities
    bus.on('cortex:error', async (event) => {
      const { error } = event.payload;

      if (error) {
        // Errors are inherently surprising
        const signal: CuriositySignal = {
          id: `curiosity-error-${Date.now()}`,
          type: 'surprise',
          description: `Unexpected error: ${error}`,
          score: 0.8,
          context: { error },
          timestamp: new Date(),
        };

        this.recordCuriosity(signal);
      }
    });

    // Monitor provider performance for surprises
    bus.on('precog:telemetry', (event) => {
      const { provider, latency, status } = event.payload;

      if (status === 'error') {
        // Provider failure is surprising
        const signal: CuriositySignal = {
          id: `curiosity-provider-fail-${Date.now()}`,
          type: 'surprise',
          description: `Provider ${provider} failed unexpectedly`,
          score: 0.7,
          context: { provider, latency, status },
          timestamp: new Date(),
        };

        this.recordCuriosity(signal);
      }
    });

    // Symbiotic integration: Learn from exploration experiment results
    bus.on('exploration:experiment_completed', (event) => {
      const { hypothesisId, type, targetArea, success, confidence, findings } = event.payload;

      // Successful experiments reduce uncertainty in that area
      // Failed experiments increase curiosity (what went wrong?)
      const signalType: CuriosityType = success ? 'uncertainty' : 'surprise';
      const score = success ? Math.max(0.3, 1 - confidence) : 0.7 + (1 - confidence) * 0.3;

      const signal: CuriositySignal = {
        id: `curiosity-exploration-${Date.now()}`,
        type: signalType,
        description: success
          ? `Exploration in ${targetArea} succeeded - new knowledge acquired`
          : `Exploration in ${targetArea} failed - unexpected result`,
        score,
        context: { hypothesisId, type, targetArea, success, confidence, findings },
        timestamp: new Date(),
      };

      this.recordCuriosity(signal);

      // Update knowledge domain tracking
      if (targetArea && success) {
        const existingStatements = this.knowledgeStatements.get(targetArea) || [];
        existingStatements.push(`Exploration validated: ${findings || 'unknown findings'}`);
        this.knowledgeStatements.set(targetArea, existingStatements);
      }
    });

    // Symbiotic integration: Learn from emergence detections
    bus.on('emergence:detected', (event) => {
      const { pattern, category, strength, novelty } = event.payload;

      // High-novelty emergence is very interesting to curiosity
      if (novelty && novelty > 0.5) {
        const signal: CuriositySignal = {
          id: `curiosity-emergence-${Date.now()}`,
          type: 'emergence_precursor',
          description: `Emergence detected: ${pattern || category}`,
          score: Math.min(1.0, novelty * 1.2),
          context: { pattern, category, strength, novelty },
          timestamp: new Date(),
          dimensions: {
            noveltyScore: novelty,
            uncertaintyScore: 0.3,
            surpriseScore: novelty * 0.8,
            complexityScore: strength || 0.5,
            dissonanceScore: 0.2,
            capabilityGapScore: 0.4,
            emergencePotential: strength || 0.7,
          },
        };

        this.recordCuriosity(signal);

        // Also add to emergence buffer for tracking
        this.emergenceBuffer.push(signal);
        if (this.emergenceBuffer.length > 100) {
          this.emergenceBuffer.shift();
        }
      }
    });
  }

  /**
   * Get curiosity statistics - Enhanced with dimension breakdown
   */
  getStatistics() {
    const byType = this.curiosityHistory.reduce(
      (acc, signal) => {
        acc[signal.type] = (acc[signal.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgScore =
      this.curiosityHistory.reduce((sum, signal) => sum + signal.score, 0) /
      Math.max(1, this.curiosityHistory.length);

    // Calculate dimension averages
    const signalsWithDimensions = this.curiosityHistory.filter((s) => s.dimensions);
    const avgDimensions: Partial<CuriosityDimensions> = {};

    if (signalsWithDimensions.length > 0) {
      const keys: (keyof CuriosityDimensions)[] = [
        'noveltyScore',
        'uncertaintyScore',
        'surpriseScore',
        'complexityScore',
        'dissonanceScore',
        'capabilityGapScore',
        'emergencePotential',
      ];

      for (const key of keys) {
        avgDimensions[key] =
          signalsWithDimensions.reduce((sum, s) => sum + (s.dimensions?.[key] || 0), 0) /
          signalsWithDimensions.length;
      }
    }

    return {
      totalSignals: this.curiosityHistory.length,
      byType,
      averageScore: avgScore,
      highCuriosityCount: this.curiosityHistory.filter((s) => s.score > 0.7).length,
      emergenceBufferSize: this.emergenceBuffer.length,
      currentEmergencePotential: this.calculateEmergencePotential(),
      averageDimensions: avgDimensions,
      knowledgeDomainsTracked: this.knowledgeStatements.size,
      capabilityCombinationsTracked: this.capabilityUsage.size,
    };
  }

  /**
   * Get recent curiosity signals
   */
  getRecentSignals(limit: number = 20): CuriositySignal[] {
    return this.curiosityHistory.slice(-limit);
  }

  /**
   * Get top curiosity signals by score
   */
  getTopSignals(limit: number = 10): CuriositySignal[] {
    return [...this.curiosityHistory].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get signals by type
   */
  getSignalsByType(type: CuriosityType, limit: number = 20): CuriositySignal[] {
    return this.curiosityHistory.filter((s) => s.type === type).slice(-limit);
  }

  /**
   * Get current emergence potential
   */
  getEmergencePotential(): number {
    return this.calculateEmergencePotential();
  }

  /**
   * Get emergence buffer contents
   */
  getEmergenceBuffer(): CuriositySignal[] {
    return [...this.emergenceBuffer];
  }

  /**
   * Force emergence detection check
   */
  checkForEmergence(): EmergencePrecursor | null {
    return this.detectEmergencePrecursors();
  }

  /**
   * Register a capability combination for gap detection
   */
  registerCapabilityUsage(capabilities: string[]): void {
    if (capabilities.length < 2) return;
    const key = capabilities.sort().join('+');
    const current = this.capabilityUsage.get(key) || 0;
    this.capabilityUsage.set(key, current + 1);
  }

  /**
   * Get capability gap analysis
   */
  getCapabilityGapAnalysis(): CapabilityGap[] {
    const totalUsage = Array.from(this.capabilityUsage.values()).reduce((a, b) => a + b, 0);
    if (totalUsage < 10) return [];

    const gaps: CapabilityGap[] = [];

    for (const [key, usage] of this.capabilityUsage) {
      const ratio = usage / totalUsage;
      if (ratio < 0.05) {
        const capabilities = key.split('+');
        gaps.push({
          capability1: capabilities[0] || 'unknown',
          capability2: capabilities[1] || capabilities[0] || 'unknown',
          combinationScore: 1 - ratio * 10,
          potentialValue: 0.5 + Math.random() * 0.5, // estimated
        });
      }
    }

    return gaps.sort((a, b) => b.potentialValue - a.potentialValue);
  }

  // ============================================================================
  // INTRINSIC REWARD SYSTEM (NEW)
  // ============================================================================

  /**
   * Generate comprehensive intrinsic reward vector from curiosity signal
   */
  generateIntrinsicReward(
    curiositySignal: CuriositySignal,
    outcome: {
      success?: boolean;
      informationGained?: boolean;
      uncertaintyReduced?: number;
      goalProgress?: { goalId: string; newDistance: number };
    } = {}
  ): IntrinsicRewardSignal {
    const domain = (curiositySignal.context['domain'] as string) || 'general';

    // Calculate each dimension
    const vector: IntrinsicRewardVector = {
      informationGain: this.calculateInformationGainReward(domain, outcome.uncertaintyReduced),
      empowerment: this.calculateEmpowermentReward(),
      progress: this.calculateProgressReward(outcome.goalProgress),
      novelty: this.calculateNoveltyReward(curiositySignal),
      competence: this.calculateCompetenceReward(domain, outcome.success),
      curiositySatisfied: this.calculateCuriositySatisfiedReward(
        curiositySignal,
        outcome.informationGained
      ),
      composite: 0, // Will be calculated below
    };

    // Calculate weighted composite
    vector.composite =
      vector.informationGain * this.REWARD_WEIGHTS.informationGain +
      vector.empowerment * this.REWARD_WEIGHTS.empowerment +
      vector.progress * this.REWARD_WEIGHTS.progress +
      vector.novelty * this.REWARD_WEIGHTS.novelty +
      vector.competence * this.REWARD_WEIGHTS.competence +
      vector.curiositySatisfied * this.REWARD_WEIGHTS.curiositySatisfied;

    // Determine dominant reward type
    const rewardTypes: [IntrinsicRewardType, number][] = [
      ['information_gain', vector.informationGain],
      ['empowerment', vector.empowerment],
      ['progress', vector.progress],
      ['novelty', vector.novelty],
      ['competence', vector.competence],
      ['curiosity_satisfied', vector.curiositySatisfied],
    ];
    const dominantType = rewardTypes.sort((a, b) => b[1] - a[1])[0]?.[0] || 'novelty';

    const rewardSignal: IntrinsicRewardSignal = {
      id: `intrinsic-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: dominantType,
      value: vector.composite,
      vector,
      source: 'curiosity-engine',
      context: {
        domain,
        curiosityType: curiositySignal.type,
        curiosityScore: curiositySignal.score,
        ...outcome,
      },
      timestamp: new Date(),
      linkedCuriositySignal: curiositySignal.id,
    };

    // Record and emit
    this.recordIntrinsicReward(rewardSignal);

    return rewardSignal;
  }

  /**
   * Calculate information gain reward (reduction in uncertainty)
   */
  private calculateInformationGainReward(domain: string, uncertaintyReduced?: number): number {
    if (uncertaintyReduced !== undefined) {
      // Direct measurement of uncertainty reduction
      return Math.min(1, Math.max(-1, uncertaintyReduced));
    }

    // Estimate from knowledge accumulation
    const priorUncertainty = this.priorUncertainty.get(domain) || 0.7;
    const statements = this.knowledgeStatements.get(domain)?.length || 0;
    const currentUncertainty = Math.max(0.1, priorUncertainty - statements * 0.01);

    const gain = priorUncertainty - currentUncertainty;
    this.priorUncertainty.set(domain, currentUncertainty);

    return Math.min(1, gain * 2); // Scale up small gains
  }

  /**
   * Calculate empowerment reward (ability to influence outcomes)
   */
  private calculateEmpowermentReward(): number {
    // Empowerment = log of reachable states from current state
    // Simplified: based on capability diversity and recent success rate

    const capabilityDiversity = this.capabilityUsage.size;
    const diversityFactor = Math.min(1, capabilityDiversity / 50);

    // Recent action success rate
    const recentSignals = this.curiosityHistory.slice(-20);
    const resolvedCount = recentSignals.filter((s) => s.context['resolved'] === true).length;
    const resolutionRate = recentSignals.length > 0 ? resolvedCount / recentSignals.length : 0.5;

    // Actionable states (how many options are available)
    const actionableFactor = Math.min(1, this.actionableStatesCount / 10);

    return diversityFactor * 0.4 + resolutionRate * 0.3 + actionableFactor * 0.3;
  }

  /**
   * Calculate progress reward (movement toward goals)
   */
  private calculateProgressReward(goalProgress?: { goalId: string; newDistance: number }): number {
    if (!goalProgress) return 0;

    const tracker = this.progressTrackers.get(goalProgress.goalId);
    if (!tracker) return 0;

    const previousDistance = tracker.currentDistance;
    const newDistance = goalProgress.newDistance;

    // Progress = reduction in distance
    const progress = (previousDistance - newDistance) / Math.max(0.01, tracker.startDistance);

    // Update tracker
    tracker.currentDistance = newDistance;
    tracker.bestDistance = Math.min(tracker.bestDistance, newDistance);
    tracker.lastUpdated = new Date();

    // Bonus for reaching new best
    const newBestBonus = newDistance < tracker.bestDistance ? 0.2 : 0;

    return Math.min(1, Math.max(-1, progress + newBestBonus));
  }

  /**
   * Calculate novelty reward from curiosity signal
   */
  private calculateNoveltyReward(signal: CuriositySignal): number {
    if (signal.dimensions) {
      return signal.dimensions.noveltyScore;
    }

    // Fallback: check if this type of signal is rare
    const recentOfType = this.curiosityHistory
      .slice(-50)
      .filter((s) => s.type === signal.type).length;
    const rarity = 1 - Math.min(1, recentOfType / 10);

    return signal.score * rarity;
  }

  /**
   * Calculate competence reward (mastery demonstration)
   */
  private calculateCompetenceReward(domain: string, success?: boolean): number {
    let competence = this.competenceByDomain.get(domain);

    if (!competence) {
      competence = {
        domain,
        level: 0.5,
        recentSuccesses: 0,
        recentFailures: 0,
        lastUpdated: new Date(),
      };
      this.competenceByDomain.set(domain, competence);
    }

    // Update competence based on outcome
    if (success !== undefined) {
      if (success) {
        competence.recentSuccesses++;
        competence.level = Math.min(1, competence.level + 0.05);
      } else {
        competence.recentFailures++;
        competence.level = Math.max(0, competence.level - 0.02);
      }
      competence.lastUpdated = new Date();
    }

    // Calculate reward based on maintaining/improving competence
    const successRate =
      competence.recentSuccesses /
      Math.max(1, competence.recentSuccesses + competence.recentFailures);

    // Reward is higher when maintaining high competence
    return competence.level * successRate;
  }

  /**
   * Calculate curiosity satisfied reward
   */
  private calculateCuriositySatisfiedReward(
    signal: CuriositySignal,
    informationGained?: boolean
  ): number {
    // High reward if strong curiosity was resolved
    if (informationGained === true && signal.score > 0.7) {
      return signal.score;
    }

    if (informationGained === false) {
      return -0.2; // Small penalty for unresolved curiosity
    }

    // Neutral if no explicit outcome
    return 0;
  }

  /**
   * Record intrinsic reward signal
   */
  private recordIntrinsicReward(signal: IntrinsicRewardSignal): void {
    this.intrinsicRewardHistory.push(signal);

    // Trim history
    if (this.intrinsicRewardHistory.length > this.MAX_REWARD_HISTORY) {
      this.intrinsicRewardHistory = this.intrinsicRewardHistory.slice(-this.MAX_REWARD_HISTORY);
    }

    // Emit to coordinator and reinforcement learner
    bus.publish('cortex', 'curiosity:intrinsic_reward_generated', {
      rewardId: signal.id,
      type: signal.type,
      value: signal.value,
      vector: signal.vector,
      domain: signal.context['domain'],
      linkedCuriosity: signal.linkedCuriositySignal,
      timestamp: signal.timestamp.toISOString(),
    });
  }

  // ============================================================================
  // INTRINSIC REWARD API
  // ============================================================================

  /**
   * Register a progress goal for tracking
   */
  registerGoal(goalId: string, description: string, initialDistance: number): void {
    this.progressTrackers.set(goalId, {
      goalId,
      goalDescription: description,
      startDistance: initialDistance,
      currentDistance: initialDistance,
      bestDistance: initialDistance,
      lastUpdated: new Date(),
    });

    console.log(`[CuriosityEngine] Goal registered: ${goalId} (distance: ${initialDistance})`);
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, newDistance: number): IntrinsicRewardSignal | null {
    const tracker = this.progressTrackers.get(goalId);
    if (!tracker) return null;

    // Create a synthetic curiosity signal for progress tracking
    const syntheticSignal: CuriositySignal = {
      id: `progress-${goalId}-${Date.now()}`,
      type: 'complexity', // Use complexity as proxy
      description: `Goal progress: ${tracker.goalDescription}`,
      score: 0.5,
      context: { goalId, domain: 'progress' },
      timestamp: new Date(),
    };

    return this.generateIntrinsicReward(syntheticSignal, {
      goalProgress: { goalId, newDistance },
    });
  }

  /**
   * Record outcome for competence tracking
   */
  recordOutcome(domain: string, success: boolean): void {
    this.calculateCompetenceReward(domain, success);
  }

  /**
   * Update actionable states count (for empowerment)
   */
  setActionableStatesCount(count: number): void {
    this.actionableStatesCount = count;
  }

  /**
   * Get intrinsic reward statistics
   */
  getIntrinsicRewardStats(): {
    totalRewards: number;
    averageComposite: number;
    byType: Record<IntrinsicRewardType, number>;
    recentTrend: number;
    competenceByDomain: Array<{ domain: string; level: number }>;
    activeGoals: number;
  } {
    const byType: Record<IntrinsicRewardType, number> = {
      information_gain: 0,
      empowerment: 0,
      progress: 0,
      novelty: 0,
      competence: 0,
      curiosity_satisfied: 0,
    };

    let totalComposite = 0;
    for (const reward of this.intrinsicRewardHistory) {
      byType[reward.type]++;
      totalComposite += reward.vector.composite;
    }

    // Calculate recent trend
    const recent20 = this.intrinsicRewardHistory.slice(-20);
    const previous20 = this.intrinsicRewardHistory.slice(-40, -20);
    const recentAvg =
      recent20.length > 0
        ? recent20.reduce((s, r) => s + r.vector.composite, 0) / recent20.length
        : 0;
    const previousAvg =
      previous20.length > 0
        ? previous20.reduce((s, r) => s + r.vector.composite, 0) / previous20.length
        : 0;
    const trend = recentAvg - previousAvg;

    return {
      totalRewards: this.intrinsicRewardHistory.length,
      averageComposite:
        this.intrinsicRewardHistory.length > 0
          ? totalComposite / this.intrinsicRewardHistory.length
          : 0,
      byType,
      recentTrend: trend,
      competenceByDomain: Array.from(this.competenceByDomain.values()).map((c) => ({
        domain: c.domain,
        level: c.level,
      })),
      activeGoals: this.progressTrackers.size,
    };
  }

  /**
   * Get recent intrinsic rewards
   */
  getRecentIntrinsicRewards(limit: number = 20): IntrinsicRewardSignal[] {
    return this.intrinsicRewardHistory.slice(-limit);
  }
}
