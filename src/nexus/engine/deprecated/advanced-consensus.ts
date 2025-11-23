// @version 2.1.11
// Advanced Consensus Validation System for TooLoo.ai
// 3+ provider validation with majority voting and disagreement analysis

import fs from 'fs';
import path from 'path';

class AdvancedConsensusValidator {
  constructor() {
    this.consensusFile = path.join(process.cwd(), 'logs', 'consensus-history.json');
    this.consensusHistory = this.loadConsensusHistory();
    
    // Consensus configuration
    this.config = {
      minProviders: 3,
      maxProviders: 5,
      majorityThreshold: 0.6, // 60% agreement required for consensus
      disagreementThreshold: 0.3, // Below 30% agreement = high disagreement
      costThreshold: 0.10, // Don't spend more than 10% of budget on consensus
      qualityBoostTarget: 25 // Target 25% quality improvement to justify cost
    };

    // Provider ordering by reliability and specialization
    this.providerRanking = {
      reasoning: ['claude', 'openai', 'deepseek', 'gemini'],
      creative: ['gemini', 'openai', 'claude', 'deepseek'],
      factual: ['openai', 'claude', 'deepseek', 'gemini'],
      technical: ['deepseek', 'claude', 'openai', 'gemini'],
      general: ['deepseek', 'openai', 'claude', 'gemini']
    };
  }

  loadConsensusHistory() {
    try {
      if (fs.existsSync(this.consensusFile)) {
        return JSON.parse(fs.readFileSync(this.consensusFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load consensus history:', error.message);
    }
    return [];
  }

  saveConsensusHistory() {
    try {
      const dir = path.dirname(this.consensusFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Keep only last 500 consensus validations
      const recentHistory = this.consensusHistory.slice(-500);
      fs.writeFileSync(this.consensusFile, JSON.stringify(recentHistory, null, 2));
    } catch (error) {
      console.warn('Could not save consensus history:', error.message);
    }
  }

  async performConsensusValidation({
    prompt,
    primaryResponse,
    primaryProvider,
    taskType,
    criticality,
    budgetChecker,
    llmGenerator
  }) {
    console.log(`🗳️  Starting consensus validation (${criticality} criticality)`);
    
    // Determine number of validators based on criticality
    const validatorCount = this.getValidatorCount(criticality);
    
    // Select optimal validators
    const validators = this.selectValidators(primaryProvider, taskType, validatorCount);
    
    // Check budget constraints
    const estimatedCost = await this.estimateConsensusCost(validators, budgetChecker);
    if (!this.isWithinBudget(estimatedCost)) {
      return {
        consensusAchieved: false,
        reason: 'budget_constraint',
        estimatedCost,
        validators: validators.map(v => v.provider)
      };
    }

    // Collect validator responses
    const validatorResponses = await this.collectValidatorResponses({
      prompt,
      validators,
      budgetChecker,
      llmGenerator
    });

    // Analyze consensus
    const consensusAnalysis = this.analyzeConsensus({
      primaryResponse,
      primaryProvider,
      validatorResponses,
      prompt,
      taskType
    });

    // Record consensus attempt
    const consensusRecord = this.recordConsensusAttempt({
      prompt,
      primaryResponse,
      primaryProvider,
      validatorResponses,
      consensusAnalysis,
      taskType,
      criticality,
      estimatedCost
    });

    this.saveConsensusHistory();

    return {
      consensusAchieved: consensusAnalysis.consensusReached,
      confidence: consensusAnalysis.overallConfidence,
      agreement: consensusAnalysis.agreement,
      validators: validatorResponses.map(v => ({
        provider: v.provider,
        agreement: v.agreement,
        quality: v.quality
      })),
      analysis: consensusAnalysis,
      finalResponse: consensusAnalysis.bestResponse,
      costIncurred: validatorResponses.reduce((sum, v) => sum + (v.cost || 0), 0),
      consensusId: consensusRecord.id
    };
  }

  getValidatorCount(criticality) {
    switch (criticality) {
    case 'critical': return 4; // Use 4 validators for critical tasks
    case 'high': return 3;     // Use 3 validators for high priority
    case 'normal': return 3;   // Use 3 validators for normal tasks
    case 'low': return 2;      // Use 2 validators for low priority
    default: return 3;
    }
  }

  selectValidators(primaryProvider, taskType, count) {
    const ranking = this.providerRanking[taskType] || this.providerRanking.general;
    
    // Remove primary provider from ranking
    const availableProviders = ranking.filter(p => p !== primaryProvider);
    
    // Select top validators, ensuring diversity
    const selectedValidators = [];
    
    for (let i = 0; i < Math.min(count, availableProviders.length); i++) {
      const provider = availableProviders[i];
      selectedValidators.push({
        provider,
        specialization: this.getProviderSpecialization(provider),
        expectedQuality: this.getProviderQualityScore(provider, taskType),
        priority: i + 1
      });
    }

    return selectedValidators;
  }

  getProviderSpecialization(provider) {
    const specializations = {
      claude: 'reasoning',
      gemini: 'creative',
      openai: 'general',
      deepseek: 'technical'
    };
    return specializations[provider] || 'general';
  }

  getProviderQualityScore(provider, taskType) {
    // Historical quality scores (would be learned from real data)
    const qualityMatrix = {
      claude: { reasoning: 95, creative: 80, factual: 90, technical: 85, general: 88 },
      gemini: { reasoning: 85, creative: 95, factual: 85, technical: 80, general: 86 },
      openai: { reasoning: 90, creative: 90, factual: 95, technical: 88, general: 91 },
      deepseek: { reasoning: 88, creative: 82, factual: 87, technical: 95, general: 88 }
    };
    
    return qualityMatrix[provider]?.[taskType] || qualityMatrix[provider]?.general || 80;
  }

  async estimateConsensusCost(validators, budgetChecker) {
    // Estimate cost based on provider and typical response length
    const costEstimates = {
      claude: 0.015,
      gemini: 0.008,
      openai: 0.020,
      deepseek: 0.005
    };

    return validators.reduce((total, validator) => {
      return total + (costEstimates[validator.provider] || 0.010);
    }, 0);
  }

  isWithinBudget(estimatedCost) {
    // Simple budget check (in real implementation would use actual budget)
    return estimatedCost <= this.config.costThreshold;
  }

  async collectValidatorResponses({ prompt, validators, budgetChecker, llmGenerator }) {
    const responses = [];
    
    for (const validator of validators) {
      if (budgetChecker.willExceed(validator.provider)) {
        console.log(`⚠️  Skipping ${validator.provider} due to budget constraint`);
        continue;
      }

      try {
        const response = await llmGenerator({ 
          prompt, 
          provider: validator.provider 
        });
        
        const cost = budgetChecker.record(validator.provider);
        
        responses.push({
          provider: validator.provider,
          response: response,
          specialization: validator.specialization,
          cost: cost.spent,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ ${validator.provider} consensus response collected`);
      } catch (error) {
        console.log(`❌ ${validator.provider} consensus failed: ${error.message}`);
        responses.push({
          provider: validator.provider,
          error: error.message,
          specialization: validator.specialization,
          cost: 0
        });
      }
    }

    return responses;
  }

  analyzeConsensus({ primaryResponse, primaryProvider, validatorResponses, prompt, taskType }) {
    const allResponses = [
      { provider: primaryProvider, response: primaryResponse.text || primaryResponse, isPrimary: true },
      ...validatorResponses.filter(v => v.response).map(v => ({ 
        provider: v.provider, 
        response: v.response, 
        isPrimary: false,
        specialization: v.specialization 
      }))
    ];

    if (allResponses.length < 2) {
      return {
        consensusReached: false,
        reason: 'insufficient_responses',
        overallConfidence: 30,
        agreement: 0,
        bestResponse: primaryResponse
      };
    }

    // Calculate pairwise similarities
    const similarities = this.calculatePairwiseSimilarities(allResponses);
    
    // Determine consensus groups
    const consensusGroups = this.identifyConsensusGroups(allResponses, similarities);
    
    // Find majority consensus
    const majorityGroup = this.findMajorityConsensus(consensusGroups);
    
    // Calculate overall agreement
    const overallAgreement = this.calculateOverallAgreement(similarities);
    
    // Determine best response
    const bestResponse = this.selectBestResponse(allResponses, similarities, majorityGroup);
    
    // Calculate confidence boost
    const confidenceBoost = this.calculateConfidenceBoost(overallAgreement, allResponses.length);

    return {
      consensusReached: majorityGroup.size >= Math.ceil(allResponses.length * this.config.majorityThreshold),
      reason: majorityGroup.size >= Math.ceil(allResponses.length * this.config.majorityThreshold) 
        ? 'majority_consensus' 
        : 'no_majority',
      overallConfidence: Math.min(95, 70 + confidenceBoost),
      agreement: Math.round(overallAgreement * 100),
      responseCount: allResponses.length,
      consensusGroup: majorityGroup,
      disagreementLevel: this.categorizeDisagreement(overallAgreement),
      bestResponse: bestResponse,
      qualityAnalysis: this.analyzeResponseQuality(allResponses, similarities),
      diversityScore: this.calculateDiversityScore(similarities)
    };
  }

  calculatePairwiseSimilarities(responses) {
    const similarities = new Map();
    
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateTextSimilarity(
          responses[i].response, 
          responses[j].response
        );
        
        similarities.set(`${i}-${j}`, {
          similarity,
          providers: [responses[i].provider, responses[j].provider],
          isPrimaryInvolved: responses[i].isPrimary || responses[j].isPrimary
        });
      }
    }
    
    return similarities;
  }

  calculateTextSimilarity(text1, text2) {
    // Enhanced similarity calculation
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    // Word overlap similarity
    const overlap = words1.filter(w => words2.includes(w)).length;
    const wordSim = overlap / Math.max(words1.length, words2.length);
    
    // Length similarity
    const lengthSim = 1 - Math.abs(words1.length - words2.length) / Math.max(words1.length, words2.length);
    
    // Combined similarity
    return (wordSim * 0.7) + (lengthSim * 0.3);
  }

  identifyConsensusGroups(responses, similarities) {
    const groups = [];
    const used = new Set();
    
    for (let i = 0; i < responses.length; i++) {
      if (used.has(i)) continue;
      
      const group = new Set([i]);
      
      for (let j = i + 1; j < responses.length; j++) {
        if (used.has(j)) continue;
        
        const simKey = `${i}-${j}`;
        const similarity = similarities.get(simKey);
        
        if (similarity && similarity.similarity > this.config.majorityThreshold) {
          group.add(j);
        }
      }
      
      // Mark all group members as used
      group.forEach(idx => used.add(idx));
      
      groups.push({
        members: Array.from(group),
        size: group.size,
        responses: Array.from(group).map(idx => responses[idx]),
        avgSimilarity: this.calculateGroupAverageSimilarity(group, similarities)
      });
    }
    
    return groups.sort((a, b) => b.size - a.size);
  }

  calculateGroupAverageSimilarity(group, similarities) {
    const members = Array.from(group);
    if (members.length < 2) return 1;
    
    let totalSim = 0;
    let pairCount = 0;
    
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = `${Math.min(members[i], members[j])}-${Math.max(members[i], members[j])}`;
        const sim = similarities.get(key);
        if (sim) {
          totalSim += sim.similarity;
          pairCount++;
        }
      }
    }
    
    return pairCount > 0 ? totalSim / pairCount : 0;
  }

  findMajorityConsensus(groups) {
    return groups[0] || { size: 0, members: [], responses: [] };
  }

  calculateOverallAgreement(similarities) {
    const simValues = Array.from(similarities.values()).map(s => s.similarity);
    return simValues.length > 0 
      ? simValues.reduce((sum, s) => sum + s, 0) / simValues.length 
      : 0;
  }

  selectBestResponse(responses, similarities, majorityGroup) {
    // If there's a clear majority, pick the best from that group
    if (majorityGroup.size >= 2) {
      // Find the response in the majority group with highest average similarity to others
      let bestResponse = majorityGroup.responses[0];
      let highestAvgSim = 0;
      
      for (const response of majorityGroup.responses) {
        const avgSim = this.calculateResponseAverageSimilarity(response, responses, similarities);
        if (avgSim > highestAvgSim) {
          highestAvgSim = avgSim;
          bestResponse = response;
        }
      }
      
      return bestResponse;
    }
    
    // No clear majority, return primary response
    return responses.find(r => r.isPrimary) || responses[0];
  }

  calculateResponseAverageSimilarity(targetResponse, allResponses, similarities) {
    const targetIndex = allResponses.indexOf(targetResponse);
    let totalSim = 0;
    let count = 0;
    
    for (let i = 0; i < allResponses.length; i++) {
      if (i === targetIndex) continue;
      
      const key = `${Math.min(targetIndex, i)}-${Math.max(targetIndex, i)}`;
      const sim = similarities.get(key);
      if (sim) {
        totalSim += sim.similarity;
        count++;
      }
    }
    
    return count > 0 ? totalSim / count : 0;
  }

  calculateConfidenceBoost(agreement, responseCount) {
    // More responses and higher agreement = higher confidence boost
    const agreementBonus = agreement * 20; // Up to 20 points for perfect agreement
    const countBonus = Math.min((responseCount - 1) * 5, 15); // Up to 15 points for response count
    return agreementBonus + countBonus;
  }

  categorizeDisagreement(agreement) {
    if (agreement > 0.8) return 'low';
    if (agreement > 0.6) return 'moderate';
    if (agreement > 0.4) return 'high';
    return 'very_high';
  }

  analyzeResponseQuality(responses, similarities) {
    return {
      totalResponses: responses.length,
      primaryIncluded: responses.some(r => r.isPrimary),
      specializationCoverage: [...new Set(responses.map(r => r.specialization))].filter(Boolean),
      averageLength: Math.round(responses.reduce((sum, r) => sum + (r.response?.length || 0), 0) / responses.length),
      lengthVariation: this.calculateLengthVariation(responses)
    };
  }

  calculateLengthVariation(responses) {
    const lengths = responses.map(r => r.response?.length || 0);
    const avg = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    return Math.round(Math.sqrt(variance));
  }

  calculateDiversityScore(similarities) {
    // Lower average similarity = higher diversity
    const avgSimilarity = this.calculateOverallAgreement(similarities);
    return Math.round((1 - avgSimilarity) * 100);
  }

  recordConsensusAttempt({
    prompt,
    primaryResponse,
    primaryProvider,
    validatorResponses,
    consensusAnalysis,
    taskType,
    criticality,
    estimatedCost
  }) {
    const record = {
      id: this.generateConsensusId(),
      timestamp: new Date().toISOString(),
      prompt: prompt.slice(0, 150) + (prompt.length > 150 ? '...' : ''),
      primaryProvider,
      validators: validatorResponses.map(v => v.provider),
      taskType,
      criticality,
      consensusAchieved: consensusAnalysis.consensusReached,
      agreement: consensusAnalysis.agreement,
      confidence: consensusAnalysis.overallConfidence,
      responseCount: consensusAnalysis.responseCount,
      disagreementLevel: consensusAnalysis.disagreementLevel,
      diversityScore: consensusAnalysis.diversityScore,
      costIncurred: validatorResponses.reduce((sum, v) => sum + (v.cost || 0), 0),
      estimatedCost,
      qualityImprovement: consensusAnalysis.overallConfidence > 70 ? 
        Math.round(consensusAnalysis.overallConfidence - 70) : 0
    };

    this.consensusHistory.push(record);
    return record;
  }

  generateConsensusId() {
    return `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConsensusStats() {
    const totalConsensus = this.consensusHistory.length;
    const recentConsensus = this.consensusHistory.slice(-50);
    
    const successRate = totalConsensus > 0 
      ? Math.round((this.consensusHistory.filter(c => c.consensusAchieved).length / totalConsensus) * 100)
      : 0;

    const avgAgreement = totalConsensus > 0
      ? Math.round(this.consensusHistory.reduce((sum, c) => sum + c.agreement, 0) / totalConsensus)
      : 0;

    const avgCost = totalConsensus > 0
      ? Number((this.consensusHistory.reduce((sum, c) => sum + c.costIncurred, 0) / totalConsensus).toFixed(4))
      : 0;

    const consensusByCriticality = this.consensusHistory.reduce((acc, c) => {
      acc[c.criticality] = (acc[c.criticality] || 0) + 1;
      return acc;
    }, {});

    const disagreementAnalysis = this.consensusHistory.reduce((acc, c) => {
      acc[c.disagreementLevel] = (acc[c.disagreementLevel] || 0) + 1;
      return acc;
    }, {});

    return {
      overview: {
        totalConsensusAttempts: totalConsensus,
        successRate,
        avgAgreement,
        avgCost,
        avgQualityImprovement: totalConsensus > 0
          ? Math.round(this.consensusHistory.reduce((sum, c) => sum + c.qualityImprovement, 0) / totalConsensus)
          : 0
      },
      consensusByCriticality,
      disagreementAnalysis,
      recentTrends: {
        last50Attempts: recentConsensus.length,
        recentSuccessRate: recentConsensus.length > 0
          ? Math.round((recentConsensus.filter(c => c.consensusAchieved).length / recentConsensus.length) * 100)
          : 0,
        recentAvgCost: recentConsensus.length > 0
          ? Number((recentConsensus.reduce((sum, c) => sum + c.costIncurred, 0) / recentConsensus.length).toFixed(4))
          : 0
      },
      topValidatorCombinations: this.getTopValidatorCombinations()
    };
  }

  getTopValidatorCombinations() {
    const combinations = new Map();
    
    for (const record of this.consensusHistory) {
      if (record.consensusAchieved) {
        const combo = [record.primaryProvider, ...record.validators].sort().join(' + ');
        if (!combinations.has(combo)) {
          combinations.set(combo, { count: 0, avgAgreement: 0, totalAgreement: 0 });
        }
        
        const stats = combinations.get(combo);
        stats.count++;
        stats.totalAgreement += record.agreement;
        stats.avgAgreement = Math.round(stats.totalAgreement / stats.count);
      }
    }
    
    return Array.from(combinations.entries())
      .filter(([_, stats]) => stats.count >= 2)
      .sort(([, a], [, b]) => b.avgAgreement - a.avgAgreement)
      .slice(0, 5)
      .map(([combo, stats]) => ({ combination: combo, ...stats }));
  }
}

export default new AdvancedConsensusValidator();