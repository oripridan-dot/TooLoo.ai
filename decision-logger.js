const fs = require('fs').promises;
const path = require('path');

/**
 * Decision Logger
 * Tracks architectural decisions, their rationale, and outcomes
 * Implements the Decision Record pattern for transparent decision-making
 */
class DecisionLogger {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.logFile = path.join(this.workspaceRoot, 'DECISIONS.log');
    this.decisionsDir = path.join(this.workspaceRoot, 'decisions');
    this.decisions = [];
    
    this.initialize();
    console.log('📋 Decision Logger initialized');
  }

  async initialize() {
    try {
      await fs.mkdir(this.decisionsDir, { recursive: true});
      await this.loadDecisions();
    } catch (error) {
      console.warn('⚠️ Decision Logger: initialization warning:', error.message);
    }
  }

  async loadDecisions() {
    try {
      const content = await fs.readFile(this.logFile, 'utf8');
      const lines = content.split('\n');
      
      // Parse decisions from log
      for (const line of lines) {
        if (line.startsWith('[')) {
          try {
            const jsonMatch = line.match(/\{.*\}/);
            if (jsonMatch) {
              this.decisions.push(JSON.parse(jsonMatch[0]));
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('Could not load decisions:', error.message);
      }
    }
  }

  /**
   * Log a new architectural decision
   */
  async logDecision(decisionData) {
    const decision = {
      id: `DEC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: decisionData.title || 'Untitled Decision',
      context: decisionData.context || '',
      decision: decisionData.decision || '',
      rationale: decisionData.rationale || '',
      alternatives: decisionData.alternatives || [],
      consequences: decisionData.consequences || [],
      status: decisionData.status || 'proposed', // proposed, accepted, superseded, deprecated
      author: decisionData.author || 'TooLoo.ai',
      tags: decisionData.tags || []
    };

    this.decisions.push(decision);

    // Append to log file
    const logEntry = `[${decision.timestamp}] ${decision.id}: ${decision.title}\n${JSON.stringify(decision, null, 2)}\n\n`;
    await fs.appendFile(this.logFile, logEntry);

    // Create detailed decision record
    await this.createDecisionRecord(decision);

    console.log(`📝 Decision logged: ${decision.title}`);
    return decision;
  }

  /**
   * Create a detailed markdown decision record
   */
  async createDecisionRecord(decision) {
    const filename = `${decision.id}-${decision.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = path.join(this.decisionsDir, filename);

    const content = `# ${decision.title}

**ID**: ${decision.id}  
**Date**: ${decision.timestamp.split('T')[0]}  
**Status**: ${decision.status}  
**Author**: ${decision.author}  
**Tags**: ${decision.tags.join(', ')}

## Context

${decision.context}

## Decision

${decision.decision}

## Rationale

${decision.rationale}

${decision.alternatives.length > 0 ? `## Alternatives Considered

${decision.alternatives.map((alt, i) => `${i + 1}. **${alt.name}**
   - Pros: ${alt.pros || 'N/A'}
   - Cons: ${alt.cons || 'N/A'}
   - Why not chosen: ${alt.reason || 'N/A'}`).join('\n\n')}
` : ''}

${decision.consequences.length > 0 ? `## Consequences

${decision.consequences.map(c => `- ${c}`).join('\n')}
` : ''}

## Outcome

*To be updated after implementation*

---

## Related Decisions

*Link to related decisions here*

## References

*External resources or documentation*

---
*This is an Architectural Decision Record (ADR)*
`;

    await fs.writeFile(filepath, content);
  }

  /**
   * Update decision status or add outcomes
   */
  async updateDecision(decisionId, updates) {
    const decision = this.decisions.find(d => d.id === decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    // Update fields
    Object.assign(decision, {
      ...updates,
      lastUpdated: new Date().toISOString()
    });

    // Log the update
    const updateEntry = `[${new Date().toISOString()}] UPDATE ${decisionId}: ${JSON.stringify(updates)}\n\n`;
    await fs.appendFile(this.logFile, updateEntry);

    // Update the decision record
    await this.createDecisionRecord(decision);

    console.log(`🔄 Decision updated: ${decision.title}`);
    return decision;
  }

  /**
   * Record the outcome of a decision
   */
  async recordOutcome(decisionId, outcome) {
    const decision = this.decisions.find(d => d.id === decisionId);
    
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    decision.outcome = {
      recordedAt: new Date().toISOString(),
      result: outcome.result || 'unknown', // success, failure, mixed
      description: outcome.description || '',
      metrics: outcome.metrics || {},
      lessons: outcome.lessons || []
    };

    decision.status = 'implemented';

    await this.updateDecision(decisionId, decision);

    console.log(`✅ Outcome recorded for: ${decision.title}`);
    return decision;
  }

  /**
   * Search decisions by tag, title, or content
   */
  async searchDecisions(query) {
    const results = this.decisions.filter(d => 
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.context.toLowerCase().includes(query.toLowerCase()) ||
      d.decision.toLowerCase().includes(query.toLowerCase()) ||
      d.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return results;
  }

  /**
   * Get decisions by status
   */
  getDecisionsByStatus(status) {
    return this.decisions.filter(d => d.status === status);
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit = 10) {
    return this.decisions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get decision statistics
   */
  getStatistics() {
    const stats = {
      total: this.decisions.length,
      byStatus: {},
      byTag: {},
      withOutcomes: 0,
      successful: 0,
      failed: 0
    };

    this.decisions.forEach(d => {
      // Count by status
      stats.byStatus[d.status] = (stats.byStatus[d.status] || 0) + 1;

      // Count by tags
      d.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });

      // Count outcomes
      if (d.outcome) {
        stats.withOutcomes++;
        if (d.outcome.result === 'success') stats.successful++;
        if (d.outcome.result === 'failure') stats.failed++;
      }
    });

    return stats;
  }

  /**
   * Generate a decisions summary report
   */
  async generateReport() {
    const stats = this.getStatistics();
    const recent = this.getRecentDecisions(5);

    const report = `# Decisions Report

**Generated**: ${new Date().toISOString().split('T')[0]}  
**Total Decisions**: ${stats.total}

## Statistics

### By Status
${Object.entries(stats.byStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

### Outcomes
- Total with outcomes: ${stats.withOutcomes}
- Successful: ${stats.successful}
- Failed: ${stats.failed}
- Success rate: ${stats.withOutcomes > 0 ? ((stats.successful / stats.withOutcomes) * 100).toFixed(1) : 0}%

### Popular Tags
${Object.entries(stats.byTag)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([tag, count]) => `- ${tag}: ${count}`)
  .join('\n')}

## Recent Decisions

${recent.map(d => `### ${d.title}
- **ID**: ${d.id}
- **Date**: ${d.timestamp.split('T')[0]}
- **Status**: ${d.status}
- **Decision**: ${d.decision.substring(0, 200)}${d.decision.length > 200 ? '...' : ''}
`).join('\n')}

---

## Key Learnings

${this.extractKeyLearnings()}

---
*Auto-generated by Decision Logger*
`;

    const reportPath = path.join(this.decisionsDir, 'REPORT.md');
    await fs.writeFile(reportPath, report);

    return { report, stats, path: reportPath };
  }

  extractKeyLearnings() {
    const decisionsWithOutcomes = this.decisions.filter(d => d.outcome && d.outcome.lessons);
    
    if (decisionsWithOutcomes.length === 0) {
      return '*No lessons recorded yet. Add outcomes to decisions to build knowledge.*';
    }

    const allLessons = [];
    decisionsWithOutcomes.forEach(d => {
      if (Array.isArray(d.outcome.lessons)) {
        allLessons.push(...d.outcome.lessons);
      }
    });

    if (allLessons.length === 0) {
      return '*No specific lessons documented.*';
    }

    return allLessons.slice(0, 10).map((lesson, i) => `${i + 1}. ${lesson}`).join('\n');
  }
}

module.exports = DecisionLogger;
