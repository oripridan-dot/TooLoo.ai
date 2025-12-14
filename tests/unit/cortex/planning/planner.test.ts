// @version 3.3.577
/**
 * @file planner.test.ts
 * @description Tests for planning module types and structures
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';

// ============= Plan Step Types =============

describe('PlanStep Types', () => {
  type StepType = 'command' | 'file:write' | 'file:read' | 'code:execute' | 'image:generate';
  type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

  interface PlanStep {
    id: string;
    type: StepType;
    description: string;
    payload: Record<string, unknown>;
    status: StepStatus;
    result?: unknown;
  }

  describe('StepType enum', () => {
    it('should support command type', () => {
      const t: StepType = 'command';
      expect(t).toBe('command');
    });

    it('should support file:write type', () => {
      const t: StepType = 'file:write';
      expect(t).toBe('file:write');
    });

    it('should support file:read type', () => {
      const t: StepType = 'file:read';
      expect(t).toBe('file:read');
    });

    it('should support code:execute type', () => {
      const t: StepType = 'code:execute';
      expect(t).toBe('code:execute');
    });

    it('should support image:generate type', () => {
      const t: StepType = 'image:generate';
      expect(t).toBe('image:generate');
    });
  });

  describe('StepStatus enum', () => {
    it('should support pending status', () => {
      const s: StepStatus = 'pending';
      expect(s).toBe('pending');
    });

    it('should support running status', () => {
      const s: StepStatus = 'running';
      expect(s).toBe('running');
    });

    it('should support completed status', () => {
      const s: StepStatus = 'completed';
      expect(s).toBe('completed');
    });

    it('should support failed status', () => {
      const s: StepStatus = 'failed';
      expect(s).toBe('failed');
    });
  });

  describe('PlanStep interface', () => {
    it('should create command step', () => {
      const step: PlanStep = {
        id: 'step-001',
        type: 'command',
        description: 'Create directory',
        payload: { command: 'mkdir -p projects/new-app', cwd: '.' },
        status: 'pending',
      };
      expect(step.type).toBe('command');
      expect(step.payload.command).toContain('mkdir');
    });

    it('should create file:write step', () => {
      const step: PlanStep = {
        id: 'step-002',
        type: 'file:write',
        description: 'Write configuration',
        payload: { path: 'config.json', content: '{"debug": true}' },
        status: 'pending',
      };
      expect(step.type).toBe('file:write');
    });

    it('should create file:read step', () => {
      const step: PlanStep = {
        id: 'step-003',
        type: 'file:read',
        description: 'Read package.json',
        payload: { path: 'package.json' },
        status: 'completed',
        result: { name: 'test-app', version: '1.0.0' },
      };
      expect(step.result).toBeDefined();
    });

    it('should create code:execute step', () => {
      const step: PlanStep = {
        id: 'step-004',
        type: 'code:execute',
        description: 'Process data',
        payload: { 
          code: 'const result = data.map(x => x * 2); return result;',
          language: 'javascript',
        },
        status: 'running',
      };
      expect(step.payload.language).toBe('javascript');
    });

    it('should create image:generate step', () => {
      const step: PlanStep = {
        id: 'step-005',
        type: 'image:generate',
        description: 'Generate logo',
        payload: { 
          prompt: 'Modern tech company logo',
          style: 'vivid',
        },
        status: 'pending',
      };
      expect(step.payload.style).toBe('vivid');
    });
  });
});

// ============= Plan Types =============

describe('Plan Types', () => {
  type PlanStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

  interface PlanStep {
    id: string;
    type: string;
    description: string;
    payload: Record<string, unknown>;
    status: string;
  }

  interface Plan {
    id: string;
    goal: string;
    steps: PlanStep[];
    status: PlanStatus;
    createdAt: number;
  }

  describe('PlanStatus enum', () => {
    it('should support pending status', () => {
      const s: PlanStatus = 'pending';
      expect(s).toBe('pending');
    });

    it('should support in-progress status', () => {
      const s: PlanStatus = 'in-progress';
      expect(s).toBe('in-progress');
    });

    it('should support completed status', () => {
      const s: PlanStatus = 'completed';
      expect(s).toBe('completed');
    });

    it('should support failed status', () => {
      const s: PlanStatus = 'failed';
      expect(s).toBe('failed');
    });
  });

  describe('Plan interface', () => {
    it('should create pending plan', () => {
      const plan: Plan = {
        id: 'plan-001',
        goal: 'Build a REST API',
        steps: [],
        status: 'pending',
        createdAt: Date.now(),
      };
      expect(plan.status).toBe('pending');
      expect(plan.steps).toHaveLength(0);
    });

    it('should create plan with steps', () => {
      const plan: Plan = {
        id: 'plan-002',
        goal: 'Create React component',
        steps: [
          { id: 's1', type: 'file:write', description: 'Create component', payload: {}, status: 'pending' },
          { id: 's2', type: 'file:write', description: 'Create styles', payload: {}, status: 'pending' },
          { id: 's3', type: 'file:write', description: 'Create tests', payload: {}, status: 'pending' },
        ],
        status: 'pending',
        createdAt: Date.now(),
      };
      expect(plan.steps).toHaveLength(3);
    });

    it('should create in-progress plan', () => {
      const plan: Plan = {
        id: 'plan-003',
        goal: 'Deploy application',
        steps: [
          { id: 's1', type: 'command', description: 'Build', payload: {}, status: 'completed' },
          { id: 's2', type: 'command', description: 'Deploy', payload: {}, status: 'running' },
        ],
        status: 'in-progress',
        createdAt: Date.now() - 5000,
      };
      expect(plan.status).toBe('in-progress');
    });

    it('should calculate plan progress', () => {
      const plan: Plan = {
        id: 'plan-004',
        goal: 'Test',
        steps: [
          { id: 's1', type: 'command', description: 'Step 1', payload: {}, status: 'completed' },
          { id: 's2', type: 'command', description: 'Step 2', payload: {}, status: 'completed' },
          { id: 's3', type: 'command', description: 'Step 3', payload: {}, status: 'pending' },
          { id: 's4', type: 'command', description: 'Step 4', payload: {}, status: 'pending' },
        ],
        status: 'in-progress',
        createdAt: Date.now(),
      };
      const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
      const progress = completedSteps / plan.steps.length;
      expect(progress).toBe(0.5);
    });
  });
});

// ============= Time Context Types =============

describe('Time Context Types', () => {
  interface TimeContext {
    iso: string;
    localTime: string;
    dayOfWeek: string;
    isWorkHours: boolean;
    isWeekend: boolean;
  }

  it('should create time context', () => {
    const now = new Date();
    const ctx: TimeContext = {
      iso: now.toISOString(),
      localTime: now.toLocaleTimeString(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      isWorkHours: now.getHours() >= 9 && now.getHours() <= 17,
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
    };
    expect(ctx.iso).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(typeof ctx.isWorkHours).toBe('boolean');
  });

  it('should detect work hours', () => {
    const isWorkHours = (hour: number) => hour >= 9 && hour <= 17;
    expect(isWorkHours(10)).toBe(true);
    expect(isWorkHours(14)).toBe(true);
    expect(isWorkHours(8)).toBe(false);
    expect(isWorkHours(18)).toBe(false);
  });

  it('should detect weekend', () => {
    const isWeekend = (day: number) => day === 0 || day === 6;
    expect(isWeekend(0)).toBe(true); // Sunday
    expect(isWeekend(6)).toBe(true); // Saturday
    expect(isWeekend(1)).toBe(false); // Monday
    expect(isWeekend(5)).toBe(false); // Friday
  });
});

// ============= Plan Critique Types =============

describe('Plan Critique Types', () => {
  interface PlanCritique {
    critique: string;
    failedStep?: {
      id: string;
      description: string;
      error?: string;
    };
  }

  it('should create critique without failed step', () => {
    const critique: PlanCritique = {
      critique: 'Consider adding error handling',
    };
    expect(critique.critique).toContain('error handling');
    expect(critique.failedStep).toBeUndefined();
  });

  it('should create critique with failed step', () => {
    const critique: PlanCritique = {
      critique: 'Step failed due to permission error',
      failedStep: {
        id: 'step-003',
        description: 'Write to /etc/config',
        error: 'EACCES: permission denied',
      },
    };
    expect(critique.failedStep?.error).toContain('EACCES');
  });
});

// ============= Payload Types =============

describe('Payload Types', () => {
  interface CommandPayload {
    command: string;
    cwd?: string;
  }

  interface FileWritePayload {
    path: string;
    content: string;
  }

  interface FileReadPayload {
    path: string;
  }

  interface CodeExecutePayload {
    code: string;
    language: 'python' | 'javascript' | 'typescript';
  }

  interface ImageGeneratePayload {
    prompt: string;
    style: 'vivid' | 'natural';
  }

  describe('CommandPayload', () => {
    it('should create basic command', () => {
      const payload: CommandPayload = {
        command: 'npm install',
      };
      expect(payload.cwd).toBeUndefined();
    });

    it('should create command with cwd', () => {
      const payload: CommandPayload = {
        command: 'npm test',
        cwd: '/app',
      };
      expect(payload.cwd).toBe('/app');
    });
  });

  describe('FileWritePayload', () => {
    it('should create file write payload', () => {
      const payload: FileWritePayload = {
        path: 'src/main.ts',
        content: 'export const hello = "world";',
      };
      expect(payload.path).toContain('.ts');
    });
  });

  describe('CodeExecutePayload', () => {
    it('should create javascript code payload', () => {
      const payload: CodeExecutePayload = {
        code: 'return 1 + 1;',
        language: 'javascript',
      };
      expect(payload.language).toBe('javascript');
    });

    it('should create python code payload', () => {
      const payload: CodeExecutePayload = {
        code: 'print("Hello")',
        language: 'python',
      };
      expect(payload.language).toBe('python');
    });

    it('should create typescript code payload', () => {
      const payload: CodeExecutePayload = {
        code: 'const x: number = 5;',
        language: 'typescript',
      };
      expect(payload.language).toBe('typescript');
    });
  });

  describe('ImageGeneratePayload', () => {
    it('should create vivid style payload', () => {
      const payload: ImageGeneratePayload = {
        prompt: 'A futuristic city',
        style: 'vivid',
      };
      expect(payload.style).toBe('vivid');
    });

    it('should create natural style payload', () => {
      const payload: ImageGeneratePayload = {
        prompt: 'A peaceful forest',
        style: 'natural',
      };
      expect(payload.style).toBe('natural');
    });
  });
});

// ============= Plan ID Generation =============

describe('Plan ID Generation', () => {
  it('should generate unique plan IDs', () => {
    const generateId = () => Math.random().toString(36).substring(7);
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate alphanumeric IDs', () => {
    const id = Math.random().toString(36).substring(7);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

// ============= Step Execution Order =============

describe('Step Execution Order', () => {
  interface PlanStep {
    id: string;
    description: string;
    status: string;
    dependencies?: string[];
  }

  it('should find next executable step', () => {
    const steps: PlanStep[] = [
      { id: 's1', description: 'Setup', status: 'completed' },
      { id: 's2', description: 'Build', status: 'pending', dependencies: ['s1'] },
      { id: 's3', description: 'Test', status: 'pending', dependencies: ['s2'] },
    ];
    
    const completedIds = new Set(steps.filter(s => s.status === 'completed').map(s => s.id));
    const nextStep = steps.find(s => 
      s.status === 'pending' && 
      (!s.dependencies || s.dependencies.every(d => completedIds.has(d)))
    );
    
    expect(nextStep?.id).toBe('s2');
  });

  it('should detect blocked steps', () => {
    const steps: PlanStep[] = [
      { id: 's1', description: 'Setup', status: 'pending' },
      { id: 's2', description: 'Build', status: 'pending', dependencies: ['s1'] },
    ];
    
    const completedIds = new Set(steps.filter(s => s.status === 'completed').map(s => s.id));
    const blockedSteps = steps.filter(s => 
      s.status === 'pending' && 
      s.dependencies && 
      !s.dependencies.every(d => completedIds.has(d))
    );
    
    expect(blockedSteps).toHaveLength(1);
    expect(blockedSteps[0].id).toBe('s2');
  });
});
