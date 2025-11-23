/**
 * Auto-Context Loader - Injects PROJECT_BRAIN.md into every AI call
 * Add this to PersonalAIManager class in simple-api-server.js
 */

const fs = require('fs').promises;
const path = require('path');

class ProjectContextLoader {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.brainPath = path.join(workspaceRoot, 'PROJECT_BRAIN.md');
    this.decisionsPath = path.join(workspaceRoot, 'DECISIONS.log');
    this.antiPatternsPath = path.join(workspaceRoot, 'DONT_DO_THIS.md');
    this.patternsDir = path.join(workspaceRoot, 'patterns');
    
    // Cache for 5 minutes to avoid repeated file reads
    this.cache = null;
    this.cacheExpiry = 0;
  }

  async loadFullContext() {
    // Return cached if still valid
    const now = Date.now();
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const [brain, decisions, antiPatterns, patterns] = await Promise.all([
        this.loadBrain(),
        this.loadRecentDecisions(),
        this.loadAntiPatterns(),
        this.loadTopPatterns()
      ]);

      const context = {
        brain: brain.summary,
        recentDecisions: decisions,
        antiPatterns: antiPatterns,
        patterns: patterns,
        loadedAt: new Date().toISOString()
      };

      // Cache for 5 minutes
      this.cache = context;
      this.cacheExpiry = now + (5 * 60 * 1000);

      return context;

    } catch (error) {
      console.warn('⚠️ Context loading failed:', error.message);
      return this.getMinimalContext();
    }
  }

  async loadBrain() {
    try {
      const content = await fs.readFile(this.brainPath, 'utf8');
      
      // Extract key sections
      const identity = this.extractSection(content, '## 🎯 PROJECT IDENTITY');
      const architecture = this.extractSection(content, '## 📐 ARCHITECTURE DECISIONS');
      const preferences = this.extractSection(content, '## 🔧 YOUR CODING PREFERENCES');
      
      return {
        summary: `${identity}\n${architecture}\n${preferences}`.substring(0, 2000),
        full: content
      };
    } catch (error) {
      return { summary: 'Project Brain unavailable', full: '' };
    }
  }

  async loadRecentDecisions() {
    try {
      const content = await fs.readFile(this.decisionsPath, 'utf8');
      const lines = content.split('\n');
      
      // Get last 5 decisions
      const recentDecisions = lines
        .filter(line => line.startsWith('['))
        .slice(-5)
        .map(line => {
          const match = line.match(/\[(.*?)\] (DEC-\d+): (.*)/);
          return match ? `- ${match[3]} (${match[1]})` : line;
        })
        .join('\n');

      return recentDecisions || 'No recent decisions logged';
    } catch (error) {
      return 'Decision log unavailable';
    }
  }

  async loadAntiPatterns() {
    try {
      const content = await fs.readFile(this.antiPatternsPath, 'utf8');
      
      // Extract "Don't" headers
      const antiPatterns = content
        .split('###')
        .filter(section => section.includes("Don't:"))
        .slice(0, 5)
        .map(section => {
          const title = section.split('\n')[0].replace("Don't:", '').trim();
          return `- DON'T: ${title}`;
        })
        .join('\n');

      return antiPatterns || 'No anti-patterns documented';
    } catch (error) {
      return 'Anti-patterns list unavailable';
    }
  }

  async loadTopPatterns() {
    try {
      const files = await fs.readdir(this.patternsDir);
      const patterns = files
        .filter(f => f.endsWith('.md') && f !== 'CATALOG.md')
        .slice(0, 5)
        .map(f => `- ${f.replace('.md', '').replace(/-/g, ' ')}`);

      return patterns.length > 0 
        ? `Available patterns:\n${patterns.join('\n')}` 
        : 'No patterns in library yet';
    } catch (error) {
      return 'Pattern library unavailable';
    }
  }

  extractSection(content, sectionHeader) {
    const regex = new RegExp(`${sectionHeader}([\\s\\S]*?)(?=##|$)`);
    const match = content.match(regex);
    return match ? match[1].trim().substring(0, 800) : '';
  }

  getMinimalContext() {
    return {
      brain: 'TooLoo.ai - Personal AI Development Assistant for single-user product creation',
      recentDecisions: 'No decisions loaded',
      antiPatterns: 'No anti-patterns loaded',
      patterns: 'No patterns loaded',
      loadedAt: new Date().toISOString()
    };
  }

  formatForPrompt(context) {
    return `[AUTO-LOADED PROJECT CONTEXT]

=== PROJECT IDENTITY ===
${context.brain}

=== RECENT DECISIONS (IMPORTANT) ===
${context.recentDecisions}

=== ANTI-PATTERNS (NEVER SUGGEST THESE) ===
${context.antiPatterns}

=== PROVEN PATTERNS (USE THESE) ===
${context.patterns}

Context loaded at: ${context.loadedAt}
=====================================

`;
  }
}

module.exports = ProjectContextLoader;
