// @version 2.3.0
/**
 * EmergenceAmplifier
 * Monitors system events for "emergence signatures" - patterns that signal
 * incoming breakthroughs, unexpected capabilities, or novel insights.
 *
 * Key capabilities:
 * - Detects clustering of curiosity signals
 * - Identifies unexpected performance jumps
 * - Recognizes novel capability combinations
 * - Triggers visual emergence events
 * - Persists discoveries to knowledge graph
 * - [v2.3.0] Safety gates before amplification (tiered response)
 */

import { bus } from '../../core/event-bus.js';
import { safetyPolicy, RiskLevel, ActionType } from '../../core/safety/safety-policy.js';
import KnowledgeGraphEngine from '../memory/knowledge-graph-engine.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Safety gate tiers for emergence response
 */
export type EmergenceResponseTier =
  | 'suppress'
  | 'observe'
  | 'cautious'
  | 'amplify'
  | 'full-amplify';

/**
 * Safety assessment result for emergence
 */
export interface EmergenceSafetyAssessment {
  tier: EmergenceResponseTier;
  riskLevel: RiskLevel;
  amplificationAllowed: boolean;
  amplificationFactor: number;
  visualsAllowed: boolean;
  persistenceAllowed: boolean;
  reason: string;
  constraints: string[];
}

export interface EmergenceSignature {
  id: string;
  type: 'breakthrough' | 'capability' | 'pattern' | 'insight' | 'synergy';
  strength: number; // 0-1
  signals: EmergenceSignal[];
  detectedAt: Date;
  confidence: number;
  domain: string;
  description: string;
}

export interface EmergenceSignal {
  id: string;
  source: string; // which system generated it
  type: string;
  value: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface EmergenceEvent {
  id: string;
  signature: EmergenceSignature;
  triggeredAt: Date;
  visualTriggered: boolean;
  persisted: boolean;
  impact: 'low' | 'medium' | 'high' | 'transformative';
  artifacts: EmergenceArtifact[];
}

export interface EmergenceArtifact {
  id: string;
  type: 'knowledge' | 'capability' | 'optimization' | 'connection';
  content: string;
  confidence: number;
  source: string;
  createdAt: Date;
  linkedSignals: string[];
}

export interface EmergenceMetrics {
  totalEmergences: number;
  byType: Record<string, number>;
  byImpact: Record<string, number>;
  averageSignalClusterSize: number;
  detectionRate: number; // emergences per hour
  falsePositiveRate: number;
  recentEmergences: EmergenceEvent[];
}

export interface EmergencePolicy {
  minSignalClusterSize: number;
  timeWindowMs: number;
  strengthThreshold: number;
  visualTriggerThreshold: number;
  cooldownMs: number;
  enableAutoPersist: boolean;
  enableVisualTriggers: boolean;
  // Safety gate configuration
  enableSafetyGates: boolean;
  riskThresholdForObserve: number; // Above this risk, just observe
  riskThresholdForCautious: number; // Above this risk, cautious amplify
  safetyOverrideCooldownMs: number; // Cooldown after safety suppression
  maxUnverifiedAmplifications: number; // Limit emergences without verification
}

/**
 * Emergence rate tracking for safety
 */
interface EmergenceRateTracker {
  windowMs: number;
  maxPerWindow: number;
  emergences: number[];
}

// ============================================================================
// EMERGENCE AMPLIFIER
// ============================================================================

export class EmergenceAmplifier {
  private static instance: EmergenceAmplifier;

  private signalBuffer: EmergenceSignal[] = [];
  private recentEmergences: EmergenceEvent[] = [];
  private knowledgeGraph?: KnowledgeGraphEngine;
  private policy: EmergencePolicy;
  private lastEmergenceTime: number = 0;
  private dataDir: string;
  private stateFile: string;

  // Safety gate state
  private safetySuppressionActive: boolean = false;
  private safetySuppressionUntil: number = 0;
  private unverifiedAmplifications: number = 0;
  private emergenceRateTracker: EmergenceRateTracker;
  private consecutiveHighRiskCount: number = 0;

  private readonly MAX_SIGNAL_BUFFER = 500;
  private readonly MAX_EMERGENCE_HISTORY = 100;

  // Emergence type detectors
  private readonly EMERGENCE_PATTERNS: Record<
    EmergenceSignature['type'],
    (signals: EmergenceSignal[]) => number
  > = {
    breakthrough: this.detectBreakthroughPattern.bind(this),
    capability: this.detectCapabilityPattern.bind(this),
    pattern: this.detectPatternPattern.bind(this),
    insight: this.detectInsightPattern.bind(this),
    synergy: this.detectSynergyPattern.bind(this),
  };

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'emergence');
    this.stateFile = path.join(this.dataDir, 'emergence-state.json');

    this.policy = {
      minSignalClusterSize: 3,
      timeWindowMs: 120000, // 2 minutes
      strengthThreshold: 0.5,
      visualTriggerThreshold: 0.7,
      cooldownMs: 30000, // 30 seconds between emergences
      enableAutoPersist: true,
      enableVisualTriggers: true,
      // Safety gate configuration
      enableSafetyGates: true,
      riskThresholdForObserve: 0.7, // High risk: observe only
      riskThresholdForCautious: 0.4, // Medium risk: cautious amplification
      safetyOverrideCooldownMs: 60000, // 1 minute cooldown after suppression
      maxUnverifiedAmplifications: 5, // Max emergences before requiring verification
    };

    // Initialize rate tracker
    this.emergenceRateTracker = {
      windowMs: 300000, // 5 minutes
      maxPerWindow: 10, // Max 10 emergences per 5 min
      emergences: [],
    };

    this.setupListeners();
  }

  static getInstance(): EmergenceAmplifier {
    if (!EmergenceAmplifier.instance) {
      EmergenceAmplifier.instance = new EmergenceAmplifier();
    }
    return EmergenceAmplifier.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(knowledgeGraph?: KnowledgeGraphEngine): Promise<void> {
    console.log('[EmergenceAmplifier] Initializing emergence detection system...');

    this.knowledgeGraph = knowledgeGraph;
    await fs.ensureDir(this.dataDir);
    await this.loadState();

    // Start continuous monitoring
    this.startEmergenceMonitoring();

    bus.publish('cortex', 'emergence:amplifier_initialized', {
      policy: this.policy,
      signalBufferSize: this.signalBuffer.length,
      recentEmergenceCount: this.recentEmergences.length,
      timestamp: new Date().toISOString(),
    });

    console.log('[EmergenceAmplifier] Ready - Monitoring for emergence signatures');
  }

  // ============================================================================
  // SIGNAL COLLECTION
  // ============================================================================

  /**
   * Receive and buffer an emergence signal
   */
  receiveSignal(
    source: string,
    type: string,
    value: number,
    metadata: Record<string, unknown> = {}
  ): void {
    const signal: EmergenceSignal = {
      id: `signal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      source,
      type,
      value: Math.max(0, Math.min(1, value)),
      timestamp: new Date(),
      metadata,
    };

    this.signalBuffer.push(signal);

    // Trim buffer if needed
    if (this.signalBuffer.length > this.MAX_SIGNAL_BUFFER) {
      this.signalBuffer = this.signalBuffer.slice(-this.MAX_SIGNAL_BUFFER);
    }

    // Check for immediate emergence trigger
    this.checkForEmergence();
  }

  // ============================================================================
  // EMERGENCE DETECTION
  // ============================================================================

  /**
   * Start continuous emergence monitoring
   */
  private startEmergenceMonitoring(): void {
    setInterval(() => this.checkForEmergence(), 10000); // Check every 10 seconds
  }

  /**
   * Check signal buffer for emergence signatures
   */
  private checkForEmergence(): void {
    // Respect cooldown
    if (Date.now() - this.lastEmergenceTime < this.policy.cooldownMs) {
      return;
    }

    // Get recent signals within time window
    const cutoff = Date.now() - this.policy.timeWindowMs;
    const recentSignals = this.signalBuffer.filter((s) => s.timestamp.getTime() > cutoff);

    if (recentSignals.length < this.policy.minSignalClusterSize) {
      return;
    }

    // Check each emergence pattern
    let strongestSignature: EmergenceSignature | null = null;

    for (const [type, detector] of Object.entries(this.EMERGENCE_PATTERNS)) {
      const strength = detector(recentSignals);

      if (strength >= this.policy.strengthThreshold) {
        const signature = this.createEmergenceSignature(
          type as EmergenceSignature['type'],
          strength,
          recentSignals
        );

        if (!strongestSignature || signature.strength > strongestSignature.strength) {
          strongestSignature = signature;
        }
      }
    }

    // Trigger emergence if strong enough
    if (strongestSignature && strongestSignature.strength >= this.policy.strengthThreshold) {
      this.triggerEmergence(strongestSignature);
    }
  }

  /**
   * Create emergence signature from detected pattern
   */
  private createEmergenceSignature(
    type: EmergenceSignature['type'],
    strength: number,
    signals: EmergenceSignal[]
  ): EmergenceSignature {
    // Determine domain from signals
    const domains = signals
      .map((s) => (s.metadata['domain'] as string) || 'general')
      .reduce((acc: Record<string, number>, d) => {
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});

    const dominantDomain = Object.entries(domains).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

    return {
      id: `emergence-${type}-${Date.now()}`,
      type,
      strength,
      signals: [...signals],
      detectedAt: new Date(),
      confidence: this.calculateConfidence(signals, strength),
      domain: dominantDomain,
      description: this.generateEmergenceDescription(type, signals, strength),
    };
  }

  /**
   * Calculate confidence score for emergence detection
   */
  private calculateConfidence(signals: EmergenceSignal[], strength: number): number {
    // Base confidence from signal count and strength
    const countFactor = Math.min(1, signals.length / 10);
    const strengthFactor = strength;

    // Signal diversity increases confidence
    const sources = new Set(signals.map((s) => s.source)).size;
    const diversityFactor = Math.min(1, sources / 4);

    // Time clustering increases confidence (signals close together)
    const timestamps = signals.map((s) => s.timestamp.getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const clusteringFactor = Math.max(0, 1 - timeSpan / this.policy.timeWindowMs);

    return (
      countFactor * 0.2 + strengthFactor * 0.4 + diversityFactor * 0.2 + clusteringFactor * 0.2
    );
  }

  /**
   * Generate human-readable description of emergence
   */
  private generateEmergenceDescription(
    type: EmergenceSignature['type'],
    signals: EmergenceSignal[],
    strength: number
  ): string {
    const descriptions: Record<EmergenceSignature['type'], string> = {
      breakthrough: `Breakthrough detected: ${signals.length} converging signals indicate major discovery`,
      capability: `New capability emerging: Unexpected combination of abilities detected`,
      pattern: `Novel pattern recognized: System identified recurring structure`,
      insight: `Insight crystallizing: Cross-domain connection forming`,
      synergy: `Synergy emerging: Multiple systems amplifying each other`,
    };

    return `${descriptions[type]} (strength: ${(strength * 100).toFixed(0)}%)`;
  }

  // ============================================================================
  // PATTERN DETECTORS
  // ============================================================================

  /**
   * Detect breakthrough pattern - sudden performance jumps
   */
  private detectBreakthroughPattern(signals: EmergenceSignal[]): number {
    // Look for high-value signals from exploration or learning
    const breakthroughSignals = signals.filter(
      (s) =>
        s.value > 0.7 &&
        (s.source.includes('exploration') ||
          s.source.includes('learning') ||
          s.type === 'success' ||
          s.type === 'discovery')
    );

    if (breakthroughSignals.length < 2) return 0;

    // Calculate clustering score
    const avgValue =
      breakthroughSignals.reduce((sum, s) => sum + s.value, 0) / breakthroughSignals.length;

    return avgValue * Math.min(1, breakthroughSignals.length / 5);
  }

  /**
   * Detect capability pattern - novel capability combinations
   */
  private detectCapabilityPattern(signals: EmergenceSignal[]): number {
    // Look for capability-related signals
    const capabilitySignals = signals.filter(
      (s) =>
        s.type === 'capability_gap' ||
        s.type === 'capability_discovery' ||
        s.source.includes('capability')
    );

    if (capabilitySignals.length < 2) return 0;

    // Check for capability combination signals
    const combinationSignals = capabilitySignals.filter(
      (s) =>
        (s.metadata['combination'] as boolean) ||
        (s.metadata['capabilities'] as string[])?.length > 1
    );

    const combinationFactor = combinationSignals.length / capabilitySignals.length;
    const avgValue =
      capabilitySignals.reduce((sum, s) => sum + s.value, 0) / capabilitySignals.length;

    return avgValue * (0.5 + combinationFactor * 0.5);
  }

  /**
   * Detect pattern pattern - recurring structures
   */
  private detectPatternPattern(signals: EmergenceSignal[]): number {
    // Look for pattern-related signals
    const patternSignals = signals.filter(
      (s) =>
        s.type === 'novelty' ||
        s.type === 'complexity' ||
        s.type === 'pattern' ||
        s.source.includes('curiosity')
    );

    if (patternSignals.length < 3) return 0;

    // Check for repeated types (pattern of patterns)
    const types = patternSignals.map((s) => s.type);
    const typeCounts = types.reduce((acc: Record<string, number>, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const maxTypeCount = Math.max(...Object.values(typeCounts));
    const repetitionFactor = maxTypeCount / patternSignals.length;

    const avgValue = patternSignals.reduce((sum, s) => sum + s.value, 0) / patternSignals.length;

    return avgValue * (0.3 + repetitionFactor * 0.7);
  }

  /**
   * Detect insight pattern - cross-domain connections
   */
  private detectInsightPattern(signals: EmergenceSignal[]): number {
    // Look for dissonance or cross-domain signals
    const insightSignals = signals.filter(
      (s) =>
        s.type === 'dissonance' ||
        s.type === 'surprise' ||
        s.type === 'emergence_precursor' ||
        (s.metadata['crossDomain'] as boolean)
    );

    if (insightSignals.length < 2) return 0;

    // Check for multiple domains (cross-domain insight)
    const domains = new Set(
      insightSignals.map((s) => (s.metadata['domain'] as string) || 'general')
    );

    const crossDomainFactor = Math.min(1, (domains.size - 1) / 3);
    const avgValue = insightSignals.reduce((sum, s) => sum + s.value, 0) / insightSignals.length;

    return avgValue * (0.5 + crossDomainFactor * 0.5);
  }

  /**
   * Detect synergy pattern - systems amplifying each other
   */
  private detectSynergyPattern(signals: EmergenceSignal[]): number {
    // Look for signals from multiple sources with high values
    const sources = new Set(signals.map((s) => s.source));
    if (sources.size < 3) return 0; // Need multiple systems

    // Calculate per-source averages
    const sourceAvgs: Record<string, number[]> = {};
    for (const signal of signals) {
      if (!sourceAvgs[signal.source]) sourceAvgs[signal.source] = [];
      const arr = sourceAvgs[signal.source];
      if (arr) arr.push(signal.value);
    }

    // Check if multiple sources have high averages (synergy)
    const highAvgSources = Object.values(sourceAvgs).filter((vals) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg > 0.5;
    }).length;

    const synergyFactor = highAvgSources / sources.size;
    const overallAvg = signals.reduce((sum, s) => sum + s.value, 0) / signals.length;

    return overallAvg * synergyFactor;
  }

  // ============================================================================
  // EMERGENCE TRIGGERING
  // ============================================================================

  /**
   * Trigger emergence event and related actions
   * Now includes safety gates to prevent undesirable emergent behaviors
   */
  private async triggerEmergence(signature: EmergenceSignature): Promise<void> {
    this.lastEmergenceTime = Date.now();

    console.log(
      `[EmergenceAmplifier] 🌟 EMERGENCE DETECTED: ${signature.type} (strength: ${(signature.strength * 100).toFixed(0)}%)`
    );

    // ========================================================================
    // SAFETY GATE: Assess emergence before amplification
    // ========================================================================
    const safetyAssessment = this.policy.enableSafetyGates
      ? await this.assessEmergenceSafety(signature)
      : this.getDefaultSafetyAssessment();

    // Log safety assessment
    console.log(
      `[EmergenceAmplifier] Safety assessment: tier=${safetyAssessment.tier}, ` +
        `risk=${safetyAssessment.riskLevel}, amplification=${safetyAssessment.amplificationFactor.toFixed(2)}`
    );

    // Check if emergence should be suppressed
    if (safetyAssessment.tier === 'suppress') {
      console.log(`[EmergenceAmplifier] ⚠️ Emergence SUPPRESSED: ${safetyAssessment.reason}`);
      bus.publish('cortex', 'emergence:suppressed', {
        signatureId: signature.id,
        type: signature.type,
        strength: signature.strength,
        reason: safetyAssessment.reason,
        riskLevel: safetyAssessment.riskLevel,
        timestamp: new Date().toISOString(),
      });

      // Activate suppression cooldown
      this.safetySuppressionActive = true;
      this.safetySuppressionUntil = Date.now() + this.policy.safetyOverrideCooldownMs;
      this.consecutiveHighRiskCount++;

      return; // Don't proceed with emergence
    }

    // Track emergence rate
    this.trackEmergenceRate();

    // Determine impact level (potentially modified by safety tier)
    const baseImpact = this.determineImpact(signature);
    const impact =
      safetyAssessment.tier === 'cautious' ? this.downgradeImpact(baseImpact) : baseImpact;

    // Create emergence event
    const event: EmergenceEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      signature,
      triggeredAt: new Date(),
      visualTriggered: false,
      persisted: false,
      impact,
      artifacts: [],
    };

    // Trigger visual emergence if allowed by safety assessment
    const visualsAllowed =
      safetyAssessment.visualsAllowed &&
      this.policy.enableVisualTriggers &&
      signature.strength >= this.policy.visualTriggerThreshold;

    if (visualsAllowed) {
      this.triggerVisualEmergence(signature, safetyAssessment.amplificationFactor);
      event.visualTriggered = true;
    }

    // Create and persist artifacts if allowed
    if (safetyAssessment.persistenceAllowed && this.policy.enableAutoPersist) {
      const artifacts = await this.createArtifacts(signature);
      event.artifacts = artifacts;
      await this.persistArtifacts(artifacts, signature);
      event.persisted = true;
      this.unverifiedAmplifications++;
    }

    // Record emergence
    this.recentEmergences.push(event);
    if (this.recentEmergences.length > this.MAX_EMERGENCE_HISTORY) {
      this.recentEmergences = this.recentEmergences.slice(-this.MAX_EMERGENCE_HISTORY);
    }

    // Clear processed signals
    const signalIds = new Set(signature.signals.map((s) => s.id));
    this.signalBuffer = this.signalBuffer.filter((s) => !signalIds.has(s.id));

    // Publish emergence event (with safety context)
    bus.publish('cortex', 'emergence:detected', {
      eventId: event.id,
      type: signature.type,
      strength: signature.strength,
      confidence: signature.confidence,
      impact,
      domain: signature.domain,
      description: signature.description,
      signalCount: signature.signals.length,
      artifactCount: event.artifacts.length,
      visualTriggered: event.visualTriggered,
      // Safety gate info
      safetyTier: safetyAssessment.tier,
      safetyRiskLevel: safetyAssessment.riskLevel,
      amplificationFactor: safetyAssessment.amplificationFactor,
      safetyConstraints: safetyAssessment.constraints,
      timestamp: new Date().toISOString(),
    });

    // Reset consecutive high risk count on successful emergence
    if (safetyAssessment.riskLevel === RiskLevel.LOW) {
      this.consecutiveHighRiskCount = 0;
    }

    // Persist state
    await this.saveState();
  }

  /**
   * Determine impact level of emergence
   */
  private determineImpact(signature: EmergenceSignature): EmergenceEvent['impact'] {
    const score = signature.strength * signature.confidence;

    if (score > 0.9) return 'transformative';
    if (score > 0.7) return 'high';
    if (score > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Trigger visual emergence animation (with amplification factor)
   */
  private triggerVisualEmergence(
    signature: EmergenceSignature,
    amplificationFactor: number = 1.0
  ): void {
    const baseDuration = Math.min(5000, 2000 + signature.strength * 3000);
    const duration = baseDuration * amplificationFactor;

    bus.publish('cortex', 'emergence:visual_trigger', {
      type: signature.type,
      strength: signature.strength,
      duration,
      description: signature.description,
      timestamp: new Date().toISOString(),
    });

    console.log(`[EmergenceAmplifier] 🎆 Visual emergence triggered (${duration}ms)`);
  }

  // ============================================================================
  // SAFETY GATE ASSESSMENT
  // ============================================================================

  /**
   * Assess safety of emergence before amplification
   * Returns tiered response based on risk analysis
   */
  private async assessEmergenceSafety(
    signature: EmergenceSignature
  ): Promise<EmergenceSafetyAssessment> {
    // Check if suppression is active
    if (this.safetySuppressionActive && Date.now() < this.safetySuppressionUntil) {
      return {
        tier: 'suppress',
        riskLevel: RiskLevel.HIGH,
        amplificationAllowed: false,
        amplificationFactor: 0,
        visualsAllowed: false,
        persistenceAllowed: false,
        reason: 'Safety suppression cooldown active',
        constraints: ['awaiting_cooldown'],
      };
    }

    // Clear suppression if cooldown has passed
    if (this.safetySuppressionActive && Date.now() >= this.safetySuppressionUntil) {
      this.safetySuppressionActive = false;
    }

    // Check emergence rate limits
    const rateExceeded = this.isEmergenceRateExceeded();
    if (rateExceeded) {
      return {
        tier: 'observe',
        riskLevel: RiskLevel.MEDIUM,
        amplificationAllowed: false,
        amplificationFactor: 0,
        visualsAllowed: false,
        persistenceAllowed: true, // Still log but don't amplify
        reason: 'Emergence rate limit exceeded',
        constraints: ['rate_limited'],
      };
    }

    // Check unverified amplification limit
    if (this.unverifiedAmplifications >= this.policy.maxUnverifiedAmplifications) {
      return {
        tier: 'observe',
        riskLevel: RiskLevel.MEDIUM,
        amplificationAllowed: false,
        amplificationFactor: 0,
        visualsAllowed: false,
        persistenceAllowed: true,
        reason: 'Too many unverified amplifications - verification required',
        constraints: ['verification_required'],
      };
    }

    // Analyze signature for risk indicators
    const riskScore = this.calculateEmergenceRiskScore(signature);
    const riskLevel = this.scoreToRiskLevel(riskScore);

    // Check consecutive high-risk count
    if (this.consecutiveHighRiskCount >= 3) {
      return {
        tier: 'suppress',
        riskLevel: RiskLevel.CRITICAL,
        amplificationAllowed: false,
        amplificationFactor: 0,
        visualsAllowed: false,
        persistenceAllowed: false,
        reason: 'Multiple consecutive high-risk emergences detected',
        constraints: ['consecutive_risk_pattern', 'manual_review_required'],
      };
    }

    // Use SafetyPolicy for additional assessment if available
    const safetyPolicyRisk = await this.consultSafetyPolicy(signature);
    const combinedRiskScore = Math.max(riskScore, safetyPolicyRisk);
    const combinedRiskLevel = this.scoreToRiskLevel(combinedRiskScore);

    // Determine tier based on combined risk
    return this.determineSafetyTier(signature, combinedRiskScore, combinedRiskLevel);
  }

  /**
   * Calculate risk score for emergence signature
   */
  private calculateEmergenceRiskScore(signature: EmergenceSignature): number {
    let riskScore = 0;

    // High strength with low confidence is risky
    if (signature.strength > 0.8 && signature.confidence < 0.5) {
      riskScore += 0.3;
    }

    // Transformative emergences need scrutiny
    if (signature.type === 'breakthrough' || signature.type === 'capability') {
      riskScore += 0.2;
    }

    // Check signal diversity (too homogeneous might indicate false pattern)
    const signalSources = new Set(signature.signals.map((s) => s.source));
    if (signalSources.size < 2) {
      riskScore += 0.15; // Single-source might be noise
    }

    // Check for anomalous signal patterns
    const signalValues = signature.signals.map((s) => s.value);
    const avgValue = signalValues.reduce((a, b) => a + b, 0) / signalValues.length;
    const variance =
      signalValues.reduce((acc, v) => acc + Math.pow(v - avgValue, 2), 0) / signalValues.length;

    // High variance in signals might indicate instability
    if (variance > 0.3) {
      riskScore += 0.15;
    }

    // Very rapid emergence (short time span) might need verification
    if (signature.signals.length > 5) {
      const timestamps = signature.signals.map((s) => s.timestamp.getTime());
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
      if (timeSpan < 10000 && signature.signals.length > 8) {
        // Many signals in <10s
        riskScore += 0.2;
      }
    }

    return Math.min(1, riskScore);
  }

  /**
   * Convert risk score to RiskLevel
   */
  private scoreToRiskLevel(score: number): RiskLevel {
    if (score >= 0.8) return RiskLevel.CRITICAL;
    if (score >= 0.6) return RiskLevel.HIGH;
    if (score >= 0.4) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Consult SafetyPolicy for additional risk assessment
   */
  private async consultSafetyPolicy(signature: EmergenceSignature): Promise<number> {
    try {
      // Create a synthetic action context for safety assessment
      const emergenceAction = {
        type: ActionType.EXPERIMENT_EXECUTION,
        description: `Emergence amplification: ${signature.type} in domain ${signature.domain}`,
        scope: [signature.domain],
        actor: 'emergence_amplifier',
        sessionId: `emergence-${signature.id}`,
        metadata: {
          emergenceType: signature.type,
          strength: signature.strength,
          confidence: signature.confidence,
          signalCount: signature.signals.length,
        },
      };

      const assessment = await safetyPolicy.assess(emergenceAction);

      // Map SafetyPolicy risk to score
      const riskScores: Record<RiskLevel, number> = {
        [RiskLevel.LOW]: 0.2,
        [RiskLevel.MEDIUM]: 0.4,
        [RiskLevel.HIGH]: 0.6,
        [RiskLevel.CRITICAL]: 0.9,
      };

      return riskScores[assessment.riskLevel] || 0.5;
    } catch {
      // If safety policy unavailable, return moderate risk
      return 0.3;
    }
  }

  /**
   * Determine safety response tier based on risk analysis
   */
  private determineSafetyTier(
    signature: EmergenceSignature,
    riskScore: number,
    riskLevel: RiskLevel
  ): EmergenceSafetyAssessment {
    const constraints: string[] = [];

    // Critical risk: suppress
    if (riskLevel === RiskLevel.CRITICAL) {
      return {
        tier: 'suppress',
        riskLevel,
        amplificationAllowed: false,
        amplificationFactor: 0,
        visualsAllowed: false,
        persistenceAllowed: false,
        reason: 'Critical risk level - emergence suppressed for safety',
        constraints: ['critical_risk', 'requires_review'],
      };
    }

    // High risk: observe only
    if (riskScore >= this.policy.riskThresholdForObserve) {
      return {
        tier: 'observe',
        riskLevel,
        amplificationAllowed: false,
        amplificationFactor: 0,
        visualsAllowed: false,
        persistenceAllowed: true,
        reason: 'High risk - observing without amplification',
        constraints: ['observation_mode', 'no_amplification'],
      };
    }

    // Medium risk: cautious amplification
    if (riskScore >= this.policy.riskThresholdForCautious) {
      constraints.push('reduced_amplification', 'monitored');
      return {
        tier: 'cautious',
        riskLevel,
        amplificationAllowed: true,
        amplificationFactor: 0.5, // Reduced amplification
        visualsAllowed: true,
        persistenceAllowed: true,
        reason: 'Moderate risk - proceeding with caution',
        constraints,
      };
    }

    // Low risk or below: normal to full amplification
    return {
      tier: 'amplify',
      riskLevel,
      amplificationAllowed: true,
      amplificationFactor: 1.0,
      visualsAllowed: true,
      persistenceAllowed: true,
      reason: 'Low risk - normal amplification',
      constraints: [],
    };
  }

  /**
   * Get default safety assessment when gates are disabled
   */
  private getDefaultSafetyAssessment(): EmergenceSafetyAssessment {
    return {
      tier: 'amplify',
      riskLevel: RiskLevel.LOW,
      amplificationAllowed: true,
      amplificationFactor: 1.0,
      visualsAllowed: true,
      persistenceAllowed: true,
      reason: 'Safety gates disabled - default amplification',
      constraints: [],
    };
  }

  /**
   * Downgrade impact level for cautious amplification
   */
  private downgradeImpact(impact: EmergenceEvent['impact']): EmergenceEvent['impact'] {
    switch (impact) {
      case 'transformative':
        return 'high';
      case 'high':
        return 'medium';
      case 'medium':
        return 'low';
      default:
        return 'low';
    }
  }

  /**
   * Track emergence rate for rate limiting
   */
  private trackEmergenceRate(): void {
    const now = Date.now();
    this.emergenceRateTracker.emergences.push(now);

    // Clean old entries
    const cutoff = now - this.emergenceRateTracker.windowMs;
    this.emergenceRateTracker.emergences = this.emergenceRateTracker.emergences.filter(
      (t) => t > cutoff
    );
  }

  /**
   * Check if emergence rate is exceeded
   */
  private isEmergenceRateExceeded(): boolean {
    const now = Date.now();
    const cutoff = now - this.emergenceRateTracker.windowMs;
    const recentCount = this.emergenceRateTracker.emergences.filter((t) => t > cutoff).length;
    return recentCount >= this.emergenceRateTracker.maxPerWindow;
  }

  /**
   * Mark an emergence as verified (resets unverified counter)
   */
  verifyEmergence(eventId: string): boolean {
    const event = this.recentEmergences.find((e) => e.id === eventId);
    if (event) {
      this.unverifiedAmplifications = Math.max(0, this.unverifiedAmplifications - 1);
      bus.publish('cortex', 'emergence:verified', {
        eventId,
        unverifiedRemaining: this.unverifiedAmplifications,
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Get current safety state
   */
  getSafetyState(): {
    suppressionActive: boolean;
    suppressionUntil: number | null;
    unverifiedCount: number;
    emergenceRate: number;
    consecutiveHighRisk: number;
  } {
    const now = Date.now();
    const recentCount = this.emergenceRateTracker.emergences.filter(
      (t) => t > now - this.emergenceRateTracker.windowMs
    ).length;

    return {
      suppressionActive: this.safetySuppressionActive && now < this.safetySuppressionUntil,
      suppressionUntil: this.safetySuppressionActive ? this.safetySuppressionUntil : null,
      unverifiedCount: this.unverifiedAmplifications,
      emergenceRate: recentCount / (this.emergenceRateTracker.windowMs / 60000), // per minute
      consecutiveHighRisk: this.consecutiveHighRiskCount,
    };
  }

  // ============================================================================
  // ARTIFACT CREATION & PERSISTENCE
  // ============================================================================

  /**
   * Create artifacts from emergence signature
   */
  private async createArtifacts(signature: EmergenceSignature): Promise<EmergenceArtifact[]> {
    const artifacts: EmergenceArtifact[] = [];

    // Create primary artifact based on emergence type
    const primary: EmergenceArtifact = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: this.mapEmergenceToArtifactType(signature.type),
      content: this.generateArtifactContent(signature),
      confidence: signature.confidence,
      source: 'emergence_amplifier',
      createdAt: new Date(),
      linkedSignals: signature.signals.map((s) => s.id),
    };

    artifacts.push(primary);

    // Create connection artifacts if cross-domain
    if (signature.signals.length > 3) {
      const connectionArtifact: EmergenceArtifact = {
        id: `artifact-connection-${Date.now()}`,
        type: 'connection',
        content: `Connection discovered between ${signature.signals
          .map((s) => s.source)
          .slice(0, 3)
          .join(', ')}`,
        confidence: signature.confidence * 0.8,
        source: 'emergence_amplifier',
        createdAt: new Date(),
        linkedSignals: signature.signals.slice(0, 5).map((s) => s.id),
      };
      artifacts.push(connectionArtifact);
    }

    return artifacts;
  }

  /**
   * Map emergence type to artifact type
   */
  private mapEmergenceToArtifactType(
    emergenceType: EmergenceSignature['type']
  ): EmergenceArtifact['type'] {
    const mapping: Record<EmergenceSignature['type'], EmergenceArtifact['type']> = {
      breakthrough: 'knowledge',
      capability: 'capability',
      pattern: 'knowledge',
      insight: 'knowledge',
      synergy: 'optimization',
    };
    return mapping[emergenceType];
  }

  /**
   * Generate artifact content from signature
   */
  private generateArtifactContent(signature: EmergenceSignature): string {
    const signalSummary = signature.signals
      .slice(0, 5)
      .map((s) => `${s.source}:${s.type}(${(s.value * 100).toFixed(0)}%)`)
      .join(', ');

    return `${signature.description}\n\nContributing signals: ${signalSummary}\n\nDomain: ${signature.domain}\nConfidence: ${(signature.confidence * 100).toFixed(0)}%`;
  }

  /**
   * Persist artifacts to knowledge graph
   */
  private async persistArtifacts(
    artifacts: EmergenceArtifact[],
    signature: EmergenceSignature
  ): Promise<void> {
    if (!this.knowledgeGraph) {
      console.log('[EmergenceAmplifier] No knowledge graph available, skipping persistence');
      return;
    }

    for (const artifact of artifacts) {
      try {
        // Add to knowledge graph using the existing API pattern
        // Record the emergence as a task performance for learning
        this.knowledgeGraph.recordTaskPerformance({
          taskId: artifact.id,
          goal: signature.domain,
          provider: `emergence-${signature.type}`,
          success: artifact.confidence > 0.7,
          responseTime: 0,
          quality: artifact.confidence,
          context: {
            domain: signature.domain,
            complexity:
              signature.strength > 0.8 ? 'high' : signature.strength > 0.5 ? 'medium' : 'low',
            emergenceType: signature.type,
            emergenceStrength: signature.strength,
          },
        });

        // Add relationship edge
        if (signature.domain !== 'general') {
          this.knowledgeGraph.addEdge(artifact.id, `domain-${signature.domain}`, {
            type: 'belongs_to',
            strength: 0.8,
            created: Date.now(),
          });
        }

        console.log(`[EmergenceAmplifier] Persisted artifact: ${artifact.id}`);
      } catch (error) {
        console.error(`[EmergenceAmplifier] Failed to persist artifact:`, error);
      }
    }
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);

        this.recentEmergences = (data.recentEmergences || []).map((e: any) => ({
          ...e,
          triggeredAt: new Date(e.triggeredAt),
          signature: {
            ...e.signature,
            detectedAt: new Date(e.signature.detectedAt),
          },
        }));

        console.log('[EmergenceAmplifier] Restored state:', {
          recentEmergences: this.recentEmergences.length,
        });
      }
    } catch (error) {
      console.error('[EmergenceAmplifier] Failed to load state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(
        this.stateFile,
        {
          recentEmergences: this.recentEmergences.slice(-50),
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error('[EmergenceAmplifier] Failed to save state:', error);
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupListeners(): void {
    // Curiosity signals
    bus.on('curiosity:signal_generated', (event) => {
      const { type, score, signalId } = event.payload;
      this.receiveSignal('curiosity_engine', type, score, {
        signalId,
        domain: event.payload.context?.domain || 'general',
      });
    });

    // Curiosity emergence precursors
    bus.on('curiosity:emergence_precursor_detected', (event) => {
      const { clusterStrength, emergenceType, signalCount } = event.payload;
      this.receiveSignal('curiosity_engine', 'emergence_precursor', clusterStrength, {
        emergenceType,
        signalCount,
        crossDomain: true,
      });
    });

    // Exploration experiment completion
    bus.on('exploration:experiment_completed', (event) => {
      const { success, confidence, hypothesisId } = event.payload;
      this.receiveSignal(
        'exploration_engine',
        success ? 'success' : 'failure',
        success ? confidence : 0.2,
        {
          hypothesisId,
          domain: event.payload.targetArea,
        }
      );
    });

    // Learning rewards
    bus.on('learning:reward_recorded', (event) => {
      const { value, source, provider, taskType } = event.payload;
      if (value > 0.5) {
        this.receiveSignal('reinforcement_learner', 'reward', value, {
          source,
          provider,
          domain: taskType,
        });
      }
    });

    // Learning strategy adjustments
    bus.on('learning:strategies_adjusted', (event) => {
      const { adjustmentCount } = event.payload;
      if (adjustmentCount > 2) {
        this.receiveSignal('reinforcement_learner', 'strategy_shift', 0.6, {
          adjustmentCount,
        });
      }
    });

    // DisCover artifacts
    bus.on('discover:artifact_created', (event) => {
      const { type, artifactId } = event.payload;
      this.receiveSignal('discover_agent', 'discovery', 0.7, {
        artifactId,
        type,
      });
    });

    // Meta-learning phase completion
    bus.on('precog:meta_learning_phase_complete', (event) => {
      const { phase, improvements } = event.payload;
      if (improvements && improvements.length > 0) {
        this.receiveSignal('meta_learning', 'improvement', 0.6, {
          phase,
          improvementCount: improvements.length,
        });
      }
    });

    // Coordinator integration: reset safety state on verification
    bus.on('emergence:external_verification', (event) => {
      const { eventId, verified } = event.payload;
      if (verified && eventId) {
        this.verifyEmergence(eventId);
      }
    });

    // Coordinator: safety policy override
    bus.on('safety:emergency_stop', () => {
      console.log('[EmergenceAmplifier] Emergency stop received - suppressing emergences');
      this.safetySuppressionActive = true;
      this.safetySuppressionUntil = Date.now() + 300000; // 5 minute suppression
    });

    // Coordinator: resume from emergency
    bus.on('safety:resume_operations', () => {
      console.log('[EmergenceAmplifier] Operations resumed - clearing safety suppression');
      this.safetySuppressionActive = false;
      this.consecutiveHighRiskCount = 0;
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getMetrics(): EmergenceMetrics {
    const byType: Record<string, number> = {};
    const byImpact: Record<string, number> = {};

    for (const e of this.recentEmergences) {
      byType[e.signature.type] = (byType[e.signature.type] || 0) + 1;
      byImpact[e.impact] = (byImpact[e.impact] || 0) + 1;
    }

    const avgClusterSize =
      this.recentEmergences.length > 0
        ? this.recentEmergences.reduce((sum, e) => sum + e.signature.signals.length, 0) /
          this.recentEmergences.length
        : 0;

    // Calculate detection rate (emergences per hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentCount = this.recentEmergences.filter(
      (e) => e.triggeredAt.getTime() > oneHourAgo
    ).length;

    return {
      totalEmergences: this.recentEmergences.length,
      byType,
      byImpact,
      averageSignalClusterSize: avgClusterSize,
      detectionRate: recentCount,
      falsePositiveRate: 0, // Would need user feedback to calculate
      recentEmergences: this.recentEmergences.slice(-10),
    };
  }

  getRecentEmergences(limit: number = 10): EmergenceEvent[] {
    return this.recentEmergences.slice(-limit);
  }

  getSignalBuffer(): EmergenceSignal[] {
    return [...this.signalBuffer];
  }

  getCurrentStrength(): number {
    const cutoff = Date.now() - this.policy.timeWindowMs;
    const recentSignals = this.signalBuffer.filter((s) => s.timestamp.getTime() > cutoff);

    if (recentSignals.length < this.policy.minSignalClusterSize) return 0;

    // Find max pattern strength
    let maxStrength = 0;
    for (const detector of Object.values(this.EMERGENCE_PATTERNS)) {
      maxStrength = Math.max(maxStrength, detector(recentSignals));
    }

    return maxStrength;
  }

  /**
   * Manually inject a signal for testing
   */
  injectSignal(
    source: string,
    type: string,
    value: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.receiveSignal(source, type, value, metadata);
  }

  /**
   * Update policy settings
   */
  updatePolicy(updates: Partial<EmergencePolicy>): void {
    this.policy = { ...this.policy, ...updates };

    bus.publish('cortex', 'emergence:policy_updated', {
      policy: this.policy,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton
export const emergenceAmplifier = EmergenceAmplifier.getInstance();
