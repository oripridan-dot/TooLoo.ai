// @version 2.1.28
/**
 * Intelligent Context Injector (Phase 7)
 *
 * Strategically injects conversation memory into prompts to maintain coherence
 * without token bloat or slowdown
 *
 * Strategies:
 * - Relevance-based: Inject messages matching current intent
 * - Recency-focused: Last N exchanges for continuity
 * - Hybrid: Balance both for optimal coherence
 * - Smart: Learn what works from successful responses
 */

class ContextInjectionEngine {
  constructor(options = {}) {
    this.strategy = options.strategy || 'hybrid';
    this.maxContextTokens = options.maxContextTokens || 1500;
    this.recentLimit = options.recentLimit || 5;
    this.scoreCache = new Map();
    this.successMetrics = [];
  }

  buildContextInjection(memoryEngine, currentMessage, options = {}) {
    if (!memoryEngine) {
      return { injection: '', stats: { method: 'none', messages: 0 } };
    }

    const strategy = options.strategy || this.strategy;
    let contextMessages = [];
    let stats = { method: strategy, messages: 0, tokens: 0 };

    if (strategy === 'relevance') {
      contextMessages = this._buildRelevanceContext(memoryEngine, currentMessage);
    } else if (strategy === 'recency') {
      contextMessages = this._buildRecencyContext(memoryEngine);
    } else if (strategy === 'hybrid') {
      contextMessages = this._buildHybridContext(memoryEngine, currentMessage);
    } else if (strategy === 'smart') {
      contextMessages = this._buildSmartContext(memoryEngine, currentMessage);
    } else {
      contextMessages = this._buildRecencyContext(memoryEngine);
    }

    const injection = this._formatContextInjection(contextMessages, memoryEngine);

    stats.messages = contextMessages.length;
    stats.tokens = this._estimateTokens(injection);

    return { injection, contextMessages, stats };
  }

  _buildRelevanceContext(memoryEngine, currentMessage) {
    const history = memoryEngine.getConversationHistory({
      includeContext: true,
      limit: 30
    });

    const intent = this._analyzeIntent(currentMessage);
    const keywords = this._extractKeywords(currentMessage);

    const scored = history.map((msg, _idx) => {
      const relevanceScore = this._scoreMessageRelevance(msg.content, intent, keywords);
      const recencyBoost = 1 - (_idx / (history.length || 1)) * 0.2;
      const finalScore = relevanceScore * recencyBoost;

      return { msg, score: finalScore, idx: _idx };
    });

    return scored
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.recentLimit + 2)
      .sort((a, b) => a.idx - b.idx)
      .map(s => s.msg);
  }

  _buildRecencyContext(memoryEngine) {
    return memoryEngine.getConversationHistory({
      limit: this.recentLimit * 2,
      includeContext: false
    });
  }

  _buildHybridContext(memoryEngine, currentMessage) {
    const recent = memoryEngine.getConversationHistory({
      limit: this.recentLimit
    });

    const intent = this._analyzeIntent(currentMessage);
    const keywords = this._extractKeywords(currentMessage);

    const history = memoryEngine.getConversationHistory({ limit: 50 });
    const older = history.slice(0, -this.recentLimit);

    const relevantOlder = older
      .map(msg => ({
        msg,
        score: this._scoreMessageRelevance(msg.content, intent, keywords)
      }))
      .filter(s => s.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.msg);

    return [...recent, ...relevantOlder];
  }

  _buildSmartContext(memoryEngine, currentMessage) {
    const intent = this._analyzeIntent(currentMessage);

    const similarPastAttempts = this.successMetrics
      .filter(m => m.intent === intent && m.success > 0.7)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 1);

    if (similarPastAttempts.length > 0) {
      const pattern = similarPastAttempts[0];
      const context = memoryEngine.searchMessages(pattern.keywords.join(' '), {
        maxResults: 5,
        recentOnly: false
      });
      if (context.length > 0) {
        return context;
      }
    }

    return this._buildHybridContext(memoryEngine, currentMessage);
  }

  recordResult(message, intent, contextMessages, success, metadata = {}) {
    this.successMetrics.push({
      message,
      intent,
      keywords: this._extractKeywords(message),
      contextSize: contextMessages.length,
      success: success ? 1 : 0,
      timestamp: Date.now(),
      metadata
    });

    if (this.successMetrics.length > 100) {
      this.successMetrics.shift();
    }
  }

  _formatContextInjection(contextMessages, memoryEngine) {
    if (!contextMessages || contextMessages.length === 0) {
      return '';
    }

    let injection = '\n## CONVERSATION CONTEXT\n\n';

    const stats = memoryEngine.getMemoryStats();
    injection += `This is message #${stats.totalMessages} in the conversation.\n`;

    if (stats.topics && stats.topics.length > 0) {
      injection += `Active topics: ${stats.topics.slice(0, 3).join(', ')}\n`;
    }

    injection += '\nRecent conversation:\n';

    contextMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      const marker = msg.isCompressed ? '[summarized]' : '[recent]';
      injection += `\n${role} ${marker}:\n${msg.content.slice(0, 300)}\n`;

      if (msg.content.length > 300) {
        injection += `...[truncated, ${msg.content.length} chars total]\n`;
      }
    });

    injection += '\n---\n\n';

    return injection;
  }

  _analyzeIntent(message) {
    const lower = message.toLowerCase();

    if (lower.match(/question|what|why|how|when|where|who/i)) {
      return 'question';
    } else if (lower.match(/implement|create|build|fix|solve/i)) {
      return 'task';
    } else if (lower.match(/explain|summarize|analyze|review/i)) {
      return 'analysis';
    } else if (lower.match(/refactor|optimize|improve|redesign/i)) {
      return 'improvement';
    } else if (lower.match(/debug|error|issue|problem|bug/i)) {
      return 'debugging';
    }
    return 'general';
  }

  _extractKeywords(message, count = 5) {
    const words = message.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4 && !this._isStopword(w))
      .slice(0, count);

    return [...new Set(words)];
  }

  _scoreMessageRelevance(messageContent, intent, keywords) {
    let score = 0;
    const lower = messageContent.toLowerCase();

    keywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        score += 0.3;
      }
    });

    if (intent === 'question' && lower.match(/answer|explains?|here|this/i)) {
      score += 0.2;
    } else if (intent === 'task' && lower.match(/implement|code|function|method/i)) {
      score += 0.2;
    } else if (intent === 'debugging' && lower.match(/error|issue|problem|fix/i)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  _isStopword(word) {
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    return stopwords.has(word);
  }

  _estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
}

let injector = null;

export function getContextInjectionEngine(options = {}) {
  if (!injector) {
    injector = new ContextInjectionEngine(options);
  }
  return injector;
}

export { ContextInjectionEngine };
