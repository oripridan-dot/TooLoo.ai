// @version 3.3.573
/**
 * Flow Types Test Suite
 * @version 3.3.510
 *
 * Tests for the Flow System type definitions including:
 * - FlowSession structure
 * - ThinkingTree and ThinkingNode operations
 * - Dimension types and templates
 * - Options and decisions
 * - Message structures
 * - Knowledge and readiness tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS (mirror from types.ts)
// ============================================================================

type FlowPhase = 'discover' | 'explore' | 'refine' | 'build' | 'validate' | 'ship';

type DimensionType =
  | 'design'
  | 'technical'
  | 'user'
  | 'business'
  | 'ethical'
  | 'operational'
  | 'data'
  | 'ecosystem'
  | 'legal'
  | 'competitive'
  | 'risk'
  | 'growth'
  | 'accessibility'
  | 'security'
  | 'custom';

type DimensionStatus = 'not-started' | 'exploring' | 'decided' | 'revisit' | 'blocked';

type OptionType =
  | 'direction'
  | 'layout'
  | 'component'
  | 'color'
  | 'typography'
  | 'architecture'
  | 'feature'
  | 'flow'
  | 'data-model'
  | 'integration'
  | 'strategy'
  | 'concept'
  | 'custom';

interface FlowSession {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  phase: FlowPhase;
  tree: ThinkingTree;
  decisions: Decision[];
  knowledge: ExtendedKnowledge;
  artifacts: FlowArtifact[];
  readiness: DimensionReadiness[];
  git?: GitContext;
  qa?: QAHandoff;
  metadata: SessionMetadata;
}

interface SessionMetadata {
  totalMessages: number;
  totalOptions: number;
  collectedCount: number;
  dismissedCount: number;
  branchCount: number;
}

interface ThinkingTree {
  root: ThinkingNode;
  currentPath: string[];
}

interface ThinkingNode {
  id: string;
  type: 'prompt' | 'dimension' | 'option' | 'branch';
  content: NodeContent;
  messages: FlowMessage[];
  children: ThinkingNode[];
  status: 'active' | 'collected' | 'dismissed' | 'archived';
  decision?: Decision;
  createdAt: number;
  updatedAt: number;
}

type NodeContent =
  | { type: 'prompt'; text: string }
  | { type: 'dimension'; dimension: ThinkingDimension }
  | { type: 'option'; option: FlowOption }
  | { type: 'branch'; label: string; reason: string };

interface ThinkingDimension {
  id: string;
  type: DimensionType;
  icon: string;
  title: string;
  question: string;
  quickOptions: QuickOption[];
  affects: DimensionRelation[];
  status: DimensionStatus;
  confidence: number;
}

interface QuickOption {
  id: string;
  label: string;
  description?: string;
  implications: string[];
  icon?: string;
}

interface DimensionRelation {
  dimensionType: DimensionType;
  relationship: 'requires' | 'conflicts' | 'informs' | 'blocks';
  description: string;
}

interface FlowOption {
  id: string;
  index: number;
  type: OptionType;
  title: string;
  insight: string;
  preview?: OptionPreview;
  content?: OptionContent;
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  status: 'presented' | 'exploring' | 'collected' | 'dismissed';
  dismissReason?: string;
  collectedAt?: number;
  collectedVersion?: number;
}

interface OptionPreview {
  type: 'component' | 'svg' | 'image' | 'code' | 'diagram';
  content: string;
  language?: string;
  thumbnail?: string;
}

interface OptionContent {
  summary: string;
  details: string[];
  pros?: string[];
  cons?: string[];
}

interface Decision {
  id: string;
  dimensionType: DimensionType;
  title: string;
  description: string;
  sourceNodeId: string;
  sourceOptionId?: string;
  implications: string[];
  affectsDimensions: DimensionType[];
  status: 'firm' | 'tentative' | 'revisiting';
  confidence: number;
  createdAt: number;
  revisedAt?: number;
  revisionHistory?: DecisionRevision[];
}

interface DecisionRevision {
  timestamp: number;
  previousValue: string;
  reason: string;
}

interface FlowMessage {
  id: string;
  role: 'user' | 'tooloo';
  content: string;
  response?: FlowResponse;
  timestamp: number;
  nodeId: string;
}

interface FlowResponse {
  message: string;
  options?: FlowOption[];
  dimensions?: ThinkingDimension[];
  context: ResponseContext;
  insights?: ResponseInsights;
  actions?: ResponseAction[];
}

interface ResponseContext {
  phase: FlowPhase;
  currentDimension?: DimensionType;
  collectionSummary: string;
  decisionCount: number;
}

interface ResponseInsights {
  patterns?: string[];
  opportunities?: string[];
  warnings?: string[];
  suggestions?: string[];
}

interface ResponseAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: ActionType;
  data?: Record<string, unknown>;
}

type ActionType =
  | 'explore-dimension'
  | 'collect-option'
  | 'dismiss-option'
  | 'branch-exploration'
  | 'go-back'
  | 'change-phase'
  | 'export'
  | 'handoff-qa'
  | 'custom';

interface ExtendedKnowledge {
  preferences: Preference[];
  explorationInsights: ExplorationInsight[];
  constraints: Constraint[];
  relationships: KnowledgeRelationship[];
}

interface Preference {
  category: string;
  values: string[];
  confidence: number;
}

interface ExplorationInsight {
  nodeId: string;
  insight: string;
  source: 'refinement' | 'dismissal' | 'comparison';
}

interface Constraint {
  type: string;
  description: string;
  source: 'explicit' | 'inferred' | 'conflict';
  dimensionTypes: DimensionType[];
}

interface KnowledgeRelationship {
  from: { dimension: DimensionType; decision: string };
  to: { dimension: DimensionType; implication: string };
  type: 'enables' | 'blocks' | 'influences';
}

interface DimensionReadiness {
  dimensionType: DimensionType;
  status: 'not-started' | 'exploring' | 'ready' | 'needs-attention' | 'blocked';
  decisionCount: number;
  openQuestions: string[];
  blockedBy?: DimensionType[];
}

interface QAHandoff {
  status: 'pending' | 'in-progress' | 'passed' | 'failed' | 'needs-revision';
  handedOffAt?: number;
  completedAt?: number;
  results?: QAResults;
  feedback?: string;
}

interface QAResults {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  coverage?: number;
  issues: QAIssue[];
}

interface QAIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  category: string;
  description: string;
  location?: string;
  suggestion?: string;
}

interface FlowArtifact {
  id: string;
  type: string;
  name: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface GitContext {
  branch: string;
  commit?: string;
  remote?: string;
}

// ============================================================================
// FLOW PHASE TESTS
// ============================================================================

describe('FlowPhase', () => {
  const validPhases: FlowPhase[] = ['discover', 'explore', 'refine', 'build', 'validate', 'ship'];

  it('should have all expected phases', () => {
    expect(validPhases).toHaveLength(6);
  });

  it('should start with discover phase', () => {
    const session: Pick<FlowSession, 'phase'> = { phase: 'discover' };
    expect(session.phase).toBe('discover');
  });

  it('should progress through phases in order', () => {
    const phaseOrder = ['discover', 'explore', 'refine', 'build', 'validate', 'ship'];
    phaseOrder.forEach((phase, index) => {
      expect(validPhases[index]).toBe(phase);
    });
  });

  it('should end with ship phase', () => {
    expect(validPhases[validPhases.length - 1]).toBe('ship');
  });
});

// ============================================================================
// DIMENSION TYPE TESTS
// ============================================================================

describe('DimensionType', () => {
  const dimensions: DimensionType[] = [
    'design',
    'technical',
    'user',
    'business',
    'ethical',
    'operational',
    'data',
    'ecosystem',
    'legal',
    'competitive',
    'risk',
    'growth',
    'accessibility',
    'security',
    'custom',
  ];

  it('should have 15 dimension types', () => {
    expect(dimensions).toHaveLength(15);
  });

  it('should include core design dimension', () => {
    expect(dimensions).toContain('design');
  });

  it('should include technical dimension', () => {
    expect(dimensions).toContain('technical');
  });

  it('should include user-centric dimension', () => {
    expect(dimensions).toContain('user');
  });

  it('should include business dimension', () => {
    expect(dimensions).toContain('business');
  });

  it('should include ethical dimension', () => {
    expect(dimensions).toContain('ethical');
  });

  it('should support custom dimensions', () => {
    expect(dimensions).toContain('custom');
  });
});

// ============================================================================
// FLOW SESSION TESTS
// ============================================================================

describe('FlowSession', () => {
  function createEmptySession(name: string): FlowSession {
    return {
      id: 'flow-test-123',
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: 'discover',
      tree: {
        root: {
          id: 'root',
          type: 'prompt',
          content: { type: 'prompt', text: 'Initial prompt' },
          messages: [],
          children: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        currentPath: ['root'],
      },
      decisions: [],
      knowledge: {
        preferences: [],
        explorationInsights: [],
        constraints: [],
        relationships: [],
      },
      artifacts: [],
      readiness: [],
      metadata: {
        totalMessages: 0,
        totalOptions: 0,
        collectedCount: 0,
        dismissedCount: 0,
        branchCount: 0,
      },
    };
  }

  it('should create empty session with name', () => {
    const session = createEmptySession('Test Project');
    expect(session.name).toBe('Test Project');
  });

  it('should start in discover phase', () => {
    const session = createEmptySession('Test');
    expect(session.phase).toBe('discover');
  });

  it('should have empty decisions', () => {
    const session = createEmptySession('Test');
    expect(session.decisions).toHaveLength(0);
  });

  it('should have root node in tree', () => {
    const session = createEmptySession('Test');
    expect(session.tree.root).toBeDefined();
    expect(session.tree.root.id).toBe('root');
  });

  it('should have current path starting at root', () => {
    const session = createEmptySession('Test');
    expect(session.tree.currentPath).toContain('root');
  });

  it('should have empty metadata counts', () => {
    const session = createEmptySession('Test');
    expect(session.metadata.totalMessages).toBe(0);
    expect(session.metadata.totalOptions).toBe(0);
    expect(session.metadata.collectedCount).toBe(0);
  });

  it('should support optional description', () => {
    const session = createEmptySession('Test');
    session.description = 'A test project description';
    expect(session.description).toBe('A test project description');
  });

  it('should support optional git context', () => {
    const session = createEmptySession('Test');
    session.git = { branch: 'main', commit: 'abc123' };
    expect(session.git?.branch).toBe('main');
    expect(session.git?.commit).toBe('abc123');
  });
});

// ============================================================================
// THINKING TREE TESTS
// ============================================================================

describe('ThinkingTree', () => {
  function createTree(): ThinkingTree {
    return {
      root: {
        id: 'root',
        type: 'prompt',
        content: { type: 'prompt', text: 'What do you want to build?' },
        messages: [],
        children: [],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      currentPath: ['root'],
    };
  }

  it('should have root node', () => {
    const tree = createTree();
    expect(tree.root).toBeDefined();
  });

  it('should track current path', () => {
    const tree = createTree();
    expect(tree.currentPath).toEqual(['root']);
  });

  it('should support adding children', () => {
    const tree = createTree();
    const child: ThinkingNode = {
      id: 'child-1',
      type: 'branch',
      content: { type: 'branch', label: 'Option A', reason: 'Exploring option' },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    tree.root.children.push(child);
    expect(tree.root.children).toHaveLength(1);
  });

  it('should update current path on navigation', () => {
    const tree = createTree();
    tree.root.children.push({
      id: 'child-1',
      type: 'branch',
      content: { type: 'branch', label: 'Branch', reason: 'Test' },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    tree.currentPath = ['root', 'child-1'];
    expect(tree.currentPath).toEqual(['root', 'child-1']);
  });
});

// ============================================================================
// THINKING NODE TESTS
// ============================================================================

describe('ThinkingNode', () => {
  it('should create prompt node', () => {
    const node: ThinkingNode = {
      id: 'node-1',
      type: 'prompt',
      content: { type: 'prompt', text: 'User question' },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(node.type).toBe('prompt');
    expect(node.content.type).toBe('prompt');
  });

  it('should create dimension node', () => {
    const dimension: ThinkingDimension = {
      id: 'dim-1',
      type: 'design',
      icon: '🎨',
      title: 'Design',
      question: 'How should it look?',
      quickOptions: [],
      affects: [],
      status: 'not-started',
      confidence: 0,
    };
    const node: ThinkingNode = {
      id: 'node-2',
      type: 'dimension',
      content: { type: 'dimension', dimension },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(node.type).toBe('dimension');
  });

  it('should create branch node', () => {
    const node: ThinkingNode = {
      id: 'node-3',
      type: 'branch',
      content: { type: 'branch', label: 'Alternative', reason: 'Exploring options' },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(node.type).toBe('branch');
  });

  it('should have valid status values', () => {
    const statuses: ThinkingNode['status'][] = ['active', 'collected', 'dismissed', 'archived'];
    statuses.forEach((status) => {
      const node: ThinkingNode = {
        id: 'test',
        type: 'prompt',
        content: { type: 'prompt', text: 'test' },
        messages: [],
        children: [],
        status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(node.status).toBe(status);
    });
  });

  it('should support optional decision', () => {
    const node: ThinkingNode = {
      id: 'node-4',
      type: 'option',
      content: { type: 'option', option: {} as FlowOption },
      messages: [],
      children: [],
      status: 'collected',
      decision: {
        id: 'dec-1',
        dimensionType: 'design',
        title: 'Minimal design',
        description: 'Using minimal design approach',
        sourceNodeId: 'node-4',
        implications: [],
        affectsDimensions: [],
        status: 'firm',
        confidence: 0.9,
        createdAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(node.decision?.title).toBe('Minimal design');
  });
});

// ============================================================================
// THINKING DIMENSION TESTS
// ============================================================================

describe('ThinkingDimension', () => {
  it('should create dimension with required fields', () => {
    const dimension: ThinkingDimension = {
      id: 'dim-design',
      type: 'design',
      icon: '🎨',
      title: 'Design Direction',
      question: 'What visual style fits your vision?',
      quickOptions: [],
      affects: [],
      status: 'not-started',
      confidence: 0,
    };
    expect(dimension.type).toBe('design');
    expect(dimension.question).toContain('visual');
  });

  it('should support quick options', () => {
    const dimension: ThinkingDimension = {
      id: 'dim-tech',
      type: 'technical',
      icon: '⚙️',
      title: 'Technical Stack',
      question: 'What technology should we use?',
      quickOptions: [
        { id: 'react', label: 'React', implications: ['component-based', 'SPA'] },
        { id: 'vue', label: 'Vue', implications: ['progressive', 'simple'] },
      ],
      affects: [],
      status: 'not-started',
      confidence: 0,
    };
    expect(dimension.quickOptions).toHaveLength(2);
  });

  it('should track affects relationships', () => {
    const dimension: ThinkingDimension = {
      id: 'dim-data',
      type: 'data',
      icon: '📊',
      title: 'Data Architecture',
      question: 'How should data be structured?',
      quickOptions: [],
      affects: [
        {
          dimensionType: 'security',
          relationship: 'informs',
          description: 'Data structure affects security',
        },
        {
          dimensionType: 'technical',
          relationship: 'requires',
          description: 'Requires tech decisions',
        },
      ],
      status: 'exploring',
      confidence: 0.5,
    };
    expect(dimension.affects).toHaveLength(2);
    expect(dimension.affects[0].relationship).toBe('informs');
  });

  it('should track confidence 0-1', () => {
    const dimension: ThinkingDimension = {
      id: 'dim-test',
      type: 'custom',
      icon: '🔧',
      title: 'Test',
      question: 'Test?',
      quickOptions: [],
      affects: [],
      status: 'decided',
      confidence: 0.95,
    };
    expect(dimension.confidence).toBeGreaterThanOrEqual(0);
    expect(dimension.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// FLOW OPTION TESTS
// ============================================================================

describe('FlowOption', () => {
  it('should create basic option', () => {
    const option: FlowOption = {
      id: 'opt-1',
      index: 1,
      type: 'direction',
      title: 'Minimal Approach',
      insight: 'Clean, focused, simple',
      tags: ['minimal', 'clean'],
      complexity: 'simple',
      status: 'presented',
    };
    expect(option.type).toBe('direction');
    expect(option.complexity).toBe('simple');
  });

  it('should support preview types', () => {
    const option: FlowOption = {
      id: 'opt-2',
      index: 2,
      type: 'layout',
      title: 'Grid Layout',
      insight: 'Modern grid-based design',
      preview: {
        type: 'svg',
        content: '<svg>...</svg>',
        thumbnail: 'data:image/png...',
      },
      tags: ['grid', 'modern'],
      complexity: 'moderate',
      status: 'presented',
    };
    expect(option.preview?.type).toBe('svg');
  });

  it('should support content with pros/cons', () => {
    const option: FlowOption = {
      id: 'opt-3',
      index: 3,
      type: 'architecture',
      title: 'Microservices',
      insight: 'Scalable but complex',
      content: {
        summary: 'Distributed architecture',
        details: ['Independent services', 'API-based communication'],
        pros: ['Scalability', 'Team independence'],
        cons: ['Complexity', 'Network overhead'],
      },
      tags: ['architecture', 'microservices'],
      complexity: 'complex',
      status: 'exploring',
    };
    expect(option.content?.pros).toContain('Scalability');
    expect(option.content?.cons).toContain('Complexity');
  });

  it('should track collected options', () => {
    const option: FlowOption = {
      id: 'opt-4',
      index: 4,
      type: 'color',
      title: 'Blue Theme',
      insight: 'Professional, trustworthy',
      tags: ['color', 'blue'],
      complexity: 'simple',
      status: 'collected',
      collectedAt: Date.now(),
      collectedVersion: 1,
    };
    expect(option.status).toBe('collected');
    expect(option.collectedAt).toBeDefined();
  });

  it('should track dismissed options with reason', () => {
    const option: FlowOption = {
      id: 'opt-5',
      index: 5,
      type: 'typography',
      title: 'Serif Fonts',
      insight: 'Traditional, elegant',
      tags: ['typography', 'serif'],
      complexity: 'simple',
      status: 'dismissed',
      dismissReason: 'Too traditional for brand',
    };
    expect(option.status).toBe('dismissed');
    expect(option.dismissReason).toBe('Too traditional for brand');
  });
});

// ============================================================================
// DECISION TESTS
// ============================================================================

describe('Decision', () => {
  it('should create firm decision', () => {
    const decision: Decision = {
      id: 'dec-1',
      dimensionType: 'design',
      title: 'Minimal Design',
      description: 'Using minimal, clean aesthetic',
      sourceNodeId: 'node-123',
      sourceOptionId: 'opt-1',
      implications: ['Fewer elements', 'More whitespace'],
      affectsDimensions: ['technical', 'user'],
      status: 'firm',
      confidence: 0.9,
      createdAt: Date.now(),
    };
    expect(decision.status).toBe('firm');
    expect(decision.confidence).toBe(0.9);
  });

  it('should support tentative decisions', () => {
    const decision: Decision = {
      id: 'dec-2',
      dimensionType: 'technical',
      title: 'Consider React',
      description: 'Leaning toward React but not final',
      sourceNodeId: 'node-456',
      implications: [],
      affectsDimensions: [],
      status: 'tentative',
      confidence: 0.5,
      createdAt: Date.now(),
    };
    expect(decision.status).toBe('tentative');
  });

  it('should track revision history', () => {
    const decision: Decision = {
      id: 'dec-3',
      dimensionType: 'business',
      title: 'Freemium Model',
      description: 'Changed from subscription',
      sourceNodeId: 'node-789',
      implications: [],
      affectsDimensions: [],
      status: 'revisiting',
      confidence: 0.7,
      createdAt: Date.now() - 86400000,
      revisedAt: Date.now(),
      revisionHistory: [
        {
          timestamp: Date.now() - 86400000,
          previousValue: 'Subscription Model',
          reason: 'Market research suggested freemium better',
        },
      ],
    };
    expect(decision.revisionHistory).toHaveLength(1);
    expect(decision.revisedAt).toBeDefined();
  });

  it('should track affected dimensions', () => {
    const decision: Decision = {
      id: 'dec-4',
      dimensionType: 'data',
      title: 'Cloud Storage',
      description: 'Using cloud-based storage',
      sourceNodeId: 'node-abc',
      implications: ['Scalable', 'Requires internet'],
      affectsDimensions: ['security', 'operational', 'legal'],
      status: 'firm',
      confidence: 0.85,
      createdAt: Date.now(),
    };
    expect(decision.affectsDimensions).toContain('security');
    expect(decision.affectsDimensions).toHaveLength(3);
  });
});

// ============================================================================
// FLOW MESSAGE TESTS
// ============================================================================

describe('FlowMessage', () => {
  it('should create user message', () => {
    const message: FlowMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'I want to build a dashboard',
      timestamp: Date.now(),
      nodeId: 'root',
    };
    expect(message.role).toBe('user');
    expect(message.content).toContain('dashboard');
  });

  it('should create tooloo response with options', () => {
    const message: FlowMessage = {
      id: 'msg-2',
      role: 'tooloo',
      content: 'Great! Here are some directions...',
      response: {
        message: 'Great! Here are some directions...',
        options: [
          {
            id: 'opt-1',
            index: 1,
            type: 'direction',
            title: 'Analytics Focus',
            insight: 'Data-driven dashboard',
            tags: ['analytics'],
            complexity: 'moderate',
            status: 'presented',
          },
        ],
        context: {
          phase: 'discover',
          collectionSummary: 'No decisions yet',
          decisionCount: 0,
        },
      },
      timestamp: Date.now(),
      nodeId: 'root',
    };
    expect(message.role).toBe('tooloo');
    expect(message.response?.options).toHaveLength(1);
  });

  it('should include response insights', () => {
    const message: FlowMessage = {
      id: 'msg-3',
      role: 'tooloo',
      content: 'I noticed a pattern...',
      response: {
        message: 'I noticed a pattern...',
        context: {
          phase: 'explore',
          collectionSummary: '2 decisions',
          decisionCount: 2,
        },
        insights: {
          patterns: ['You prefer minimal designs'],
          opportunities: ['Consider dark mode'],
          warnings: ['This might conflict with accessibility'],
          suggestions: ['Explore color dimensions next'],
        },
      },
      timestamp: Date.now(),
      nodeId: 'node-123',
    };
    expect(message.response?.insights?.patterns).toContain('You prefer minimal designs');
    expect(message.response?.insights?.warnings).toHaveLength(1);
  });

  it('should include response actions', () => {
    const message: FlowMessage = {
      id: 'msg-4',
      role: 'tooloo',
      content: 'Ready to move forward?',
      response: {
        message: 'Ready to move forward?',
        context: {
          phase: 'refine',
          collectionSummary: '5 decisions',
          decisionCount: 5,
        },
        actions: [
          { id: 'act-1', label: 'Explore Design', type: 'primary', action: 'explore-dimension' },
          { id: 'act-2', label: 'Go Back', type: 'secondary', action: 'go-back' },
          { id: 'act-3', label: 'Export', type: 'secondary', action: 'export' },
        ],
      },
      timestamp: Date.now(),
      nodeId: 'node-456',
    };
    expect(message.response?.actions).toHaveLength(3);
    expect(message.response?.actions?.[0].action).toBe('explore-dimension');
  });
});

// ============================================================================
// EXTENDED KNOWLEDGE TESTS
// ============================================================================

describe('ExtendedKnowledge', () => {
  it('should track preferences', () => {
    const knowledge: ExtendedKnowledge = {
      preferences: [
        { category: 'design', values: ['minimal', 'clean'], confidence: 0.8 },
        { category: 'color', values: ['blue', 'neutral'], confidence: 0.7 },
      ],
      explorationInsights: [],
      constraints: [],
      relationships: [],
    };
    expect(knowledge.preferences).toHaveLength(2);
    expect(knowledge.preferences[0].values).toContain('minimal');
  });

  it('should track exploration insights', () => {
    const knowledge: ExtendedKnowledge = {
      preferences: [],
      explorationInsights: [
        { nodeId: 'node-1', insight: 'User prefers simplicity', source: 'refinement' },
        { nodeId: 'node-2', insight: 'Dismissed complex options', source: 'dismissal' },
      ],
      constraints: [],
      relationships: [],
    };
    expect(knowledge.explorationInsights).toHaveLength(2);
    expect(knowledge.explorationInsights[1].source).toBe('dismissal');
  });

  it('should track constraints', () => {
    const knowledge: ExtendedKnowledge = {
      preferences: [],
      explorationInsights: [],
      constraints: [
        {
          type: 'budget',
          description: 'Limited to $5000 budget',
          source: 'explicit',
          dimensionTypes: ['operational', 'technical'],
        },
        {
          type: 'timeline',
          description: 'Must launch in Q1',
          source: 'explicit',
          dimensionTypes: ['operational'],
        },
      ],
      relationships: [],
    };
    expect(knowledge.constraints).toHaveLength(2);
    expect(knowledge.constraints[0].source).toBe('explicit');
  });

  it('should track cross-dimension relationships', () => {
    const knowledge: ExtendedKnowledge = {
      preferences: [],
      explorationInsights: [],
      constraints: [],
      relationships: [
        {
          from: { dimension: 'design', decision: 'Minimal UI' },
          to: { dimension: 'technical', implication: 'Less complex frontend' },
          type: 'enables',
        },
        {
          from: { dimension: 'security', decision: 'Encryption required' },
          to: { dimension: 'data', implication: 'Must encrypt at rest' },
          type: 'influences',
        },
      ],
    };
    expect(knowledge.relationships).toHaveLength(2);
    expect(knowledge.relationships[0].type).toBe('enables');
  });
});

// ============================================================================
// DIMENSION READINESS TESTS
// ============================================================================

describe('DimensionReadiness', () => {
  it('should track not-started dimension', () => {
    const readiness: DimensionReadiness = {
      dimensionType: 'legal',
      status: 'not-started',
      decisionCount: 0,
      openQuestions: ['What compliance is needed?', 'Any IP concerns?'],
    };
    expect(readiness.status).toBe('not-started');
    expect(readiness.openQuestions).toHaveLength(2);
  });

  it('should track exploring dimension', () => {
    const readiness: DimensionReadiness = {
      dimensionType: 'design',
      status: 'exploring',
      decisionCount: 1,
      openQuestions: ['What about mobile?'],
    };
    expect(readiness.status).toBe('exploring');
    expect(readiness.decisionCount).toBe(1);
  });

  it('should track ready dimension', () => {
    const readiness: DimensionReadiness = {
      dimensionType: 'technical',
      status: 'ready',
      decisionCount: 4,
      openQuestions: [],
    };
    expect(readiness.status).toBe('ready');
    expect(readiness.openQuestions).toHaveLength(0);
  });

  it('should track blocked dimension', () => {
    const readiness: DimensionReadiness = {
      dimensionType: 'data',
      status: 'blocked',
      decisionCount: 0,
      openQuestions: ['What data to collect?'],
      blockedBy: ['legal', 'security'],
    };
    expect(readiness.status).toBe('blocked');
    expect(readiness.blockedBy).toContain('legal');
  });
});

// ============================================================================
// QA HANDOFF TESTS
// ============================================================================

describe('QAHandoff', () => {
  it('should track pending handoff', () => {
    const handoff: QAHandoff = {
      status: 'pending',
    };
    expect(handoff.status).toBe('pending');
    expect(handoff.handedOffAt).toBeUndefined();
  });

  it('should track in-progress QA', () => {
    const handoff: QAHandoff = {
      status: 'in-progress',
      handedOffAt: Date.now() - 3600000,
    };
    expect(handoff.status).toBe('in-progress');
    expect(handoff.handedOffAt).toBeDefined();
  });

  it('should track passed QA with results', () => {
    const handoff: QAHandoff = {
      status: 'passed',
      handedOffAt: Date.now() - 7200000,
      completedAt: Date.now(),
      results: {
        testsRun: 50,
        testsPassed: 48,
        testsFailed: 2,
        coverage: 0.85,
        issues: [
          {
            id: 'issue-1',
            severity: 'minor',
            category: 'accessibility',
            description: 'Missing alt text',
            suggestion: 'Add alt text to images',
          },
        ],
      },
      feedback: 'Good work! Minor accessibility fixes needed.',
    };
    expect(handoff.status).toBe('passed');
    expect(handoff.results?.testsPassed).toBe(48);
    expect(handoff.results?.coverage).toBe(0.85);
  });

  it('should track failed QA with critical issues', () => {
    const handoff: QAHandoff = {
      status: 'failed',
      handedOffAt: Date.now() - 7200000,
      completedAt: Date.now(),
      results: {
        testsRun: 30,
        testsPassed: 15,
        testsFailed: 15,
        issues: [
          {
            id: 'issue-critical',
            severity: 'critical',
            category: 'security',
            description: 'XSS vulnerability detected',
            location: 'user-input.tsx:45',
            suggestion: 'Sanitize user input',
          },
        ],
      },
      feedback: 'Critical security issues found. Must fix before ship.',
    };
    expect(handoff.status).toBe('failed');
    expect(handoff.results?.issues[0].severity).toBe('critical');
  });
});

// ============================================================================
// RESPONSE ACTION TESTS
// ============================================================================

describe('ResponseAction', () => {
  const actionTypes: ActionType[] = [
    'explore-dimension',
    'collect-option',
    'dismiss-option',
    'branch-exploration',
    'go-back',
    'change-phase',
    'export',
    'handoff-qa',
    'custom',
  ];

  it('should have all action types', () => {
    expect(actionTypes).toHaveLength(9);
  });

  it('should create primary action', () => {
    const action: ResponseAction = {
      id: 'act-1',
      label: 'Continue',
      type: 'primary',
      action: 'explore-dimension',
      data: { dimension: 'design' },
    };
    expect(action.type).toBe('primary');
  });

  it('should create secondary action', () => {
    const action: ResponseAction = {
      id: 'act-2',
      label: 'Go Back',
      type: 'secondary',
      action: 'go-back',
    };
    expect(action.type).toBe('secondary');
  });

  it('should create danger action', () => {
    const action: ResponseAction = {
      id: 'act-3',
      label: 'Dismiss',
      type: 'danger',
      action: 'dismiss-option',
      data: { optionId: 'opt-123' },
    };
    expect(action.type).toBe('danger');
  });
});

// ============================================================================
// OPTION TYPE TESTS
// ============================================================================

describe('OptionType', () => {
  const optionTypes: OptionType[] = [
    'direction',
    'layout',
    'component',
    'color',
    'typography',
    'architecture',
    'feature',
    'flow',
    'data-model',
    'integration',
    'strategy',
    'concept',
    'custom',
  ];

  it('should have 13 option types', () => {
    expect(optionTypes).toHaveLength(13);
  });

  it('should include design-related types', () => {
    expect(optionTypes).toContain('layout');
    expect(optionTypes).toContain('color');
    expect(optionTypes).toContain('typography');
  });

  it('should include technical types', () => {
    expect(optionTypes).toContain('architecture');
    expect(optionTypes).toContain('data-model');
    expect(optionTypes).toContain('integration');
  });

  it('should include strategy types', () => {
    expect(optionTypes).toContain('strategy');
    expect(optionTypes).toContain('direction');
  });

  it('should support custom type', () => {
    expect(optionTypes).toContain('custom');
  });
});

// ============================================================================
// COMPLEXITY TESTS
// ============================================================================

describe('Complexity Levels', () => {
  it('should support simple complexity', () => {
    const option: Pick<FlowOption, 'complexity'> = { complexity: 'simple' };
    expect(option.complexity).toBe('simple');
  });

  it('should support moderate complexity', () => {
    const option: Pick<FlowOption, 'complexity'> = { complexity: 'moderate' };
    expect(option.complexity).toBe('moderate');
  });

  it('should support complex complexity', () => {
    const option: Pick<FlowOption, 'complexity'> = { complexity: 'complex' };
    expect(option.complexity).toBe('complex');
  });
});
