// Validation History & Learning Engine for TooLoo.ai
import fs from 'fs';
import path from 'path';

class ValidationHistory {
  constructor() {
    this.historyFile = path.join(process.cwd(), 'logs', 'validation-history.json');
    this.history = this.loadHistory();
    this.patterns = new Map(); // Learning patterns from validation outcomes
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load validation history:', error.message);
    }
    return [];
  }

  saveHistory() {
    try {
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.warn('Could not save validation history:', error.message);
    }
  }

  recordValidation({
    prompt,
    taskType,
    criticality,
    primaryProvider,
    primaryConfidence,
    validatorProvider,
    agreement,
    validationReason,
    validationMode,
    timestamp = new Date().toISOString()
  }) {
    const record = {
      id: this.generateId(),
      timestamp,
      prompt: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''), // Truncate for privacy
      taskType,
      criticality,
      primary: {
        provider: primaryProvider,
        confidence: primaryConfidence
      },
      validator: {
        provider: validatorProvider,
        agreement
      },
      validation: {
        reason: validationReason,
        mode: validationMode,
        effective: agreement > 70 // Consider validation effective if high agreement
      }
    };

    this.history.push(record);
    
    // Keep only last 1000 records
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }

    this.updatePatterns(record);
    this.saveHistory();
    
    return record;
  }

  updatePatterns(record) {
    // Learn patterns from validation outcomes
    const key = `${record.taskType}_${record.primary.provider}_${record.validator.provider}`;
    
    if (!this.patterns.has(key)) {
      this.patterns.set(key, {
        count: 0,
        totalAgreement: 0,
        effectiveValidations: 0,
        avgConfidence: 0
      });
    }

    const pattern = this.patterns.get(key);
    pattern.count++;
    pattern.totalAgreement += record.validator.agreement;
    pattern.avgConfidence = ((pattern.avgConfidence * (pattern.count - 1)) + record.primary.confidence) / pattern.count;
    
    if (record.validation.effective) {
      pattern.effectiveValidations++;
    }

    // Update the pattern
    this.patterns.set(key, pattern);
  }

  getRecommendations(taskType, primaryProvider, confidence) {
    // Provide recommendations based on learned patterns
    const recommendations = {
      shouldValidate: false,
      recommendedValidator: null,
      expectedAgreement: 0,
      confidence: 'low'
    };

    // Find best validator for this combination
    let bestValidator = null;
    let bestScore = 0;

    for (const [key, pattern] of this.patterns.entries()) {
      const [type, primary, validator] = key.split('_');
      
      if (type === taskType && primary === primaryProvider) {
        const effectivenessRate = pattern.effectiveValidations / pattern.count;
        const avgAgreement = pattern.totalAgreement / pattern.count;
        const score = effectivenessRate * avgAgreement;

        if (score > bestScore) {
          bestScore = score;
          bestValidator = validator;
          recommendations.expectedAgreement = Math.round(avgAgreement);
        }
      }
    }

    // Determine if validation is recommended
    recommendations.shouldValidate = confidence < 80 || bestScore > 0.5;
    recommendations.recommendedValidator = bestValidator;
    recommendations.confidence = bestScore > 0.7 ? 'high' : bestScore > 0.4 ? 'medium' : 'low';

    return recommendations;
  }

  getStats() {
    const totalValidations = this.history.length;
    const effectiveValidations = this.history.filter(r => r.validation.effective).length;
    const avgAgreement = this.history.length > 0 
      ? this.history.reduce((sum, r) => sum + r.validator.agreement, 0) / this.history.length 
      : 0;

    const validationsByReason = this.history.reduce((acc, r) => {
      acc[r.validation.reason] = (acc[r.validation.reason] || 0) + 1;
      return acc;
    }, {});

    const providerPairs = this.history.reduce((acc, r) => {
      const pair = `${r.primary.provider} → ${r.validator.provider}`;
      acc[pair] = (acc[pair] || 0) + 1;
      return acc;
    }, {});

    return {
      totalValidations,
      effectiveValidations,
      effectivenessRate: totalValidations > 0 ? Math.round((effectiveValidations / totalValidations) * 100) : 0,
      avgAgreement: Math.round(avgAgreement),
      validationsByReason,
      topProviderPairs: Object.entries(providerPairs)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([pair, count]) => ({ pair, count }))
    };
  }

  generateId() {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new ValidationHistory();