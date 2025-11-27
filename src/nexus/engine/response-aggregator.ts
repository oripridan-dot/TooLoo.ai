// @version 2.1.28
/**
 * Response Aggregator
 * Takes multiple Layer 1 provider responses and synthesizes them into:
 * - Bullet-point format (key insights/sentences)
 * - Comprehensive combined response with all key info
 * - Consolidated suggestions
 */

export default class ResponseAggregator {
  constructor() {
    this.responses = [];
    this.metadata = {
      providersUsed: [],
      timestamp: null,
      taskType: null,
      criticality: null,
    };
  }

  /**
   * Add a response from a Layer 1 provider
   * @param {string} text - The response text
   * @param {object} metadata - Provider metadata (name, confidence, taskType, etc.)
   */
  addResponse(text, metadata = {}) {
    if (!text || !String(text).trim()) return;

    this.responses.push({
      text: String(text).trim(),
      provider: metadata.provider || "unknown",
      confidence: metadata.confidence || 0.5,
      taskType: metadata.taskType || "general",
      timestamp: metadata.timestamp || Date.now(),
    });

    if (
      metadata.provider &&
      !this.metadata.providersUsed.includes(metadata.provider)
    ) {
      this.metadata.providersUsed.push(metadata.provider);
    }
  }

  /**
   * Extract key bullets from a single response
   * Identifies sentences, breaks them into bullets, prioritizes by relevance
   */
  extractBullets(text, maxBullets = 5) {
    if (!text) return [];

    // Split by sentences (simple heuristic)
    const sentences = text
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 10)
      .slice(0, maxBullets);

    // Clean and format as bullets
    return sentences
      .map((s) => {
        const cleaned = s.replace(/[.!?]$/, "").trim();
        return cleaned.length > 0 ? `• ${cleaned}` : null;
      })
      .filter(Boolean);
  }

  /**
   * Generate Layer 1 bullets (key sentences/insights)
   * Takes all responses and extracts consolidated bullet points
   */
  generateLayer1Bullets(maxBullets = 8) {
    if (this.responses.length === 0) return [];

    const allBullets = [];

    // Extract bullets from each response
    this.responses.forEach((resp, idx) => {
      const bullets = this.extractBullets(resp.text, 3);
      bullets.forEach((bullet) => {
        allBullets.push({
          text: bullet,
          provider: resp.provider,
          confidence: resp.confidence,
          index: idx,
        });
      });
    });

    // Sort by confidence and uniqueness
    const unique = this.deduplicateBullets(allBullets);
    const sorted = unique
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxBullets);

    return sorted.map((b) => b.text);
  }

  /**
   * Deduplicate similar bullets
   */
  deduplicateBullets(bullets) {
    const seen = new Set();
    const result = [];

    for (const bullet of bullets) {
      const normalized = this.normalizeBullet(bullet.text);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(bullet);
      }
    }

    return result;
  }

  /**
   * Normalize bullet for comparison (lowercase, trim punctuation)
   */
  normalizeBullet(text) {
    return text
      .toLowerCase()
      .replace(/^•\s*/, "")
      .replace(/[.!?,;:]/g, "")
      .trim();
  }

  /**
   * Generate comprehensive aggregated response
   * Combines all responses with key insights, avoiding repetition
   */
  generateAggregatedResponse() {
    if (this.responses.length === 0) {
      return {
        summary: "No responses received.",
        bullets: [],
        suggestions: [],
        providers: [],
        confidence: 0,
      };
    }

    // Generate consolidated bullets
    const bullets = this.generateLayer1Bullets();

    // Extract suggestions and recommendations
    const suggestions = this.extractSuggestions();

    // Calculate average confidence
    const avgConfidence =
      this.responses.reduce((sum, r) => sum + r.confidence, 0) /
      this.responses.length;

    // Build summary narrative
    const summary = this.buildSummaryNarrative(bullets);

    return {
      summary,
      bullets,
      suggestions,
      providers: this.metadata.providersUsed,
      responseCount: this.responses.length,
      confidence: Math.round(avgConfidence * 100),
      timestamp: Date.now(),
    };
  }

  /**
   * Build a narrative summary from bullets
   */
  buildSummaryNarrative(bullets) {
    if (bullets.length === 0)
      return "Unable to generate summary from responses.";

    const bulletTexts = bullets
      .map((b) => b.replace(/^•\s*/, "").replace(/[.!?]$/, ""))
      .slice(0, 3);

    return `Key insights: ${bulletTexts.join("; ")}${bulletTexts.length > 0 ? "." : ""}`;
  }

  /**
   * Extract actionable suggestions from all responses
   */
  extractSuggestions(maxSuggestions = 5) {
    const suggestions = [];
    const suggestionPatterns = [
      /(?:recommend|suggest|should|consider|try|attempt|implement|use)[\s:]([^.!?]+)/gi,
      /(?:best practice|tip:|key:|insight:)[\s]([^.!?]+)/gi,
      /(?:next step|action|improve)[\s:]([^.!?]+)/gi,
    ];

    this.responses.forEach((resp) => {
      suggestionPatterns.forEach((pattern) => {
        let match;
        while (
          (match = pattern.exec(resp.text)) &&
          suggestions.length < maxSuggestions
        ) {
          const text = match[1].trim();
          if (text.length > 5) {
            suggestions.push({
              text: `• ${text}`,
              provider: resp.provider,
              confidence: resp.confidence,
            });
          }
        }
      });
    });

    // Deduplicate and sort by confidence
    const unique = this.deduplicateBullets(suggestions);
    return unique
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions)
      .map((s) => s.text);
  }

  /**
   * Reset aggregator for new batch
   */
  reset() {
    this.responses = [];
    this.metadata = {
      providersUsed: [],
      timestamp: null,
      taskType: null,
      criticality: null,
    };
  }

  /**
   * Get detailed report with all metadata
   */
  getDetailedReport() {
    return {
      aggregated: this.generateAggregatedResponse(),
      responses: this.responses.map((r) => ({
        provider: r.provider,
        confidence: r.confidence,
        preview: r.text.substring(0, 100) + (r.text.length > 100 ? "..." : ""),
      })),
      metadata: this.metadata,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Format output for display (with proper formatting)
   */
  formatForDisplay(options = {}) {
    const {
      includeMetadata = true,
      bulletFormat = true,
      maxBullets = 8,
    } = options;

    const agg = this.generateAggregatedResponse();

    let output = "";

    if (bulletFormat) {
      output += "## Key Insights\n";
      agg.bullets.slice(0, maxBullets).forEach((bullet) => {
        output += `${bullet}\n`;
      });
    } else {
      output += `## Summary\n${agg.summary}\n`;
    }

    if (agg.suggestions.length > 0) {
      output += "\n## Recommendations\n";
      agg.suggestions.forEach((sugg) => {
        output += `${sugg}\n`;
      });
    }

    if (includeMetadata) {
      output += "\n---\n";
      output += `**Providers**: ${agg.providers.join(", ")}\n`;
      output += `**Confidence**: ${agg.confidence}%\n`;
      output += `**Responses Aggregated**: ${agg.responseCount}\n`;
    }

    return output;
  }
}
