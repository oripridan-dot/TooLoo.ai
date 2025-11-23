// @version 2.1.11
/**
 * Semantic Conversation Understanding Engine
 * Uses LLM analysis to detect conversation intent, goal evolution, and context shifts
 * Replaces keyword-based segmentation with true semantic understanding
 */

import LLMProvider from "../../precog/providers/llm-provider.js";

export default class SemanticSegmentation {
  constructor(options = {}) {
    this.llm = new LLMProvider(options);
    this.cache = new Map(); // Cache for analysis results
  }

  /**
   * Analyze conversation semantically using LLM
   * @param {Array} messages - Array of conversation messages
   * @param {object} context - Additional context
   * @returns {object} - Semantic analysis results
   */
  async analyzeConversation(messages, context = {}) {
    if (!messages || messages.length === 0) {
      return {
        segments: [],
        intent: "unknown",
        goalEvolution: [],
        contextShifts: [],
      };
    }

    // Create cache key from message content
    const cacheKey = this.createCacheKey(messages);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prepare conversation summary for LLM analysis
    const conversationText = this.formatConversationForAnalysis(messages);

    const analysisPrompt = `Analyze this conversation and provide a detailed semantic breakdown. Focus on:

1. PRIMARY INTENT: What is the user's main goal or purpose in this conversation?
2. CURRENT PHASE: What phase of problem-solving are they in? (Discovery, Planning, Implementation, Testing, Refinement)
3. GOAL EVOLUTION: How has their goal changed or evolved through the conversation?
4. CONTEXT SHIFTS: Any significant changes in topic, scope, or requirements?
5. EMOTIONAL STATE: User's current emotional state (frustrated, focused, confused, satisfied, etc.)
6. URGENCY LEVEL: How urgent is this request? (low, medium, high, critical)
7. DOMAIN EXPERTISE: What domain expertise would be most helpful? (technical, creative, business, research, etc.)

Conversation:
${conversationText}

Provide your analysis in JSON format with these exact keys: intent, phase, goalEvolution, contextShifts, emotionalState, urgencyLevel, domainExpertise`;

    try {
      const response = await this.llm.generateSmartLLM({
        prompt: analysisPrompt,
        taskType: "analysis",
        context: { analysis: true },
      });

      const analysis = this.parseAnalysisResponse(response.content);

      // Create segments based on semantic analysis
      const segments = this.createSemanticSegments(messages, analysis);

      const result = {
        segments,
        intent: analysis.intent || "unknown",
        phase: analysis.phase || "unknown",
        goalEvolution: analysis.goalEvolution || [],
        contextShifts: analysis.contextShifts || [],
        emotionalState: analysis.emotionalState || "neutral",
        urgencyLevel: analysis.urgencyLevel || "medium",
        domainExpertise: analysis.domainExpertise || "general",
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.warn(
        "Semantic analysis failed, falling back to basic segmentation:",
        error.message
      );
      return this.fallbackAnalysis(messages);
    }
  }

  /**
   * Format conversation messages for LLM analysis
   * @param {Array} messages - Conversation messages
   * @returns {string} - Formatted conversation text
   */
  formatConversationForAnalysis(messages) {
    return messages
      .map((msg, index) => {
        const role = msg.role || "user";
        const content = typeof msg === "string" ? msg : msg.content || "";
        return `${role.toUpperCase()}[${index}]: ${content.substring(0, 500)}`; // Limit content length
      })
      .join("\n\n");
  }

  /**
   * Parse LLM analysis response
   * @param {string} response - Raw LLM response
   * @returns {object} - Parsed analysis
   */
  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: extract key information from text
      return {
        intent: this.extractFromText(response, "PRIMARY INTENT", "intent"),
        phase: this.extractFromText(response, "CURRENT PHASE", "phase"),
        goalEvolution: this.extractListFromText(response, "GOAL EVOLUTION"),
        contextShifts: this.extractListFromText(response, "CONTEXT SHIFTS"),
        emotionalState: this.extractFromText(
          response,
          "EMOTIONAL STATE",
          "emotionalState"
        ),
        urgencyLevel: this.extractFromText(
          response,
          "URGENCY LEVEL",
          "urgencyLevel"
        ),
        domainExpertise: this.extractFromText(
          response,
          "DOMAIN EXPERTISE",
          "domainExpertise"
        ),
      };
    } catch (error) {
      console.warn("Failed to parse analysis response:", error.message);
      return {};
    }
  }

  /**
   * Extract single value from text response
   * @param {string} text - Full response text
   * @param {string} section - Section header to look for
   * @param {string} fallback - Fallback key
   * @returns {string} - Extracted value
   */
  extractFromText(text, section, fallback) {
    const regex = new RegExp(`${section}[:\\s]*([^\\n]+)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : fallback;
  }

  /**
   * Extract list from text response
   * @param {string} text - Full response text
   * @param {string} section - Section header
   * @returns {Array} - Extracted list items
   */
  extractListFromText(text, section) {
    const sectionRegex = new RegExp(
      `${section}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`,
      "i"
    );
    const sectionMatch = text.match(sectionRegex);
    if (!sectionMatch) return [];

    const listText = sectionMatch[1];
    const items = listText
      .split(/[•\-\*\d+\.]/)
      .filter((item) => item.trim().length > 0);
    return items.map((item) => item.trim());
  }

  /**
   * Create semantic segments based on analysis
   * @param {Array} messages - Original messages
   * @param {object} analysis - Semantic analysis
   * @returns {Array} - Semantic segments
   */
  createSemanticSegments(messages, analysis) {
    const segments = [];

    if (messages.length === 0) return segments;

    // Create segments based on phase and context shifts
    let currentSegment = {
      start: 0,
      end: 0,
      phase: analysis.phase || "unknown",
      intent: analysis.intent || "unknown",
      emotionalState: analysis.emotionalState || "neutral",
      messages: [],
    };

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const shouldSplit = this.shouldSplitSegment(
        currentSegment,
        message,
        analysis,
        i
      );

      if (shouldSplit && currentSegment.messages.length > 0) {
        // Finalize current segment
        currentSegment.end = i - 1;
        currentSegment.title = `${currentSegment.phase}: ${currentSegment.intent}`;
        currentSegment.summary = `Phase: ${currentSegment.phase}, Intent: ${currentSegment.intent}, Emotional state: ${currentSegment.emotionalState}`;
        segments.push({ ...currentSegment });

        // Start new segment
        currentSegment = {
          start: i,
          end: i,
          phase: analysis.phase || "unknown",
          intent: analysis.intent || "unknown",
          emotionalState: analysis.emotionalState || "neutral",
          messages: [],
        };
      }

      currentSegment.messages.push(message);
    }

    // Add final segment
    if (currentSegment.messages.length > 0) {
      currentSegment.end = messages.length - 1;
      currentSegment.title = `${currentSegment.phase}: ${currentSegment.intent}`;
      currentSegment.summary = `Phase: ${currentSegment.phase}, Intent: ${currentSegment.intent}, Emotional state: ${currentSegment.emotionalState}`;
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Determine if we should split the segment at this message
   * @param {object} currentSegment - Current segment being built
   * @param {object} message - Current message
   * @param {object} analysis - Full analysis
   * @param {number} index - Message index
   * @returns {boolean} - Whether to split
   */
  shouldSplitSegment(currentSegment, message, analysis, index) {
    // Split on context shifts
    if (analysis.contextShifts && analysis.contextShifts.length > 0) {
      // Check if this message corresponds to a context shift
      const messageContent =
        typeof message === "string" ? message : message.content || "";
      return analysis.contextShifts.some((shift) =>
        messageContent
          .toLowerCase()
          .includes(shift.toLowerCase().substring(0, 20))
      );
    }

    // Split on significant emotional changes (simplified)
    const emotionalKeywords = {
      frustrated: ["frustrated", "stuck", "problem", "issue", "error"],
      focused: ["focus", "concentrate", "work on", "implement"],
      confused: ["confused", "unclear", "not sure", "help"],
      satisfied: ["good", "great", "excellent", "perfect", "done"],
    };

    const messageContent = (
      typeof message === "string" ? message : message.content || ""
    ).toLowerCase();
    let detectedEmotion = null;

    for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some((keyword) => messageContent.includes(keyword))) {
        detectedEmotion = emotion;
        break;
      }
    }

    if (detectedEmotion && detectedEmotion !== currentSegment.emotionalState) {
      return true;
    }

    return false;
  }

  /**
   * Create cache key from messages
   * @param {Array} messages - Messages array
   * @returns {string} - Cache key
   */
  createCacheKey(messages) {
    const content = messages
      .map((m) => (typeof m === "string" ? m : m.content || ""))
      .join("");
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Fallback analysis when LLM fails
   * @param {Array} messages - Messages array
   * @returns {object} - Basic analysis
   */
  fallbackAnalysis(messages) {
    return {
      segments: [
        {
          start: 0,
          end: messages.length - 1,
          title: "Conversation",
          summary: "Basic conversation segment",
          phase: "unknown",
          intent: "unknown",
        },
      ],
      intent: "unknown",
      phase: "unknown",
      goalEvolution: [],
      contextShifts: [],
      emotionalState: "neutral",
      urgencyLevel: "medium",
      domainExpertise: "general",
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.cache.clear();
  }
}
