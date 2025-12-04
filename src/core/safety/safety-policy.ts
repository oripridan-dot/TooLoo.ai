// @version 2.4.0
import { BiasDetector, BiasResult } from '../ethics/bias-detector.js';
import { bus } from '../event-bus.js';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActionType {
  CODE_MODIFICATION = 'CODE_MODIFICATION',
  FILE_DELETION = 'FILE_DELETION',
  EXPERIMENT_EXECUTION = 'EXPERIMENT_EXECUTION',
  EXTERNAL_API_CALL = 'EXTERNAL_API_CALL',
  DATABASE_WRITE = 'DATABASE_WRITE',
  SYSTEM_COMMAND = 'SYSTEM_COMMAND',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  DEPENDENCY_UPDATE = 'DEPENDENCY_UPDATE',
}

export interface SafetyAssessment {
  riskLevel: RiskLevel;
  requiresHumanApproval: boolean;
  requiresSandboxTesting: boolean;
  requiresRollbackPlan: boolean;
  maxExecutionTime: number; // milliseconds
  allowedInProduction: boolean;
  reasoning: string;
  biasCheck?: BiasResult;
  warnings: string[];
  blockingIssues: string[];
  // New predictive fields
  predictedRisk?: PredictedRisk;
  softBounds?: SoftBounds;
  driftAssessment?: DriftAssessment;
}

export interface PredictedRisk {
  probability: number; // 0-1 probability of negative outcome
  severity: RiskLevel;
  confidence: number; // 0-1 confidence in prediction
  factors: string[];
  mitigations: string[];
}

export interface SoftBounds {
  degradationLevel: 'none' | 'mild' | 'moderate' | 'severe';
  allowedCapabilities: string[];
  restrictedCapabilities: string[];
  maxResourceUsage: number; // 0-1 fraction of normal limits
  reasoning: string;
}

export interface DriftAssessment {
  detected: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'critical';
  driftScore: number; // 0-1, higher = more drift
  direction: 'positive' | 'negative' | 'neutral';
  baseline: number;
  current: number;
  correctionSuggested: boolean;
  correctionAction?: string;
}

export interface EmergenceSafetyContext {
  emergenceId: string;
  emergenceStrength: number;
  emergenceType: string;
  responseLevel: string;
  affectedSystems: string[];
}

export interface ActionContext {
  type: ActionType;
  description: string;
  scope: string[]; // Files/modules affected
  actor: string; // Which agent/system initiated this
  sessionId: string;
  metadata?: Record<string, any>;
  emergenceContext?: EmergenceSafetyContext; // For emergence-driven actions
}

export interface SafetyPolicyConfig {
  // Risk thresholds
  biasScoreThreshold: number; // Default 0.6
  maxConcurrentHighRiskActions: number; // Default 1
  requireApprovalForRisk: RiskLevel[]; // Default [HIGH, CRITICAL]

  // Sandbox requirements
  alwaysSandboxActions: ActionType[];
  sandboxTimeout: number; // Default 5 minutes

  // Production safeguards
  allowProductionExperiments: boolean; // Default false
  maxDailyExperiments: number; // Default 50
  cooldownBetweenExperiments: number; // Default 60 seconds

  // Predictive safety (new)
  enablePredictiveAssessment: boolean;
  predictionConfidenceThreshold: number; // Min confidence for blocking
  driftDetectionEnabled: boolean;
  driftThreshold: number; // Score above which drift is concerning

  // Soft bounds (new)
  enableSoftBounds: boolean;
  softBoundDegradationLevels: Record<RiskLevel, SoftBounds['degradationLevel']>;
}

export class SafetyPolicy {
  private config: SafetyPolicyConfig;
  private experimentCountToday: number = 0;
  private lastExperimentTime: number = 0;
  private activeHighRiskActions: number = 0;

  // Drift detection state
  private actionHistory: Array<{
    type: ActionType;
    risk: RiskLevel;
    timestamp: Date;
    outcome?: 'success' | 'failure';
  }> = [];
  private baselineRiskDistribution: Record<RiskLevel, number> = {
    [RiskLevel.LOW]: 0.5,
    [RiskLevel.MEDIUM]: 0.3,
    [RiskLevel.HIGH]: 0.15,
    [RiskLevel.CRITICAL]: 0.05,
  };

  constructor(config?: Partial<SafetyPolicyConfig>) {
    this.config = {
      biasScoreThreshold: 0.6,
      maxConcurrentHighRiskActions: 1,
      requireApprovalForRisk: [RiskLevel.HIGH, RiskLevel.CRITICAL],
      alwaysSandboxActions: [
        ActionType.CODE_MODIFICATION,
        ActionType.EXPERIMENT_EXECUTION,
        ActionType.SYSTEM_COMMAND,
      ],
      sandboxTimeout: 300000, // 5 minutes
      allowProductionExperiments: false,
      maxDailyExperiments: 50,
      cooldownBetweenExperiments: 60000, // 60 seconds
      // New predictive config defaults
      enablePredictiveAssessment: true,
      predictionConfidenceThreshold: 0.8,
      driftDetectionEnabled: true,
      driftThreshold: 0.3,
      enableSoftBounds: true,
      softBoundDegradationLevels: {
        [RiskLevel.LOW]: 'none',
        [RiskLevel.MEDIUM]: 'mild',
        [RiskLevel.HIGH]: 'moderate',
        [RiskLevel.CRITICAL]: 'severe',
      },
      ...config,
    };
  }

  /**
   * Comprehensive safety assessment for any autonomous action
   */
  async assess(context: ActionContext): Promise<SafetyAssessment> {
    const warnings: string[] = [];
    const blockingIssues: string[] = [];

    // 1. Classify base risk level by action type
    const baseRisk = this.classifyActionRisk(context.type);

    // 2. Check bias/ethics if action involves text generation or decision-making
    let biasCheck: BiasResult | undefined;
    if (context.description) {
      try {
        biasCheck = await BiasDetector.analyze(context.description, {
          useMultiProvider: true,
          includeRecommendations: true,
        });

        if (biasCheck.score > this.config.biasScoreThreshold) {
          warnings.push(`Bias detected (${biasCheck.severity}): ${biasCheck.reasoning}`);

          if (biasCheck.severity === 'critical' || biasCheck.severity === 'high') {
            blockingIssues.push(
              `Action blocked due to ${biasCheck.severity} bias score: ${biasCheck.score.toFixed(2)}`
            );
          }
        }
      } catch (error) {
        warnings.push(`Bias check failed: ${error}`);
      }
    }

    // 3. Adjust risk based on scope
    let finalRisk = baseRisk;
    if (context.scope.length > 10) {
      finalRisk = this.escalateRisk(finalRisk);
      warnings.push(`Large scope: ${context.scope.length} files affected`);
    }

    // 4. Check experiment rate limits
    if (context.type === ActionType.EXPERIMENT_EXECUTION) {
      if (this.experimentCountToday >= this.config.maxDailyExperiments) {
        blockingIssues.push(`Daily experiment limit reached: ${this.config.maxDailyExperiments}`);
      }

      const timeSinceLastExperiment = Date.now() - this.lastExperimentTime;
      if (timeSinceLastExperiment < this.config.cooldownBetweenExperiments) {
        const waitTime = Math.ceil(
          (this.config.cooldownBetweenExperiments - timeSinceLastExperiment) / 1000
        );
        blockingIssues.push(`Experiment cooldown active: wait ${waitTime}s`);
      }
    }

    // 5. Check concurrent high-risk actions
    if (
      (finalRisk === RiskLevel.HIGH || finalRisk === RiskLevel.CRITICAL) &&
      this.activeHighRiskActions >= this.config.maxConcurrentHighRiskActions
    ) {
      blockingIssues.push(
        `Max concurrent high-risk actions reached: ${this.config.maxConcurrentHighRiskActions}`
      );
    }

    // 6. Production environment checks
    const isProduction = process.env['NODE_ENV'] === 'production';
    if (isProduction && !this.config.allowProductionExperiments) {
      if (context.type === ActionType.EXPERIMENT_EXECUTION) {
        blockingIssues.push('Experiments not allowed in production');
      }
    }

    // 7. Build assessment
    const requiresApproval = this.config.requireApprovalForRisk.includes(finalRisk);
    const requiresSandbox = this.config.alwaysSandboxActions.includes(context.type);
    const requiresRollback = finalRisk === RiskLevel.HIGH || finalRisk === RiskLevel.CRITICAL;

    // 8. Predictive risk assessment (new)
    let predictedRisk: PredictedRisk | undefined;
    if (this.config.enablePredictiveAssessment) {
      predictedRisk = this.predictRisk(context, finalRisk);

      if (
        predictedRisk.probability > 0.7 &&
        predictedRisk.confidence >= this.config.predictionConfidenceThreshold
      ) {
        warnings.push(
          `High predicted risk: ${(predictedRisk.probability * 100).toFixed(0)}% probability of issues`
        );

        if (predictedRisk.severity === RiskLevel.CRITICAL && predictedRisk.probability > 0.8) {
          blockingIssues.push('Predictive assessment indicates critical risk');
        }
      }
    }

    // 9. Soft bounds calculation (new)
    let softBounds: SoftBounds | undefined;
    if (this.config.enableSoftBounds) {
      softBounds = this.calculateSoftBounds(finalRisk, context);
    }

    // 10. Drift detection (new)
    let driftAssessment: DriftAssessment | undefined;
    if (this.config.driftDetectionEnabled) {
      driftAssessment = this.detectDrift();

      if (driftAssessment.detected && driftAssessment.severity !== 'none') {
        warnings.push(
          `Behavioral drift detected: ${driftAssessment.severity} (score: ${driftAssessment.driftScore.toFixed(2)})`
        );

        if (driftAssessment.severity === 'critical') {
          blockingIssues.push('Critical behavioral drift detected - corrective action required');
        }
      }
    }

    // 11. Emergence-specific safety (new)
    if (context.emergenceContext) {
      const emergenceSafety = this.assessEmergenceSafety(context.emergenceContext, finalRisk);
      warnings.push(...emergenceSafety.warnings);
      blockingIssues.push(...emergenceSafety.blockingIssues);
    }

    // Record this action for drift detection
    this.recordAction(context.type, finalRisk);

    return {
      riskLevel: finalRisk,
      requiresHumanApproval: requiresApproval || blockingIssues.length > 0,
      requiresSandboxTesting: requiresSandbox,
      requiresRollbackPlan: requiresRollback,
      maxExecutionTime: this.getTimeoutForRisk(finalRisk),
      allowedInProduction: isProduction ? this.config.allowProductionExperiments : true,
      reasoning: this.buildReasoning(context, finalRisk, biasCheck),
      biasCheck,
      warnings,
      blockingIssues,
      predictedRisk,
      softBounds,
      driftAssessment,
    };
  }

  // ============================================================================
  // PREDICTIVE RISK ASSESSMENT
  // ============================================================================

  /**
   * Predict risk based on historical patterns and context
   */
  private predictRisk(context: ActionContext, baseRisk: RiskLevel): PredictedRisk {
    const factors: string[] = [];
    const mitigations: string[] = [];
    let probability = 0;

    // Factor 1: Historical failure rate for this action type
    const relevantHistory = this.actionHistory.filter(
      (h) => h.type === context.type && Date.now() - h.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    );

    if (relevantHistory.length > 5) {
      const failureRate =
        relevantHistory.filter((h) => h.outcome === 'failure').length / relevantHistory.length;
      probability += failureRate * 0.3;

      if (failureRate > 0.2) {
        factors.push(`Historical failure rate: ${(failureRate * 100).toFixed(0)}%`);
        mitigations.push('Consider additional testing before execution');
      }
    }

    // Factor 2: Scope complexity
    const scopeComplexity = Math.min(1, context.scope.length / 20);
    probability += scopeComplexity * 0.2;

    if (scopeComplexity > 0.5) {
      factors.push(`Large scope: ${context.scope.length} files`);
      mitigations.push('Break down into smaller operations');
    }

    // Factor 3: Time of day (late night = higher risk due to potential fatigue)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
      probability += 0.1;
      factors.push('Late night operation');
      mitigations.push('Consider deferring non-urgent actions');
    }

    // Factor 4: Recent high-risk activity concentration
    const recentHighRisk = this.actionHistory.filter(
      (h) =>
        (h.risk === RiskLevel.HIGH || h.risk === RiskLevel.CRITICAL) &&
        Date.now() - h.timestamp.getTime() < 30 * 60 * 1000
    ).length;

    if (recentHighRisk > 3) {
      probability += 0.15;
      factors.push(`${recentHighRisk} high-risk actions in last 30 minutes`);
      mitigations.push('Allow system to stabilize before continuing');
    }

    // Factor 5: Base risk level contribution
    const riskContribution: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0.05,
      [RiskLevel.MEDIUM]: 0.15,
      [RiskLevel.HIGH]: 0.3,
      [RiskLevel.CRITICAL]: 0.5,
    };
    probability += riskContribution[baseRisk];

    // Confidence based on data availability
    const confidence = Math.min(1, 0.5 + (relevantHistory.length / 20) * 0.5);

    return {
      probability: Math.min(1, probability),
      severity:
        probability > 0.7 ? RiskLevel.HIGH : probability > 0.4 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      confidence,
      factors,
      mitigations,
    };
  }

  // ============================================================================
  // SOFT BOUNDS
  // ============================================================================

  /**
   * Calculate soft bounds - degraded capabilities instead of hard blocks
   */
  private calculateSoftBounds(risk: RiskLevel, context: ActionContext): SoftBounds {
    const degradationLevel = this.config.softBoundDegradationLevels[risk];

    const allCapabilities = [
      'file_write',
      'file_delete',
      'code_execution',
      'network_access',
      'database_write',
      'config_modify',
      'dependency_update',
      'system_command',
    ];

    let allowedCapabilities: string[] = [];
    let restrictedCapabilities: string[] = [];
    let maxResourceUsage = 1.0;
    let reasoning = '';

    switch (degradationLevel) {
      case 'none':
        allowedCapabilities = allCapabilities;
        restrictedCapabilities = [];
        maxResourceUsage = 1.0;
        reasoning = 'Full capabilities available';
        break;

      case 'mild':
        restrictedCapabilities = ['system_command'];
        allowedCapabilities = allCapabilities.filter((c) => !restrictedCapabilities.includes(c));
        maxResourceUsage = 0.9;
        reasoning = 'Minor restrictions on system commands';
        break;

      case 'moderate':
        restrictedCapabilities = ['system_command', 'database_write', 'dependency_update'];
        allowedCapabilities = allCapabilities.filter((c) => !restrictedCapabilities.includes(c));
        maxResourceUsage = 0.7;
        reasoning = 'Moderate restrictions on dangerous operations';
        break;

      case 'severe':
        allowedCapabilities = ['file_write', 'network_access'];
        restrictedCapabilities = allCapabilities.filter((c) => !allowedCapabilities.includes(c));
        maxResourceUsage = 0.5;
        reasoning = 'Severe restrictions - only safe operations allowed';
        break;
    }

    return {
      degradationLevel,
      allowedCapabilities,
      restrictedCapabilities,
      maxResourceUsage,
      reasoning,
    };
  }

  // ============================================================================
  // DRIFT DETECTION
  // ============================================================================

  /**
   * Detect behavioral drift from baseline
   */
  private detectDrift(): DriftAssessment {
    const recentWindow = 100;
    const recent = this.actionHistory.slice(-recentWindow);

    if (recent.length < 20) {
      return {
        detected: false,
        severity: 'none',
        driftScore: 0,
        direction: 'neutral',
        baseline: 0,
        current: 0,
        correctionSuggested: false,
      };
    }

    // Calculate current risk distribution
    const currentDistribution: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
    };

    for (const action of recent) {
      currentDistribution[action.risk]++;
    }

    // Normalize
    for (const level of Object.keys(currentDistribution) as RiskLevel[]) {
      currentDistribution[level] /= recent.length;
    }

    // Calculate drift score using KL-divergence approximation
    let driftScore = 0;
    for (const level of Object.keys(currentDistribution) as RiskLevel[]) {
      const current = currentDistribution[level] || 0.01;
      const baseline = this.baselineRiskDistribution[level] || 0.01;
      driftScore += current * Math.log(current / baseline);
    }
    driftScore = Math.abs(driftScore);

    // Determine severity
    let severity: DriftAssessment['severity'] = 'none';
    if (driftScore > 0.5) severity = 'critical';
    else if (driftScore > 0.3) severity = 'moderate';
    else if (driftScore > 0.15) severity = 'minor';

    // Determine direction (positive = safer, negative = riskier)
    const baselineHighRisk =
      this.baselineRiskDistribution[RiskLevel.HIGH] +
      this.baselineRiskDistribution[RiskLevel.CRITICAL];
    const currentHighRisk =
      currentDistribution[RiskLevel.HIGH] + currentDistribution[RiskLevel.CRITICAL];
    const direction: DriftAssessment['direction'] =
      currentHighRisk > baselineHighRisk * 1.2
        ? 'negative'
        : currentHighRisk < baselineHighRisk * 0.8
          ? 'positive'
          : 'neutral';

    const detected = driftScore >= this.config.driftThreshold;

    // Emit drift event if significant
    if (detected && severity !== 'none') {
      bus.publish('system', 'safety:drift_detected', {
        severity,
        driftScore,
        direction,
        currentDistribution,
        baselineDistribution: this.baselineRiskDistribution,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      detected,
      severity,
      driftScore,
      direction,
      baseline: baselineHighRisk,
      current: currentHighRisk,
      correctionSuggested: severity === 'moderate' || severity === 'critical',
      correctionAction:
        severity === 'critical'
          ? 'Immediate review of recent high-risk actions recommended'
          : severity === 'moderate'
            ? 'Consider reviewing action patterns'
            : undefined,
    };
  }

  /**
   * Record action for drift detection
   */
  private recordAction(type: ActionType, risk: RiskLevel, outcome?: 'success' | 'failure'): void {
    this.actionHistory.push({
      type,
      risk,
      timestamp: new Date(),
      outcome,
    });

    // Keep history bounded
    if (this.actionHistory.length > 1000) {
      this.actionHistory = this.actionHistory.slice(-1000);
    }
  }

  /**
   * Update action outcome for learning
   */
  updateActionOutcome(type: ActionType, outcome: 'success' | 'failure'): void {
    // Find most recent action of this type without outcome
    for (let i = this.actionHistory.length - 1; i >= 0; i--) {
      const action = this.actionHistory[i];
      if (action && action.type === type && !action.outcome) {
        action.outcome = outcome;
        break;
      }
    }
  }

  // ============================================================================
  // EMERGENCE SAFETY
  // ============================================================================

  /**
   * Assess safety of emergence-driven actions
   */
  private assessEmergenceSafety(
    emergenceContext: EmergenceSafetyContext,
    baseRisk: RiskLevel
  ): { warnings: string[]; blockingIssues: string[] } {
    const warnings: string[] = [];
    const blockingIssues: string[] = [];

    // Check emergence strength
    if (emergenceContext.emergenceStrength > 0.9) {
      warnings.push(
        `Very high emergence strength: ${(emergenceContext.emergenceStrength * 100).toFixed(0)}%`
      );
    }

    // Check response level appropriateness
    const responseLevelRisks: Record<string, RiskLevel> = {
      observe: RiskLevel.LOW,
      cautious: RiskLevel.LOW,
      moderate: RiskLevel.MEDIUM,
      amplify: RiskLevel.MEDIUM,
      surge: RiskLevel.HIGH,
    };

    const responseRisk = responseLevelRisks[emergenceContext.responseLevel] || RiskLevel.MEDIUM;

    if (responseRisk === RiskLevel.HIGH && baseRisk === RiskLevel.CRITICAL) {
      blockingIssues.push('Emergence surge response not allowed for critical-risk actions');
    }

    // Check affected systems count
    if (emergenceContext.affectedSystems.length > 5) {
      warnings.push(
        `Emergence affects ${emergenceContext.affectedSystems.length} systems - proceed with caution`
      );
    }

    return { warnings, blockingIssues };
  }

  /**
   * Mark action as started (for rate limiting and concurrency tracking)
   */
  startAction(assessment: SafetyAssessment): void {
    if (assessment.riskLevel === RiskLevel.HIGH || assessment.riskLevel === RiskLevel.CRITICAL) {
      this.activeHighRiskActions++;
    }

    this.lastExperimentTime = Date.now();
    this.experimentCountToday++;
  }

  /**
   * Mark action as completed (release concurrency slot)
   */
  completeAction(assessment: SafetyAssessment): void {
    if (assessment.riskLevel === RiskLevel.HIGH || assessment.riskLevel === RiskLevel.CRITICAL) {
      this.activeHighRiskActions = Math.max(0, this.activeHighRiskActions - 1);
    }
  }

  /**
   * Reset daily counters (should be called at midnight)
   */
  resetDailyCounters(): void {
    this.experimentCountToday = 0;
  }

  private classifyActionRisk(type: ActionType): RiskLevel {
    switch (type) {
      case ActionType.FILE_DELETION:
      case ActionType.DATABASE_WRITE:
        return RiskLevel.CRITICAL;

      case ActionType.CODE_MODIFICATION:
      case ActionType.SYSTEM_COMMAND:
      case ActionType.DEPENDENCY_UPDATE:
        return RiskLevel.HIGH;

      case ActionType.EXPERIMENT_EXECUTION:
      case ActionType.CONFIG_CHANGE:
        return RiskLevel.MEDIUM;

      case ActionType.EXTERNAL_API_CALL:
        return RiskLevel.LOW;

      default:
        return RiskLevel.MEDIUM;
    }
  }

  private escalateRisk(current: RiskLevel): RiskLevel {
    switch (current) {
      case RiskLevel.LOW:
        return RiskLevel.MEDIUM;
      case RiskLevel.MEDIUM:
        return RiskLevel.HIGH;
      case RiskLevel.HIGH:
      case RiskLevel.CRITICAL:
        return RiskLevel.CRITICAL;
    }
  }

  private getTimeoutForRisk(risk: RiskLevel): number {
    switch (risk) {
      case RiskLevel.LOW:
        return 30000; // 30 seconds
      case RiskLevel.MEDIUM:
        return 120000; // 2 minutes
      case RiskLevel.HIGH:
        return 300000; // 5 minutes
      case RiskLevel.CRITICAL:
        return 600000; // 10 minutes
    }
  }

  private buildReasoning(context: ActionContext, risk: RiskLevel, biasCheck?: BiasResult): string {
    const parts = [
      `Action: ${context.type}`,
      `Risk Level: ${risk}`,
      `Scope: ${context.scope.length} files`,
      `Actor: ${context.actor}`,
    ];

    if (biasCheck && biasCheck.detected) {
      parts.push(`Bias: ${biasCheck.severity} (score: ${biasCheck.score.toFixed(2)})`);
    }

    return parts.join(' | ');
  }

  getConfig(): SafetyPolicyConfig {
    return { ...this.config };
  }

  getStats() {
    return {
      experimentsToday: this.experimentCountToday,
      activeHighRiskActions: this.activeHighRiskActions,
      timeSinceLastExperiment: Date.now() - this.lastExperimentTime,
    };
  }
}

// Singleton instance
export const safetyPolicy = new SafetyPolicy();
