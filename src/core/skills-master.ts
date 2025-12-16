/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Skills Master
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The Hands of TooLoo. Knows what skills exist, evaluates what's needed,
 * finds creative ways to use existing skills, and creates new ones when necessary.
 *
 * "Creates its own light to find its way in the dark"
 *
 * For each step in a process:
 *   1. What skills does this step need?
 *   2. What skills do I have?
 *   3. Can I compose existing skills to meet the need?
 *   4. If not, can I create a new skill?
 *   5. Execute with the best available approach
 *
 * Skills are not just code - they're accumulated wisdom about how to do things.
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { TooLooContext, ProcessStep, CreatedSkill } from './kernel.js';
import { kernel } from './kernel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SKILLS_DIR = join(ROOT, 'skills');
const CREATED_SKILLS_DIR = join(ROOT, 'soul', 'created-skills');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;

  // What this skill can do
  capabilities: string[];

  // What this skill needs to work
  requirements: string[];

  // How to use this skill (instructions for LLM)
  instructions: string;

  // Tools this skill can use
  tools: string[];

  // Keywords for matching
  keywords: string[];

  // Origin
  origin: 'built-in' | 'created' | 'evolved';
  created_from?: string; // What process/need led to its creation

  // Performance tracking
  times_used: number;
  success_rate: number;
  last_used?: string;
}

export interface SkillMatch {
  skill: Skill;
  relevance: number; // 0-1, how relevant to the need
  confidence: number; // 0-1, how confident we can execute
  gaps: string[]; // What's missing
  adaptations: string[]; // How we'd adapt it
}

export interface SkillComposition {
  skills: Skill[];
  strategy: string; // How to combine them
  confidence: number;
  gaps: string[]; // What we still can't cover
}

export interface SkillCreationRequest {
  need: string;
  context: string;
  similar_skills: Skill[];
  industry_patterns: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKILLS MASTER
// ═══════════════════════════════════════════════════════════════════════════════

export class SkillsMaster extends EventEmitter {
  private skills: Map<string, Skill> = new Map();
  private loaded = false;

  constructor() {
    super();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load all available skills
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;

    console.log('[SkillsMaster] Loading skills...');

    // Load built-in skills
    const builtInCount = this.loadSkillsFromDirectory(SKILLS_DIR, 'built-in');
    console.log(`[SkillsMaster] Loaded ${builtInCount} built-in skills`);

    // Load self-created skills
    if (existsSync(CREATED_SKILLS_DIR)) {
      const createdCount = this.loadSkillsFromDirectory(CREATED_SKILLS_DIR, 'created');
      console.log(`[SkillsMaster] Loaded ${createdCount} self-created skills`);
    }

    this.loaded = true;
    console.log(`[SkillsMaster] ✅ Ready with ${this.skills.size} total skills`);
  }

  /**
   * Load skills from a directory
   */
  private loadSkillsFromDirectory(dir: string, origin: Skill['origin']): number {
    if (!existsSync(dir)) return 0;

    let count = 0;
    const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), 'utf-8');
        const data = parseYaml(content);

        const skill: Skill = {
          id: data.id || file.replace(/\.ya?ml$/, ''),
          name: data.name || data.id,
          description: data.description || '',
          version: data.version || '1.0.0',
          capabilities: data.capabilities || data.keywords || [],
          requirements: data.requirements || [],
          instructions: data.instructions || '',
          tools: data.tools || [],
          keywords: data.keywords || [],
          origin,
          created_from: data.created_from,
          times_used: data.times_used || 0,
          success_rate: data.success_rate || 1.0,
          last_used: data.last_used,
        };

        this.skills.set(skill.id, skill);
        count++;
      } catch (error) {
        console.warn(`[SkillsMaster] Failed to load ${file}:`, error);
      }
    }

    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL EVALUATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate what skills are needed for a step
   */
  async evaluateNeeds(step: ProcessStep, context: TooLooContext): Promise<string[]> {
    this.emit('evaluate:start', { step });

    // Build context for evaluation
    const evaluationContext = `
# Step to Execute
${step.description}

# Skills Required (as listed)
${step.skills_needed.join(', ')}

# Validation Criteria
${step.validation_criteria}

# Available Skills
${Array.from(this.skills.values())
  .map((s) => `- ${s.id}: ${s.description} (${s.capabilities.slice(0, 3).join(', ')})`)
  .join('\n')}

# Instructions
What specific capabilities does this step need?
Be precise - list atomic capabilities like "read files", "write TypeScript", "search web".
`;

    // Emit for LLM evaluation
    const needsPromise = new Promise<string[]>((resolve) => {
      this.emit('evaluate:needs-request', {
        step,
        context,
        evaluationContext,
        resolve,
      });

      // Default: use what the step says
      setTimeout(() => resolve(step.skills_needed), 5000);
    });

    const needs = await needsPromise;
    this.emit('evaluate:complete', { step, needs });

    return needs;
  }

  /**
   * Find skills that match the needs
   */
  findMatchingSkills(needs: string[]): SkillMatch[] {
    const matches: SkillMatch[] = [];

    for (const skill of this.skills.values()) {
      let relevanceScore = 0;
      const gaps: string[] = [];
      const adaptations: string[] = [];

      for (const need of needs) {
        const needLower = need.toLowerCase();

        // Check if skill capabilities match
        const capabilityMatch = skill.capabilities.some(
          (c) => c.toLowerCase().includes(needLower) || needLower.includes(c.toLowerCase())
        );

        // Check if keywords match
        const keywordMatch = skill.keywords.some(
          (k) => k.toLowerCase().includes(needLower) || needLower.includes(k.toLowerCase())
        );

        // Check if description matches
        const descriptionMatch = skill.description.toLowerCase().includes(needLower);

        if (capabilityMatch) {
          relevanceScore += 0.4;
        } else if (keywordMatch) {
          relevanceScore += 0.3;
          adaptations.push(`Adapt "${skill.name}" for "${need}"`);
        } else if (descriptionMatch) {
          relevanceScore += 0.2;
          adaptations.push(`Use "${skill.name}" creatively for "${need}"`);
        } else {
          gaps.push(need);
        }
      }

      // Normalize relevance
      relevanceScore = Math.min(1, relevanceScore / needs.length);

      // Calculate confidence based on success rate and usage
      const confidence = skill.success_rate * (skill.times_used > 0 ? 0.9 : 0.7);

      if (relevanceScore > 0.1) {
        matches.push({
          skill,
          relevance: relevanceScore,
          confidence,
          gaps,
          adaptations,
        });
      }
    }

    // Sort by relevance then confidence
    return matches.sort((a, b) => {
      const scoreA = a.relevance * 0.7 + a.confidence * 0.3;
      const scoreB = b.relevance * 0.7 + b.confidence * 0.3;
      return scoreB - scoreA;
    });
  }

  /**
   * Try to compose multiple skills to meet the need
   */
  composeSkills(needs: string[], matches: SkillMatch[]): SkillComposition | null {
    if (matches.length === 0) return null;

    const coveredNeeds = new Set<string>();
    const selectedSkills: Skill[] = [];
    const strategies: string[] = [];

    for (const match of matches) {
      // Find which needs this skill covers
      const covers = needs.filter((need) => {
        const needLower = need.toLowerCase();
        return (
          match.skill.capabilities.some(
            (c) => c.toLowerCase().includes(needLower) || needLower.includes(c.toLowerCase())
          ) ||
          match.skill.keywords.some(
            (k) => k.toLowerCase().includes(needLower) || needLower.includes(k.toLowerCase())
          )
        );
      });

      if (covers.length > 0) {
        selectedSkills.push(match.skill);
        covers.forEach((c) => coveredNeeds.add(c));

        if (match.adaptations.length > 0) {
          strategies.push(...match.adaptations);
        } else {
          strategies.push(`Use ${match.skill.name} for: ${covers.join(', ')}`);
        }
      }

      // Check if all needs are covered
      if (coveredNeeds.size === needs.length) break;
    }

    const gaps = needs.filter((n) => !coveredNeeds.has(n));
    const confidence =
      selectedSkills.length > 0
        ? selectedSkills.reduce((sum, s) => sum + s.success_rate, 0) / selectedSkills.length
        : 0;

    return {
      skills: selectedSkills,
      strategy: strategies.join('\n'),
      confidence: confidence * (1 - gaps.length / needs.length),
      gaps,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL CREATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new skill to fill a gap
   * "Creates its own light to find its way in the dark"
   */
  async createSkill(request: SkillCreationRequest, context: TooLooContext): Promise<Skill> {
    this.emit('create:start', { request });

    const soul = context.soul;

    const creationContext = `
# TooLoo's Principle: Creative Problem-Solving
"When I lack a skill, I create it. When a path is blocked, I find another."

# Need to Address
${request.need}

# Context
${request.context}

# Similar Existing Skills
${request.similar_skills.map((s) => `- ${s.name}: ${s.description}`).join('\n') || 'None'}

# Industry Patterns for Inspiration
${request.industry_patterns.join('\n') || 'None available - be creative'}

# TooLoo's Value: Elegance
"Simple solutions over complex machinery. If something can be done in 10 lines, don't write 100."

# Instructions
Create a new skill definition that addresses this need.
The skill should be:
1. Focused - does one thing well
2. Composable - can work with other skills
3. Clear - easy to understand and use
4. Elegant - simple but effective

Provide:
- id: snake_case identifier
- name: Human-readable name
- description: What it does
- capabilities: List of specific capabilities
- instructions: How an LLM should use this skill
- keywords: For matching
`;

    // Emit for LLM to create the skill
    const skillPromise = new Promise<Skill>((resolve) => {
      this.emit('create:skill-request', {
        request,
        context,
        creationContext,
        resolve,
      });

      // Default timeout - create a basic placeholder
      setTimeout(() => {
        const placeholderId = request.need
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 30);
        resolve({
          id: `created-${placeholderId}`,
          name: `Created: ${request.need.slice(0, 50)}`,
          description: `Auto-created skill for: ${request.need}`,
          version: '0.1.0',
          capabilities: [request.need],
          requirements: [],
          instructions: `Fulfill this need: ${request.need}\n\nContext: ${request.context}`,
          tools: [],
          keywords: request.need.split(' ').filter((w) => w.length > 3),
          origin: 'created',
          created_from: request.context,
          times_used: 0,
          success_rate: 0.5, // Unknown, assume average
        });
      }, 30000);
    });

    const skill = await skillPromise;

    // Save the skill
    this.saveCreatedSkill(skill);

    // Register it
    this.skills.set(skill.id, skill);

    // Record in evolution
    kernel.recordCreatedSkill({
      id: skill.id,
      name: skill.name,
      purpose: skill.description,
      born_from: request.context,
    });

    kernel.recordEvolution({
      timestamp: new Date().toISOString(),
      type: 'creation',
      content: `Created new skill: ${skill.name} - ${skill.description}`,
    });

    this.emit('create:complete', { skill });

    return skill;
  }

  /**
   * Save a created skill to disk
   */
  private saveCreatedSkill(skill: Skill): void {
    if (!existsSync(CREATED_SKILLS_DIR)) {
      mkdirSync(CREATED_SKILLS_DIR, { recursive: true });
    }

    const skillData = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      version: skill.version,
      capabilities: skill.capabilities,
      requirements: skill.requirements,
      instructions: skill.instructions,
      tools: skill.tools,
      keywords: skill.keywords,
      origin: skill.origin,
      created_from: skill.created_from,
      times_used: skill.times_used,
      success_rate: skill.success_rate,
    };

    const path = join(CREATED_SKILLS_DIR, `${skill.id}.yaml`);
    writeFileSync(path, stringifyYaml(skillData));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL EXECUTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Execute a step using the best available approach
   * Main entry point called by Process Planner
   */
  async executeStep(step: ProcessStep, context: TooLooContext): Promise<unknown> {
    this.emit('execute:start', { step });

    // 1. Evaluate what we need
    const needs = await this.evaluateNeeds(step, context);
    console.log(`[SkillsMaster] Step needs: ${needs.join(', ')}`);

    // 2. Find matching skills
    const matches = this.findMatchingSkills(needs);
    console.log(`[SkillsMaster] Found ${matches.length} potential skills`);

    // 3. Try to compose skills
    const composition = this.composeSkills(needs, matches);

    // 4. If gaps exist, create skills to fill them
    if (composition && composition.gaps.length > 0) {
      console.log(`[SkillsMaster] Gaps to fill: ${composition.gaps.join(', ')}`);

      for (const gap of composition.gaps) {
        const newSkill = await this.createSkill(
          {
            need: gap,
            context: `Step "${step.description}" requires "${gap}"`,
            similar_skills: matches.slice(0, 3).map((m) => m.skill),
            industry_patterns: [], // World Observer would provide these
          },
          context
        );

        composition.skills.push(newSkill);
        console.log(`[SkillsMaster] Created skill: ${newSkill.name}`);
      }
    }

    // 5. Execute with the composed/created skills
    const executionContext = {
      step,
      skills: composition?.skills || [],
      strategy: composition?.strategy || 'Direct execution',
      context,
    };

    this.emit('execute:ready', executionContext);

    // The actual execution happens through LLM with these skills
    const resultPromise = new Promise<unknown>((resolve, reject) => {
      this.emit('execute:run-request', {
        ...executionContext,
        resolve,
        reject,
      });

      // Timeout
      setTimeout(() => reject(new Error('Execution timeout')), 5 * 60 * 1000);
    });

    const result = await resultPromise;

    // 6. Update skill usage stats
    for (const skill of composition?.skills || []) {
      skill.times_used++;
      skill.last_used = new Date().toISOString();
    }

    this.emit('execute:complete', { step, result });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a skill by ID
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Update skill success rate after execution
   */
  updateSkillSuccess(skillId: string, success: boolean): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    // Exponential moving average
    const alpha = 0.1; // Weight of new observation
    skill.success_rate = skill.success_rate * (1 - alpha) + (success ? 1 : 0) * alpha;

    // Save if it's a created skill
    if (skill.origin === 'created') {
      this.saveCreatedSkill(skill);
    }
  }

  /**
   * Get skills created by TooLoo
   */
  getCreatedSkills(): Skill[] {
    return Array.from(this.skills.values()).filter((s) => s.origin === 'created');
  }

  /**
   * Get skill statistics
   */
  getStats(): { total: number; builtIn: number; created: number; mostUsed: Skill[] } {
    const all = Array.from(this.skills.values());
    return {
      total: all.length,
      builtIn: all.filter((s) => s.origin === 'built-in').length,
      created: all.filter((s) => s.origin === 'created').length,
      mostUsed: all.sort((a, b) => b.times_used - a.times_used).slice(0, 5),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const skillsMaster = new SkillsMaster();
export default skillsMaster;
