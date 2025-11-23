// Tier 1 Knowledge Enhancement Integration
// Activates all three Tier 1 engines: web sources, conversation learning, and benchmark-driven improvements

const KnowledgeSourceIntegration = require('./knowledge-source-integration.cjs');
const ConversationLearningEngine = require('./conversation-learning-engine.cjs');
const BenchmarkLearningEngine = require('./benchmark-learning-engine.cjs');

class Tier1KnowledgeEnhancement {
  constructor() {
    this.webSourceEngine = new KnowledgeSourceIntegration();
    this.conversationEngine = new ConversationLearningEngine();
    this.benchmarkEngine = new BenchmarkLearningEngine();
    this.status = 'initializing';
    this.activationTime = null;
  }

  /**
   * Master activation: start all three Tier 1 engines
   */
  async activateAllTier1Engines() {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🚀 TIER 1 KNOWLEDGE ENHANCEMENT — FULL ACTIVATION');
      console.log('='.repeat(80) + '\n');

      this.activationTime = new Date();

      // Engine 1: Web Source Integration
      console.log('📍 ENGINE 1: Web Source Integration Pipeline');
      console.log('-'.repeat(80));
      const webSourceResult = await this.webSourceEngine.activateWebSourcePipeline();
      console.log('✅ Web Source Integration: ACTIVE\n');

      // Engine 2: Conversation Learning
      console.log('📍 ENGINE 2: Conversation Learning Engine');
      console.log('-'.repeat(80));
      const conversationResult = await this.conversationEngine.connectConversationLearningEngine();
      console.log('✅ Conversation Learning Engine: ACTIVE\n');

      // Engine 3: Benchmark-Driven Learning
      console.log('📍 ENGINE 3: Benchmark-Driven Learning Engine');
      console.log('-'.repeat(80));
      const benchmarkResult = await this.benchmarkEngine.buildAutoImprovementRulesFromBenchmarks();
      console.log('✅ Benchmark-Driven Learning: ACTIVE\n');

      // Integration summary
      const integrationSummary = this.generateIntegrationSummary({
        webSourceResult,
        conversationResult,
        benchmarkResult
      });

      this.status = 'active';
      
      return {
        status: 'success',
        activationTime: this.activationTime.toISOString(),
        enginesActivated: 3,
        summary: integrationSummary
      };
    } catch (error) {
      console.error('❌ Tier 1 activation failed:', error.message);
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * Generate integration summary
   */
  generateIntegrationSummary(results) {
    const { webSourceResult, conversationResult, benchmarkResult } = results;

    return {
      timestamp: new Date().toISOString(),
      engines: {
        webSources: {
          status: webSourceResult.status,
          sourcesLoaded: webSourceResult.sourcesLoaded,
          authorityScoresComputed: webSourceResult.authorityScoresComputed,
          pipelineReady: webSourceResult.pipelineReady
        },
        conversationMemory: {
          status: conversationResult.status,
          memoriesStored: conversationResult.memoriesStored,
          patternsExtracted: conversationResult.patternsExtracted,
          successfulPatterns: conversationResult.successfulPatterns,
          engineReady: conversationResult.engineReady
        },
        benchmarkImprovement: {
          status: benchmarkResult.status,
          benchmarksLoaded: benchmarkResult.benchmarksLoaded,
          weakAreasIdentified: benchmarkResult.weakAreasIdentified,
          improvementRulesGenerated: benchmarkResult.improvementRulesGenerated,
          sourcesQueued: benchmarkResult.sourcesQueued,
          engineReady: benchmarkResult.engineReady
        }
      },
      statistics: {
        totalSourcesLoaded: webSourceResult.sourcesLoaded,
        totalConversationsProcessed: conversationResult.memoriesStored,
        totalImprovementRules: benchmarkResult.improvementRulesGenerated,
        weakAreasIdentified: benchmarkResult.weakAreasIdentified,
        sourceFetchesQueued: benchmarkResult.sourcesQueued
      },
      nextSteps: [
        '1. Monitor web source integration for new authoritative sources',
        '2. Record new conversations to build learning memory',
        '3. Apply benchmark improvement rules to address weak areas',
        '4. Check progress at /api/v1/knowledge/stats for real-time metrics'
      ]
    };
  }

  /**
   * Get comprehensive knowledge base status
   */
  async getKnowledgeBaseStatus() {
    if (this.status !== 'active') {
      return { status: 'inactive', message: 'Activate engines first with activateAllTier1Engines()' };
    }

    return {
      timestamp: new Date().toISOString(),
      activationTime: this.activationTime.toISOString(),
      engines: {
        webSources: {
          status: 'active',
          sources: this.webSourceEngine.getSourceStats(),
          endpoints: ['/api/v1/knowledge/sources']
        },
        conversationMemory: {
          status: 'active',
          memory: this.conversationEngine.getMemoryStats(),
          endpoints: ['/api/v1/knowledge/memory']
        },
        benchmarkImprovement: {
          status: 'active',
          improvements: this.benchmarkEngine.getBenchmarkStats(),
          progress: this.benchmarkEngine.getImprovementProgress(),
          endpoints: ['/api/v1/knowledge/benchmarks', '/api/v1/knowledge/rules']
        }
      },
      integratedCapabilities: [
        'Real-time web source discovery with authority scoring',
        'Conversation memory extraction and pattern learning',
        'Benchmark-driven auto-improvement rule generation',
        'Weak area identification and priority learning plans',
        'Multi-source knowledge synthesis'
      ]
    };
  }

  /**
   * Record a conversation and trigger learning
   */
  async recordAndLearn(conversationData) {
    try {
      // Record in conversation memory
      const result = await this.conversationEngine.recordConversation(conversationData);
      
      // Extract topic for source fetching
      const topic = conversationData.topic || 'general';
      
      // Get relevant sources from web sources
      const sources = await this.webSourceEngine.getSourcesForTopic(topic);
      
      return {
        conversationRecorded: result.recorded,
        insightsExtracted: result.insightsExtracted,
        relevantSources: sources.slice(0, 5), // Top 5 sources
        nextAction: 'Review extracted insights and relevant sources to enhance learning'
      };
    } catch (error) {
      console.error('Error during record and learn:', error.message);
      throw error;
    }
  }

  /**
   * Get sources for improving a weak area
   */
  async getSourcesForWeakArea(weakAreaTopic, options = {}) {
    try {
      const sources = await this.webSourceEngine.getSourcesForTopic(weakAreaTopic, {
        limit: options.limit || 20,
        minAuthority: options.minAuthority || 0.75
      });

      const conversationPatterns = await this.conversationEngine.getPatternsForTopic(weakAreaTopic);

      return {
        topic: weakAreaTopic,
        sources,
        learningPatterns: conversationPatterns,
        recommendedApproach: this.generateApproach(sources, conversationPatterns),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting sources for weak area:', error.message);
      throw error;
    }
  }

  /**
   * Generate learning approach based on sources and patterns
   */
  generateApproach(sources, patterns) {
    const topSourceTypes = this.getTopSourceTypes(sources);
    const learningStyle = this.determineLearningStyle(patterns);

    return {
      recommendedSequence: [
        'Start with official documentation or books (highest authority)',
        'Study relevant research papers or case studies',
        'Explore practical examples and tutorials',
        'Practice with real-world scenarios'
      ],
      prioritySourceTypes: topSourceTypes,
      estimatedLearningTime: `${sources.length * 2}-${sources.length * 4} hours`,
      learningStyle,
      successMetrics: [
        'Understanding of core concepts (80%+)',
        'Ability to apply in practice (70%+)',
        'Teaching ability (explain to others effectively)'
      ]
    };
  }

  /**
   * Get top source types
   */
  getTopSourceTypes(sources) {
    const types = {};
    sources.forEach(s => {
      types[s.type] = (types[s.type] || 0) + 1;
    });

    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Determine learning style from patterns
   */
  determineLearningStyle(patterns) {
    const styleMap = {
      'bullet-point-format': 'visual-structured',
      'code-blocks': 'hands-on-practical',
      'detailed-format': 'comprehensive-theoretical',
      'concise-format': 'quick-reference'
    };

    const styles = patterns.map(p => styleMap[p.value]).filter(Boolean);
    
    if (styles.length === 0) return 'mixed';
    
    const counts = {};
    styles.forEach(s => counts[s] = (counts[s] || 0) + 1);
    
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Apply improvement rules
   */
  async applyNextImprovementRule() {
    try {
      const pending = this.benchmarkEngine.improvementRules.find(r => r.status === 'pending');
      
      if (!pending) {
        return { status: 'no-pending-rules', message: 'All rules have been processed' };
      }

      const applied = await this.benchmarkEngine.applyRule(pending.id);
      
      return {
        ruleApplied: applied.id,
        weakArea: applied.weakArea,
        actionsExecuted: applied.actions.length,
        nextRule: this.benchmarkEngine.improvementRules.find(r => r.status === 'pending')?.id || null
      };
    } catch (error) {
      console.error('Error applying improvement rule:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive knowledge enhancement report
   */
  getComprehensiveReport() {
    if (this.status !== 'active') {
      return { status: 'inactive' };
    }

    const webStats = this.webSourceEngine.getSourceStats();
    const conversationStats = this.conversationEngine.getMemoryStats();
    const benchmarkStats = this.benchmarkEngine.getBenchmarkStats();
    const improvementProgress = this.benchmarkEngine.getImprovementProgress();

    return {
      timestamp: new Date().toISOString(),
      systemStatus: 'active',
      activationDuration: new Date() - this.activationTime,
      
      knowledgeBaseSummary: {
        webSources: {
          total: webStats.totalSources,
          byType: webStats.byType,
          averageAuthority: webStats.averageAuthority.toFixed(2),
          highAuthorityCount: webStats.highAuthoritySources
        },
        conversationLearning: {
          conversationsProcessed: conversationStats.conversationsRecorded,
          topicsLearned: conversationStats.topicsLearned,
          patterns: conversationStats.successfulPatterns,
          avgInsightsPerConv: conversationStats.averageInsightsPerConversation.toFixed(2)
        },
        benchmarkImprovement: {
          weakAreas: benchmarkStats.totalWeakAreas,
          improvementRules: benchmarkStats.improvementRulesGenerated,
          sourceRequests: benchmarkStats.sourceRequestsQueued,
          topPriorityArea: benchmarkStats.topPriorityArea?.topic || 'none',
          averageGap: benchmarkStats.averageGap.toFixed(2)
        }
      },

      improvementProgress,
      
      keyCapabilities: [
        'Real-time knowledge source discovery',
        'Conversation-based learning and memory',
        'Benchmark-driven auto-improvement',
        'Authority-scored source ranking',
        'Multi-domain weak area identification',
        'Priority-based learning planning'
      ],

      recommendations: [
        `Focus on top priority weak area: "${benchmarkStats.topPriorityArea?.topic || 'N/A'}"`,
        `Continue recording conversations to enhance learning memory`,
        `Apply ${improvementProgress.rulesPending} pending improvement rules`,
        `Monitor ${benchmarkStats.sourceRequestsQueued} queued source fetches`
      ]
    };
  }
}

// Export for use in servers
module.exports = Tier1KnowledgeEnhancement;
