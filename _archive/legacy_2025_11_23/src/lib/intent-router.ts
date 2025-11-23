import { v4 as uuidv4 } from 'uuid';

export class IntentRouter {
  constructor() {
    this.intents = new Map();
    this.intentHistory = [];
    this.initializeIntents();
  }

  initializeIntents() {
    this.intents.set('learn', {
      id: 'learn',
      name: 'Learning Intent',
      description: 'User wants to start a learning session',
      parameters: ['topic', 'level', 'duration'],
      priority: 'high',
    });

    this.intents.set('challenge', {
      id: 'challenge',
      name: 'Challenge Intent',
      description: 'User wants to take a challenge or assessment',
      parameters: ['difficulty', 'topic', 'timeLimit'],
      priority: 'high',
    });

    this.intents.set('review', {
      id: 'review',
      name: 'Review Intent',
      description: 'User wants to review past learning',
      parameters: ['period', 'topic'],
      priority: 'medium',
    });

    this.intents.set('analyze', {
      id: 'analyze',
      name: 'Analysis Intent',
      description: 'User wants analytics or performance analysis',
      parameters: ['metric', 'timeframe'],
      priority: 'medium',
    });

    this.intents.set('schedule', {
      id: 'schedule',
      name: 'Scheduling Intent',
      description: 'User wants to schedule a future activity',
      parameters: ['activity', 'date', 'time', 'recurrence'],
      priority: 'medium',
    });

    this.intents.set('integrate', {
      id: 'integrate',
      name: 'Integration Intent',
      description: 'User wants to integrate with external services',
      parameters: ['service', 'action'],
      priority: 'low',
    });

    this.intents.set('configure', {
      id: 'configure',
      name: 'Configuration Intent',
      description: 'User wants to configure settings',
      parameters: ['setting', 'value'],
      priority: 'low',
    });

    this.intents.set('help', {
      id: 'help',
      name: 'Help Intent',
      description: 'User is asking for help or assistance',
      parameters: ['topic'],
      priority: 'high',
    });
  }

  parseIntent(userInput) {
    const entry = {
      id: uuidv4(),
      userInput,
      timestamp: Date.now(),
    };

    const normalized = userInput.toLowerCase().trim();
    let detectedIntent = null;
    let confidence = 0;
    let parameters = {};

    // Simple keyword matching for intent detection
    const keywordMap = {
      learn: ['learn', 'teach', 'study', 'course', 'lesson', 'educate'],
      challenge: ['challenge', 'quiz', 'test', 'assess', 'exam', 'practice'],
      review: ['review', 'recap', 'go over', 'look back', 'summary'],
      analyze: ['analyze', 'analytics', 'stats', 'performance', 'progress', 'results'],
      schedule: ['schedule', 'book', 'plan', 'set up', 'arrange', 'when'],
      integrate: ['integrate', 'connect', 'link', 'sync', 'github', 'slack'],
      configure: ['configure', 'settings', 'config', 'change', 'update', 'set'],
      help: ['help', 'how', 'what', 'explain', 'guide', 'support'],
    };

    for (const [intentId, keywords] of Object.entries(keywordMap)) {
      const matchCount = keywords.filter((keyword) => normalized.includes(keyword)).length;
      if (matchCount > 0) {
        const newConfidence = matchCount / keywords.length;
        if (newConfidence > confidence) {
          confidence = newConfidence;
          detectedIntent = intentId;
        }
      }
    }

    if (!detectedIntent) {
      detectedIntent = 'help';
      confidence = 0.3;
    }

    // Extract parameters based on intent
    if (detectedIntent === 'learn') {
      const topicMatch = normalized.match(/about\s+(\w+)|learn\s+(\w+)/);
      if (topicMatch) parameters.topic = topicMatch[1] || topicMatch[2];
      
      const levelMatch = normalized.match(/beginner|intermediate|advanced/);
      if (levelMatch) parameters.level = levelMatch[0];
      
      const durationMatch = normalized.match(/(\d+)\s*(hours?|minutes?|days?)/);
      if (durationMatch) parameters.duration = `${durationMatch[1]} ${durationMatch[2]}`;
    }

    if (detectedIntent === 'challenge') {
      const diffMatch = normalized.match(/easy|medium|hard|difficulty/);
      if (diffMatch) parameters.difficulty = diffMatch[0];
      
      const timeMatch = normalized.match(/(\d+)\s*min/);
      if (timeMatch) parameters.timeLimit = parseInt(timeMatch[1]);
    }

    if (detectedIntent === 'schedule') {
      const dateMatch = normalized.match(/(?:on|for|at)\s+(\w+day|\d{1,2}\/\d{1,2})/);
      if (dateMatch) parameters.date = dateMatch[1];
      
      const timeMatch = normalized.match(/at\s+(\d{1,2}(?::\d{2})?(?:am|pm)?)/);
      if (timeMatch) parameters.time = timeMatch[1];
    }

    entry.detectedIntent = detectedIntent;
    entry.confidence = confidence;
    entry.parameters = parameters;

    this.intentHistory.push(entry);

    return {
      intentId: detectedIntent,
      confidence: confidence.toFixed(2),
      parameters,
      description: this.intents.get(detectedIntent).description,
    };
  }

  classifyIntent(intentId) {
    const intent = this.intents.get(intentId);

    if (!intent) {
      return null;
    }

    return {
      id: intent.id,
      name: intent.name,
      description: intent.description,
      parameters: intent.parameters,
      priority: intent.priority,
    };
  }

  extractParameters(userInput, intentId) {
    const intent = this.intents.get(intentId);

    if (!intent) {
      return {};
    }

    const extracted = {};

    for (const param of intent.parameters) {
      const regex = new RegExp(`${param}\\s*[:=]?\\s*([^,]+)`, 'i');
      const match = userInput.match(regex);
      if (match) {
        extracted[param] = match[1].trim();
      }
    }

    return extracted;
  }

  validateIntent(intentId, parameters) {
    const intent = this.intents.get(intentId);

    if (!intent) {
      return { valid: false, error: 'Intent not found' };
    }

    const errors = [];

    for (const param of intent.parameters) {
      if (!parameters[param]) {
        errors.push(`Missing parameter: ${param}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getIntentPriority(intentId) {
    const intent = this.intents.get(intentId);

    if (!intent) {
      return null;
    }

    const priorityLevels = { high: 3, medium: 2, low: 1 };

    return {
      intentId,
      priority: intent.priority,
      level: priorityLevels[intent.priority],
    };
  }

  getRecentIntents(limit = 10) {
    return this.intentHistory
      .slice(-limit)
      .reverse()
      .map((entry) => ({
        timestamp: new Date(entry.timestamp).toISOString(),
        userInput: entry.userInput,
        detectedIntent: entry.detectedIntent,
        confidence: parseFloat(entry.confidence),
      }));
  }

  getIntentDistribution() {
    const distribution = {};

    for (const entry of this.intentHistory) {
      distribution[entry.detectedIntent] = (distribution[entry.detectedIntent] || 0) + 1;
    }

    return distribution;
  }

  getIntentConfidenceStats() {
    if (this.intentHistory.length === 0) {
      return { avgConfidence: 0, minConfidence: 0, maxConfidence: 0 };
    }

    const confidences = this.intentHistory.map((e) => parseFloat(e.confidence));
    const sum = confidences.reduce((a, b) => a + b, 0);
    const avg = sum / confidences.length;

    return {
      avgConfidence: parseFloat(avg.toFixed(2)),
      minConfidence: Math.min(...confidences),
      maxConfidence: Math.max(...confidences),
    };
  }

  getAllIntents() {
    return Array.from(this.intents.values()).map((intent) => ({
      id: intent.id,
      name: intent.name,
      description: intent.description,
      priority: intent.priority,
      parameterCount: intent.parameters.length,
    }));
  }

  clearHistory() {
    this.intentHistory = [];
  }
}

export default IntentRouter;
