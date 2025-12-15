/**
 * @file LearningSkill - Skill Implementation
 * @description Backend logic for the learning.yaml skill
 * @version 1.3.0
 * @skill-os true
 *
 * This skill provides Q-learning and feedback tracking capabilities.
 * It uses the native LearningEngine via context.services.engines.
 */

import { z } from 'zod';
import type { Skill, KernelContext, SkillExecutionResult } from '../../kernel/types.js';
import { createSkillEngineService, type LearningStatus } from '../engine-service.js';

// =============================================================================
// SCHEMA
// =============================================================================

const learningInputSchema = z.object({
  query: z.string().describe('Learning-related query'),
  action: z
    .enum(['status', 'feedback', 'adjust', 'history', 'reset', 'optimal'])
    .describe('What learning action to perform'),
  feedback: z
    .object({
      type: z.enum(['positive', 'negative', 'rating']),
      value: z.number().optional(),
      skillId: z.string().optional(),
      taskType: z.string().optional(),
      provider: z.string().optional(),
    })
    .optional()
    .describe('Feedback to record'),
  adjust: z
    .object({
      learningEnabled: z.boolean().optional(),
      explorationRate: z.number().min(0).max(1).optional(),
    })
    .optional()
    .describe('Learning adjustments'),
  optimal: z
    .object({
      taskType: z.string(),
      complexity: z.enum(['low', 'medium', 'high']),
      skillId: z.string(),
      providers: z.array(z.string()),
    })
    .optional()
    .describe('Request optimal strategy for a task'),
});

type LearningInput = z.infer<typeof learningInputSchema>;

// =============================================================================
// OUTPUT FORMAT
// =============================================================================

export interface LearningOutput {
  message: string;
  status?: LearningStatus;
  recommendation?: {
    provider: string;
    strategy: string;
    temperature: number;
  };
  feedbackRecorded?: {
    reward: number;
    newQValue?: number;
  };
}

// =============================================================================
// EXECUTE FUNCTION
// =============================================================================

async function execute(input: LearningInput, context: KernelContext): Promise<LearningOutput> {
  const engineService = createSkillEngineService(context);
  const action = input.action ?? 'status';

  switch (action) {
    case 'status':
      return handleStatus(engineService);

    case 'feedback':
      return handleFeedback(input, context, engineService);

    case 'adjust':
      return handleAdjust(input, engineService);

    case 'optimal':
      return handleOptimal(input, engineService);

    case 'history':
      return handleHistory(engineService);

    case 'reset':
      return handleReset(engineService);

    default:
      return { message: `Unknown action: ${input.action}` };
  }
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

function handleStatus(service: ReturnType<typeof createSkillEngineService>): LearningOutput {
  const status = service.getLearningStatus();

  const message = `## 🧠 Learning Status

### Current State
- Learning: ${status.enabled ? '✅ Active' : '⏸️ Paused'}
- Exploration rate: ${(status.explorationRate * 100).toFixed(1)}%
- Total rewards: +${status.positiveRewards} / -${status.negativeRewards}
- Average reward: ${status.averageReward.toFixed(3)}
- Q-table size: ${status.qTableSize} entries

### Top Strategies
${
  status.topStrategies.length > 0
    ? `| State | Best Action | Q-Value |
|-------|-------------|---------|
${status.topStrategies.map((s) => `| ${s.state} | ${s.action} | ${s.qValue.toFixed(3)} |`).join('\n')}`
    : '_No strategies learned yet. Interact more to build the Q-table._'
}`;

  return { message, status };
}

async function handleFeedback(
  input: LearningInput,
  context: KernelContext,
  service: ReturnType<typeof createSkillEngineService>
): Promise<LearningOutput> {
  if (!input.feedback) {
    return { message: '❌ No feedback provided. Use `feedback: { type: "positive" }` or similar.' };
  }

  const result = await service.recordFeedback({
    type: input.feedback.type,
    value: input.feedback.value ?? (input.feedback.type === 'positive' ? 1 : -1),
    sessionId: context.sessionId,
    skillId: input.feedback.skillId ?? 'unknown',
    provider: input.feedback.provider,
    taskType: input.feedback.taskType,
    complexity: 'medium',
    strategy: 'direct',
  });

  if (result.success) {
    return {
      message: `✅ ${result.message}. New Q-value: ${result.newQValue?.toFixed(3) ?? 'N/A'}`,
      feedbackRecorded: {
        reward: result.rewardValue,
        newQValue: result.newQValue,
      },
    };
  } else {
    return { message: `❌ ${result.message}` };
  }
}

function handleAdjust(
  input: LearningInput,
  service: ReturnType<typeof createSkillEngineService>
): LearningOutput {
  if (!input.adjust) {
    return { message: '❌ No adjustments specified.' };
  }

  const changes: string[] = [];

  if (input.adjust.learningEnabled !== undefined) {
    service.setLearningEnabled(input.adjust.learningEnabled);
    changes.push(`Learning ${input.adjust.learningEnabled ? 'enabled' : 'disabled'}`);
  }

  if (changes.length === 0) {
    return { message: 'ℹ️ No changes made.' };
  }

  return { message: `✅ Adjustments applied:\n${changes.map((c) => `- ${c}`).join('\n')}` };
}

async function handleOptimal(
  input: LearningInput,
  service: ReturnType<typeof createSkillEngineService>
): Promise<LearningOutput> {
  if (!input.optimal) {
    return { message: '❌ No optimal request specified.' };
  }

  const complexity = input.optimal.complexity ?? 'medium';
  const providers = input.optimal.providers ?? ['deepseek', 'anthropic', 'openai', 'gemini'];

  const action = await service.getOptimalStrategy(
    input.optimal.taskType,
    complexity,
    input.optimal.skillId,
    providers
  );

  return {
    message: `## 🎯 Optimal Strategy Recommendation

For **${input.optimal.taskType}** (${complexity} complexity):

| Parameter | Value |
|-----------|-------|
| Provider | ${action.provider} |
| Strategy | ${action.strategy} |
| Temperature | ${action.temperature} |

_This recommendation is based on Q-learning from past interactions._`,
    recommendation: {
      provider: action.provider,
      strategy: action.strategy,
      temperature: action.temperature,
    },
  };
}

function handleHistory(service: ReturnType<typeof createSkillEngineService>): LearningOutput {
  const status = service.getLearningStatus();

  return {
    message: `## 📜 Learning History

### Summary
- Total positive rewards: +${status.positiveRewards}
- Total negative rewards: -${status.negativeRewards}
- Net learning: ${status.positiveRewards - status.negativeRewards}

### Q-Table
${status.qTableSize} state-action pairs learned.

_Use \`action: status\` to see top strategies._`,
    status,
  };
}

function handleReset(service: ReturnType<typeof createSkillEngineService>): LearningOutput {
  // For safety, we don't actually reset - just report
  return {
    message: `⚠️ **Reset Not Implemented**

Resetting the Q-table would erase all learned strategies.
This action requires manual intervention.

To reset, delete the file:
\`/data/engines/q-learning.json\``,
  };
}

// =============================================================================
// SKILL DEFINITION
// =============================================================================

export const learningSkill: Skill<LearningInput, LearningOutput> = {
  id: 'learning',
  name: 'Learning Engine',
  version: '1.3.0',
  description: 'Q-learning and feedback tracking for continuous improvement',
  category: 'learning',

  schema: learningInputSchema,

  intent: {
    triggers: ['learn', 'learning', 'feedback', 'reward', 'q-learning'],
    priority: 80,
    classifier: (text: string) => {
      const lower = text.toLowerCase();
      const keywords = ['learn', 'feedback', 'reward', 'q-learning', 'exploration', 'strategy'];
      const matches = keywords.filter((k) => lower.includes(k)).length;
      return matches > 0 ? 0.3 + matches * 0.15 : 0;
    },
  },

  execute,

  // UI configuration
  ui: {
    icon: 'brain',
    placement: 'sidebar',
  },

  // Component path - uses ChatV2 as the interface
  component: 'skills/learning/ui',

  hooks: {
    onLoad: async () => {
      console.log('[LearningSkill] Loaded - connected to LearningEngine');
    },
  },
};

export default learningSkill;
