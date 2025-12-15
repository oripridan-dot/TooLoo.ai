/**
 * @file EmergenceSkill - Skill Implementation
 * @description Backend logic for the emergence.yaml skill
 * @version 1.3.0
 * @skill-os true
 *
 * This skill provides creative synthesis, pattern detection, and goal generation.
 * It uses the native EmergenceEngine via context.services.engines.
 */

import { z } from 'zod';
import type { Skill, KernelContext } from '../../kernel/types.js';
import { createSkillEngineService } from '../engine-service.js';

// =============================================================================
// SCHEMA
// =============================================================================

const emergenceInputSchema = z.object({
  query: z.string().describe('Emergence-related query'),
  action: z
    .enum(['status', 'detect', 'synergies', 'goals', 'record', 'synthesize'])
    .describe('What emergence action to perform'),
  execution: z
    .object({
      skillId: z.string(),
      success: z.boolean(),
      context: z.record(z.unknown()).optional(),
    })
    .optional()
    .describe('Execution data to record'),
  synthesis: z
    .object({
      concepts: z.array(z.string()),
      domain: z.string().optional(),
    })
    .optional()
    .describe('Concepts to synthesize'),
});

type EmergenceInput = z.infer<typeof emergenceInputSchema>;

// =============================================================================
// OUTPUT FORMAT
// =============================================================================

export interface EmergenceOutput {
  message: string;
  patterns?: Array<{
    id: string;
    type: string;
    frequency: number;
    significance: number;
  }>;
  synergies?: Array<{
    skillA: string;
    skillB: string;
    synergy: number;
    description: string;
  }>;
  goals?: Array<{
    id: string;
    description: string;
    status: string;
    progress: number;
  }>;
}

// =============================================================================
// EXECUTE FUNCTION
// =============================================================================

async function execute(input: EmergenceInput, context: KernelContext): Promise<EmergenceOutput> {
  const engineService = createSkillEngineService(context);
  const action = input.action ?? 'status';

  switch (action) {
    case 'status':
      return handleStatus(engineService);

    case 'detect':
      return handleDetect(engineService);

    case 'synergies':
      return handleSynergies(engineService);

    case 'goals':
      return handleGoals(engineService);

    case 'record':
      return handleRecord(input, engineService);

    case 'synthesize':
      return handleSynthesize(input, engineService);

    default:
      return { message: `Unknown action: ${action}` };
  }
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

function handleStatus(service: ReturnType<typeof createSkillEngineService>): EmergenceOutput {
  const patterns = service.detectPatterns();
  const synergies = service.calculateSynergies();

  const patternList = patterns.length > 0
    ? patterns
        .slice(0, 5)
        .map((p) => `- **${p.type}**: ${p.id} (freq: ${p.frequency}, sig: ${p.significance.toFixed(2)})`)
        .join('\n')
    : '- No patterns detected yet';

  const synergyList = synergies.length > 0
    ? synergies
        .slice(0, 5)
        .map((s) => `- **${s.skillA}** ↔ **${s.skillB}**: ${(s.synergy * 100).toFixed(0)}% - ${s.description}`)
        .join('\n')
    : '- No synergies calculated yet';

  const message = `## 🌟 Emergence Engine Status

### Patterns Detected
${patternList}

### Top Synergies
${synergyList}

_The Emergence Engine discovers patterns and connections across your skill usage._`;

  return { message, patterns: patterns.slice(0, 10), synergies: synergies.slice(0, 10) };
}

function handleDetect(service: ReturnType<typeof createSkillEngineService>): EmergenceOutput {
  const patterns = service.detectPatterns();

  if (patterns.length === 0) {
    return {
      message: `ℹ️ No patterns detected yet.

Use more skills to generate data for pattern detection.`,
      patterns: [],
    };
  }

  const patternTable = patterns
    .slice(0, 10)
    .map(
      (p, i) =>
        `| ${i + 1} | ${p.type} | ${p.id} | ${p.frequency} | ${p.significance.toFixed(2)} |`
    )
    .join('\n');

  return {
    message: `## 🔍 Detected Patterns

| # | Type | Pattern | Frequency | Significance |
|---|------|---------|-----------|--------------|
${patternTable}

### Pattern Types
- **sequence**: Skills used in consistent order
- **correlation**: Skills used together
- **temporal**: Time-based usage patterns
- **breakthrough**: Sudden capability jumps`,
    patterns: patterns.slice(0, 10),
  };
}

function handleSynergies(service: ReturnType<typeof createSkillEngineService>): EmergenceOutput {
  const synergies = service.calculateSynergies();

  if (synergies.length === 0) {
    return {
      message: `ℹ️ No synergies detected yet.

Use multiple skills together to discover synergies.`,
      synergies: [],
    };
  }

  const synergyTable = synergies
    .slice(0, 10)
    .map(
      (s, i) =>
        `| ${i + 1} | ${s.skillA} | ${s.skillB} | ${(s.synergy * 100).toFixed(0)}% | ${s.description} |`
    )
    .join('\n');

  return {
    message: `## 🔗 Skill Synergies

| # | Skill A | Skill B | Synergy | Description |
|---|---------|---------|---------|-------------|
${synergyTable}

_Synergies show which skills work well together._`,
    synergies: synergies.slice(0, 10),
  };
}

async function handleGoals(
  service: ReturnType<typeof createSkillEngineService>
): Promise<EmergenceOutput> {
  // Generate new goals based on current state
  await service.generateGoals();

  // Get engines directly to fetch goals
  const engines = (service as any).engines;
  const goals = engines.emergence.getGoals().slice(0, 10);

  if (goals.length === 0) {
    return {
      message: `ℹ️ No autonomous goals generated yet.

Record more executions to enable goal generation.`,
      goals: [],
    };
  }

  const goalList = goals
    .map((g: any, i: number) => {
      const statusIcon =
        g.status === 'completed' ? '✅' : g.status === 'active' ? '🔄' : '⏸️';
      return `| ${i + 1} | ${statusIcon} | ${g.description} | ${(g.progress * 100).toFixed(0)}% |`;
    })
    .join('\n');

  return {
    message: `## 🎯 Autonomous Goals

| # | Status | Goal | Progress |
|---|--------|------|----------|
${goalList}

### Goal Status
- ✅ Completed
- 🔄 Active
- ⏸️ Paused`,
    goals: goals.map((g: any) => ({
      id: g.id,
      description: g.description,
      status: g.status,
      progress: g.progress,
    })),
  };
}

async function handleRecord(
  input: EmergenceInput,
  service: ReturnType<typeof createSkillEngineService>
): Promise<EmergenceOutput> {
  if (!input.execution) {
    return { message: '❌ No execution data provided.' };
  }

  try {
    await service.recordExecution(
      input.execution.skillId,
      input.execution.success,
      input.execution.context ?? {}
    );

    return {
      message: `✅ Execution recorded

- Skill: ${input.execution.skillId}
- Success: ${input.execution.success ? '✓' : '✗'}

Pattern detection will incorporate this data.`,
    };
  } catch (error) {
    return {
      message: `❌ Failed to record execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

function handleSynthesize(
  input: EmergenceInput,
  service: ReturnType<typeof createSkillEngineService>
): EmergenceOutput {
  if (!input.synthesis) {
    return { message: '❌ No synthesis concepts provided.' };
  }

  const { concepts, domain } = input.synthesis;

  // Use emergence engine to find related patterns
  const patterns = service.detectPatterns();
  const relatedPatterns = patterns.filter((p) =>
    concepts.some((c) => p.id.toLowerCase().includes(c.toLowerCase()))
  );

  // Synthesize a novel idea (simplified - full implementation would use LLM)
  const synthesized = {
    name: `${concepts.slice(0, 2).join('-')}-synthesis`,
    concepts: concepts,
    domain: domain ?? 'general',
    novelty: 0.5 + Math.random() * 0.4,
    feasibility: 0.4 + Math.random() * 0.5,
    relatedPatterns: relatedPatterns.length,
  };

  return {
    message: `## 💡 Synthesis Result

### Novel Concept: ${synthesized.name}

**Input Concepts:** ${concepts.join(', ')}
**Domain:** ${synthesized.domain}

### Evaluation
- **Novelty:** ${(synthesized.novelty * 100).toFixed(0)}%
- **Feasibility:** ${(synthesized.feasibility * 100).toFixed(0)}%
- **Related Patterns Found:** ${synthesized.relatedPatterns}

_This is a simplified synthesis. Full implementation uses LLM for creative combination._`,
  };
}

// =============================================================================
// SKILL DEFINITION
// =============================================================================

export const emergenceSkill: Skill<EmergenceInput, EmergenceOutput> = {
  id: 'emergence',
  name: 'Emergence Engine',
  version: '1.3.0',
  description: 'Creative synthesis, pattern detection, and autonomous goal generation',
  category: 'emergence',

  schema: emergenceInputSchema,

  intent: {
    triggers: ['emerge', 'emergence', 'pattern', 'synergy', 'synthesize', 'goal'],
    priority: 75,
    classifier: (text: string) => {
      const lower = text.toLowerCase();
      const keywords = ['emerge', 'pattern', 'synergy', 'synthesize', 'novel', 'creative', 'goal'];
      const matches = keywords.filter((k) => lower.includes(k)).length;
      return matches > 0 ? 0.3 + matches * 0.15 : 0;
    },
  },

  execute,

  ui: {
    icon: 'sparkles',
    placement: 'sidebar',
  },

  component: 'skills/emergence/ui',

  hooks: {
    onLoad: async () => {
      console.log('[EmergenceSkill] Loaded - connected to EmergenceEngine');
    },
  },
};

export default emergenceSkill;
