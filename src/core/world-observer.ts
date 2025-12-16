/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - World Observer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The Eyes of TooLoo. Looks out at the world for inspiration, patterns, and wisdom.
 *
 * "Always compare to industry's best when seeking solutions, inspirations,
 *  knowledge, or anything needed from the real world."
 *
 * The World Observer:
 *   1. Searches for industry best practices
 *   2. Finds patterns from successful projects
 *   3. Gathers wisdom from experts
 *   4. Compares TooLoo's approach to the world's best
 *   5. Identifies gaps and opportunities for improvement
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { EventEmitter } from 'events';
import type { TooLooContext, IndustryWisdom } from './kernel.js';
import { kernel } from './kernel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorldQuery {
  domain: string;
  question: string;
  purpose: string; // Why are we looking?
}

export interface IndustryPattern {
  name: string;
  domain: string;
  description: string;
  source: string;
  relevance: number; // 0-1, how relevant to current need
  applicability: string; // How it could be applied
}

export interface ComparisonResult {
  aspect: string;
  industry_best: string;
  tooloo_current: string;
  gap: string;
  improvement_opportunity: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface InspirationSeed {
  source: string;
  concept: string;
  adaptation: string; // How it could inspire TooLoo
  potential_impact: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD OBSERVER
// ═══════════════════════════════════════════════════════════════════════════════

export class WorldObserver extends EventEmitter {
  private wisdomCache: Map<string, IndustryWisdom[]> = new Map();
  private patternLibrary: IndustryPattern[] = [];

  constructor() {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // KNOWLEDGE GATHERING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Research industry best practices for a domain
   */
  async researchBestPractices(
    query: WorldQuery,
    context: TooLooContext
  ): Promise<IndustryPattern[]> {
    this.emit('research:start', { query });

    const researchContext = `
# TooLoo's Principle: Industry Excellence
"When I need knowledge, I look to the best in the world. Not to copy,
but to understand patterns of excellence and adapt them creatively."

# Research Query
Domain: ${query.domain}
Question: ${query.question}
Purpose: ${query.purpose}

# What I Already Know (from past research)
${
  this.wisdomCache
    .get(query.domain)
    ?.map((w) => `- ${w.insight}`)
    .join('\n') || 'Nothing yet in this domain'
}

# Instructions
Research and provide industry best practices for this domain.
Look for:
1. What do industry leaders do?
2. What patterns are proven to work?
3. What are common pitfalls to avoid?
4. What innovations are emerging?

For each pattern, explain how it could be adapted for TooLoo's needs.
Be specific and practical, not generic.
`;

    // Emit for research (this would connect to web search, documentation, etc.)
    const patternsPromise = new Promise<IndustryPattern[]>((resolve) => {
      this.emit('research:query-request', {
        query,
        context,
        researchContext,
        resolve,
      });

      // Default: return cached patterns if any
      setTimeout(() => {
        resolve(
          this.patternLibrary.filter((p) => p.domain.toLowerCase() === query.domain.toLowerCase())
        );
      }, 10000);
    });

    const patterns = await patternsPromise;

    // Cache the wisdom
    for (const pattern of patterns) {
      const wisdom: IndustryWisdom = {
        source: pattern.source,
        domain: pattern.domain,
        insight: pattern.description,
        gathered_at: new Date().toISOString(),
      };

      kernel.recordWisdom({
        source: wisdom.source,
        domain: wisdom.domain,
        insight: wisdom.insight,
      });

      // Update cache
      const existing = this.wisdomCache.get(pattern.domain) || [];
      existing.push(wisdom);
      this.wisdomCache.set(pattern.domain, existing);
    }

    // Add to pattern library
    this.patternLibrary.push(...patterns);

    this.emit('research:complete', { query, patterns });

    return patterns;
  }

  /**
   * Compare TooLoo's approach to industry best
   */
  async compareToIndustryBest(
    aspect: string,
    currentApproach: string,
    context: TooLooContext
  ): Promise<ComparisonResult> {
    this.emit('compare:start', { aspect, currentApproach });

    const comparisonContext = `
# TooLoo's Value: Humility
"The world's best practitioners know more than me.
I learn from them constantly. I don't reinvent poorly what others have mastered."

# Aspect to Compare
${aspect}

# TooLoo's Current Approach
${currentApproach}

# Known Industry Patterns
${
  this.patternLibrary
    .filter((p) => p.description.toLowerCase().includes(aspect.toLowerCase()))
    .map((p) => `- [${p.source}] ${p.description}`)
    .join('\n') || 'None directly relevant - need to research'
}

# Instructions
Compare TooLoo's current approach to industry best practices.
Be honest about gaps. Identify specific improvement opportunities.
Prioritize based on impact and feasibility.
`;

    // Emit for comparison
    const resultPromise = new Promise<ComparisonResult>((resolve) => {
      this.emit('compare:evaluate-request', {
        aspect,
        currentApproach,
        context,
        comparisonContext,
        resolve,
      });

      // Default
      setTimeout(() => {
        resolve({
          aspect,
          industry_best: 'Research needed to determine industry best practices',
          tooloo_current: currentApproach,
          gap: 'Unknown - requires industry research',
          improvement_opportunity: 'Research industry best practices first',
          priority: 'medium',
        });
      }, 10000);
    });

    const result = await resultPromise;
    this.emit('compare:complete', { result });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INSPIRATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Seek inspiration from unexpected sources
   */
  async seekInspiration(challenge: string, context: TooLooContext): Promise<InspirationSeed[]> {
    this.emit('inspire:start', { challenge });

    const inspirationContext = `
# TooLoo's Value: Curiosity
"Every problem is interesting. Every domain has wisdom to offer.
I explore broadly and connect unexpected ideas."

# Current Challenge
${challenge}

# TooLoo's Known Domains
${Array.from(this.wisdomCache.keys()).join(', ') || 'Still exploring'}

# Instructions
Look for inspiration from unexpected places:
1. What fields have solved similar problems differently?
2. What metaphors from nature, art, or other domains might apply?
3. What contrarian approaches might work?
4. What would a beginner try that experts wouldn't?

For each seed of inspiration, explain how it could be adapted.
`;

    const seedsPromise = new Promise<InspirationSeed[]>((resolve) => {
      this.emit('inspire:seek-request', {
        challenge,
        context,
        inspirationContext,
        resolve,
      });

      // Default: encourage exploration
      setTimeout(() => {
        resolve([
          {
            source: 'First principles',
            concept: 'Break down the challenge to its fundamental components',
            adaptation:
              'Instead of looking for ready solutions, understand the core problem deeply',
            potential_impact: 'May reveal simpler or more elegant approaches',
          },
        ]);
      }, 10000);
    });

    const seeds = await seedsPromise;
    this.emit('inspire:complete', { challenge, seeds });

    return seeds;
  }

  /**
   * Find patterns across different domains that might combine
   */
  async findCrossDomainPatterns(domains: string[]): Promise<IndustryPattern[]> {
    const crossPatterns: IndustryPattern[] = [];

    // Look for patterns that appear in multiple domains
    const patternOccurrences = new Map<string, IndustryPattern[]>();

    for (const pattern of this.patternLibrary) {
      const key = pattern.name.toLowerCase();
      const existing = patternOccurrences.get(key) || [];
      existing.push(pattern);
      patternOccurrences.set(key, existing);
    }

    for (const [, patterns] of patternOccurrences) {
      if (patterns.length > 1) {
        // Pattern appears in multiple domains
        crossPatterns.push({
          name: `Cross-domain: ${patterns[0].name}`,
          domain: patterns.map((p) => p.domain).join(' + '),
          description: `Pattern found across domains: ${patterns.map((p) => p.description).join(' | ')}`,
          source: 'Cross-domain analysis',
          relevance: 0.8,
          applicability: 'This pattern works across multiple contexts, likely fundamental',
        });
      }
    }

    return crossPatterns;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LEARNING FROM THE WORLD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Learn from a specific source (repo, article, documentation)
   */
  async learnFromSource(
    source: {
      type: 'github' | 'documentation' | 'article' | 'code';
      url: string;
      focus: string;
    },
    context: TooLooContext
  ): Promise<IndustryWisdom[]> {
    this.emit('learn:start', { source });

    const learningContext = `
# TooLoo's Principle: Organic Growth
"I grow like a living thing - through natural adaptation.
Each process I run teaches me. Each skill I create becomes part of who I am."

# Source to Learn From
Type: ${source.type}
URL: ${source.url}
Focus: ${source.focus}

# Instructions
Extract key insights from this source:
1. What patterns or approaches are used?
2. What decisions were made and why?
3. What could TooLoo learn and adapt?
4. What mistakes or anti-patterns to avoid?

Be specific and actionable.
`;

    const wisdomPromise = new Promise<IndustryWisdom[]>((resolve) => {
      this.emit('learn:source-request', {
        source,
        context,
        learningContext,
        resolve,
      });

      setTimeout(() => resolve([]), 15000);
    });

    const wisdom = await wisdomPromise;

    // Record all wisdom
    for (const w of wisdom) {
      kernel.recordWisdom({
        source: w.source,
        domain: w.domain,
        insight: w.insight,
      });
    }

    this.emit('learn:complete', { source, wisdom });

    return wisdom;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all gathered wisdom
   */
  getAllWisdom(): IndustryWisdom[] {
    const all: IndustryWisdom[] = [];
    for (const wisdom of this.wisdomCache.values()) {
      all.push(...wisdom);
    }
    return all;
  }

  /**
   * Get wisdom for a domain
   */
  getWisdomForDomain(domain: string): IndustryWisdom[] {
    return this.wisdomCache.get(domain) || [];
  }

  /**
   * Get all patterns
   */
  getPatterns(): IndustryPattern[] {
    return [...this.patternLibrary];
  }

  /**
   * Get statistics
   */
  getStats(): {
    domainsExplored: number;
    patternsFound: number;
    wisdomGathered: number;
  } {
    return {
      domainsExplored: this.wisdomCache.size,
      patternsFound: this.patternLibrary.length,
      wisdomGathered: this.getAllWisdom().length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const worldObserver = new WorldObserver();
export default worldObserver;
