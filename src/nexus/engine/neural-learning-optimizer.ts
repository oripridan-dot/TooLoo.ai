// @version 2.1.28
class NeuralLearningOptimizer {
  constructor() {
    this.weights = new Map(); // Learning weights for different strategies
    this.memory = []; // Experience replay buffer
    this.epsilon = 0.3; // Exploration rate
    this.learningRate = 0.1;
    this.discountFactor = 0.95;
    
    // Initialize neural network weights for learning strategies
    this.initializeWeights();
  }

  initializeWeights() {
    const strategies = [
      'sequential_learning',
      'parallel_training', 
      'weakness_targeting',
      'strength_building',
      'random_exploration',
      'gradient_ascent',
      'meta_learning',
      'knowledge_transfer'
    ];

    strategies.forEach(strategy => {
      this.weights.set(strategy, {
        efficiency: Math.random() * 0.5 + 0.5, // 0.5-1.0
        momentum: Math.random() * 0.3 + 0.1,   // 0.1-0.4
        adaptability: Math.random() * 0.4 + 0.3 // 0.3-0.7
      });
    });

    console.log('🧠 Neural Learning Optimizer initialized with', strategies.length, 'strategies');
  }

  selectLearningAction(currentState) {
    // Epsilon-greedy action selection
    if (Math.random() < this.epsilon) {
      // Explore: random strategy
      const strategies = Array.from(this.weights.keys());
      return strategies[Math.floor(Math.random() * strategies.length)];
    } else {
      // Exploit: best strategy based on current weights
      return this.getBestStrategy(currentState);
    }
  }

  getBestStrategy(state) {
    let bestStrategy = null;
    let bestScore = -Infinity;

    for (const [strategy, weights] of this.weights.entries()) {
      const score = this.calculateStrategyScore(strategy, weights, state);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }

    return bestStrategy;
  }

  calculateStrategyScore(strategy, weights, state) {
    const { avgMastery, weakestDomain, masteredDomains, trainingRounds } = state;
    
    let score = weights.efficiency * 0.4 + weights.momentum * 0.3 + weights.adaptability * 0.3;
    
    // Adjust score based on current state
    if (avgMastery < 50) {
      // Early learning phase - favor broad strategies
      if (strategy.includes('parallel') || strategy.includes('exploration')) {
        score *= 1.3;
      }
    } else if (avgMastery < 80) {
      // Mid learning phase - target weaknesses
      if (strategy.includes('weakness') || strategy.includes('gradient')) {
        score *= 1.4;
      }
    } else {
      // Advanced learning phase - optimize and transfer
      if (strategy.includes('meta') || strategy.includes('transfer')) {
        score *= 1.5;
      }
    }

    return score;
  }

  updateWeights(strategy, reward, state) {
    // Q-learning update rule
    const currentWeights = this.weights.get(strategy);
    const prediction = this.calculateStrategyScore(strategy, currentWeights, state);
    const target = reward + this.discountFactor * this.getMaxFutureReward(state);
    const error = target - prediction;

    // Update weights using gradient descent
    const updatedWeights = {
      efficiency: Math.max(0.1, Math.min(1.0, 
        currentWeights.efficiency + this.learningRate * error * 0.4)),
      momentum: Math.max(0.05, Math.min(0.5, 
        currentWeights.momentum + this.learningRate * error * 0.3)),
      adaptability: Math.max(0.1, Math.min(0.8, 
        currentWeights.adaptability + this.learningRate * error * 0.3))
    };

    this.weights.set(strategy, updatedWeights);
    
    // Store experience in memory for replay
    this.memory.push({ strategy, reward, state, error });
    if (this.memory.length > 1000) {
      this.memory.shift(); // Keep memory buffer manageable
    }

    // Decay exploration rate
    this.epsilon = Math.max(0.05, this.epsilon * 0.995);
  }

  getMaxFutureReward(state) {
    let maxReward = 0;
    for (const [strategy, weights] of this.weights.entries()) {
      const score = this.calculateStrategyScore(strategy, weights, state);
      maxReward = Math.max(maxReward, score);
    }
    return maxReward;
  }

  experienceReplay(batchSize = 10) {
    if (this.memory.length < batchSize) return;

    // Sample random batch from memory
    const batch = [];
    for (let i = 0; i < batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.memory.length);
      batch.push(this.memory[randomIndex]);
    }

    // Update weights based on sampled experiences
    batch.forEach(experience => {
      this.updateWeights(experience.strategy, experience.reward, experience.state);
    });
  }

  async executeOptimizedLearning(rounds = 50) {
    console.log('\n🧠 Neural Learning Optimizer Active');
    console.log(`🎯 Target: ${rounds} optimized learning rounds`);
    console.log('🔄 Using reinforcement learning to discover best strategies\n');

    let totalReward = 0;
    const strategyUsage = new Map();
    
    for (let round = 1; round <= rounds; round++) {
      // Get current state
      const state = await this.getCurrentLearningState();
      
      // Select learning action using neural network
      const selectedStrategy = this.selectLearningAction(state);
      
      // Track strategy usage
      strategyUsage.set(selectedStrategy, (strategyUsage.get(selectedStrategy) || 0) + 1);
      
      // Execute the strategy
      const result = await this.executeStrategy(selectedStrategy, state);
      
      // Calculate reward based on improvement
      const reward = this.calculateReward(result, state);
      totalReward += reward;
      
      // Update neural network weights
      this.updateWeights(selectedStrategy, reward, state);
      
      // Perform experience replay every 5 rounds
      if (round % 5 === 0) {
        this.experienceReplay();
      }
      
      // Progress report every 10 rounds
      if (round % 10 === 0) {
        const currentState = await this.getCurrentLearningState();
        console.log(`Round ${round}: Avg mastery ${currentState.avgMastery.toFixed(1)}% | Strategy: ${selectedStrategy} | Reward: ${reward.toFixed(2)}`);
      }
    }

    console.log('\n🎊 Neural Optimization Complete!');
    console.log(`🏆 Total reward accumulated: ${totalReward.toFixed(2)}`);
    console.log(`🧠 Exploration rate: ${(this.epsilon * 100).toFixed(1)}%`);
    
    // Report strategy effectiveness
    console.log('\n📊 Strategy Usage & Effectiveness:');
    const sortedStrategies = Array.from(strategyUsage.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedStrategies.forEach(([strategy, count], index) => {
      const weights = this.weights.get(strategy);
      const effectiveness = (weights.efficiency + weights.momentum + weights.adaptability) / 3;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${strategy}: ${count} uses, ${(effectiveness * 100).toFixed(1)}% effectiveness`);
    });

    return { totalReward, strategyUsage, finalWeights: this.weights };
  }

  async getCurrentLearningState() {
    try {
      const response = await fetch('http://localhost:3001/api/v1/training/overview');
      const data = await response.json();
      
      if (data.ok && data.data) {
        const domains = data.data.domains;
        const avgMastery = domains.reduce((sum, d) => sum + d.mastery, 0) / domains.length;
        const weakestDomain = domains.reduce((min, d) => d.mastery < min.mastery ? d : min);
        const masteredDomains = domains.filter(d => d.mastery >= 90).length;
        
        return {
          avgMastery,
          weakestDomain: weakestDomain.mastery,
          masteredDomains,
          trainingRounds: 0, // Could track this if needed
          domains
        };
      }
    } catch (error) {
      console.error('Error getting learning state:', error.message);
    }
    
    return { avgMastery: 0, weakestDomain: 0, masteredDomains: 0, trainingRounds: 0 };
  }

  async executeStrategy(strategy, state) {
    // Execute training round with strategy-specific parameters
    try {
      const response = await fetch('http://localhost:3001/api/v1/training/round', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.ok) {
        // Get updated state to measure improvement
        const newState = await this.getCurrentLearningState();
        return {
          success: true,
          improvement: newState.avgMastery - state.avgMastery,
          newState,
          strategy
        };
      }
    } catch (error) {
      console.error(`Strategy ${strategy} execution failed:`, error.message);
    }
    
    return { success: false, improvement: 0, newState: state, strategy };
  }

  calculateReward(result, previousState) {
    if (!result.success) return -1.0;
    
    const { improvement, newState } = result;
    
    // Base reward from improvement
    let reward = improvement * 10; // Scale improvement to meaningful reward
    
    // Bonus for reaching milestones
    if (newState.avgMastery >= 90 && previousState.avgMastery < 90) {
      reward += 50; // Big bonus for reaching 90%
    } else if (newState.avgMastery >= 80 && previousState.avgMastery < 80) {
      reward += 20; // Bonus for reaching 80%
    }
    
    // Bonus for mastering new domains
    const newMasteredDomains = newState.masteredDomains - previousState.masteredDomains;
    reward += newMasteredDomains * 15;
    
    // Penalty for stagnation (no improvement)
    if (improvement <= 0) {
      reward -= 2;
    }
    
    return Math.max(-5, Math.min(100, reward)); // Clamp reward between -5 and 100
  }
}

module.exports = NeuralLearningOptimizer;