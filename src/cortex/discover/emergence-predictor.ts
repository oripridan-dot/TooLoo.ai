// @version 3.3.186
/**
 * EmergencePredictor
 * Predictive intelligence for anticipating emergence events.
 *
 * Key capabilities:
 * - Historical pattern analysis for emergence prediction
 * - Trend detection across emergence types
 * - Signal correlation analysis (what precedes emergences?)
 * - Precursor detection (early warning system)
 * - Confidence scoring for predictions
 * - Time-window forecasting (when is emergence likely?)
 *
 * Integrates with:
 * - EmergenceAmplifier for historical emergence data
 * - CuriosityEngine for curiosity signal patterns
 * - ReinforcementLearner for learning velocity correlation
 * - ExplorationEngine for hypothesis success patterns
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import { EmergenceSignature, EmergenceEvent, EmergenceSignal } from './emergence-amplifier.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type PredictionConfidence = 'low' | 'medium' | 'high' | 'very_high';
export type PredictionTimeframe = 'imminent' | 'soon' | 'likely' | 'possible' | 'unlikely';
export type EmergenceType = 'breakthrough' | 'capability' | 'pattern' | 'insight' | 'synergy';

export interface EmergencePrediction {
  id: string;
  type: EmergenceType;
  confidence: number; // 0-1
  confidenceLevel: PredictionConfidence;
  timeframe: PredictionTimeframe;
  estimatedTimeMs: number; // Estimated time until emergence
  estimatedStrength: number; // Predicted emergence strength
  precursors: PrecursorSignal[];
  correlations: SignalCorrelation[];
  reasoning: string[];
  createdAt: Date;
  expiresAt: Date;
  validated?: boolean;
  actualEmergenceId?: string;
}

export interface PrecursorSignal {
  type: string;
  source: string;
  pattern: string;
  weight: number; // How strongly this precursor indicates emergence
  currentValue: number;
  thresholdValue: number;
  triggeredAt?: Date;
}

export interface SignalCorrelation {
  signalA: string;
  signalB: string;
  correlation: number; // -1 to 1
  lag: number; // Time lag in ms
  strength: number;
  sampleCount: number;
}

export interface HistoricalPattern {
  id: string;
  emergenceType: EmergenceType;
  precursorSequence: string[]; // Sequence of signal types that preceded
  averageLeadTime: number; // Average time between precursors and emergence
  confidence: number;
  occurrences: number;
  lastSeen: Date;
  successRate: number; // How often this pattern led to emergence
}

export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  velocity: number; // Rate of change
  acceleration: number; // Change in velocity
  forecast: number; // Predicted value
  confidence: number;
}

export interface PredictorPolicy {
  // Prediction thresholds
  minConfidenceToPredict: number;
  minPrecursorsRequired: number;
  correlationThreshold: number;
  patternMatchThreshold: number;

  // Timing
  predictionWindowMs: number; // How far ahead to predict
  updateIntervalMs: number; // How often to update predictions
  expirationMs: number; // How long predictions remain valid

  // Learning
  learnFromOutcomes: boolean;
  patternDecayRate: number; // How fast old patterns lose weight
  minSamplesForPattern: number;

  // Filtering
  maxActivePredictions: number;
  suppressLowConfidence: boolean;
  requireMultiplePrecursors: boolean;
}

export interface PredictorState {
  status: 'active' | 'learning' | 'paused';
  activePredictions: EmergencePrediction[];
  historicalPatterns: HistoricalPattern[];
  correlationMatrix: Map<string, SignalCorrelation[]>;
  recentSignals: EmergenceSignal[];
  metrics: PredictorMetrics;
}

export interface PredictorMetrics {
  totalPredictions: number;
  correctPredictions: number;
  falsePredictions: number;
  missedEmergences: number;
  averageLeadTime: number;
  averageConfidence: number;
  patternCount: number;
  correlationCount: number;
  predictionAccuracy: number;
}

// Precursor patterns for each emergence type
export const EMERGENCE_PRECURSORS: Record<EmergenceType, PrecursorPattern[]> = {
  breakthrough: [
    {
      type: 'curiosity_spike',
      weight: 0.8,
      threshold: 0.7,
      description: 'Sudden increase in curiosity signals',
    },
    {
      type: 'learning_velocity',
      weight: 0.7,
      threshold: 0.6,
      description: 'Accelerating learning rate',
    },
    {
      type: 'novelty_detection',
      weight: 0.9,
      threshold: 0.8,
      description: 'High novelty in recent interactions',
    },
    {
      type: 'hypothesis_success',
      weight: 0.6,
      threshold: 0.7,
      description: 'Multiple hypotheses validated',
    },
  ],
  capability: [
    {
      type: 'skill_combination',
      weight: 0.9,
      threshold: 0.6,
      description: 'New combinations of capabilities',
    },
    {
      type: 'task_success_streak',
      weight: 0.7,
      threshold: 0.8,
      description: 'Consecutive successful task completions',
    },
    {
      type: 'domain_expansion',
      weight: 0.8,
      threshold: 0.5,
      description: 'Activity in new knowledge domains',
    },
  ],
  pattern: [
    {
      type: 'repetition_detection',
      weight: 0.9,
      threshold: 0.7,
      description: 'Recurring structures detected',
    },
    {
      type: 'abstraction_level',
      weight: 0.7,
      threshold: 0.6,
      description: 'Increasing abstraction in responses',
    },
    {
      type: 'cross_domain_similarity',
      weight: 0.8,
      threshold: 0.5,
      description: 'Similar patterns across domains',
    },
  ],
  insight: [
    {
      type: 'connection_density',
      weight: 0.9,
      threshold: 0.7,
      description: 'Dense connections in knowledge graph',
    },
    {
      type: 'inference_depth',
      weight: 0.8,
      threshold: 0.6,
      description: 'Multi-step reasoning chains',
    },
    {
      type: 'question_quality',
      weight: 0.7,
      threshold: 0.5,
      description: 'Higher quality questions generated',
    },
  ],
  synergy: [
    {
      type: 'system_coherence',
      weight: 0.8,
      threshold: 0.7,
      description: 'Multiple systems aligning',
    },
    {
      type: 'feedback_loops',
      weight: 0.9,
      threshold: 0.6,
      description: 'Positive feedback detected',
    },
    {
      type: 'emergence_clustering',
      weight: 0.7,
      threshold: 0.5,
      description: 'Multiple emergence types co-occurring',
    },
  ],
};

interface PrecursorPattern {
  type: string;
  weight: number;
  threshold: number;
  description: string;
}

// ============================================================================
// EMERGENCE PREDICTOR
// ============================================================================

export class EmergencePredictor {
  private static instance: EmergencePredictor;

  private state: PredictorState;
  private policy: PredictorPolicy;
  private dataDir: string;
  private stateFile: string;
  private updateInterval?: NodeJS.Timeout;
  private signalHistory: EmergenceSignal[] = [];
  private emergenceHistory: EmergenceEvent[] = [];

  private readonly MAX_SIGNAL_HISTORY = 5000;
  private readonly MAX_EMERGENCE_HISTORY = 500;
  private readonly MAX_ACTIVE_PREDICTIONS = 20;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'emergence-predictor');
    this.stateFile = path.join(this.dataDir, 'predictor-state.json');

    this.policy = {
      minConfidenceToPredict: 0.4,
      minPrecursorsRequired: 2,
      correlationThreshold: 0.5,
      patternMatchThreshold: 0.6,
      predictionWindowMs: 3600000, // 1 hour
      updateIntervalMs: 30000, // 30 seconds
      expirationMs: 900000, // 15 minutes
      learnFromOutcomes: true,
      patternDecayRate: 0.99,
      minSamplesForPattern: 5,
      maxActivePredictions: 20,
      suppressLowConfidence: false,
      requireMultiplePrecursors: true,
    };

    this.state = {
      status: 'active',
      activePredictions: [],
      historicalPatterns: [],
      correlationMatrix: new Map(),
      recentSignals: [],
      metrics: {
        totalPredictions: 0,
        correctPredictions: 0,
        falsePredictions: 0,
        missedEmergences: 0,
        averageLeadTime: 0,
        averageConfidence: 0,
        patternCount: 0,
        correlationCount: 0,
        predictionAccuracy: 0,
      },
    };

    this.setupListeners();
  }

  static getInstance(): EmergencePredictor {
    if (!EmergencePredictor.instance) {
      EmergencePredictor.instance = new EmergencePredictor();
    }
    return EmergencePredictor.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[EmergencePredictor] Initializing predictive emergence system...');

    await fs.ensureDir(this.dataDir);
    await this.loadState();

    // Start prediction cycle
    this.start();

    bus.publish('cortex', 'predictor:initialized', {
      policy: this.policy,
      patternCount: this.state.historicalPatterns.length,
      activePredicitions: this.state.activePredictions.length,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[EmergencePredictor] Ready - ${this.state.historicalPatterns.length} patterns, ${this.state.correlationMatrix.size} correlations`
    );
  }

  private setupListeners(): void {
    // Listen for emergence signals
    bus.on('emergence:signal_received', (event: SynapsysEvent) => {
      this.recordSignal(event.payload as EmergenceSignal);
    });

    // Listen for actual emergences (to validate predictions)
    bus.on('emergence:detected', (event: SynapsysEvent) => {
      this.validatePredictions(event.payload as EmergenceEvent);
      this.learnFromEmergence(event.payload as EmergenceEvent);
    });

    // Listen for curiosity signals
    bus.on('curiosity:signal', (event: SynapsysEvent) => {
      const data = event.payload as Record<string, unknown>;
      this.recordSignal({
        id: `curiosity-${Date.now()}`,
        source: 'curiosity',
        type: (data['type'] as string) || 'unknown',
        value: (data['score'] as number) || (data['value'] as number) || 0,
        timestamp: new Date(),
        metadata: data,
      });
    });

    // Listen for learning events
    bus.on('learning:reward_received', (event: SynapsysEvent) => {
      const data = event.payload as Record<string, unknown>;
      this.recordSignal({
        id: `learning-${Date.now()}`,
        source: 'learning',
        type: 'reward',
        value: (data['value'] as number) || 0,
        timestamp: new Date(),
        metadata: data,
      });
    });

    // Listen for exploration results
    bus.on('hypothesis:validated', (event: SynapsysEvent) => {
      const data = event.payload as Record<string, unknown>;
      this.recordSignal({
        id: `exploration-${Date.now()}`,
        source: 'exploration',
        type: 'hypothesis_success',
        value: (data['confidence'] as number) || 0.7,
        timestamp: new Date(),
        metadata: data,
      });
    });
  }

  // ============================================================================
  // PREDICTOR LIFECYCLE
  // ============================================================================

  start(): void {
    if (this.state.status === 'active' && this.updateInterval) {
      return;
    }

    this.state.status = 'active';
    this.updateInterval = setInterval(() => this.updatePredictions(), this.policy.updateIntervalMs);
    this.updatePredictions(); // Initial update

    console.log('[EmergencePredictor] ▶️ Prediction engine started');
  }

  stop(): void {
    this.state.status = 'paused';
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    console.log('[EmergencePredictor] ⏹️ Prediction engine stopped');
  }

  pause(): void {
    this.state.status = 'paused';
    console.log('[EmergencePredictor] ⏸️ Prediction engine paused');
  }

  resume(): void {
    this.state.status = 'active';
    console.log('[EmergencePredictor] ▶️ Prediction engine resumed');
  }

  // ============================================================================
  // SIGNAL RECORDING
  // ============================================================================

  private recordSignal(signal: EmergenceSignal): void {
    this.signalHistory.push(signal);
    this.state.recentSignals.push(signal);

    // Trim histories
    if (this.signalHistory.length > this.MAX_SIGNAL_HISTORY) {
      this.signalHistory = this.signalHistory.slice(-this.MAX_SIGNAL_HISTORY);
    }

    // Keep recent signals in smaller window for real-time analysis
    const cutoff = Date.now() - this.policy.predictionWindowMs;
    this.state.recentSignals = this.state.recentSignals.filter(
      (s) => s.timestamp.getTime() > cutoff
    );

    // Update correlations periodically
    if (this.signalHistory.length % 100 === 0) {
      this.updateCorrelations();
    }
  }

  // ============================================================================
  // PREDICTION ENGINE
  // ============================================================================

  private async updatePredictions(): Promise<void> {
    if (this.state.status !== 'active') {
      return;
    }

    // Expire old predictions
    this.expirePredictions();

    // Analyze current state for predictions
    const predictions = await this.generatePredictions();

    // Update active predictions (merge, don't replace)
    for (const prediction of predictions) {
      const existing = this.state.activePredictions.find(
        (p) => p.type === prediction.type && !p.validated
      );

      if (existing) {
        // Update existing prediction
        Object.assign(existing, {
          confidence: (existing.confidence + prediction.confidence) / 2,
          estimatedTimeMs: Math.min(existing.estimatedTimeMs, prediction.estimatedTimeMs),
          precursors: this.mergePrecursors(existing.precursors, prediction.precursors),
          reasoning: [...new Set([...existing.reasoning, ...prediction.reasoning])],
        });
        existing.confidenceLevel = this.getConfidenceLevel(existing.confidence);
        existing.timeframe = this.getTimeframe(existing.estimatedTimeMs);
      } else if (this.state.activePredictions.length < this.policy.maxActivePredictions) {
        // Add new prediction
        this.state.activePredictions.push(prediction);
        this.state.metrics.totalPredictions++;

        bus.publish('cortex', 'prediction:created', {
          prediction: this.sanitizePrediction(prediction),
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[EmergencePredictor] 🔮 New prediction: ${prediction.type} (${(prediction.confidence * 100).toFixed(0)}% confidence, ${prediction.timeframe})`
        );
      }
    }

    // Update metrics
    this.updateMetrics();
    await this.saveState();
  }

  private async generatePredictions(): Promise<EmergencePrediction[]> {
    const predictions: EmergencePrediction[] = [];
    const now = Date.now();

    for (const type of Object.keys(EMERGENCE_PRECURSORS) as EmergenceType[]) {
      const precursors = this.analyzePrecursors(type);
      const patterns = this.matchHistoricalPatterns(type);
      const trends = this.analyzeTrends(type);

      // Calculate confidence from multiple sources
      const precursorConfidence = this.calculatePrecursorConfidence(precursors);
      const firstPattern = patterns[0];
      const patternConfidence = patterns.length > 0 && firstPattern ? firstPattern.confidence : 0;
      const trendConfidence = this.calculateTrendConfidence(trends);

      // Weighted combination
      const confidence =
        precursorConfidence * 0.4 + patternConfidence * 0.35 + trendConfidence * 0.25;

      // Skip low confidence predictions
      if (confidence < this.policy.minConfidenceToPredict) {
        continue;
      }

      // Check precursor requirement
      const triggeredPrecursors = precursors.filter((p) => p.triggeredAt);
      if (
        this.policy.requireMultiplePrecursors &&
        triggeredPrecursors.length < this.policy.minPrecursorsRequired
      ) {
        continue;
      }

      // Estimate time until emergence
      const estimatedTimeMs = this.estimateTimeToEmergence(type, precursors, patterns);

      const prediction: EmergencePrediction = {
        id: `pred-${now}-${type}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        confidence,
        confidenceLevel: this.getConfidenceLevel(confidence),
        timeframe: this.getTimeframe(estimatedTimeMs),
        estimatedTimeMs,
        estimatedStrength: this.estimateStrength(precursors, patterns),
        precursors,
        correlations: this.getRelevantCorrelations(type),
        reasoning: this.generateReasoning(type, precursors, patterns, trends),
        createdAt: new Date(),
        expiresAt: new Date(now + this.policy.expirationMs),
      };

      predictions.push(prediction);
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================================
  // PRECURSOR ANALYSIS
  // ============================================================================

  private analyzePrecursors(type: EmergenceType): PrecursorSignal[] {
    const patterns = EMERGENCE_PRECURSORS[type];
    const precursors: PrecursorSignal[] = [];
    const recentSignals = this.state.recentSignals;

    for (const pattern of patterns) {
      const relevantSignals = recentSignals.filter((s) => this.matchesPrecursorPattern(s, pattern));

      if (relevantSignals.length === 0) {
        precursors.push({
          type: pattern.type,
          source: 'analysis',
          pattern: pattern.description,
          weight: pattern.weight,
          currentValue: 0,
          thresholdValue: pattern.threshold,
        });
        continue;
      }

      // Calculate current value (average of recent matching signals)
      const currentValue =
        relevantSignals.reduce((sum, s) => sum + s.value, 0) / relevantSignals.length;

      const triggered = currentValue >= pattern.threshold;
      const mostRecent = relevantSignals.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      )[0];

      precursors.push({
        type: pattern.type,
        source: mostRecent?.source || 'analysis',
        pattern: pattern.description,
        weight: pattern.weight,
        currentValue,
        thresholdValue: pattern.threshold,
        triggeredAt: triggered ? mostRecent?.timestamp : undefined,
      });
    }

    return precursors;
  }

  private matchesPrecursorPattern(signal: EmergenceSignal, pattern: PrecursorPattern): boolean {
    // Match by type
    if (signal.type.toLowerCase().includes(pattern.type.toLowerCase())) {
      return true;
    }

    // Match by source + type combinations
    const combined = `${signal.source}_${signal.type}`.toLowerCase();
    if (combined.includes(pattern.type.toLowerCase())) {
      return true;
    }

    // Match specific patterns
    const patternMatches: Record<string, (s: EmergenceSignal) => boolean> = {
      curiosity_spike: (s) => s.source === 'curiosity' && s.value > 0.7,
      learning_velocity: (s) => s.source === 'learning' && s.type.includes('velocity'),
      novelty_detection: (s) => s.type.includes('novelty') || s.type.includes('novel'),
      hypothesis_success: (s) => s.source === 'exploration' && s.value > 0.6,
      skill_combination: (s) => s.type.includes('capability') || s.type.includes('skill'),
      task_success_streak: (s) => s.source === 'learning' && s.type === 'reward' && s.value > 0,
      domain_expansion: (s) => s.type.includes('domain') || s.type.includes('expansion'),
      repetition_detection: (s) => s.type.includes('pattern') || s.type.includes('repeat'),
      connection_density: (s) => s.type.includes('connection') || s.type.includes('link'),
      system_coherence: (s) => s.type.includes('coherence') || s.type.includes('alignment'),
      feedback_loops: (s) => s.type.includes('feedback') || s.type.includes('loop'),
    };

    const matcher = patternMatches[pattern.type];
    return matcher ? matcher(signal) : false;
  }

  private calculatePrecursorConfidence(precursors: PrecursorSignal[]): number {
    if (precursors.length === 0) return 0;

    let totalWeight = 0;
    let triggeredWeight = 0;

    for (const p of precursors) {
      totalWeight += p.weight;
      if (p.triggeredAt) {
        // Scale by how much the current value exceeds the threshold
        const excess = Math.min(1, p.currentValue / p.thresholdValue);
        triggeredWeight += p.weight * excess;
      }
    }

    return totalWeight > 0 ? triggeredWeight / totalWeight : 0;
  }

  // ============================================================================
  // HISTORICAL PATTERN MATCHING
  // ============================================================================

  private matchHistoricalPatterns(type: EmergenceType): HistoricalPattern[] {
    const recentSignalTypes = this.state.recentSignals.map((s) => s.type);

    return this.state.historicalPatterns
      .filter((p) => p.emergenceType === type)
      .map((pattern) => {
        // Calculate match score
        const matchedPrecursors = pattern.precursorSequence.filter((precursor) =>
          recentSignalTypes.some((t) => t.includes(precursor) || precursor.includes(t))
        );

        const matchScore = matchedPrecursors.length / pattern.precursorSequence.length;

        return {
          ...pattern,
          confidence: matchScore * pattern.successRate * (1 - this.getPatternAge(pattern)),
        };
      })
      .filter((p) => p.confidence >= this.policy.patternMatchThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private getPatternAge(pattern: HistoricalPattern): number {
    const ageMs = Date.now() - pattern.lastSeen.getTime();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 1 week
    return Math.min(1, ageMs / maxAgeMs) * 0.3; // Max 30% decay
  }

  // ============================================================================
  // TREND ANALYSIS
  // ============================================================================

  private analyzeTrends(type: EmergenceType): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const signalGroups = this.groupSignalsByType();

    for (const [signalType, signals] of signalGroups.entries()) {
      if (signals.length < 3) continue;

      // Calculate velocity and acceleration
      const values = signals.map((s) => s.value);
      const times = signals.map((s) => s.timestamp.getTime());

      const velocity = this.calculateVelocity(values, times);
      const acceleration = this.calculateAcceleration(values, times);

      let direction: TrendAnalysis['direction'];
      if (Math.abs(velocity) < 0.01) {
        direction = 'stable';
      } else if (Math.abs(acceleration) > Math.abs(velocity)) {
        direction = 'volatile';
      } else if (velocity > 0) {
        direction = 'increasing';
      } else {
        direction = 'decreasing';
      }

      // Simple linear forecast
      const lastValue = values[values.length - 1] ?? 0;
      const forecast = Math.max(0, Math.min(1, lastValue + velocity * 60000)); // 1 minute ahead

      trends.push({
        metric: signalType,
        direction,
        velocity,
        acceleration,
        forecast,
        confidence: Math.min(1, signals.length / 10),
      });
    }

    return trends;
  }

  private groupSignalsByType(): Map<string, EmergenceSignal[]> {
    const groups = new Map<string, EmergenceSignal[]>();

    for (const signal of this.state.recentSignals) {
      const key = `${signal.source}:${signal.type}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(signal);
    }

    return groups;
  }

  private calculateVelocity(values: number[], times: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const lastIdx = n - 1;
    const deltaValue = (values[lastIdx] ?? 0) - (values[0] ?? 0);
    const deltaTime = (times[lastIdx] ?? 0) - (times[0] ?? 0);

    return deltaTime > 0 ? deltaValue / deltaTime : 0;
  }

  private calculateAcceleration(values: number[], times: number[]): number {
    if (values.length < 3) return 0;

    const n = values.length;
    const midIdx = Math.floor(n / 2);

    const velocity1 = this.calculateVelocity(values.slice(0, midIdx), times.slice(0, midIdx));
    const velocity2 = this.calculateVelocity(values.slice(midIdx), times.slice(midIdx));

    const deltaTime = (times[n - 1] ?? 0) - (times[0] ?? 0);
    return deltaTime > 0 ? (velocity2 - velocity1) / deltaTime : 0;
  }

  private calculateTrendConfidence(trends: TrendAnalysis[]): number {
    if (trends.length === 0) return 0;

    const positiveTrends = trends.filter((t) => t.direction === 'increasing' && t.velocity > 0.001);

    return Math.min(1, positiveTrends.length / trends.length + 0.2);
  }

  // ============================================================================
  // CORRELATION ANALYSIS
  // ============================================================================

  private updateCorrelations(): void {
    const signalTypes = new Set(this.signalHistory.map((s) => `${s.source}:${s.type}`));

    for (const typeA of signalTypes) {
      for (const typeB of signalTypes) {
        if (typeA >= typeB) continue; // Avoid duplicates

        const correlation = this.calculateCorrelation(typeA, typeB);
        if (Math.abs(correlation.correlation) >= this.policy.correlationThreshold) {
          const key = typeA;
          if (!this.state.correlationMatrix.has(key)) {
            this.state.correlationMatrix.set(key, []);
          }
          this.state.correlationMatrix.get(key)!.push(correlation);
        }
      }
    }

    // Update metrics
    let totalCorrelations = 0;
    for (const correlations of this.state.correlationMatrix.values()) {
      totalCorrelations += correlations.length;
    }
    this.state.metrics.correlationCount = totalCorrelations;
  }

  private calculateCorrelation(typeA: string, typeB: string): SignalCorrelation {
    const signalsA = this.signalHistory.filter((s) => `${s.source}:${s.type}` === typeA);
    const signalsB = this.signalHistory.filter((s) => `${s.source}:${s.type}` === typeB);

    if (signalsA.length < 5 || signalsB.length < 5) {
      return {
        signalA: typeA,
        signalB: typeB,
        correlation: 0,
        lag: 0,
        strength: 0,
        sampleCount: 0,
      };
    }

    // Simple Pearson correlation (without lag for now)
    const minLength = Math.min(signalsA.length, signalsB.length);
    const valuesA = signalsA.slice(-minLength).map((s) => s.value);
    const valuesB = signalsB.slice(-minLength).map((s) => s.value);

    const correlation = this.pearsonCorrelation(valuesA, valuesB);

    return {
      signalA: typeA,
      signalB: typeB,
      correlation,
      lag: 0,
      strength: Math.abs(correlation),
      sampleCount: minLength,
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n < 2) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * (y[i] ?? 0), 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getRelevantCorrelations(type: EmergenceType): SignalCorrelation[] {
    const relevant: SignalCorrelation[] = [];
    const precursorTypes = EMERGENCE_PRECURSORS[type].map((p) => p.type);

    for (const [key, correlations] of this.state.correlationMatrix.entries()) {
      for (const correlation of correlations) {
        const aMatches = precursorTypes.some(
          (p) => correlation.signalA.includes(p) || p.includes(correlation.signalA)
        );
        const bMatches = precursorTypes.some(
          (p) => correlation.signalB.includes(p) || p.includes(correlation.signalB)
        );

        if (aMatches || bMatches) {
          relevant.push(correlation);
        }
      }
    }

    return relevant.slice(0, 10);
  }

  // ============================================================================
  // ESTIMATION & SCORING
  // ============================================================================

  private estimateTimeToEmergence(
    type: EmergenceType,
    precursors: PrecursorSignal[],
    patterns: HistoricalPattern[]
  ): number {
    // Default estimate
    let estimatedMs = this.policy.predictionWindowMs / 2;

    // Adjust based on precursor triggers
    const triggeredPrecursors = precursors.filter((p) => p.triggeredAt);
    if (triggeredPrecursors.length > 0) {
      // More precursors = sooner emergence
      const triggerRatio = triggeredPrecursors.length / precursors.length;
      estimatedMs *= 1 - triggerRatio * 0.7;
    }

    // Adjust based on historical patterns
    if (patterns.length > 0) {
      const avgLeadTime = patterns.reduce((sum, p) => sum + p.averageLeadTime, 0) / patterns.length;
      estimatedMs = (estimatedMs + avgLeadTime) / 2;
    }

    // Adjust based on signal strength
    const avgStrength = precursors.reduce((sum, p) => sum + p.currentValue, 0) / precursors.length;
    if (avgStrength > 0.8) {
      estimatedMs *= 0.5; // High strength = imminent
    }

    return Math.max(60000, Math.min(this.policy.predictionWindowMs, estimatedMs));
  }

  private estimateStrength(precursors: PrecursorSignal[], patterns: HistoricalPattern[]): number {
    const avgPrecursorValue =
      precursors.reduce((sum, p) => sum + p.currentValue, 0) / precursors.length;
    const patternConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length
        : 0.5;

    return avgPrecursorValue * 0.6 + patternConfidence * 0.4;
  }

  private getConfidenceLevel(confidence: number): PredictionConfidence {
    if (confidence >= 0.8) return 'very_high';
    if (confidence >= 0.6) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  }

  private getTimeframe(estimatedMs: number): PredictionTimeframe {
    if (estimatedMs < 120000) return 'imminent'; // < 2 min
    if (estimatedMs < 600000) return 'soon'; // < 10 min
    if (estimatedMs < 1800000) return 'likely'; // < 30 min
    if (estimatedMs < 3600000) return 'possible'; // < 1 hour
    return 'unlikely';
  }

  private generateReasoning(
    type: EmergenceType,
    precursors: PrecursorSignal[],
    patterns: HistoricalPattern[],
    trends: TrendAnalysis[]
  ): string[] {
    const reasons: string[] = [];

    // Precursor-based reasoning
    const triggered = precursors.filter((p) => p.triggeredAt);
    if (triggered.length > 0) {
      reasons.push(`${triggered.length}/${precursors.length} precursors triggered`);
      for (const p of triggered.slice(0, 3)) {
        reasons.push(`• ${p.pattern} (${(p.currentValue * 100).toFixed(0)}%)`);
      }
    }

    // Pattern-based reasoning
    if (patterns.length > 0) {
      const firstPattern = patterns[0];
      reasons.push(
        `Matches ${patterns.length} historical pattern(s) with ${((firstPattern?.successRate ?? 0) * 100).toFixed(0)}% success rate`
      );
    }

    // Trend-based reasoning
    const increasingTrends = trends.filter((t) => t.direction === 'increasing');
    if (increasingTrends.length > 0) {
      reasons.push(`${increasingTrends.length} signal(s) showing upward trend`);
    }

    return reasons;
  }

  // ============================================================================
  // VALIDATION & LEARNING
  // ============================================================================

  private validatePredictions(emergence: EmergenceEvent): void {
    // Defensive check for malformed emergence events
    if (!emergence?.signature?.type) {
      console.warn(
        '[EmergencePredictor] Received emergence event without signature.type, skipping validation'
      );
      return;
    }
    const emergenceType = emergence.signature.type as EmergenceType;
    const emergenceTime = emergence.triggeredAt?.getTime?.() ?? Date.now();

    for (const prediction of this.state.activePredictions) {
      if (prediction.validated) continue;
      if (prediction.type !== emergenceType) continue;

      // Check if prediction was made before emergence and was still valid
      const predictionTime = prediction.createdAt.getTime();
      const expirationTime = prediction.expiresAt.getTime();

      if (predictionTime < emergenceTime && expirationTime > emergenceTime) {
        // Correct prediction!
        prediction.validated = true;
        prediction.actualEmergenceId = emergence.id;
        this.state.metrics.correctPredictions++;

        const leadTime = emergenceTime - predictionTime;
        this.state.metrics.averageLeadTime =
          (this.state.metrics.averageLeadTime * (this.state.metrics.correctPredictions - 1) +
            leadTime) /
          this.state.metrics.correctPredictions;

        bus.publish('cortex', 'prediction:validated', {
          predictionId: prediction.id,
          emergenceId: emergence.id,
          leadTimeMs: leadTime,
          confidence: prediction.confidence,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[EmergencePredictor] ✅ Prediction validated: ${prediction.type} (${(leadTime / 1000).toFixed(0)}s lead time)`
        );
      }
    }
  }

  private learnFromEmergence(emergence: EmergenceEvent): void {
    if (!this.policy.learnFromOutcomes) return;

    // Defensive check for malformed emergence events
    if (!emergence?.signature?.type) {
      console.warn(
        '[EmergencePredictor] Received emergence event without signature.type, skipping learning'
      );
      return;
    }

    this.emergenceHistory.push(emergence);
    if (this.emergenceHistory.length > this.MAX_EMERGENCE_HISTORY) {
      this.emergenceHistory = this.emergenceHistory.slice(-this.MAX_EMERGENCE_HISTORY);
    }

    const emergenceType = emergence.signature.type as EmergenceType;
    const emergenceTime = emergence.triggeredAt?.getTime?.() ?? Date.now();

    // Find signals that preceded this emergence
    const leadTimeWindow = 600000; // 10 minutes
    const precedingSignals = this.signalHistory.filter((s) => {
      const signalTime = s.timestamp.getTime();
      return signalTime < emergenceTime && signalTime > emergenceTime - leadTimeWindow;
    });

    if (precedingSignals.length < this.policy.minSamplesForPattern) {
      return;
    }

    // Extract precursor sequence
    const precursorSequence = [...new Set(precedingSignals.map((s) => s.type))];

    // Look for existing pattern to update
    const existingPattern = this.state.historicalPatterns.find(
      (p) =>
        p.emergenceType === emergenceType &&
        this.arraysOverlap(p.precursorSequence, precursorSequence)
    );

    if (existingPattern) {
      // Update existing pattern
      existingPattern.occurrences++;
      existingPattern.lastSeen = new Date();
      existingPattern.averageLeadTime =
        (existingPattern.averageLeadTime * (existingPattern.occurrences - 1) + leadTimeWindow / 2) /
        existingPattern.occurrences;
      existingPattern.successRate = Math.min(1, existingPattern.successRate + 0.05);
      existingPattern.confidence = Math.min(1, existingPattern.confidence + 0.02);
    } else {
      // Create new pattern
      const pattern: HistoricalPattern = {
        id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        emergenceType,
        precursorSequence,
        averageLeadTime: leadTimeWindow / 2,
        confidence: 0.5,
        occurrences: 1,
        lastSeen: new Date(),
        successRate: 0.6,
      };

      this.state.historicalPatterns.push(pattern);
      this.state.metrics.patternCount++;

      console.log(
        `[EmergencePredictor] 📚 Learned new pattern for ${emergenceType}: ${precursorSequence.join(' → ')}`
      );
    }

    // Apply pattern decay to old patterns
    for (const pattern of this.state.historicalPatterns) {
      if (pattern.lastSeen.getTime() < Date.now() - 86400000) {
        // > 1 day old
        pattern.confidence *= this.policy.patternDecayRate;
      }
    }

    // Remove very low confidence patterns
    this.state.historicalPatterns = this.state.historicalPatterns.filter((p) => p.confidence > 0.1);
  }

  private arraysOverlap(a: string[], b: string[]): boolean {
    const setB = new Set(b);
    const overlap = a.filter((item) => setB.has(item));
    return overlap.length >= Math.min(a.length, b.length) * 0.5;
  }

  // ============================================================================
  // EXPIRATION & CLEANUP
  // ============================================================================

  private expirePredictions(): void {
    const now = Date.now();
    const expiredCount = this.state.activePredictions.filter(
      (p) => !p.validated && p.expiresAt.getTime() < now
    ).length;

    if (expiredCount > 0) {
      this.state.metrics.falsePredictions += expiredCount;
    }

    // Remove expired predictions
    this.state.activePredictions = this.state.activePredictions.filter(
      (p) => p.validated || p.expiresAt.getTime() > now
    );
  }

  // ============================================================================
  // METRICS & UTILITIES
  // ============================================================================

  private updateMetrics(): void {
    const total = this.state.metrics.totalPredictions;
    const correct = this.state.metrics.correctPredictions;

    this.state.metrics.predictionAccuracy = total > 0 ? correct / total : 0;
    this.state.metrics.averageConfidence =
      this.state.activePredictions.length > 0
        ? this.state.activePredictions.reduce((sum, p) => sum + p.confidence, 0) /
          this.state.activePredictions.length
        : 0;
  }

  private mergePrecursors(a: PrecursorSignal[], b: PrecursorSignal[]): PrecursorSignal[] {
    const merged = new Map<string, PrecursorSignal>();

    for (const p of [...a, ...b]) {
      const existing = merged.get(p.type);
      if (!existing || p.currentValue > existing.currentValue) {
        merged.set(p.type, p);
      }
    }

    return Array.from(merged.values());
  }

  private sanitizePrediction(prediction: EmergencePrediction): Partial<EmergencePrediction> {
    return {
      id: prediction.id,
      type: prediction.type,
      confidence: prediction.confidence,
      confidenceLevel: prediction.confidenceLevel,
      timeframe: prediction.timeframe,
      estimatedTimeMs: prediction.estimatedTimeMs,
      estimatedStrength: prediction.estimatedStrength,
      reasoning: prediction.reasoning,
      createdAt: prediction.createdAt,
      expiresAt: prediction.expiresAt,
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async saveState(): Promise<void> {
    try {
      const data = {
        policy: this.policy,
        historicalPatterns: this.state.historicalPatterns,
        metrics: this.state.metrics,
        activePredictions: this.state.activePredictions.slice(-50),
        savedAt: new Date().toISOString(),
      };

      await fs.writeJson(this.stateFile, data, { spaces: 2 });
    } catch (error) {
      console.error('[EmergencePredictor] Failed to save state:', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);

        if (data.policy) {
          this.policy = { ...this.policy, ...data.policy };
        }

        if (data.historicalPatterns) {
          this.state.historicalPatterns = data.historicalPatterns.map((p: HistoricalPattern) => ({
            ...p,
            lastSeen: new Date(p.lastSeen),
          }));
        }

        if (data.metrics) {
          this.state.metrics = { ...this.state.metrics, ...data.metrics };
        }

        console.log(`[EmergencePredictor] Loaded ${this.state.historicalPatterns.length} patterns`);
      }
    } catch (error) {
      console.error('[EmergencePredictor] Failed to load state:', error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Force an immediate prediction cycle
   */
  runPredictionCycle(): void {
    this.updatePredictions().catch((err: Error) => {
      console.error('[EmergencePredictor] Error in forced prediction cycle:', err);
    });
  }

  getPolicy(): PredictorPolicy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<PredictorPolicy>): PredictorPolicy {
    this.policy = { ...this.policy, ...updates };
    this.saveState();
    return this.policy;
  }

  getState(): PredictorState {
    return {
      ...this.state,
      activePredictions: [...this.state.activePredictions],
      historicalPatterns: [...this.state.historicalPatterns],
    };
  }

  getMetrics(): PredictorMetrics {
    return { ...this.state.metrics };
  }

  getActivePredictions(): EmergencePrediction[] {
    return [...this.state.activePredictions];
  }

  getPrediction(id: string): EmergencePrediction | undefined {
    return this.state.activePredictions.find((p) => p.id === id);
  }

  getHistoricalPatterns(): HistoricalPattern[] {
    return [...this.state.historicalPatterns];
  }

  getCorrelations(): Map<string, SignalCorrelation[]> {
    return new Map(this.state.correlationMatrix);
  }

  // Force immediate prediction update
  async forcePredictionUpdate(): Promise<EmergencePrediction[]> {
    await this.updatePredictions();
    return this.state.activePredictions;
  }

  // Clear all predictions (for testing)
  clearPredictions(): void {
    this.state.activePredictions = [];
    this.saveState();
  }

  // Get prediction summary for dashboard
  getSummary(): {
    status: string;
    activePredictions: number;
    patterns: number;
    accuracy: number;
    topPrediction: EmergencePrediction | null;
  } {
    const sorted = [...this.state.activePredictions].sort((a, b) => b.confidence - a.confidence);

    return {
      status: this.state.status,
      activePredictions: this.state.activePredictions.length,
      patterns: this.state.historicalPatterns.length,
      accuracy: this.state.metrics.predictionAccuracy,
      topPrediction: sorted[0] || null,
    };
  }
}

// Export singleton
export const emergencePredictor = EmergencePredictor.getInstance();
