// @version 2.1.28
// Real-time Learning & Dynamic Threshold Adaptation for TooLoo.ai
// Automatically adjusts validation thresholds based on success patterns

import fs from 'fs';
import path from 'path';

class RealTimeLearningEngine {
  constructor() {
    this.configFile = path.join(process.cwd(), 'logs', 'adaptive-config.json');
    this.performanceFile = path.join(process.cwd(), 'logs', 'performance-history.json');
    
    this.config = this.loadConfig();
    this.performanceHistory = this.loadPerformanceHistory();
    
    // Learning parameters
    this.learningRate = 0.1;
    this.minSampleSize = 5;
    this.adaptationInterval = 10; // Adapt every 10 validations
    this.validationCount = 0;
    
    // Dynamic thresholds (start with defaults)
    this.dynamicThresholds = {
      confidenceThreshold: 70,
      reasoningValidationThreshold: 0.8,
      factualValidationThreshold: 0.7,
      agreementThreshold: 70,
      costEfficiencyTarget: 0.05 // Target 5% of budget for validation
    };

    this.performanceMetrics = {
      validationSuccess: [],
      costEfficiency: [],
      userSatisfaction: [],
      agreementScores: [],
      taskTypes: new Map()
    };
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load adaptive config:', error.message);
    }
    return { lastAdaptation: null, adaptationCount: 0 };
  }

  loadPerformanceHistory() {
    try {
      if (fs.existsSync(this.performanceFile)) {
        return JSON.parse(fs.readFileSync(this.performanceFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load performance history:', error.message);
    }
    return [];
  }

  saveConfig() {
    try {
      const dir = path.dirname(this.configFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.warn('Could not save adaptive config:', error.message);
    }
  }

  savePerformanceHistory() {
    try {
      const dir = path.dirname(this.performanceFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Keep only last 1000 records
      const recentHistory = this.performanceHistory.slice(-1000);
      fs.writeFileSync(this.performanceFile, JSON.stringify(recentHistory, null, 2));
    } catch (error) {
      console.warn('Could not save performance history:', error.message);
    }
  }

  recordValidationOutcome({
    taskType,
    primaryProvider,
    validatorProvider,
    originalConfidence,
    agreement,
    validationReason,
    costIncurred,
    userFeedback = null,
    responseTime,
    effective = null
  }) {
    const outcome = {
      timestamp: new Date().toISOString(),
      taskType,
      primaryProvider,
      validatorProvider,
      originalConfidence,
      agreement,
      validationReason,
      costIncurred,
      userFeedback,
      responseTime,
      effective: effective !== null ? effective : agreement > this.dynamicThresholds.agreementThreshold
    };

    // Record in performance history
    this.performanceHistory.push(outcome);
    
    // Update real-time metrics
    this.updateRealTimeMetrics(outcome);
    
    // Increment validation counter
    this.validationCount++;
    
    // Check if it's time to adapt
    if (this.validationCount % this.adaptationInterval === 0) {
      this.adaptThresholds();
    }

    this.savePerformanceHistory();
    return outcome;
  }

  updateRealTimeMetrics(outcome) {
    // Update success rate
    this.performanceMetrics.validationSuccess.push(outcome.effective ? 1 : 0);
    
    // Update cost efficiency
    this.performanceMetrics.costEfficiency.push(outcome.costIncurred);
    
    // Update user satisfaction (if provided)
    if (outcome.userFeedback !== null) {
      this.performanceMetrics.userSatisfaction.push(outcome.userFeedback);
    }
    
    // Update agreement scores
    this.performanceMetrics.agreementScores.push(outcome.agreement);
    
    // Update task type performance
    if (!this.performanceMetrics.taskTypes.has(outcome.taskType)) {
      this.performanceMetrics.taskTypes.set(outcome.taskType, {
        count: 0,
        successRate: 0,
        avgAgreement: 0,
        avgCost: 0
      });
    }
    
    const taskStats = this.performanceMetrics.taskTypes.get(outcome.taskType);
    taskStats.count++;
    taskStats.successRate = ((taskStats.successRate * (taskStats.count - 1)) + (outcome.effective ? 1 : 0)) / taskStats.count;
    taskStats.avgAgreement = ((taskStats.avgAgreement * (taskStats.count - 1)) + outcome.agreement) / taskStats.count;
    taskStats.avgCost = ((taskStats.avgCost * (taskStats.count - 1)) + outcome.costIncurred) / taskStats.count;
    
    // Keep metrics arrays manageable
    const maxSize = 100;
    for (const metric of Object.values(this.performanceMetrics)) {
      if (Array.isArray(metric) && metric.length > maxSize) {
        metric.splice(0, metric.length - maxSize);
      }
    }
  }

  adaptThresholds() {
    console.log('🧠 Real-time learning: Adapting thresholds based on recent performance...');
    
    const recentOutcomes = this.performanceHistory.slice(-this.adaptationInterval);
    if (recentOutcomes.length < this.minSampleSize) {
      console.log('📊 Insufficient data for adaptation (need at least', this.minSampleSize, 'samples)');
      return;
    }

    // Calculate current performance metrics
    const successRate = recentOutcomes.filter(o => o.effective).length / recentOutcomes.length;
    const avgAgreement = recentOutcomes.reduce((sum, o) => sum + o.agreement, 0) / recentOutcomes.length;
    const avgCost = recentOutcomes.reduce((sum, o) => sum + o.costIncurred, 0) / recentOutcomes.length;
    const avgConfidence = recentOutcomes.reduce((sum, o) => sum + o.originalConfidence, 0) / recentOutcomes.length;

    // Adaptive logic
    const adaptations = this.calculateAdaptations({
      successRate,
      avgAgreement,
      avgCost,
      avgConfidence
    });

    // Apply adaptations with learning rate
    for (const [threshold, change] of Object.entries(adaptations)) {
      if (this.dynamicThresholds.hasOwnProperty(threshold)) {
        const oldValue = this.dynamicThresholds[threshold];
        const newValue = oldValue + (change * this.learningRate);
        
        // Apply bounds
        this.dynamicThresholds[threshold] = this.boundThreshold(threshold, newValue);
        
        if (Math.abs(change) > 0.1) {
          console.log(`🔧 Adapted ${threshold}: ${oldValue.toFixed(1)} → ${this.dynamicThresholds[threshold].toFixed(1)}`);
        }
      }
    }

    // Update global config
    this.updateGlobalConfig();
    
    // Record adaptation
    this.config.lastAdaptation = new Date().toISOString();
    this.config.adaptationCount = (this.config.adaptationCount || 0) + 1;
    this.saveConfig();
  }

  calculateAdaptations({ successRate, avgAgreement, avgCost, avgConfidence }) {
    const adaptations = {};

    // Confidence threshold adaptation
    if (successRate > 0.9 && avgAgreement > 80) {
      // High success rate - can lower threshold to validate more
      adaptations.confidenceThreshold = -5;
    } else if (successRate < 0.7) {
      // Low success rate - raise threshold to be more selective
      adaptations.confidenceThreshold = 3;
    }

    // Agreement threshold adaptation
    if (avgAgreement > 85) {
      // High agreement - can be slightly more lenient
      adaptations.agreementThreshold = -2;
    } else if (avgAgreement < 60) {
      // Low agreement - need stricter agreement
      adaptations.agreementThreshold = 5;
    }

    // Cost efficiency adaptation
    const costRatio = avgCost / this.dynamicThresholds.costEfficiencyTarget;
    if (costRatio > 1.5) {
      // Too expensive - be more selective
      adaptations.confidenceThreshold = 5;
      adaptations.reasoningValidationThreshold = 0.1;
    } else if (costRatio < 0.5) {
      // Under budget - can validate more
      adaptations.confidenceThreshold = -3;
      adaptations.reasoningValidationThreshold = -0.05;
    }

    return adaptations;
  }

  boundThreshold(thresholdName, value) {
    const bounds = {
      confidenceThreshold: [40, 90],
      reasoningValidationThreshold: [0.3, 1.0],
      factualValidationThreshold: [0.3, 1.0],
      agreementThreshold: [50, 95],
      costEfficiencyTarget: [0.01, 0.2]
    };

    const [min, max] = bounds[thresholdName] || [0, 100];
    return Math.max(min, Math.min(max, value));
  }

  updateGlobalConfig() {
    // Update the global quality gates config with learned thresholds
    if (global.qualityGatesConfig) {
      global.qualityGatesConfig.confidenceThreshold = Math.round(this.dynamicThresholds.confidenceThreshold);
      global.qualityGatesConfig.agreementThreshold = Math.round(this.dynamicThresholds.agreementThreshold);
      global.qualityGatesConfig.lastLearningUpdate = new Date().toISOString();
      global.qualityGatesConfig.adaptive = true;
    }
  }

  getOptimalValidationStrategy(taskType, confidence, provider) {
    // Recommend optimal validation strategy based on learned patterns
    const taskStats = this.performanceMetrics.taskTypes.get(taskType);
    
    if (!taskStats || taskStats.count < this.minSampleSize) {
      // Not enough data, use defaults
      return {
        shouldValidate: confidence < this.dynamicThresholds.confidenceThreshold,
        recommendedValidator: null,
        confidence: 'default',
        reason: 'insufficient_data'
      };
    }

    // Use learned patterns
    const shouldValidate = 
      confidence < this.dynamicThresholds.confidenceThreshold ||
      taskStats.successRate > 0.8; // Validate if this task type usually benefits

    // Find best validator for this provider based on history
    const bestValidator = this.findBestValidator(provider, taskType);

    return {
      shouldValidate,
      recommendedValidator: bestValidator.provider,
      expectedAgreement: Math.round(bestValidator.avgAgreement),
      confidence: this.getConfidenceLevel(bestValidator.avgAgreement),
      reason: 'learned_pattern',
      taskSuccessRate: Math.round(taskStats.successRate * 100),
      adaptedThreshold: Math.round(this.dynamicThresholds.confidenceThreshold)
    };
  }

  findBestValidator(primaryProvider, taskType) {
    const validatorStats = new Map();
    
    // Analyze historical validator performance
    const relevantOutcomes = this.performanceHistory.filter(
      o => o.primaryProvider === primaryProvider && o.taskType === taskType
    );

    for (const outcome of relevantOutcomes) {
      const validator = outcome.validatorProvider;
      if (!validatorStats.has(validator)) {
        validatorStats.set(validator, {
          count: 0,
          totalAgreement: 0,
          successCount: 0
        });
      }
      
      const stats = validatorStats.get(validator);
      stats.count++;
      stats.totalAgreement += outcome.agreement;
      if (outcome.effective) stats.successCount++;
    }

    // Find best performer
    let bestValidator = { provider: null, avgAgreement: 0, successRate: 0 };
    
    for (const [validator, stats] of validatorStats.entries()) {
      if (stats.count >= 2) { // Minimum sample size
        const avgAgreement = stats.totalAgreement / stats.count;
        const successRate = stats.successCount / stats.count;
        const score = avgAgreement * successRate; // Combined score
        
        if (score > bestValidator.avgAgreement * bestValidator.successRate) {
          bestValidator = {
            provider: validator,
            avgAgreement,
            successRate,
            count: stats.count
          };
        }
      }
    }

    return bestValidator;
  }

  getConfidenceLevel(agreement) {
    if (agreement > 80) return 'high';
    if (agreement > 60) return 'medium';
    return 'low';
  }

  getAdaptiveMetrics() {
    const recentOutcomes = this.performanceHistory.slice(-50);
    
    return {
      dynamicThresholds: this.dynamicThresholds,
      recentPerformance: {
        validationCount: recentOutcomes.length,
        successRate: recentOutcomes.length > 0 
          ? Math.round((recentOutcomes.filter(o => o.effective).length / recentOutcomes.length) * 100)
          : 0,
        avgAgreement: recentOutcomes.length > 0
          ? Math.round(recentOutcomes.reduce((sum, o) => sum + o.agreement, 0) / recentOutcomes.length)
          : 0,
        avgCost: recentOutcomes.length > 0
          ? Number((recentOutcomes.reduce((sum, o) => sum + o.costIncurred, 0) / recentOutcomes.length).toFixed(4))
          : 0
      },
      adaptationHistory: {
        totalAdaptations: this.config.adaptationCount || 0,
        lastAdaptation: this.config.lastAdaptation,
        nextAdaptationIn: this.adaptationInterval - (this.validationCount % this.adaptationInterval)
      },
      taskTypePerformance: Array.from(this.performanceMetrics.taskTypes.entries()).map(([type, stats]) => ({
        taskType: type,
        count: stats.count,
        successRate: Math.round(stats.successRate * 100),
        avgAgreement: Math.round(stats.avgAgreement),
        avgCost: Number(stats.avgCost.toFixed(4))
      }))
    };
  }

  reset() {
    // Reset learning system (for testing or fresh start)
    this.performanceHistory = [];
    this.validationCount = 0;
    this.config = { lastAdaptation: null, adaptationCount: 0 };
    this.dynamicThresholds = {
      confidenceThreshold: 70,
      reasoningValidationThreshold: 0.8,
      factualValidationThreshold: 0.7,
      agreementThreshold: 70,
      costEfficiencyTarget: 0.05
    };
    this.saveConfig();
    this.savePerformanceHistory();
    console.log('🔄 Real-time learning system reset to defaults');
  }
}

export default new RealTimeLearningEngine();