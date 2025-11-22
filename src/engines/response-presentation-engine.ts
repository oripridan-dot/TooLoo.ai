/**
 * Response Presentation Engine
 * 
 * Transforms raw multi-provider responses into concise TooLoo.ai response format:
 * - Consensus Level (%)
 * - Conflict Highlights
 * - Action Bullet Points
 * - Advisory Window (next moves)
 */

import LLMProvider from '../engine/llm-provider.js';

class ResponsePresentationEngine {
  constructor(config = {}) {
    this.config = {
      minConsensusThreshold: config.minConsensusThreshold || 60,
      maxActionItems: config.maxActionItems || 5,
      maxConflicts: config.maxConflicts || 3,
      summaryLength: config.summaryLength || 150,
      ...config
    };
    this.llmProvider = new LLMProvider();
  }

  /**
   * Main presentation method
   * Input: { query, providerResponses: { provider: response_text } }
   * Output: Formatted TooLoo response with all components
   */
  async presentResponse(data) {
    const { query, providerResponses = {}, userContext = {} } = data;
    
    if (!query || Object.keys(providerResponses).length === 0) {
      throw new Error('Query and provider responses required');
    }

    // Step 1: Extract consensus points
    const consensus = await this.extractConsensus(query, providerResponses);

    // Step 2: Identify conflicts
    const conflicts = await this.identifyConflicts(query, providerResponses);

    // Step 3: Generate action items
    const actions = await this.generateActions(query, providerResponses, consensus);

    // Step 4: Create advisory window
    const advisory = await this.createAdvisory(query, consensus, conflicts, actions, userContext);

    // Step 5: Calculate consensus percentage
    const consensusLevel = this.calculateConsensusLevel(consensus);

    // Step 6: Format final response
    return this.formatTooLooResponse({
      query,
      consensusLevel,
      consensus,
      conflicts,
      actions,
      advisory,
      providerCount: Object.keys(providerResponses).length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Extract consensus points from multiple responses
   */
  async extractConsensus(query, providerResponses) {
    const prompt = `You are analyzing responses from multiple AI providers to this query: "${query}"

Provider responses:
${Object.entries(providerResponses)
    .map(([provider, response]) => `**${provider}:** ${response}`)
    .join('\n\n')}

Extract 3-5 key consensus points that appear across multiple responses.
Format as JSON array of objects with:
- point: (the consensus point)
- supportedBy: (list of providers agreeing)
- strength: (low/medium/high based on how many providers agree)
- keywordFrequency: (how often this appears as a percentage)

Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.llmProvider.generate({
        prompt,
        taskType: 'analysis',
        criticality: 'normal'
      });

      let text = result.content || '[]';
      // Strip markdown code blocks if present
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      return JSON.parse(text);
    } catch (err) {
      console.error('Consensus extraction error:', err.message);
      return [];
    }
  }

  /**
   * Identify conflicts and diverging viewpoints
   */
  async identifyConflicts(query, providerResponses) {
    const prompt = `You are identifying conflicts and disagreements in responses about: "${query}"

Provider responses:
${Object.entries(providerResponses)
    .map(([provider, response]) => `**${provider}:** ${response}`)
    .join('\n\n')}

Find 1-3 significant disagreements or conflicting perspectives.
Format as JSON array of objects with:
- conflict: (description of the disagreement)
- providers: (list of providers with conflicting views)
- perspectives: (array of the conflicting viewpoints)
- resolution: (brief suggestion for reconciling this)
- severity: (low/medium/high based on impact)

Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.llmProvider.generate({
        prompt,
        taskType: 'analysis',
        criticality: 'normal'
      });

      let text = result.content || '[]';
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      return JSON.parse(text);
    } catch (err) {
      console.error('Conflict identification error:', err.message);
      return [];
    }
  }

  /**
   * Generate actionable items from consensus and responses
   */
  async generateActions(query, providerResponses, consensus) {
    const consensusText = consensus.map(c => c.point).join('; ');
    
    const prompt = `Based on this query: "${query}"

And these consensus points: ${consensusText}

Generate 3-5 specific, actionable next steps derived from the providers' responses.
Each action should be:
- Concrete and implementable
- Prioritized by importance
- Include estimated effort (quick/moderate/complex)

Format as JSON array of objects with:
- action: (the actionable item)
- priority: (1-5, where 1 is highest)
- effort: (quick/moderate/complex)
- rationale: (why this action matters)
- owner: (who should do this - user/team/system)

Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.llmProvider.generate({
        prompt,
        taskType: 'planning',
        criticality: 'normal'
      });

      let text = result.content || '[]';
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      let actions = JSON.parse(text);
      return actions.slice(0, this.config.maxActionItems);
    } catch (err) {
      console.error('Action generation error:', err.message);
      return [];
    }
  }

  /**
   * Create advisory window with next moves
   */
  async createAdvisory(query, consensus, conflicts, actions, userContext = {}) {
    const contextText = userContext.role ? `User role: ${userContext.role}` : '';
    const conflictSummary = conflicts.length > 0 
      ? conflicts.map(c => `- ${c.conflict}`).join('\n')
      : 'No significant conflicts identified';

    const prompt = `Based on this analysis:

Query: "${query}"
Consensus Points: ${consensus.map(c => c.point).join('; ')}
Conflicts: ${conflictSummary}
Recommended Actions: ${actions.map(a => a.action).join('; ')}
${contextText}

Create a brief advisory window that includes:
1. Key insight (1 sentence, most important takeaway)
2. Risk flag (if any high-severity conflicts or gaps)
3. Next move recommendations (2-3 suggested next steps)
4. Timeline hint (when to revisit this)

Format as JSON with keys: insight, riskFlag, nextMoves (array), timelineHint
Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.llmProvider.generate({
        prompt,
        taskType: 'analysis',
        criticality: 'normal'
      });

      let text = result.content || '{}';
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      return JSON.parse(text);
    } catch (err) {
      console.error('Advisory generation error:', err.message);
      return {
        insight: 'Analysis complete',
        riskFlag: null,
        nextMoves: ['Review recommendations above', 'Take priority action items in order'],
        timelineHint: 'Review in 1 week'
      };
    }
  }

  /**
   * Calculate consensus percentage
   */
  calculateConsensusLevel(consensus) {
    if (consensus.length === 0) return 0;

    // Average the strength of all consensus points
    const strengths = {
      'high': 100,
      'medium': 66,
      'low': 33
    };

    const total = consensus.reduce((sum, c) => {
      return sum + (strengths[c.strength] || 50);
    }, 0);

    return Math.round(total / consensus.length);
  }

  /**
   * Format the final TooLoo.ai response
   */
  formatTooLooResponse(data) {
    const {
      query,
      consensusLevel,
      consensus,
      conflicts,
      actions,
      advisory,
      providerCount,
      timestamp
    } = data;

    const conflictsList = conflicts
      .slice(0, this.config.maxConflicts)
      .map(c => `⚠️ **${c.conflict}** (${c.severity}): ${c.resolution}`)
      .join('\n');

    const actionsList = actions
      .sort((a, b) => a.priority - b.priority)
      .map(a => `${a.priority}. **${a.action}** _(${a.effort})_ — ${a.rationale}`)
      .join('\n');

    const consensusList = consensus
      .map(c => `✓ **${c.point}** — supported by ${c.supportedBy.join(', ')}`)
      .join('\n');

    const riskBadge = advisory.riskFlag ? `🚩 **RISK**: ${advisory.riskFlag}\n\n` : '';

    return {
      // Structured response data
      metadata: {
        query,
        providers: providerCount,
        timestamp,
        consensusLevel
      },
      
      // Formatted markdown for display
      markdown: `## 🎯 TooLoo Analysis

### 📊 Consensus Level: ${consensusLevel}%
${this.getConsensusBar(consensusLevel)}

### 🤝 Consensus Points
${consensusList || '_(No strong consensus identified)_'}

${conflictsList ? `### ⚡ Conflicts & Divergences\n${conflictsList}\n` : ''}

### ✅ Action Items
${actionsList || '_(No specific actions recommended)_'}

${riskBadge}### 🔮 Advisory Window
**Key Insight:** ${advisory.insight}

**Next Moves:**
${advisory.nextMoves.map(m => `• ${m}`).join('\n')}

**Timeline:** ${advisory.timelineHint}`,

      // Machine-readable components
      components: {
        consensus,
        conflicts: conflicts.slice(0, this.config.maxConflicts),
        actions: actions.slice(0, this.config.maxActionItems),
        advisory
      }
    };
  }

  /**
   * Helper: Visual consensus bar
   */
  getConsensusBar(level) {
    const filled = Math.round(level / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    let label;
    if (level >= 80) label = '🟢 Strong';
    else if (level >= 60) label = '🟡 Moderate';
    else if (level >= 40) label = '🟠 Weak';
    else label = '🔴 Low';

    return `\`${bar}\` ${label}`;
  }

  /**
   * Batch process multiple queries
   */
  async presentResponses(dataArray) {
    return Promise.all(dataArray.map(data => this.presentResponse(data)));
  }
}

export default ResponsePresentationEngine;
