/**
 * @file SkillEvolutionSkill - Skill Implementation
 * @description Backend logic for the skill-evolution.yaml skill
 * @version 1.3.0
 * @skill-os true
 *
 * This skill provides A/B testing and prompt evolution capabilities.
 * It uses the native EvolutionEngine via context.services.engines.
 */

import { z } from 'zod';
import type { Skill, KernelContext } from '../../kernel/types.js';
import { createSkillEngineService } from '../engine-service.js';

// =============================================================================
// SCHEMA
// =============================================================================

const evolutionInputSchema = z.object({
  query: z.string().describe('Evolution-related query'),
  action: z
    .enum(['status', 'start-test', 'record-sample', 'complete-test', 'strategies', 'goals'])
    .describe('What evolution action to perform'),
  abTest: z
    .object({
      name: z.string(),
      skillId: z.string(),
      strategyA: z.string(),
      strategyB: z.string(),
      minSamples: z.number().optional(),
    })
    .optional()
    .describe('A/B test configuration'),
  sample: z
    .object({
      testId: z.string(),
      strategy: z.enum(['A', 'B']),
      success: z.boolean(),
      quality: z.number().min(0).max(1),
      latency: z.number(),
    })
    .optional()
    .describe('Sample to record for A/B test'),
  testId: z.string().optional().describe('Test ID for completing a test'),
  skillId: z.string().optional().describe('Skill ID for getting champion strategy'),
});

type EvolutionInput = z.infer<typeof evolutionInputSchema>;

// =============================================================================
// OUTPUT FORMAT
// =============================================================================

export interface EvolutionOutput {
  message: string;
  metrics?: {
    totalStrategies: number;
    activeTests: number;
    completedTests: number;
    improvementsDeployed: number;
  };
  testId?: string;
  champion?: {
    template: string;
    successRate: number;
  };
}

// =============================================================================
// EXECUTE FUNCTION
// =============================================================================

async function execute(input: EvolutionInput, context: KernelContext): Promise<EvolutionOutput> {
  const engineService = createSkillEngineService(context);
  const action = input.action ?? 'status';

  switch (action) {
    case 'status':
      return handleStatus(engineService);

    case 'start-test':
      return handleStartTest(input, engineService);

    case 'record-sample':
      return handleRecordSample(input, engineService);

    case 'complete-test':
      return handleCompleteTest(input, engineService);

    case 'strategies':
      return handleStrategies(input, engineService);

    case 'goals':
      return handleGoals(engineService);

    default:
      return { message: `Unknown action: ${action}` };
  }
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

function handleStatus(service: ReturnType<typeof createSkillEngineService>): EvolutionOutput {
  const metrics = service.getEvolutionStatus();

  const message = `## 🧬 Evolution Engine Status

### Current State
- Total strategies: ${metrics.totalStrategies}
- Active A/B tests: ${metrics.activeTests}
- Completed tests: ${metrics.completedTests}
- Improvements deployed: ${metrics.improvementsDeployed}

### Active Goals
- ${metrics.activeGoals} improvement goals active
- ${metrics.achievedGoals} goals achieved

_The Evolution Engine continuously optimizes prompts and strategies through A/B testing._`;

  return { message, metrics };
}

async function handleStartTest(
  input: EvolutionInput,
  service: ReturnType<typeof createSkillEngineService>
): Promise<EvolutionOutput> {
  if (!input.abTest) {
    return { message: '❌ No A/B test configuration provided.' };
  }

  try {
    const testId = await service.startABTest({
      name: input.abTest.name,
      skillId: input.abTest.skillId,
      strategyA: input.abTest.strategyA,
      strategyB: input.abTest.strategyB,
      minSamples: input.abTest.minSamples,
    });

    return {
      message: `✅ A/B Test Started

**Test ID:** ${testId}
**Name:** ${input.abTest.name}
**Skill:** ${input.abTest.skillId}

Strategy A vs Strategy B will be tested. Record samples with \`record-sample\` action.`,
      testId,
    };
  } catch (error) {
    return {
      message: `❌ Failed to start A/B test: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function handleRecordSample(
  input: EvolutionInput,
  service: ReturnType<typeof createSkillEngineService>
): Promise<EvolutionOutput> {
  if (!input.sample) {
    return { message: '❌ No sample data provided.' };
  }

  try {
    await service.recordABSample(input.sample.testId, input.sample.strategy, {
      success: input.sample.success,
      quality: input.sample.quality,
      latency: input.sample.latency,
    });

    return {
      message: `✅ Sample recorded for Strategy ${input.sample.strategy}

- Success: ${input.sample.success ? '✓' : '✗'}
- Quality: ${(input.sample.quality * 100).toFixed(1)}%
- Latency: ${input.sample.latency}ms`,
    };
  } catch (error) {
    return {
      message: `❌ Failed to record sample: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function handleCompleteTest(
  input: EvolutionInput,
  service: ReturnType<typeof createSkillEngineService>
): Promise<EvolutionOutput> {
  if (!input.testId) {
    return { message: '❌ No test ID provided.' };
  }

  // Get evolution engine directly to complete test
  const engines = (service as any).engines;
  try {
    const result = await engines.evolution.completeTest(input.testId);

    return {
      message: `## 🏆 A/B Test Complete

**Winner:** Strategy ${result.winner ?? 'TIE'}
**Confidence:** ${(result.confidence * 100).toFixed(1)}%

### Results
| Strategy | Samples | Success Rate |
|----------|---------|--------------|
| A | ${result.resultsA.samples} | ${((result.resultsA.successes / result.resultsA.samples) * 100 || 0).toFixed(1)}% |
| B | ${result.resultsB.samples} | ${((result.resultsB.successes / result.resultsB.samples) * 100 || 0).toFixed(1)}% |`,
    };
  } catch (error) {
    return {
      message: `❌ Failed to complete test: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

function handleStrategies(
  input: EvolutionInput,
  service: ReturnType<typeof createSkillEngineService>
): EvolutionOutput {
  if (!input.skillId) {
    return { message: '❌ No skill ID provided. Specify skillId to get champion strategy.' };
  }

  const champion = service.getChampionStrategy(input.skillId);

  if (!champion) {
    return {
      message: `ℹ️ No champion strategy found for skill: ${input.skillId}

Run A/B tests to determine the best strategy.`,
    };
  }

  return {
    message: `## 🏆 Champion Strategy for ${input.skillId}

**Success Rate:** ${(champion.successRate * 100).toFixed(1)}%

### Template
\`\`\`
${champion.template}
\`\`\``,
    champion,
  };
}

function handleGoals(service: ReturnType<typeof createSkillEngineService>): EvolutionOutput {
  const engines = (service as any).engines;
  const goals = engines.evolution.getActiveGoals();

  if (goals.length === 0) {
    return {
      message: `ℹ️ No active improvement goals.

Set goals with the Evolution Engine to track optimization progress.`,
    };
  }

  const goalList = goals
    .map(
      (g: any) =>
        `| ${g.skillId} | ${g.metric} | ${g.currentValue.toFixed(2)} | ${g.targetValue.toFixed(2)} | ${(g.progress * 100).toFixed(0)}% |`
    )
    .join('\n');

  return {
    message: `## 🎯 Active Improvement Goals

| Skill | Metric | Current | Target | Progress |
|-------|--------|---------|--------|----------|
${goalList}`,
  };
}

// =============================================================================
// SKILL DEFINITION
// =============================================================================

export const skillEvolutionSkill: Skill<EvolutionInput, EvolutionOutput> = {
  id: 'skill-evolution',
  name: 'Skill Evolution Engine',
  version: '1.3.0',
  description: 'A/B testing and prompt evolution for continuous skill improvement',
  category: 'evolution',

  schema: evolutionInputSchema,

  intent: {
    triggers: ['evolve', 'evolution', 'a/b test', 'ab test', 'optimize', 'improve'],
    priority: 75,
    classifier: (text: string) => {
      const lower = text.toLowerCase();
      const keywords = ['evolve', 'evolution', 'a/b', 'test', 'optimize', 'improve', 'strategy'];
      const matches = keywords.filter((k) => lower.includes(k)).length;
      return matches > 0 ? 0.3 + matches * 0.15 : 0;
    },
  },

  execute,

  ui: {
    icon: 'dna',
    placement: 'sidebar',
  },

  component: 'skills/evolution/ui',

  hooks: {
    onLoad: async () => {
      console.log('[SkillEvolutionSkill] Loaded - connected to EvolutionEngine');
    },
  },
};

export default skillEvolutionSkill;
