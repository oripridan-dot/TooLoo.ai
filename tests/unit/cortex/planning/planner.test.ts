import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Planner } from '../../../../src/cortex/planning/planner';
import { bus } from '../../../../src/core/event-bus';

// Mock LLMProvider
const mockGenerateSmartLLM = vi.fn();
vi.mock('../../../../src/precog/providers/llm-provider', () => ({
  default: vi.fn().mockImplementation(() => ({
    generateSmartLLM: mockGenerateSmartLLM
  }))
}));

describe('Planner', () => {
  let planner: Planner;

  beforeEach(() => {
    planner = new Planner(bus);
    mockGenerateSmartLLM.mockReset();
  });

  it('should create a plan from a goal', async () => {
    const mockResponse = {
      content: JSON.stringify({
        steps: [
          {
            type: 'command',
            description: 'List files',
            payload: { command: 'ls' }
          }
        ]
      })
    };
    mockGenerateSmartLLM.mockResolvedValue(mockResponse);

    const plan = await planner.createPlan('List files');

    expect(mockGenerateSmartLLM).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'Goal: List files',
      taskType: 'planning'
    }));

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].type).toBe('command');
    expect(plan.steps[0].payload).toEqual({ command: 'ls' });
  });

  it('should handle JSON in markdown code blocks', async () => {
    const mockResponse = {
      content: 'Here is the plan:\n```json\n{\n  "steps": []\n}\n```'
    };
    mockGenerateSmartLLM.mockResolvedValue(mockResponse);

    const plan = await planner.createPlan('Do nothing');

    expect(plan.steps).toHaveLength(0);
  });
});
