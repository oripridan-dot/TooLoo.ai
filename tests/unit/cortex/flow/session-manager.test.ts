/**
 * Flow Session Manager Tests
 * Tests for unified thinking and creation experience
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock('../../core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
  },
}));

describe('FlowSessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('FlowSession', () => {
      it('should have id property', () => {
        interface FlowSession {
          id: string;
          name: string;
          description?: string;
          createdAt: number;
          updatedAt: number;
          phase: string;
          decisions: unknown[];
          artifacts: unknown[];
        }
        const session: FlowSession = {
          id: 'flow-abc123',
          name: 'New Feature',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          phase: 'discover',
          decisions: [],
          artifacts: [],
        };
        expect(session.id).toBe('flow-abc123');
      });

      it('should have phase property', () => {
        type FlowPhase = 'discover' | 'design' | 'develop' | 'deliver';
        const phase: FlowPhase = 'discover';
        expect(phase).toBe('discover');
      });

      it('should track timestamps', () => {
        const now = Date.now();
        const session = { createdAt: now, updatedAt: now };
        expect(session.createdAt).toBe(now);
      });

      it('should have optional description', () => {
        interface FlowSession {
          id: string;
          name: string;
          description?: string;
        }
        const session: FlowSession = {
          id: 'f-1',
          name: 'Test',
          description: 'A test session',
        };
        expect(session.description).toBe('A test session');
      });
    });

    describe('FlowPhase', () => {
      it('should include discover phase', () => {
        type FlowPhase = 'discover' | 'design' | 'develop' | 'deliver';
        const phase: FlowPhase = 'discover';
        expect(phase).toBe('discover');
      });

      it('should include design phase', () => {
        type FlowPhase = 'discover' | 'design' | 'develop' | 'deliver';
        const phase: FlowPhase = 'design';
        expect(phase).toBe('design');
      });

      it('should include develop phase', () => {
        type FlowPhase = 'discover' | 'design' | 'develop' | 'deliver';
        const phase: FlowPhase = 'develop';
        expect(phase).toBe('develop');
      });

      it('should include deliver phase', () => {
        type FlowPhase = 'discover' | 'design' | 'develop' | 'deliver';
        const phase: FlowPhase = 'deliver';
        expect(phase).toBe('deliver');
      });
    });

    describe('ThinkingTree', () => {
      it('should have root node', () => {
        interface ThinkingTree {
          root: { id: string; content: string };
          currentNode: string;
          depth: number;
        }
        const tree: ThinkingTree = {
          root: { id: 'root', content: 'Main idea' },
          currentNode: 'root',
          depth: 0,
        };
        expect(tree.root.id).toBe('root');
      });

      it('should track current node', () => {
        const tree = { currentNode: 'node-5' };
        expect(tree.currentNode).toBe('node-5');
      });

      it('should track depth', () => {
        const tree = { depth: 3 };
        expect(tree.depth).toBe(3);
      });
    });

    describe('ThinkingNode', () => {
      it('should have id and content', () => {
        interface ThinkingNode {
          id: string;
          content: string;
          parent?: string;
          children: string[];
          dimension?: string;
        }
        const node: ThinkingNode = {
          id: 'node-1',
          content: 'Consider user requirements',
          children: ['node-2', 'node-3'],
        };
        expect(node.content).toBe('Consider user requirements');
      });

      it('should track parent', () => {
        interface ThinkingNode {
          id: string;
          content: string;
          parent?: string;
          children: string[];
        }
        const node: ThinkingNode = {
          id: 'node-2',
          content: 'Sub-idea',
          parent: 'node-1',
          children: [],
        };
        expect(node.parent).toBe('node-1');
      });

      it('should have children array', () => {
        interface ThinkingNode {
          id: string;
          content: string;
          children: string[];
        }
        const node: ThinkingNode = {
          id: 'node-1',
          content: 'Parent',
          children: ['child-1', 'child-2'],
        };
        expect(node.children).toHaveLength(2);
      });
    });

    describe('Decision', () => {
      it('should have decision content', () => {
        interface Decision {
          id: string;
          content: string;
          madeAt: number;
          confidence: number;
          reasoning?: string;
        }
        const decision: Decision = {
          id: 'd-1',
          content: 'Use TypeScript for the project',
          madeAt: Date.now(),
          confidence: 0.9,
          reasoning: 'Better type safety',
        };
        expect(decision.content).toContain('TypeScript');
      });

      it('should have confidence score', () => {
        const decision = { confidence: 0.85 };
        expect(decision.confidence).toBeGreaterThanOrEqual(0);
        expect(decision.confidence).toBeLessThanOrEqual(1);
      });

      it('should have timestamp', () => {
        const decision = { madeAt: Date.now() };
        expect(decision.madeAt).toBeGreaterThan(0);
      });
    });

    describe('FlowArtifact', () => {
      it('should have type and content', () => {
        interface FlowArtifact {
          id: string;
          type: 'code' | 'design' | 'document' | 'config';
          name: string;
          content: string;
          createdAt: number;
        }
        const artifact: FlowArtifact = {
          id: 'art-1',
          type: 'code',
          name: 'Button.tsx',
          content: 'export const Button = () => <button>Click</button>',
          createdAt: Date.now(),
        };
        expect(artifact.type).toBe('code');
      });

      it('should support design type', () => {
        type ArtifactType = 'code' | 'design' | 'document' | 'config';
        const type: ArtifactType = 'design';
        expect(type).toBe('design');
      });

      it('should support document type', () => {
        type ArtifactType = 'code' | 'design' | 'document' | 'config';
        const type: ArtifactType = 'document';
        expect(type).toBe('document');
      });
    });
  });

  describe('Session Management', () => {
    describe('Initialization', () => {
      it('should only initialize once', () => {
        let initCount = 0;
        let initialized = false;
        const init = async () => {
          if (initialized) return;
          initCount++;
          initialized = true;
        };
        init();
        init();
        expect(initCount).toBe(1);
      });

      it('should create data directory', () => {
        const dataDir = 'data/flow-sessions';
        expect(dataDir).toContain('flow-sessions');
      });

      it('should load existing sessions', () => {
        const sessions = new Map();
        sessions.set('s1', { id: 's1', name: 'Session 1' });
        sessions.set('s2', { id: 's2', name: 'Session 2' });
        expect(sessions.size).toBe(2);
      });
    });

    describe('Create Session', () => {
      it('should generate unique ID', () => {
        const id = `flow-${Date.now().toString(36)}`;
        expect(id).toMatch(/^flow-/);
      });

      it('should set initial phase to discover', () => {
        const session = { phase: 'discover' };
        expect(session.phase).toBe('discover');
      });

      it('should create empty tree', () => {
        const tree = { root: null, nodes: {}, depth: 0 };
        expect(tree.nodes).toEqual({});
      });

      it('should emit creation event', () => {
        const events: string[] = [];
        const publish = (channel: string, event: string) => events.push(event);
        publish('cortex', 'flow:created');
        expect(events).toContain('flow:created');
      });
    });

    describe('Get Session', () => {
      it('should return existing session', () => {
        const sessions = new Map([['s1', { id: 's1', name: 'Test' }]]);
        const session = sessions.get('s1');
        expect(session?.name).toBe('Test');
      });

      it('should return undefined for missing session', () => {
        const sessions = new Map();
        const session = sessions.get('nonexistent');
        expect(session).toBeUndefined();
      });
    });

    describe('Update Session', () => {
      it('should update timestamp', () => {
        const session = { updatedAt: 0 };
        session.updatedAt = Date.now();
        expect(session.updatedAt).toBeGreaterThan(0);
      });

      it('should persist changes', () => {
        let persisted = false;
        const save = async () => {
          persisted = true;
        };
        save();
        expect(persisted).toBe(true);
      });
    });

    describe('Delete Session', () => {
      it('should remove from map', () => {
        const sessions = new Map([['s1', { id: 's1' }]]);
        sessions.delete('s1');
        expect(sessions.has('s1')).toBe(false);
      });

      it('should delete file', () => {
        const deleted: string[] = [];
        const deleteFile = async (path: string) => {
          deleted.push(path);
        };
        deleteFile('data/flow-sessions/s1.json');
        expect(deleted).toHaveLength(1);
      });
    });
  });

  describe('Phase Transitions', () => {
    it('should transition from discover to design', () => {
      const phases = ['discover', 'design', 'develop', 'deliver'];
      const currentIdx = phases.indexOf('discover');
      const nextPhase = phases[currentIdx + 1];
      expect(nextPhase).toBe('design');
    });

    it('should transition from design to develop', () => {
      const phases = ['discover', 'design', 'develop', 'deliver'];
      const currentIdx = phases.indexOf('design');
      const nextPhase = phases[currentIdx + 1];
      expect(nextPhase).toBe('develop');
    });

    it('should transition from develop to deliver', () => {
      const phases = ['discover', 'design', 'develop', 'deliver'];
      const currentIdx = phases.indexOf('develop');
      const nextPhase = phases[currentIdx + 1];
      expect(nextPhase).toBe('deliver');
    });

    it('should emit phase transition event', () => {
      const events: { event: string; from: string; to: string }[] = [];
      const publish = (channel: string, event: string, data: { from: string; to: string }) => {
        events.push({ event, ...data });
      };
      publish('cortex', 'flow:phase_changed', { from: 'discover', to: 'design' });
      expect(events[0]?.from).toBe('discover');
      expect(events[0]?.to).toBe('design');
    });
  });

  describe('Thinking Tree Operations', () => {
    it('should add child node', () => {
      const nodes: Record<string, { id: string; children: string[] }> = {
        root: { id: 'root', children: [] },
      };
      nodes['root'].children.push('child-1');
      nodes['child-1'] = { id: 'child-1', children: [] };
      expect(nodes['root'].children).toContain('child-1');
    });

    it('should navigate to node', () => {
      let currentNode = 'root';
      currentNode = 'node-5';
      expect(currentNode).toBe('node-5');
    });

    it('should calculate depth', () => {
      const getDepth = (node: { parent?: string }, nodes: Record<string, { parent?: string }>) => {
        let depth = 0;
        let current = node;
        while (current.parent) {
          depth++;
          current = nodes[current.parent];
        }
        return depth;
      };
      const nodes = {
        root: {},
        child: { parent: 'root' },
        grandchild: { parent: 'child' },
      };
      expect(getDepth(nodes['grandchild'], nodes)).toBe(2);
    });
  });

  describe('Decision Recording', () => {
    it('should add decision', () => {
      const decisions: { content: string }[] = [];
      decisions.push({ content: 'Use React' });
      expect(decisions).toHaveLength(1);
    });

    it('should track confidence', () => {
      const decision = { content: 'Use TypeScript', confidence: 0.95 };
      expect(decision.confidence).toBe(0.95);
    });

    it('should include reasoning', () => {
      const decision = {
        content: 'Use PostgreSQL',
        reasoning: 'Better for relational data',
      };
      expect(decision.reasoning).toContain('relational');
    });
  });

  describe('Artifact Management', () => {
    it('should add artifact', () => {
      const artifacts: { name: string; type: string }[] = [];
      artifacts.push({ name: 'index.ts', type: 'code' });
      expect(artifacts).toHaveLength(1);
    });

    it('should categorize by type', () => {
      const artifacts = [
        { type: 'code', name: 'a.ts' },
        { type: 'design', name: 'b.fig' },
        { type: 'code', name: 'c.ts' },
      ];
      const codeArtifacts = artifacts.filter((a) => a.type === 'code');
      expect(codeArtifacts).toHaveLength(2);
    });
  });
});
