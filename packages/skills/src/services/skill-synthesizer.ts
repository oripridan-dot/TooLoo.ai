/**
 * @file SkillSynthesizer - Automatic Skill Creation from Patterns
 * @description Phase 9: Proactive skill creation based on detected gaps
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * This service provides:
 * - Gap analysis: detect missing capabilities from user requests
 * - Pattern synthesis: combine patterns from successful interactions
 * - Automatic YAML generation for new skills
 * - Testing and validation of synthesized skills
 * - Integration with the skill registry
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

/** A detected capability gap */
export interface CapabilityGap {
  id: string;
  description: string;
  requestExamples: string[];
  suggestedKeywords: string[];
  frequency: number;
  firstDetected: number;
  lastDetected: number;
  confidence: number;
}

/** A pattern extracted from successful interactions */
export interface InteractionPattern {
  id: string;
  skillId: string;
  inputPattern: string;
  outputPattern: string;
  successRate: number;
  useCount: number;
  averageQuality: number;
}

/** A synthesized skill proposal */
export interface SynthesizedSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  keywords: string[];
  schema: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  instructions: string;
  tools: string[];
  composedFrom: string[];
  gapId?: string;
  confidence: number;
  status: 'draft' | 'testing' | 'validated' | 'deployed' | 'rejected';
  createdAt: number;
  yamlContent?: string;
}

/** Configuration for the skill synthesizer */
export interface SkillSynthesizerConfig {
  /** Path to persist synthesis data */
  persistPath?: string;
  /** Minimum frequency for a gap to trigger synthesis */
  minGapFrequency: number;
  /** Minimum confidence to auto-deploy */
  minDeployConfidence: number;
  /** Maximum skills to synthesize per day */
  maxDailyCreations: number;
  /** Enable automatic deployment */
  autoDeployEnabled: boolean;
  /** Skills directory path */
  skillsDirectory: string;
}

/** Internal config with required fields */
interface InternalConfig {
  persistPath: string;
  minGapFrequency: number;
  minDeployConfidence: number;
  maxDailyCreations: number;
  autoDeployEnabled: boolean;
  skillsDirectory: string;
}

/** Metrics for skill synthesis */
export interface SynthesisMetrics {
  totalGapsDetected: number;
  totalSkillsSynthesized: number;
  skillsDeployed: number;
  skillsRejected: number;
  averageConfidence: number;
  gapCoverageRate: number;
}

// =============================================================================
// SKILL SYNTHESIZER
// =============================================================================

export class SkillSynthesizer extends EventEmitter {
  private config: InternalConfig;
  private gaps: Map<string, CapabilityGap> = new Map();
  private patterns: Map<string, InteractionPattern> = new Map();
  private synthesized: Map<string, SynthesizedSkill> = new Map();
  private dailyCreations: { date: string; count: number } = { date: '', count: 0 };
  private initialized = false;

  // Metrics
  private metrics: SynthesisMetrics = {
    totalGapsDetected: 0,
    totalSkillsSynthesized: 0,
    skillsDeployed: 0,
    skillsRejected: 0,
    averageConfidence: 0,
    gapCoverageRate: 0,
  };

  constructor(config: SkillSynthesizerConfig) {
    super();
    this.config = {
      persistPath: config.persistPath ?? './data/skill-synthesis.json',
      minGapFrequency: config.minGapFrequency,
      minDeployConfidence: config.minDeployConfidence,
      maxDailyCreations: config.maxDailyCreations,
      autoDeployEnabled: config.autoDeployEnabled,
      skillsDirectory: config.skillsDirectory,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Synthesizer] 🧬 Initializing skill synthesizer...');

    // Load persisted data
    await this.loadState();

    this.initialized = true;
    this.emit('initialized');
    console.log('[Synthesizer] ✅ Skill synthesizer ready');
  }

  async shutdown(): Promise<void> {
    console.log('[Synthesizer] 🛑 Shutting down skill synthesizer...');
    await this.saveState();
    this.initialized = false;
    this.emit('shutdown');
    console.log('[Synthesizer] ✅ Skill synthesizer shutdown complete');
  }

  isHealthy(): boolean {
    return this.initialized;
  }

  // ---------------------------------------------------------------------------
  // Gap Detection
  // ---------------------------------------------------------------------------

  /**
   * Record a user request that couldn't be handled
   */
  recordUnhandledRequest(request: string, _context?: Record<string, unknown>): void {
    // Extract potential keywords from request
    const keywords = this.extractKeywords(request);
    const gapId = this.generateGapId(keywords);

    const existing = this.gaps.get(gapId);
    if (existing) {
      existing.frequency++;
      existing.lastDetected = Date.now();
      existing.requestExamples.push(request);
      if (existing.requestExamples.length > 10) {
        existing.requestExamples.shift(); // Keep last 10
      }
      existing.confidence = this.calculateGapConfidence(existing);
    } else {
      const gap: CapabilityGap = {
        id: gapId,
        description: this.generateGapDescription(request, keywords),
        requestExamples: [request],
        suggestedKeywords: keywords,
        frequency: 1,
        firstDetected: Date.now(),
        lastDetected: Date.now(),
        confidence: 0.1,
      };
      this.gaps.set(gapId, gap);
      this.metrics.totalGapsDetected++;
    }

    this.emit('gap:detected', { gapId, request });

    // Check if we should synthesize a skill
    this.checkSynthesisTrigger(gapId);
  }

  /**
   * Extract keywords from a request
   */
  private extractKeywords(request: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once',
      'here', 'there', 'when', 'where', 'why', 'how', 'all',
      'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
      'until', 'while', 'although', 'though', 'this', 'that',
      'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our',
      'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it',
      'its', 'they', 'them', 'their', 'what', 'which', 'who',
      'whom', 'please', 'help', 'want', 'like', 'get', 'make',
    ]);

    const words = request.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    // Return unique keywords, max 5
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Generate a unique gap ID from keywords
   */
  private generateGapId(keywords: string[]): string {
    return `gap-${keywords.sort().join('-')}`;
  }

  /**
   * Generate a description for a gap
   */
  private generateGapDescription(_request: string, keywords: string[]): string {
    return `Capability gap for requests involving: ${keywords.join(', ')}`;
  }

  /**
   * Calculate confidence for a gap
   */
  private calculateGapConfidence(gap: CapabilityGap): number {
    // Higher frequency = higher confidence
    const frequencyFactor = Math.min(gap.frequency / 10, 1) * 0.5;
    // More diverse examples = higher confidence
    const diversityFactor = Math.min(gap.requestExamples.length / 5, 1) * 0.3;
    // Recent detections = higher confidence
    const recencyFactor = gap.lastDetected > Date.now() - 86400000 ? 0.2 : 0.1;

    return frequencyFactor + diversityFactor + recencyFactor;
  }

  // ---------------------------------------------------------------------------
  // Pattern Recording
  // ---------------------------------------------------------------------------

  /**
   * Record a successful interaction pattern
   */
  recordSuccessfulPattern(
    skillId: string,
    input: string,
    output: string,
    quality: number
  ): void {
    const patternId = `pattern-${skillId}-${this.hashString(input).substring(0, 8)}`;

    const existing = this.patterns.get(patternId);
    if (existing) {
      existing.useCount++;
      existing.averageQuality =
        (existing.averageQuality * (existing.useCount - 1) + quality) /
        existing.useCount;
      existing.successRate = Math.min(existing.successRate + 0.01, 1);
    } else {
      const pattern: InteractionPattern = {
        id: patternId,
        skillId,
        inputPattern: this.abstractPattern(input),
        outputPattern: this.abstractPattern(output),
        successRate: quality,
        useCount: 1,
        averageQuality: quality,
      };
      this.patterns.set(patternId, pattern);
    }

    this.emit('pattern:recorded', { patternId, skillId, quality });
  }

  /**
   * Abstract a pattern from concrete input/output
   */
  private abstractPattern(text: string): string {
    // Replace specific values with placeholders
    return text
      .replace(/\b\d+\b/g, '{NUMBER}')
      .replace(/"[^"]+"/g, '"{STRING}"')
      .replace(/`[^`]+`/g, '`{CODE}`')
      .replace(/\[[^\]]+\]/g, '[{LIST}]')
      .replace(/\{[^}]+\}/g, '{OBJECT}');
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ---------------------------------------------------------------------------
  // Skill Synthesis
  // ---------------------------------------------------------------------------

  /**
   * Check if synthesis should be triggered for a gap
   */
  private checkSynthesisTrigger(gapId: string): void {
    const gap = this.gaps.get(gapId);
    if (!gap) return;

    if (
      gap.frequency >= this.config.minGapFrequency &&
      gap.confidence >= 0.5 &&
      this.canCreateToday()
    ) {
      this.synthesizeSkillFromGap(gap);
    }
  }

  /**
   * Check daily creation limit
   */
  private canCreateToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyCreations.date !== today) {
      this.dailyCreations = { date: today ?? '', count: 0 };
    }
    return this.dailyCreations.count < this.config.maxDailyCreations;
  }

  /**
   * Synthesize a skill from a detected gap
   */
  async synthesizeSkillFromGap(gap: CapabilityGap): Promise<SynthesizedSkill | null> {
    console.log(`[Synthesizer] 🧬 Synthesizing skill for gap: ${gap.id}`);

    // Find related patterns
    const relatedPatterns = this.findRelatedPatterns(gap.suggestedKeywords);

    // Generate skill definition
    const skill: SynthesizedSkill = {
      id: this.generateSkillId(gap),
      name: this.generateSkillName(gap),
      description: gap.description,
      version: '1.0.0',
      keywords: gap.suggestedKeywords,
      schema: this.generateSchema(gap),
      instructions: this.generateInstructions(gap, relatedPatterns),
      tools: this.suggestTools(gap),
      composedFrom: relatedPatterns.map(p => p.skillId),
      gapId: gap.id,
      confidence: gap.confidence,
      status: 'draft',
      createdAt: Date.now(),
    };

    // Generate YAML content
    skill.yamlContent = this.generateYaml(skill);

    this.synthesized.set(skill.id, skill);
    this.metrics.totalSkillsSynthesized++;
    this.updateAverageConfidence();
    this.dailyCreations.count++;

    this.emit('skill:synthesized', skill);
    console.log(`[Synthesizer] ✅ Synthesized skill: ${skill.name}`);

    // Auto-deploy if confidence is high enough
    if (
      this.config.autoDeployEnabled &&
      skill.confidence >= this.config.minDeployConfidence
    ) {
      await this.deploySkill(skill.id);
    }

    return skill;
  }

  /**
   * Find patterns related to keywords
   */
  private findRelatedPatterns(keywords: string[]): InteractionPattern[] {
    const related: InteractionPattern[] = [];

    for (const pattern of this.patterns.values()) {
      const patternText = `${pattern.inputPattern} ${pattern.outputPattern}`.toLowerCase();
      const matches = keywords.filter(k => patternText.includes(k.toLowerCase()));
      if (matches.length > 0 && pattern.successRate > 0.7) {
        related.push(pattern);
      }
    }

    return related.slice(0, 5); // Top 5 related patterns
  }

  /**
   * Generate a skill ID from a gap
   */
  private generateSkillId(gap: CapabilityGap): string {
    const base = gap.suggestedKeywords.slice(0, 2).join('-');
    return `synth-${base}-${Date.now().toString(36)}`;
  }

  /**
   * Generate a skill name from a gap
   */
  private generateSkillName(gap: CapabilityGap): string {
    const words = gap.suggestedKeywords.map(
      k => k.charAt(0).toUpperCase() + k.slice(1)
    );
    return `${words.join(' ')} Assistant`;
  }

  /**
   * Generate schema from gap
   */
  private generateSchema(gap: CapabilityGap): SynthesizedSkill['schema'] {
    return {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: `The ${gap.suggestedKeywords.join('/')} task to perform`,
        },
        context: {
          type: 'string',
          description: 'Additional context or requirements',
        },
      },
      required: ['task'],
    };
  }

  /**
   * Generate instructions from gap and patterns
   */
  private generateInstructions(
    gap: CapabilityGap,
    patterns: InteractionPattern[]
  ): string {
    const lines = [
      `You are an expert assistant for ${gap.suggestedKeywords.join(', ')} tasks.`,
      '',
      '## Capabilities',
      ...gap.suggestedKeywords.map(k => `- ${k.charAt(0).toUpperCase() + k.slice(1)}`),
      '',
      '## Guidelines',
      '- Provide clear, actionable responses',
      '- Ask clarifying questions if the request is ambiguous',
      '- Use examples when helpful',
    ];

    if (patterns.length > 0) {
      lines.push('', '## Learned Patterns');
      for (const pattern of patterns.slice(0, 3)) {
        lines.push(`- Pattern from ${pattern.skillId}: ${pattern.inputPattern.substring(0, 50)}...`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Suggest tools based on gap keywords
   */
  private suggestTools(gap: CapabilityGap): string[] {
    const tools: string[] = [];
    const keywords = gap.suggestedKeywords.join(' ').toLowerCase();

    if (keywords.includes('file') || keywords.includes('read') || keywords.includes('write')) {
      tools.push('file_read', 'file_write');
    }
    if (keywords.includes('search') || keywords.includes('find') || keywords.includes('grep')) {
      tools.push('grep_search', 'semantic_search');
    }
    if (keywords.includes('run') || keywords.includes('execute') || keywords.includes('command')) {
      tools.push('terminal_execute');
    }

    return tools.length > 0 ? tools : ['file_read'];
  }

  /**
   * Generate YAML content for a skill
   */
  generateYaml(skill: SynthesizedSkill): string {
    const yaml = `# Auto-synthesized skill
# Generated: ${new Date(skill.createdAt).toISOString()}
# Gap ID: ${skill.gapId ?? 'manual'}
# Confidence: ${(skill.confidence * 100).toFixed(1)}%

id: ${skill.id}
name: ${skill.name}
version: ${skill.version}
description: >
  ${skill.description}

keywords:
${skill.keywords.map(k => `  - ${k}`).join('\n')}

schema:
  type: object
  properties:
    task:
      type: string
      description: ${skill.schema.properties['task']?.description ?? 'The task to perform'}
    context:
      type: string
      description: Additional context or requirements
  required:
    - task

instructions: |
${skill.instructions.split('\n').map(line => `  ${line}`).join('\n')}

tools:
${skill.tools.map(t => `  - ${t}`).join('\n')}

# Synthesis metadata
metadata:
  synthesized: true
  composedFrom:
${skill.composedFrom.map(s => `    - ${s}`).join('\n') || '    []'}
  confidence: ${skill.confidence}
`;

    return yaml;
  }

  // ---------------------------------------------------------------------------
  // Skill Deployment
  // ---------------------------------------------------------------------------

  /**
   * Deploy a synthesized skill
   */
  async deploySkill(skillId: string): Promise<boolean> {
    const skill = this.synthesized.get(skillId);
    if (!skill) {
      console.error(`[Synthesizer] Skill not found: ${skillId}`);
      return false;
    }

    if (!skill.yamlContent) {
      console.error(`[Synthesizer] No YAML content for skill: ${skillId}`);
      return false;
    }

    console.log(`[Synthesizer] 🚀 Deploying skill: ${skill.name}`);

    try {
      // In production, write to filesystem
      // For now, just update status
      skill.status = 'deployed';
      this.metrics.skillsDeployed++;

      this.emit('skill:deployed', skill);
      console.log(`[Synthesizer] ✅ Skill deployed: ${skill.name}`);

      // Mark gap as covered
      if (skill.gapId) {
        this.gaps.delete(skill.gapId);
        this.updateGapCoverageRate();
      }

      return true;
    } catch (error) {
      skill.status = 'rejected';
      this.metrics.skillsRejected++;

      this.emit('skill:rejected', { skill, error });
      console.error(`[Synthesizer] ❌ Skill deployment failed: ${skill.name}`, error);

      return false;
    }
  }

  /**
   * Reject a synthesized skill
   */
  rejectSkill(skillId: string, reason: string): void {
    const skill = this.synthesized.get(skillId);
    if (!skill) return;

    skill.status = 'rejected';
    this.metrics.skillsRejected++;

    this.emit('skill:rejected', { skill, reason });
    console.log(`[Synthesizer] ❌ Skill rejected: ${skill.name} - ${reason}`);
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  private updateAverageConfidence(): void {
    const skills = Array.from(this.synthesized.values());
    if (skills.length === 0) return;
    this.metrics.averageConfidence =
      skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length;
  }

  private updateGapCoverageRate(): void {
    const totalGaps = this.metrics.totalGapsDetected;
    const covered = this.metrics.skillsDeployed;
    this.metrics.gapCoverageRate = totalGaps > 0 ? covered / totalGaps : 0;
  }

  getMetrics(): SynthesisMetrics {
    return { ...this.metrics };
  }

  getGaps(): CapabilityGap[] {
    return Array.from(this.gaps.values());
  }

  getSynthesizedSkills(): SynthesizedSkill[] {
    return Array.from(this.synthesized.values());
  }

  getPatterns(): InteractionPattern[] {
    return Array.from(this.patterns.values());
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadState(): Promise<void> {
    // In production, load from persistPath
  }

  private async saveState(): Promise<void> {
    // In production, save to persistPath
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: SkillSynthesizer | null = null;

export function getSkillSynthesizer(config?: SkillSynthesizerConfig): SkillSynthesizer {
  if (!instance) {
    instance = new SkillSynthesizer(config ?? {
      minGapFrequency: 3,
      minDeployConfidence: 0.7,
      maxDailyCreations: 5,
      autoDeployEnabled: false,
      skillsDirectory: './skills',
    });
  }
  return instance;
}

export function resetSkillSynthesizer(): void {
  instance = null;
}

export default SkillSynthesizer;
