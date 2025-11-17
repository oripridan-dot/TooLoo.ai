// Conversation Learning Engine
// Extracts knowledge from chat history and conversation patterns to improve responses

const fs = require('fs').promises;
const path = require('path');

class ConversationLearningEngine {
  constructor() {
    this.conversationMemory = new Map();     // Store processed conversations
    this.extractedPatterns = new Map();      // Topic → patterns mapping
    this.userPreferences = new Map();        // User → preferences mapping
    this.successfulPatterns = [];            // Track what works well
    this.failurePatterns = [];               // Track what doesn't work
    this.learningCache = new Map();          // Cache for quick lookup
  }

  /**
   * Main activation: connects conversation learning engine
   */
  async connectConversationLearningEngine() {
    try {
      console.log('💬 Connecting Conversation Learning Engine...');
      
      // 1. Initialize memory storage
      await this.initializeMemoryStorage();
      console.log('  ✓ Memory storage initialized');
      
      // 2. Load existing conversation history (if available)
      await this.loadConversationHistory();
      console.log(`  ✓ Loaded ${this.conversationMemory.size} conversations`);
      
      // 3. Extract patterns from conversations
      await this.extractConversationPatterns();
      console.log(`  ✓ Extracted patterns from ${this.extractedPatterns.size} topics`);
      
      // 4. Analyze successful responses
      await this.analyzeSuccessfulResponses();
      console.log(`  ✓ Analyzed ${this.successfulPatterns.length} successful patterns`);
      
      // 5. Setup hooks for new conversations
      this.setupConversationHooks();
      console.log('  ✓ Real-time conversation hooks active');
      
      // 6. Register API endpoint
      await this.registerMemoryEndpoint();
      console.log('  ✓ Conversation memory API ready: /api/v1/knowledge/memory');
      
      return {
        status: 'connected',
        memoriesStored: this.conversationMemory.size,
        patternsExtracted: this.extractedPatterns.size,
        successfulPatterns: this.successfulPatterns.length,
        engineReady: true
      };
    } catch (error) {
      console.error('❌ Failed to connect conversation learning engine:', error.message);
      throw error;
    }
  }

  /**
   * Initialize memory storage system
   */
  async initializeMemoryStorage() {
    const memoryDir = path.join(__dirname, '../data/conversation-memory');
    try {
      await fs.mkdir(memoryDir, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }

    // Initialize storage metadata
    this.memoryMetadata = {
      initialized: new Date().toISOString(),
      memoryDir,
      conversationCount: 0,
      totalTokens: 0,
      learningRate: 0.15  // How aggressively to adopt new patterns
    };
  }

  /**
   * Load existing conversation history
   */
  async loadConversationHistory() {
    try {
      const memoryDir = path.join(__dirname, '../data/conversation-memory');
      const files = await fs.readdir(memoryDir);
      
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const content = await fs.readFile(path.join(memoryDir, file), 'utf8');
          const conversation = JSON.parse(content);
          this.conversationMemory.set(conversation.id, conversation);
        } catch (error) {
          console.log(`  ⚠ Failed to load ${file}`);
        }
      }
    } catch (error) {
      // No existing conversations yet
    }
  }

  /**
   * Add new conversation to memory and learn from it
   */
  async recordConversation(conversationData) {
    const {
      id = `conv_${Date.now()}`,
      messages,
      topic,
      outcome,
      quality = 'neutral',
      timestamp = new Date().toISOString()
    } = conversationData;

    const conversation = {
      id,
      messages,
      topic,
      outcome,
      quality,
      timestamp,
      processed: false,
      extractedInsights: []
    };

    // Store in memory
    this.conversationMemory.set(id, conversation);

    // Extract and learn from this conversation
    const insights = await this.extractConversationInsights(conversation);
    conversation.extractedInsights = insights;
    conversation.processed = true;

    // Track pattern success/failure
    if (quality === 'success' || outcome?.success) {
      this.successfulPatterns.push({
        conversationId: id,
        patterns: insights,
        timestamp,
        quality
      });
    } else if (quality === 'failure' || outcome?.success === false) {
      this.failurePatterns.push({
        conversationId: id,
        patterns: insights,
        timestamp,
        quality
      });
    }

    // Save to disk
    await this.saveConversationToDisk(conversation);

    return {
      recorded: true,
      conversationId: id,
      insightsExtracted: insights.length,
      learningApplied: true
    };
  }

  /**
   * Extract insights from a conversation
   */
  async extractConversationInsights(conversation) {
    const insights = [];

    // 1. Extract user intent
    const userIntents = this.analyzeUserIntents(conversation.messages);
    insights.push(...userIntents.map(intent => ({
      type: 'user-intent',
      value: intent,
      confidence: 0.85
    })));

    // 2. Extract successful response patterns
    const responsePatterns = this.analyzeResponsePatterns(conversation.messages);
    insights.push(...responsePatterns.map(pattern => ({
      type: 'response-pattern',
      value: pattern,
      confidence: 0.8
    })));

    // 3. Extract domain-specific knowledge
    const domainKnowledge = this.extractDomainKnowledge(conversation);
    insights.push(...domainKnowledge.map(knowledge => ({
      type: 'domain-knowledge',
      value: knowledge,
      confidence: 0.75
    })));

    // 4. Extract terminology and vocabulary
    const terminology = this.extractTerminology(conversation);
    insights.push(...terminology.map(term => ({
      type: 'terminology',
      value: term,
      confidence: 0.7
    })));

    // 5. Extract user preferences
    const preferences = this.analyzeUserPreferences(conversation);
    insights.push(...preferences.map(pref => ({
      type: 'user-preference',
      value: pref,
      confidence: 0.65
    })));

    return insights;
  }

  /**
   * Analyze user intents from messages
   */
  analyzeUserIntents(messages) {
    const intents = [];
    const userMessages = messages.filter(m => m.role === 'user');
    
    for (const msg of userMessages) {
      const text = msg.content.toLowerCase();
      
      // Pattern matching for common intents
      if (text.match(/how|explain|what|why/i)) intents.push('information-seeking');
      if (text.match(/help|assist|can you|could you/i)) intents.push('request-assistance');
      if (text.match(/improve|enhance|better|optimize/i)) intents.push('improvement-request');
      if (text.match(/problem|issue|error|bug|fail/i)) intents.push('problem-solving');
      if (text.match(/summarize|overview|summary|brief/i)) intents.push('summarization');
      if (text.match(/compare|difference|versus|vs/i)) intents.push('comparison');
      if (text.match(/implement|build|create|develop/i)) intents.push('implementation');
    }

    return [...new Set(intents)]; // Deduplicate
  }

  /**
   * Analyze response patterns that worked
   */
  analyzeResponsePatterns(messages) {
    const patterns = [];
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    for (const msg of assistantMessages) {
      const text = msg.content;
      
      // Track response structure patterns
      if (text.match(/^[-•*]/m)) patterns.push('bullet-point-format');
      if (text.match(/```/)) patterns.push('code-blocks');
      if (text.match(/##.*?\n/)) patterns.push('headers-structure');
      if (text.match(/\*\*.*?\*\*/)) patterns.push('bold-emphasis');
      if (text.includes('✓') || text.includes('✅')) patterns.push('checkmark-format');
      if (text.includes('→')) patterns.push('arrow-navigation');
      
      // Track response length preference
      const lineCount = text.split('\n').length;
      if (lineCount < 5) patterns.push('concise-format');
      if (lineCount > 20) patterns.push('detailed-format');
    }

    return [...new Set(patterns)]; // Deduplicate
  }

  /**
   * Extract domain-specific knowledge from conversations
   */
  extractDomainKnowledge(conversation) {
    const knowledge = [];
    const allText = conversation.messages
      .map(m => m.content)
      .join(' ')
      .toLowerCase();

    // Map common topics to domains
    const domainMappings = {
      'github|git|commit|branch|pull request': 'version-control',
      'api|endpoint|rest|http': 'api-design',
      'database|sql|query|schema': 'databases',
      'testing|test|jest|unit test': 'testing',
      'docker|container|kubernetes': 'devops',
      'node|javascript|async|promise': 'nodejs',
      'product|user|feature|design': 'product-management',
      'marketing|growth|channel|acquisition': 'growth',
      'performance|latency|throughput|optimize': 'optimization',
      'security|auth|token|encryption': 'security'
    };

    for (const [pattern, domain] of Object.entries(domainMappings)) {
      if (new RegExp(pattern).test(allText)) {
        knowledge.push(domain);
      }
    }

    return [...new Set(knowledge)]; // Deduplicate
  }

  /**
   * Extract terminology from conversation
   */
  extractTerminology(conversation) {
    const terminology = [];
    const allText = conversation.messages.map(m => m.content).join(' ');
    
    // Extract capitalized terms (likely technical terms)
    const capitalTerms = allText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    terminology.push(...capitalTerms.slice(0, 10)); // Top 10

    return [...new Set(terminology)]; // Deduplicate
  }

  /**
   * Analyze user communication preferences
   */
  analyzeUserPreferences(conversation) {
    const preferences = [];
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    
    let totalLength = 0;
    for (const msg of userMessages) {
      totalLength += msg.content.length;
      
      // Punctuation preference
      if ((msg.content.match(/!/g) || []).length > 2) preferences.push('enthusiastic-tone');
      if ((msg.content.match(/\?/g) || []).length > 3) preferences.push('questioning-style');
      if (msg.content.length < 50) preferences.push('concise-messages');
      if (msg.content.length > 200) preferences.push('detailed-messages');
    }

    const avgLength = totalLength / userMessages.length;
    if (avgLength < 75) preferences.push('brief-communicator');
    else if (avgLength > 150) preferences.push('thorough-communicator');

    return [...new Set(preferences)]; // Deduplicate
  }

  /**
   * Extract patterns from all conversations
   */
  async extractConversationPatterns() {
    for (const conversation of this.conversationMemory.values()) {
      if (!conversation.processed) {
        const insights = await this.extractConversationInsights(conversation);
        conversation.extractedInsights = insights;
        conversation.processed = true;
      }

      // Group insights by topic
      const topic = conversation.topic || 'general';
      if (!this.extractedPatterns.has(topic)) {
        this.extractedPatterns.set(topic, []);
      }

      const patterns = this.extractedPatterns.get(topic);
      patterns.push(...conversation.extractedInsights);
    }
  }

  /**
   * Analyze successful responses
   */
  async analyzeSuccessfulResponses() {
    // Find conversations marked as successful
    for (const conversation of this.conversationMemory.values()) {
      if (conversation.quality === 'success' || conversation.outcome?.success) {
        const patterns = conversation.extractedInsights || [];
        this.successfulPatterns.push({
          conversationId: conversation.id,
          topic: conversation.topic,
          patterns,
          timestamp: conversation.timestamp
        });
      }
    }
  }

  /**
   * Setup hooks to learn from new conversations in real-time
   */
  setupConversationHooks() {
    // This would integrate with the actual conversation API
    // Example hook registration:
    // EventEmitter.on('conversation:completed', (data) => this.recordConversation(data));
    
    console.log('  ℹ Conversation hooks ready (integrate with conversation API)');
  }

  /**
   * Register memory endpoint
   */
  async registerMemoryEndpoint() {
    return {
      endpoint: '/api/v1/knowledge/memory',
      methods: {
        GET: {
          description: 'Get learned patterns from memory',
          parameters: {
            topic: 'Filter by topic (optional)',
            type: 'Pattern type (user-intent, response-pattern, domain-knowledge, etc.)',
            limit: 'Maximum results (default: 20)'
          }
        },
        POST: {
          description: 'Record new conversation and learn from it',
          body: {
            messages: 'Array of conversation messages',
            topic: 'Conversation topic',
            outcome: 'Outcome assessment',
            quality: 'Quality rating (success/failure/neutral)'
          }
        }
      }
    };
  }

  /**
   * Save conversation to disk for persistence
   */
  async saveConversationToDisk(conversation) {
    try {
      const memoryDir = path.join(__dirname, '../data/conversation-memory');
      const fileName = `${conversation.id}.json`;
      const filePath = path.join(memoryDir, fileName);
      
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
    } catch (error) {
      console.log(`  ⚠ Failed to save conversation to disk: ${error.message}`);
    }
  }

  /**
   * Get learned patterns for a topic
   */
  async getPatternsForTopic(topic) {
    const patterns = this.extractedPatterns.get(topic) || [];
    
    // Sort by confidence
    return patterns.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Get user learning profile
   */
  getUserLearningProfile(userId) {
    const userConversations = Array.from(this.conversationMemory.values())
      .filter(c => c.userId === userId);
    
    const allInsights = userConversations.flatMap(c => c.extractedInsights || []);
    
    return {
      userId,
      conversationCount: userConversations.length,
      successRate: userConversations.filter(c => c.quality === 'success').length / userConversations.length,
      preferredDomains: this.getTopDomains(allInsights),
      communicationStyle: this.getPreferredStyle(allInsights),
      learningPatterns: this.extractLearningPatterns(allInsights)
    };
  }

  /**
   * Get top domains from insights
   */
  getTopDomains(insights) {
    const domains = insights
      .filter(i => i.type === 'domain-knowledge')
      .map(i => i.value);
    
    const counts = {};
    domains.forEach(d => counts[d] = (counts[d] || 0) + 1);
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, frequency: count }));
  }

  /**
   * Get preferred communication style
   */
  getPreferredStyle(insights) {
    const styles = insights
      .filter(i => i.type === 'user-preference')
      .map(i => i.value);
    
    const counts = {};
    styles.forEach(s => counts[s] = (counts[s] || 0) + 1);
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([style]) => style);
  }

  /**
   * Extract learning patterns
   */
  extractLearningPatterns(insights) {
    const patterns = insights
      .filter(i => i.type === 'response-pattern')
      .map(i => i.value);
    
    const counts = {};
    patterns.forEach(p => counts[p] = (counts[p] || 0) + 1);
    
    return counts;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      conversationsRecorded: this.conversationMemory.size,
      topicsLearned: this.extractedPatterns.size,
      successfulPatterns: this.successfulPatterns.length,
      failurePatterns: this.failurePatterns.length,
      averageInsightsPerConversation: this.conversationMemory.size > 0
        ? Array.from(this.conversationMemory.values())
          .reduce((sum, c) => sum + (c.extractedInsights?.length || 0), 0) / this.conversationMemory.size
        : 0
    };
  }
}

module.exports = ConversationLearningEngine;
