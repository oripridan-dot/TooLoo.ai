const fs = require('fs').promises;
const path = require('path');

/**
 * Learning Accumulator - TooLoo's Self-Improvement Brain
 * Tracks performance metrics, successful patterns, and failed experiments
 */
class LearningAccumulator {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.dataDir = path.join(this.workspaceRoot, 'data', 'learning');
    this.metricsFile = path.join(this.dataDir, 'metrics.json');
    this.patternsFile = path.join(this.dataDir, 'patterns.json');
    this.failuresFile = path.join(this.dataDir, 'failures.json');
    
    this.metrics = {
      sessions: [],
      baseline: {
        contextReexplanationTime: 900, // 15 min in seconds
        repeatProblemRate: 0.30,
        firstTrySuccessRate: 0.40,
        timeToPrototype: 7200 // 2 hours in seconds
      },
      targets: {
        contextReexplanationTime: 120, // 2 min
        repeatProblemRate: 0.10,
        firstTrySuccessRate: 0.70,
        timeToPrototype: 3600 // 1 hour
      },
      current: {
        totalSessions: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageResponseTime: 0,
        patternsDiscovered: 0
      }
    };
    
    this.patterns = [];
    this.failures = [];
    
    this.initialize();
    console.log('🧠 Learning Accumulator initialized - Self-improvement system active');
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadData();
    } catch (error) {
      console.warn('⚠️ Learning Accumulator: initialization warning:', error.message);
    }
  }

  async loadData() {
    try {
      const metricsData = await fs.readFile(this.metricsFile, 'utf8');
      const loadedMetrics = JSON.parse(metricsData);
      this.metrics = { ...this.metrics, ...loadedMetrics };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load metrics:', error.message);
      }
    }

    try {
      const patternsData = await fs.readFile(this.patternsFile, 'utf8');
      this.patterns = JSON.parse(patternsData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load patterns:', error.message);
      }
    }

    try {
      const failuresData = await fs.readFile(this.failuresFile, 'utf8');
      this.failures = JSON.parse(failuresData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load failures:', error.message);
      }
    }
  }

  async saveData() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
      await fs.writeFile(this.patternsFile, JSON.stringify(this.patterns, null, 2));
      await fs.writeFile(this.failuresFile, JSON.stringify(this.failures, null, 2));
    } catch (error) {
      console.error('Failed to save learning data:', error.message);
    }
  }

  /**
   * Track a new session
   */
  async startSession(sessionData = {}) {
    const session = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      type: sessionData.type || 'general',
      goal: sessionData.goal || 'No goal specified',
      provider: sessionData.provider || 'unknown'
    };

    this.currentSession = session;
    this.metrics.current.totalSessions++;
    return session;
  }

  /**
   * Track successful code generation
   */
  async recordSuccess(data = {}) {
    if (!this.currentSession) {
      await this.startSession();
    }

    const success = {
      sessionId: this.currentSession.id,
      timestamp: new Date().toISOString(),
      type: data.type || 'code-generation',
      provider: data.provider || 'unknown',
      responseTime: data.responseTime || 0,
      firstTrySuccess: data.firstTrySuccess !== false,
      description: data.description || ''
    };

    this.metrics.sessions.push({
      ...this.currentSession,
      ...success,
      outcome: 'success'
    });

    this.metrics.current.successfulGenerations++;
    
    if (success.firstTrySuccess) {
      // Update first-try success rate
      const total = this.metrics.current.successfulGenerations + this.metrics.current.failedGenerations;
      this.metrics.current.firstTrySuccessRate = 
        this.metrics.current.successfulGenerations / total;
    }

    await this.saveData();
    return success;
  }

  /**
   * Track failed attempts
   */
  async recordFailure(data = {}) {
    if (!this.currentSession) {
      await this.startSession();
    }

    const failure = {
      id: `failure-${Date.now()}`,
      sessionId: this.currentSession.id,
      timestamp: new Date().toISOString(),
      type: data.type || 'code-generation',
      provider: data.provider || 'unknown',
      error: data.error || 'Unknown error',
      attempted: data.attempted || '',
      rootCause: data.rootCause || '',
      lesson: data.lesson || ''
    };

    this.failures.push(failure);
    this.metrics.current.failedGenerations++;

    this.metrics.sessions.push({
      ...this.currentSession,
      ...failure,
      outcome: 'failure'
    });

    await this.saveData();
    return failure;
  }

  /**
   * Discover and save a new successful pattern
   */
  async discoverPattern(patternData) {
    const pattern = {
      id: `pattern-${Date.now()}`,
      discoveredAt: new Date().toISOString(),
      name: patternData.name || 'Unnamed Pattern',
      category: patternData.category || 'general',
      description: patternData.description || '',
      code: patternData.code || '',
      useCase: patternData.useCase || '',
      successRate: patternData.successRate || 1.0,
      timesUsed: 0,
      timesSuccessful: 0
    };

    this.patterns.push(pattern);
    this.metrics.current.patternsDiscovered++;

    // Save pattern to /patterns directory for easy reference
    if (patternData.saveToFile) {
      const patternsDir = path.join(this.workspaceRoot, 'patterns');
      await fs.mkdir(patternsDir, { recursive: true });
      
      const filename = pattern.name.toLowerCase().replace(/\s+/g, '-') + '.md';
      const content = `# ${pattern.name}

**Category**: ${pattern.category}  
**Discovered**: ${pattern.discoveredAt}  
**Success Rate**: ${(pattern.successRate * 100).toFixed(1)}%

## Description
${pattern.description}

## Use Case
${pattern.useCase}

## Code
\`\`\`javascript
${pattern.code}
\`\`\`

---
*Auto-generated by Learning Accumulator*
`;
      await fs.writeFile(path.join(patternsDir, filename), content);
    }

    await this.saveData();
    console.log(`📚 New pattern discovered: ${pattern.name}`);
    return pattern;
  }

  /**
   * Check if a problem has been encountered before
   */
  isRepeatProblem(errorMessage) {
    const similar = this.failures.filter(f => 
      f.error.toLowerCase().includes(errorMessage.toLowerCase()) ||
      errorMessage.toLowerCase().includes(f.error.toLowerCase())
    );

    if (similar.length > 0) {
      console.warn(`⚠️ Repeat problem detected! Seen ${similar.length} times before.`);
      return {
        isRepeat: true,
        previousOccurrences: similar,
        suggestedLesson: similar[similar.length - 1].lesson
      };
    }

    return { isRepeat: false };
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const { baseline, targets, current, sessions } = this.metrics;
    
    // Calculate improvements
    const recentSessions = sessions.slice(-10);
    const recentSuccessRate = recentSessions.length > 0 
      ? recentSessions.filter(s => s.outcome === 'success').length / recentSessions.length
      : 0;

    const improvements = {
      firstTrySuccess: {
        baseline: baseline.firstTrySuccessRate,
        current: recentSuccessRate,
        target: targets.firstTrySuccessRate,
        improvement: ((recentSuccessRate - baseline.firstTrySuccessRate) / baseline.firstTrySuccessRate) * 100,
        achieved: recentSuccessRate >= targets.firstTrySuccessRate
      },
      repeatProblems: {
        baseline: baseline.repeatProblemRate,
        current: this.calculateRepeatRate(),
        target: targets.repeatProblemRate,
        improvement: ((baseline.repeatProblemRate - this.calculateRepeatRate()) / baseline.repeatProblemRate) * 100,
        achieved: this.calculateRepeatRate() <= targets.repeatProblemRate
      }
    };

    return {
      totalSessions: current.totalSessions,
      successfulGenerations: current.successfulGenerations,
      failedGenerations: current.failedGenerations,
      patternsDiscovered: current.patternsDiscovered,
      improvements,
      recentSuccessRate,
      topPatterns: this.getTopPatterns(5),
      commonFailures: this.getCommonFailures(5)
    };
  }

  calculateRepeatRate() {
    if (this.failures.length < 2) return 0;
    
    const uniqueErrors = new Set();
    let repeats = 0;
    
    this.failures.forEach(failure => {
      const errorKey = failure.error.toLowerCase().substring(0, 50);
      if (uniqueErrors.has(errorKey)) {
        repeats++;
      } else {
        uniqueErrors.add(errorKey);
      }
    });
    
    return repeats / this.failures.length;
  }

  getTopPatterns(limit = 5) {
    return this.patterns
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit)
      .map(p => ({
        name: p.name,
        category: p.category,
        successRate: p.successRate,
        timesUsed: p.timesUsed
      }));
  }

  getCommonFailures(limit = 5) {
    const errorCounts = {};
    
    this.failures.forEach(failure => {
      const key = failure.error.substring(0, 100);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }

  /**
   * Get learning insights
   */
  getLearningInsights() {
    const report = this.getPerformanceReport();
    const insights = [];

    // Check if we're improving
    if (report.improvements.firstTrySuccess.improvement > 0) {
      insights.push({
        type: 'success',
        message: `First-try success rate improved by ${report.improvements.firstTrySuccess.improvement.toFixed(1)}%!`,
        recommendation: 'Continue current approach'
      });
    }

    // Check for repeat problems
    if (report.improvements.repeatProblems.current > 0.2) {
      insights.push({
        type: 'warning',
        message: `${(report.improvements.repeatProblems.current * 100).toFixed(1)}% of problems are recurring`,
        recommendation: 'Review failure logs and update anti-patterns documentation'
      });
    }

    // Check pattern usage
    if (this.patterns.length < 5) {
      insights.push({
        type: 'info',
        message: 'Pattern library is small',
        recommendation: 'Extract more successful patterns to speed up future development'
      });
    }

    return insights;
  }
}

module.exports = LearningAccumulator;
