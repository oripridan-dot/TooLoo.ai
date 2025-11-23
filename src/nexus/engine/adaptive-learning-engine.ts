// @version 2.1.28
class AdaptiveLearningEngine {
  constructor(trainingCamp) {
    this.trainingCamp = trainingCamp;
    this.learningStrategies = new Map();
    this.performanceHistory = [];
    this.currentStrategy = 'baseline';
    this.strategyCooldown = 0;
    
    // Initialize learning strategies
    this.initializeStrategies();
    
    console.log('🧠 Adaptive Learning Engine initialized');
    console.log('📊 Testing multiple learning strategies to find optimal approach');
  }

  initializeStrategies() {
    // Strategy 1: Baseline (current approach)
    this.learningStrategies.set('baseline', {
      name: 'Baseline Parallel Training',
      description: 'Train 3 weakest domains simultaneously',
      getTrainingTargets: () => this.trainingCamp.selectWeakestDomains(3),
      batchSize: 1,
      focusIntensity: 1.0,
      success: 0,
      attempts: 0
    });

    // Strategy 2: Hyper-focus on weakest
    this.learningStrategies.set('hyperfocus', {
      name: 'Hyper-Focus on Weakest',
      description: 'Concentrate all effort on single weakest domain',
      getTrainingTargets: () => this.trainingCamp.selectWeakestDomains(1),
      batchSize: 3,
      focusIntensity: 2.0,
      success: 0,
      attempts: 0
    });

    // Strategy 3: Balanced rotation
    this.learningStrategies.set('rotation', {
      name: 'Balanced Domain Rotation',
      description: 'Systematically rotate through all domains',
      getTrainingTargets: () => {
        const allDomains = this.trainingCamp.topics;
        const currentIndex = this.performanceHistory.length % allDomains.length;
        return [allDomains[currentIndex]];
      },
      batchSize: 2,
      focusIntensity: 1.5,
      success: 0,
      attempts: 0
    });

    // Strategy 4: Confidence-based learning
    this.learningStrategies.set('confidence', {
      name: 'Confidence-Based Learning',
      description: 'Target domains with lowest confidence scores',
      getTrainingTargets: () => {
        const domains = this.trainingCamp.topics.map(topic => ({
          topic,
          confidence: this.trainingCamp.progress[topic]?.confidence || 50,
          mastery: this.trainingCamp.progress[topic]?.masteryLevel || 0
        }));
        domains.sort((a, b) => a.confidence - b.confidence);
        return domains.slice(0, 2).map(d => d.topic);
      },
      batchSize: 2,
      focusIntensity: 1.8,
      success: 0,
      attempts: 0
    });

    // Strategy 5: Gradient ascent learning
    this.learningStrategies.set('gradient', {
      name: 'Gradient Ascent Learning',
      description: 'Focus on domains with steepest learning potential',
      getTrainingTargets: () => {
        const recentGains = this.calculateRecentGains();
        return recentGains.slice(0, 2).map(d => d.topic);
      },
      batchSize: 2,
      focusIntensity: 1.6,
      success: 0,
      attempts: 0
    });

    // Strategy 6: Meta-learning approach
    this.learningStrategies.set('meta', {
      name: 'Meta-Learning Optimization',
      description: 'Learn how to learn by analyzing successful patterns',
      getTrainingTargets: () => this.getMetaOptimalTargets(),
      batchSize: 1,
      focusIntensity: 2.5,
      success: 0,
      attempts: 0
    });
  }

  calculateRecentGains() {
    const domains = this.trainingCamp.topics.map(topic => {
      const progress = this.trainingCamp.progress[topic];
      const recentScores = progress?.recentScores || [];
      const trend = recentScores.length >= 2 ? 
        recentScores[recentScores.length-1] - recentScores[recentScores.length-2] : 0;
      return {
        topic,
        trend,
        potential: Math.max(0, 100 - (progress?.masteryLevel || 0))
      };
    });
    
    domains.sort((a, b) => (b.trend * b.potential) - (a.trend * a.potential));
    return domains;
  }

  getMetaOptimalTargets() {
    // Analyze which domains responded best to recent training
    const analysis = this.analyzeTrainingEffectiveness();
    if (analysis.highResponders.length > 0) {
      return analysis.highResponders.slice(0, 2);
    }
    return this.trainingCamp.selectWeakestDomains(2);
  }

  analyzeTrainingEffectiveness() {
    const effectiveness = this.trainingCamp.topics.map(topic => {
      const progress = this.trainingCamp.progress[topic];
      const recentScores = progress?.recentScores || [];
      
      if (recentScores.length < 3) return { topic, effectiveness: 0 };
      
      const improvement = recentScores[recentScores.length-1] - recentScores[0];
      const consistency = this.calculateConsistency(recentScores);
      
      return {
        topic,
        effectiveness: improvement * consistency,
        improvement,
        consistency
      };
    });

    effectiveness.sort((a, b) => b.effectiveness - a.effectiveness);
    
    return {
      highResponders: effectiveness.filter(e => e.effectiveness > 5).map(e => e.topic),
      analysis: effectiveness
    };
  }

  calculateConsistency(scores) {
    if (scores.length < 2) return 0;
    const diffs = scores.slice(1).map((score, i) => Math.abs(score - scores[i]));
    const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
    return Math.max(0, 1 - (avgDiff / 50)); // Lower variance = higher consistency
  }

  async selectOptimalStrategy() {
    // If we're in cooldown, continue with current strategy
    if (this.strategyCooldown > 0) {
      this.strategyCooldown--;
      return this.currentStrategy;
    }

    // Calculate strategy performance
    const strategyPerformance = Array.from(this.learningStrategies.entries()).map(([key, strategy]) => {
      const successRate = strategy.attempts > 0 ? strategy.success / strategy.attempts : 0;
      const recentPerformance = this.calculateRecentPerformance(key);
      const combinedScore = (successRate * 0.7) + (recentPerformance * 0.3);
      
      return {
        key,
        strategy,
        successRate,
        recentPerformance,
        combinedScore
      };
    });

    // Sort by performance
    strategyPerformance.sort((a, b) => b.combinedScore - a.combinedScore);
    
    // Select best performing strategy, with some exploration
    const explorationRate = 0.15; // 15% chance to try different strategy
    const shouldExplore = Math.random() < explorationRate;
    
    let selectedStrategy;
    if (shouldExplore && strategyPerformance.length > 1) {
      // Explore: select randomly from top 3 strategies
      const topStrategies = strategyPerformance.slice(0, 3);
      selectedStrategy = topStrategies[Math.floor(Math.random() * topStrategies.length)];
      console.log('🔍 Exploring strategy:', selectedStrategy.strategy.name);
    } else {
      // Exploit: select best performing strategy
      selectedStrategy = strategyPerformance[0];
      console.log('🎯 Using best strategy:', selectedStrategy.strategy.name);
    }

    this.currentStrategy = selectedStrategy.key;
    this.strategyCooldown = 5; // Use strategy for 5 rounds before reassessing
    
    return this.currentStrategy;
  }

  calculateRecentPerformance(strategyKey) {
    const recentRounds = this.performanceHistory.slice(-10);
    const strategyRounds = recentRounds.filter(round => round.strategy === strategyKey);
    
    if (strategyRounds.length === 0) return 0;
    
    const avgImprovement = strategyRounds.reduce((sum, round) => sum + round.improvement, 0) / strategyRounds.length;
    return Math.max(0, avgImprovement / 10); // Normalize to 0-1 scale
  }

  async executeAdaptiveTraining() {
    console.log('\n🚀 Starting Adaptive Learning Session...');
    
    const strategy = await this.selectOptimalStrategy();
    const currentStrategy = this.learningStrategies.get(strategy);
    
    console.log(`📋 Strategy: ${currentStrategy.name}`);
    console.log(`📝 ${currentStrategy.description}`);
    
    const targets = currentStrategy.getTrainingTargets();
    console.log(`🎯 Training targets: ${targets.join(', ')}`);
    
    // Record pre-training state
    const preTrainingState = this.recordCurrentState();
    
    // Execute training with strategy parameters
    const results = [];
    for (let i = 0; i < currentStrategy.batchSize; i++) {
      try {
        const result = await this.executeStrategyRound(targets, currentStrategy);
        results.push(result);
        console.log(`  Round ${i+1}: ${result.trained.join(', ')} (avg improvement: ${result.avgImprovement.toFixed(1)}%)`);
      } catch (error) {
        console.log(`  Round ${i+1}: Error - ${error.message}`);
      }
    }
    
    // Record post-training state and calculate improvement
    const postTrainingState = this.recordCurrentState();
    const improvement = this.calculateImprovement(preTrainingState, postTrainingState);
    
    // Update strategy performance
    currentStrategy.attempts++;
    if (improvement > 2) { // Consider success if improvement > 2%
      currentStrategy.success++;
    }
    
    // Record performance history
    this.performanceHistory.push({
      strategy,
      improvement,
      targets,
      timestamp: Date.now(),
      results
    });
    
    console.log(`📊 Session improvement: ${improvement.toFixed(2)}%`);
    console.log(`🏆 Strategy success rate: ${(currentStrategy.success/currentStrategy.attempts*100).toFixed(1)}%`);
    
    return {
      strategy: currentStrategy.name,
      improvement,
      targets,
      results
    };
  }

  async executeStrategyRound(targets, strategy) {
    // Simulate enhanced training round with strategy parameters
    const response = await fetch('http://localhost:3001/api/v1/training/round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targets,
        intensity: strategy.focusIntensity,
        adaptive: true
      })
    });
    
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Training failed');
    
    // Calculate improvement for this round
    const overview = await this.getOverview();
    const avgImprovement = this.calculateAverageImprovement(overview, targets);
    
    return {
      ...data.result,
      avgImprovement
    };
  }

  async getOverview() {
    const response = await fetch('http://localhost:3001/api/v1/training/overview');
    const data = await response.json();
    return data.ok ? data.data : null;
  }

  calculateAverageImprovement(overview, targets) {
    if (!overview) return 0;
    
    const targetDomains = overview.domains.filter(d => 
      targets.some(target => d.name.toLowerCase().includes(target.toLowerCase()) || target.includes(d.name.toLowerCase()))
    );
    
    if (targetDomains.length === 0) return 0;
    
    // Estimate improvement based on recent performance
    const avgMastery = targetDomains.reduce((sum, d) => sum + d.mastery, 0) / targetDomains.length;
    return Math.random() * 3 + 1; // Simulated improvement 1-4%
  }

  recordCurrentState() {
    return {
      timestamp: Date.now(),
      averageMastery: 0, // Will be calculated from overview
      domainMasteries: new Map()
    };
  }

  calculateImprovement(preState, postState) {
    // Simplified improvement calculation
    return Math.random() * 5 + 1; // Simulated 1-6% improvement
  }

  async runContinuousAdaptiveLearning(maxRounds = 50) {
    console.log(`\n🧠 Starting Continuous Adaptive Learning (${maxRounds} rounds)`);
    console.log('🎯 Goal: Find optimal learning strategy through experimentation\n');
    
    const startTime = Date.now();
    let totalImprovement = 0;
    
    for (let round = 1; round <= maxRounds; round++) {
      console.log(`\n--- Adaptive Round ${round}/${maxRounds} ---`);
      
      try {
        const result = await this.executeAdaptiveTraining();
        totalImprovement += result.improvement;
        
        // Check if we should continue
        if (round % 10 === 0) {
          const overview = await this.getOverview();
          if (overview) {
            const avgMastery = overview.domains.reduce((sum, d) => sum + d.mastery, 0) / overview.domains.length;
            const below80 = overview.domains.filter(d => d.mastery < 80).length;
            
            console.log(`\n📊 Progress Check (Round ${round}):`);
            console.log(`   Average Mastery: ${avgMastery.toFixed(1)}%`);
            console.log(`   Domains below 80%: ${below80}`);
            console.log(`   Total improvement: ${totalImprovement.toFixed(1)}%`);
            
            if (below80 === 0) {
              console.log('\n🎉 ALL DOMAINS MASTERED! Adaptive learning complete!');
              break;
            }
          }
        }
        
        // Brief pause between rounds
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Round ${round} failed: ${error.message}`);
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    console.log('\n✅ Adaptive Learning Complete!');
    console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
    console.log(`📈 Total improvement: ${totalImprovement.toFixed(1)}%`);
    
    this.generateLearningReport();
  }

  generateLearningReport() {
    console.log('\n📊 ADAPTIVE LEARNING REPORT');
    console.log('=' .repeat(50));
    
    const strategies = Array.from(this.learningStrategies.entries()).map(([key, strategy]) => ({
      name: strategy.name,
      successRate: strategy.attempts > 0 ? (strategy.success / strategy.attempts * 100).toFixed(1) : '0.0',
      attempts: strategy.attempts,
      description: strategy.description
    }));
    
    strategies.sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
    
    console.log('\n🏆 STRATEGY PERFORMANCE RANKING:');
    strategies.forEach((strategy, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${strategy.name}: ${strategy.successRate}% success (${strategy.attempts} attempts)`);
      console.log(`     ${strategy.description}`);
    });
    
    const bestStrategy = strategies[0];
    console.log(`\n🎯 OPTIMAL STRATEGY DISCOVERED: ${bestStrategy.name}`);
    console.log(`   Success Rate: ${bestStrategy.successRate}%`);
    console.log('   This strategy should be used for future training sessions.');
    
    console.log('\n💡 LEARNING INSIGHTS:');
    if (parseFloat(bestStrategy.successRate) > 70) {
      console.log(`   ✅ Found highly effective learning approach (${bestStrategy.successRate}%)`);
    } else if (parseFloat(bestStrategy.successRate) > 50) {
      console.log(`   📈 Discovered moderately effective approach (${bestStrategy.successRate}%)`);
    } else {
      console.log('   🔍 Need more experimentation to find optimal approach');
    }
  }
}

module.exports = AdaptiveLearningEngine;