import { promises as fs } from 'fs';
import path from 'path';

/**
 * Context Bridge Engine - Phase 2 Evolution Component  
 * Connects related conversations and maintains long-term context memory
 */
export default class ContextBridgeEngine {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.dataDir = path.join(this.workspaceRoot, 'data', 'context-bridge');
    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.contextsFile = path.join(this.dataDir, 'contexts.json');
    this.bridgesFile = path.join(this.dataDir, 'bridges.json');
    
    // Context bridging structures
    this.conversationHistory = new Map();
    this.contextNetworks = new Map();
    this.topicBridges = new Map();
    this.outcomeTracker = new Map();
    
    this.loadContextData();
  }

  async loadContextData() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load conversation history
      try {
        const historyData = await fs.readFile(this.conversationsFile, 'utf8');
        const history = JSON.parse(historyData);
        this.conversationHistory = new Map(history.conversations || []);
      } catch (error) {
        console.log('No existing conversation history found, starting fresh');
      }
      
      // Load context networks
      try {
        const networksData = await fs.readFile(this.contextsFile, 'utf8');
        const networks = JSON.parse(networksData);
        this.contextNetworks = new Map(networks.networks || []);
      } catch (error) {
        console.log('No existing context networks found, starting fresh');
      }
      
      // Load topic bridges
      try {
        const bridgesData = await fs.readFile(this.bridgesFile, 'utf8');
        const bridges = JSON.parse(bridgesData);
        this.topicBridges = new Map(bridges.bridges || []);
      } catch (error) {
        console.log('No existing topic bridges found, starting fresh');
      }
      
    } catch (error) {
      console.warn('Could not load context bridge data:', error.message);
    }
  }

  /**
   * CONVERSATION RECORDING - Capture rich context for bridging
   */
  async recordConversation(conversationData) {
    const {
      id,
      userId,
      timestamp = new Date().toISOString(),
      topic,
      subtopics = [],
      technologies = [],
      outcome,
      challenges = [],
      solutions = [],
      codeGenerated = [],
      userSatisfaction = 0,
      followUpQuestions = [],
      contextUsed = []
    } = conversationData;
    
    const conversation = {
      id: id || `conv-${Date.now()}`,
      userId,
      timestamp,
      topic,
      subtopics,
      technologies,
      outcome,
      challenges,
      solutions,
      codeGenerated,
      userSatisfaction,
      followUpQuestions,
      contextUsed,
      // Rich context analysis
      semanticTags: this.extractSemanticTags(conversationData),
      conceptsDiscussed: this.extractConcepts(conversationData),
      skillsInvolved: this.extractSkills(conversationData),
      complexityLevel: this.assessComplexity(conversationData),
      learningOutcomes: this.identifyLearningOutcomes(conversationData)
    };
    
    // Store conversation
    this.conversationHistory.set(conversation.id, conversation);
    
    // Build context networks
    await this.buildContextNetwork(conversation);
    
    // Create topic bridges
    await this.createTopicBridges(conversation);
    
    return conversation;
  }

  /**
   * CONTEXT BRIDGING - Find related conversations and context
   */
  async findRelevantContext(currentContext) {
    const { topic, subtopics = [], technologies = [], challenges = [] } = currentContext;
    
    const relevantConversations = [];
    const contextBridges = [];
    
    // Find conversations with topic overlap
    for (const [id, conversation] of this.conversationHistory) {
      const relevance = this.calculateRelevance(currentContext, conversation);
      
      if (relevance > 0.3) {
        relevantConversations.push({
          conversation,
          relevance,
          bridgeType: this.identifyBridgeType(currentContext, conversation),
          applicableElements: this.extractApplicableElements(currentContext, conversation)
        });
      }
    }
    
    // Sort by relevance
    relevantConversations.sort((a, b) => b.relevance - a.relevance);
    
    // Find context networks
    const networks = this.findContextNetworks(currentContext);
    
    // Build bridges to related topics
    const topicBridges = this.findTopicBridges(currentContext);
    
    return {
      relevantConversations: relevantConversations.slice(0, 5), // Top 5
      contextNetworks: networks,
      topicBridges: topicBridges,
      bridgeRecommendations: this.generateBridgeRecommendations(currentContext, relevantConversations)
    };
  }

  /**
   * PROACTIVE CONTEXT SUGGESTIONS - Based on conversation flow
   */
  getProactiveContextSuggestions(currentFlow) {
    const suggestions = [];
    
    // Based on conversation progression
    const flowSuggestions = this.suggestBasedOnFlow(currentFlow);
    suggestions.push(...flowSuggestions);
    
    // Based on similar conversation patterns
    const patternSuggestions = this.suggestBasedOnPatterns(currentFlow);
    suggestions.push(...patternSuggestions);
    
    // Based on common next steps
    const nextStepSuggestions = this.suggestNextSteps(currentFlow);
    suggestions.push(...nextStepSuggestions);
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  suggestBasedOnFlow(currentFlow) {
    const { currentTopic, stepsSoFar = [], userProgress = 0 } = currentFlow;
    const suggestions = [];
    
    // Find similar conversation flows
    for (const [id, conversation] of this.conversationHistory) {
      if (this.hasFlowSimilarity(stepsSoFar, conversation.learningOutcomes)) {
        const nextLogicalStep = this.predictNextStep(conversation, userProgress);
        if (nextLogicalStep) {
          suggestions.push({
            type: 'flow_continuation',
            suggestion: nextLogicalStep.description,
            confidence: nextLogicalStep.confidence,
            reasoning: `Similar to your work on ${conversation.topic}`,
            resources: nextLogicalStep.resources
          });
        }
      }
    }
    
    return suggestions;
  }

  suggestBasedOnPatterns(currentFlow) {
    const suggestions = [];
    const { currentTopic, technologies = [] } = currentFlow;
    
    // Find common patterns for this topic + tech combination
    const patterns = this.findCommonPatterns(currentTopic, technologies);
    
    patterns.forEach(pattern => {
      suggestions.push({
        type: 'common_pattern',
        suggestion: `Consider implementing ${pattern.name}`,
        confidence: pattern.frequency,
        reasoning: `Common next step in ${pattern.context}`,
        resources: pattern.resources,
        examples: pattern.examples
      });
    });
    
    return suggestions;
  }

  suggestNextSteps(currentFlow) {
    const suggestions = [];
    const { outcome, challenges = [] } = currentFlow;
    
    // Based on current outcome, suggest logical next steps
    if (outcome?.includes('basic implementation')) {
      suggestions.push({
        type: 'progression',
        suggestion: 'Ready to add error handling and edge cases',
        confidence: 0.8,
        reasoning: 'Natural progression from basic implementation',
        resources: ['error-handling-patterns', 'testing-strategies']
      });
    }
    
    if (challenges.length > 0) {
      suggestions.push({
        type: 'challenge_resolution',
        suggestion: `Address remaining challenge: ${challenges[0]}`,
        confidence: 0.9,
        reasoning: 'Unresolved challenges often become blockers',
        resources: this.getResourcesForChallenge(challenges[0])
      });
    }
    
    return suggestions;
  }

  /**
   * CONTEXT NETWORK BUILDING - Create knowledge graphs
   */
  async buildContextNetwork(conversation) {
    const { topic, subtopics, technologies, conceptsDiscussed } = conversation;
    
    // Get or create network for this topic
    let network = this.contextNetworks.get(topic) || {
      topic,
      nodes: new Map(),
      connections: new Map(),
      strength: new Map()
    };
    
    // Add nodes
    [...subtopics, ...technologies, ...conceptsDiscussed].forEach(concept => {
      if (!network.nodes.has(concept)) {
        network.nodes.set(concept, {
          name: concept,
          type: this.classifyConceptType(concept),
          frequency: 0,
          lastSeen: conversation.timestamp,
          conversations: []
        });
      }
      
      const node = network.nodes.get(concept);
      node.frequency++;
      node.lastSeen = conversation.timestamp;
      node.conversations.push(conversation.id);
    });
    
    // Add connections between concepts
    const concepts = [...subtopics, ...technologies, ...conceptsDiscussed];
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const connection = `${concepts[i]}-${concepts[j]}`;
        const strength = network.strength.get(connection) || 0;
        network.strength.set(connection, strength + 1);
        
        if (!network.connections.has(concepts[i])) {
          network.connections.set(concepts[i], new Set());
        }
        network.connections.get(concepts[i]).add(concepts[j]);
      }
    }
    
    this.contextNetworks.set(topic, network);
  }

  async createTopicBridges(conversation) {
    const { topic, subtopics, technologies, outcome } = conversation;
    
    // Create bridges between this topic and related topics
    for (const [existingTopic, existingConv] of this.conversationHistory) {
      if (existingConv.id === conversation.id) continue;
      
      const bridgeStrength = this.calculateBridgeStrength(conversation, existingConv);
      
      if (bridgeStrength > 0.5) {
        const bridgeKey = `${topic}-${existingConv.topic}`;
        const bridge = this.topicBridges.get(bridgeKey) || {
          topics: [topic, existingConv.topic],
          strength: 0,
          connections: [],
          patterns: []
        };
        
        bridge.strength = Math.max(bridge.strength, bridgeStrength);
        bridge.connections.push({
          conversationId: conversation.id,
          bridgeType: this.identifyBridgeType(conversation, existingConv),
          sharedConcepts: this.findSharedConcepts(conversation, existingConv)
        });
        
        this.topicBridges.set(bridgeKey, bridge);
      }
    }
  }

  /**
   * HELPER METHODS - Analysis and calculation
   */
  calculateRelevance(currentContext, conversation) {
    let relevance = 0;
    
    // Topic similarity
    if (currentContext.topic === conversation.topic) relevance += 0.5;
    else if (this.topicBridges.has(`${currentContext.topic}-${conversation.topic}`)) {
      relevance += 0.3;
    }
    
    // Subtopic overlap
    const subtopicOverlap = this.calculateOverlap(
      currentContext.subtopics || [], 
      conversation.subtopics
    );
    relevance += subtopicOverlap * 0.3;
    
    // Technology overlap
    const techOverlap = this.calculateOverlap(
      currentContext.technologies || [], 
      conversation.technologies
    );
    relevance += techOverlap * 0.2;
    
    // Challenge similarity
    const challengeOverlap = this.calculateOverlap(
      currentContext.challenges || [], 
      conversation.challenges
    );
    relevance += challengeOverlap * 0.4;
    
    return Math.min(relevance, 1);
  }

  calculateOverlap(array1, array2) {
    if (!array1.length || !array2.length) return 0;
    const overlap = array1.filter(item => array2.includes(item)).length;
    return overlap / Math.max(array1.length, array2.length);
  }

  identifyBridgeType(context1, context2) {
    // Technology bridge
    if (this.calculateOverlap(context1.technologies || [], context2.technologies || []) > 0.5) {
      return 'technology';
    }
    
    // Concept bridge
    if (this.calculateOverlap(context1.conceptsDiscussed || [], context2.conceptsDiscussed || []) > 0.5) {
      return 'concept';
    }
    
    // Problem bridge
    if (this.calculateOverlap(context1.challenges || [], context2.challenges || []) > 0.3) {
      return 'problem';
    }
    
    return 'topic';
  }

  extractSemanticTags(conversationData) {
    // Extract semantic meaning from conversation
    const { topic, subtopics, challenges, solutions } = conversationData;
    const tags = new Set();
    
    // Add topic-based tags
    if (topic) tags.add(`topic:${topic.toLowerCase()}`);
    
    // Add challenge-based tags
    challenges?.forEach(challenge => {
      tags.add(`challenge:${challenge.toLowerCase()}`);
    });
    
    // Add solution-based tags
    solutions?.forEach(solution => {
      tags.add(`solution:${solution.toLowerCase()}`);
    });
    
    return Array.from(tags);
  }

  extractConcepts(conversationData) {
    // Extract programming concepts discussed
    const concepts = [];
    const { topic, subtopics, codeGenerated } = conversationData;
    
    // Common programming concepts
    const conceptPatterns = [
      'async', 'promise', 'callback', 'closure', 'inheritance',
      'component', 'state', 'props', 'hook', 'middleware',
      'api', 'rest', 'graphql', 'database', 'schema'
    ];
    
    const text = `${topic} ${subtopics?.join(' ')} ${codeGenerated?.join(' ')}`.toLowerCase();
    
    conceptPatterns.forEach(pattern => {
      if (text.includes(pattern)) {
        concepts.push(pattern);
      }
    });
    
    return concepts;
  }

  extractSkills(conversationData) {
    const { technologies, codeGenerated } = conversationData;
    const skills = new Set();
    
    // Add technologies as skills
    technologies?.forEach(tech => skills.add(tech));
    
    // Infer skills from code
    codeGenerated?.forEach(code => {
      if (code.includes('async') || code.includes('await')) skills.add('async-programming');
      if (code.includes('class') || code.includes('extends')) skills.add('oop');
      if (code.includes('useState') || code.includes('useEffect')) skills.add('react-hooks');
    });
    
    return Array.from(skills);
  }

  assessComplexity(conversationData) {
    const { technologies, conceptsDiscussed, challenges } = conversationData;
    
    let complexity = 0;
    
    // Technology complexity
    complexity += (technologies?.length || 0) * 0.2;
    
    // Concept complexity
    complexity += (conceptsDiscussed?.length || 0) * 0.3;
    
    // Challenge complexity
    complexity += (challenges?.length || 0) * 0.3;
    
    // Map to complexity levels
    if (complexity > 2) return 'advanced';
    if (complexity > 1) return 'intermediate';
    if (complexity > 0.5) return 'basic';
    return 'simple';
  }

  identifyLearningOutcomes(conversationData) {
    const { outcome, solutions, codeGenerated, userSatisfaction } = conversationData;
    
    const outcomes = [];
    
    if (outcome?.includes('implemented')) {
      outcomes.push('successful_implementation');
    }
    
    if (solutions?.length > 0) {
      outcomes.push('problem_solving');
    }
    
    if (codeGenerated?.length > 0) {
      outcomes.push('code_creation');
    }
    
    if (userSatisfaction > 0.8) {
      outcomes.push('high_satisfaction');
    }
    
    return outcomes;
  }

  /**
   * PUBLIC API - Phase 2 context bridging capabilities
   */
  async recordCurrentConversation(conversationData) {
    return await this.recordConversation(conversationData);
  }

  async getRelevantContext(currentContext) {
    return await this.findRelevantContext(currentContext);
  }

  getContextSuggestions(currentFlow) {
    return this.getProactiveContextSuggestions(currentFlow);
  }

  getContextNetwork(topic) {
    return this.contextNetworks.get(topic);
  }

  getTopicBridges(topic) {
    const bridges = [];
    for (const [key, bridge] of this.topicBridges) {
      if (bridge.topics.includes(topic)) {
        bridges.push(bridge);
      }
    }
    return bridges.sort((a, b) => b.strength - a.strength);
  }

  getConversationHistory(userId, limit = 10) {
    const userConversations = [];
    for (const [id, conversation] of this.conversationHistory) {
      if (conversation.userId === userId) {
        userConversations.push(conversation);
      }
    }
    return userConversations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
}