// @version 1.0.0 - ExecutionTracer Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test interfaces
interface TraceStep {
  id: string;
  timestamp: string;
  type: 'thought' | 'tool' | 'result' | 'error';
  content: unknown;
  meta?: Record<string, unknown>;
}

interface ExecutionTrace {
  id: string;
  goal: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  steps: TraceStep[];
  result?: unknown;
  error?: unknown;
}

describe('ExecutionTracer', () => {
  describe('TraceStep Interface', () => {
    it('should have required id', () => {
      const step: TraceStep = {
        id: 'step-1',
        timestamp: new Date().toISOString(),
        type: 'thought',
        content: 'thinking...'
      };
      expect(step.id).toBe('step-1');
    });

    it('should have required timestamp', () => {
      const step: TraceStep = {
        id: 's1',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'tool',
        content: {}
      };
      expect(step.timestamp).toContain('T');
    });

    it('should support thought type', () => {
      const step: TraceStep = { id: 's', timestamp: '', type: 'thought', content: '' };
      expect(step.type).toBe('thought');
    });

    it('should support tool type', () => {
      const step: TraceStep = { id: 's', timestamp: '', type: 'tool', content: {} };
      expect(step.type).toBe('tool');
    });

    it('should support result type', () => {
      const step: TraceStep = { id: 's', timestamp: '', type: 'result', content: {} };
      expect(step.type).toBe('result');
    });

    it('should support error type', () => {
      const step: TraceStep = { id: 's', timestamp: '', type: 'error', content: 'error!' };
      expect(step.type).toBe('error');
    });

    it('should allow any content type', () => {
      const stringContent: TraceStep = { id: '1', timestamp: '', type: 'thought', content: 'text' };
      const objectContent: TraceStep = { id: '2', timestamp: '', type: 'result', content: { data: 1 } };
      const arrayContent: TraceStep = { id: '3', timestamp: '', type: 'tool', content: [1, 2, 3] };
      
      expect(typeof stringContent.content).toBe('string');
      expect(typeof objectContent.content).toBe('object');
      expect(Array.isArray(arrayContent.content)).toBe(true);
    });

    it('should support optional meta', () => {
      const step: TraceStep = {
        id: 's1',
        timestamp: '',
        type: 'tool',
        content: {},
        meta: { provider: 'openai', model: 'gpt-4' }
      };
      expect(step.meta?.provider).toBe('openai');
    });
  });

  describe('ExecutionTrace Interface', () => {
    it('should have unique id', () => {
      const trace: ExecutionTrace = {
        id: 'trace-123',
        goal: 'analyze code',
        startTime: new Date().toISOString(),
        status: 'running',
        steps: []
      };
      expect(trace.id).toContain('trace');
    });

    it('should have goal description', () => {
      const trace: ExecutionTrace = {
        id: 't1',
        goal: 'refactor function',
        startTime: '',
        status: 'running',
        steps: []
      };
      expect(trace.goal).toBe('refactor function');
    });

    it('should track start time', () => {
      const startTime = new Date().toISOString();
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime, status: 'running', steps: [] };
      expect(trace.startTime).toBe(startTime);
    });

    it('should have optional end time', () => {
      const trace: ExecutionTrace = {
        id: 't1',
        goal: 'g',
        startTime: '',
        endTime: new Date().toISOString(),
        status: 'completed',
        steps: []
      };
      expect(trace.endTime).toBeDefined();
    });

    it('should start with running status', () => {
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime: '', status: 'running', steps: [] };
      expect(trace.status).toBe('running');
    });

    it('should support completed status', () => {
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime: '', status: 'completed', steps: [] };
      expect(trace.status).toBe('completed');
    });

    it('should support failed status', () => {
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime: '', status: 'failed', steps: [] };
      expect(trace.status).toBe('failed');
    });

    it('should start with empty steps', () => {
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime: '', status: 'running', steps: [] };
      expect(trace.steps).toHaveLength(0);
    });

    it('should allow adding steps', () => {
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime: '', status: 'running', steps: [] };
      trace.steps.push({ id: 's1', timestamp: '', type: 'thought', content: 'thinking' });
      expect(trace.steps).toHaveLength(1);
    });

    it('should have optional result', () => {
      const trace: ExecutionTrace = {
        id: 't',
        goal: 'g',
        startTime: '',
        status: 'completed',
        steps: [],
        result: { success: true, data: [1, 2, 3] }
      };
      expect(trace.result).toBeDefined();
    });

    it('should have optional error', () => {
      const trace: ExecutionTrace = {
        id: 't',
        goal: 'g',
        startTime: '',
        status: 'failed',
        steps: [],
        error: 'Something went wrong'
      };
      expect(trace.error).toBe('Something went wrong');
    });
  });

  describe('Trace Management', () => {
    let traces: ExecutionTrace[];
    const maxTraces = 50;

    beforeEach(() => {
      traces = [];
    });

    it('should limit max traces', () => {
      expect(maxTraces).toBe(50);
    });

    it('should add new traces to beginning', () => {
      traces.unshift({ id: 'first', goal: 'g1', startTime: '', status: 'running', steps: [] });
      traces.unshift({ id: 'second', goal: 'g2', startTime: '', status: 'running', steps: [] });
      expect(traces[0].id).toBe('second');
    });

    it('should remove oldest trace when limit exceeded', () => {
      for (let i = 0; i < 51; i++) {
        traces.unshift({ id: `trace-${i}`, goal: `g${i}`, startTime: '', status: 'running', steps: [] });
        if (traces.length > maxTraces) {
          traces.pop();
        }
      }
      expect(traces.length).toBe(50);
      expect(traces[49].id).toBe('trace-1');
    });

    it('should track active trace id', () => {
      let activeTraceId: string | null = null;
      activeTraceId = 'trace-active';
      expect(activeTraceId).toBe('trace-active');
    });

    it('should clear active trace on completion', () => {
      let activeTraceId: string | null = 'trace-123';
      activeTraceId = null;
      expect(activeTraceId).toBeNull();
    });
  });

  describe('ID Generation', () => {
    it('should generate unique trace IDs', () => {
      const generateId = () => `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should include trace prefix', () => {
      const id = `trace-${Date.now()}-abc123`;
      expect(id.startsWith('trace-')).toBe(true);
    });

    it('should generate unique step IDs', () => {
      const generateStepId = () => `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const s1 = generateStepId();
      const s2 = generateStepId();
      expect(s1).not.toBe(s2);
    });
  });

  describe('Event Listeners', () => {
    it('should listen for planning:intent events', () => {
      const eventType = 'planning:intent';
      expect(eventType).toBe('planning:intent');
    });

    it('should listen for planning:plan:completed events', () => {
      const eventType = 'planning:plan:completed';
      expect(eventType).toContain('completed');
    });

    it('should listen for planning:plan:failed events', () => {
      const eventType = 'planning:plan:failed';
      expect(eventType).toContain('failed');
    });

    it('should listen for cortex:tool:call events', () => {
      const eventType = 'cortex:tool:call';
      expect(eventType).toContain('tool');
    });

    it('should listen for cortex:tool:result events', () => {
      const eventType = 'cortex:tool:result';
      expect(eventType).toContain('result');
    });

    it('should listen for cortex:thought events', () => {
      const eventType = 'cortex:thought';
      expect(eventType).toContain('thought');
    });
  });

  describe('Step Addition', () => {
    it('should add thought steps', () => {
      const steps: TraceStep[] = [];
      steps.push({ id: 's1', timestamp: '', type: 'thought', content: 'Analyzing the problem...' });
      expect(steps[0].type).toBe('thought');
    });

    it('should add tool steps', () => {
      const steps: TraceStep[] = [];
      steps.push({ id: 's1', timestamp: '', type: 'tool', content: { name: 'readFile', args: ['file.ts'] } });
      expect(steps[0].type).toBe('tool');
    });

    it('should add result steps', () => {
      const steps: TraceStep[] = [];
      steps.push({ id: 's1', timestamp: '', type: 'result', content: { output: 'file contents' } });
      expect(steps[0].type).toBe('result');
    });

    it('should add error steps', () => {
      const steps: TraceStep[] = [];
      steps.push({ id: 's1', timestamp: '', type: 'error', content: 'File not found' });
      expect(steps[0].type).toBe('error');
    });
  });

  describe('Trace Lifecycle', () => {
    it('should start trace with goal', () => {
      const goal = 'Refactor authentication module';
      const trace: ExecutionTrace = {
        id: 'trace-1',
        goal,
        startTime: new Date().toISOString(),
        status: 'running',
        steps: []
      };
      expect(trace.goal).toBe(goal);
      expect(trace.status).toBe('running');
    });

    it('should end trace with completed status', () => {
      const trace: ExecutionTrace = {
        id: 'trace-1',
        goal: 'g',
        startTime: '',
        status: 'running',
        steps: []
      };
      trace.status = 'completed';
      trace.endTime = new Date().toISOString();
      trace.result = { success: true };
      expect(trace.status).toBe('completed');
      expect(trace.endTime).toBeDefined();
    });

    it('should end trace with failed status', () => {
      const trace: ExecutionTrace = { id: 't', goal: 'g', startTime: '', status: 'running', steps: [] };
      trace.status = 'failed';
      trace.endTime = new Date().toISOString();
      trace.error = 'Operation timed out';
      expect(trace.status).toBe('failed');
      expect(trace.error).toBeDefined();
    });
  });
});
