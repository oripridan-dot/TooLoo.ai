// @version 2.1.11
/**
 * DAG Builder Engine
 * 
 * Decomposes high-level intents into structured task graphs.
 * - Parse intent complexity & scope
 * - Generate subtasks with dependencies
 * - Map tasks to optimal stations (builders, testers, designers, etc.)
 * - Track SLAs, Definition of Done, validators
 * - Create visual DAG for UI display
 * 
 * Input: Intent Packet + Execution Plan
 * Output: Task DAG with full metadata for parallel execution
 */

import { v4 as uuidv4 } from 'uuid';

export class DAGBuilder {
  constructor(options = {}) {
    this.config = {
      maxDepth: options.maxDepth || 4,
      maxTasksPerLevel: options.maxTasksPerLevel || 8,
      defaultTimeoutMs: options.defaultTimeoutMs || 300000, // 5 min per task
      defaultConfidenceThreshold: options.defaultConfidenceThreshold || 0.82,
      ...options
    };

    this.dags = new Map(); // dagId -> DAG object
    this.stats = {
      totalDAGs: 0,
      totalTasks: 0,
      avgTasksPerDAG: 0,
      avgDepth: 0
    };

    // Station profiles (worker pools with specialized skills)
    this.stations = {
      planner: { skills: ['planning', 'analysis', 'specification'], maxConcurrent: 2 },
      researcher: { skills: ['research', 'retrieval', 'synthesis'], maxConcurrent: 3 },
      designer: { skills: ['design', 'ux', 'layout', 'visual'], maxConcurrent: 3 },
      builder: { skills: ['coding', 'implementation', 'scripting'], maxConcurrent: 4 },
      tester: { skills: ['testing', 'validation', 'qa'], maxConcurrent: 2 },
      writer: { skills: ['documentation', 'content', 'writing'], maxConcurrent: 2 },
      optimizer: { skills: ['optimization', 'performance', 'refinement'], maxConcurrent: 2 },
      auditor: { skills: ['security', 'compliance', 'review'], maxConcurrent: 2 }
    };
  }

  /**
   * Build a DAG from an intent
   */
  buildDAG(intent) {
    const dagId = uuidv4();
    const dag = {
      id: dagId,
      intentId: intent.id,
      createdAt: new Date().toISOString(),
      status: 'planning',
      nodes: [],
      edges: [], // [{ from: nodeId, to: nodeId }]
      metrics: {
        totalNodes: 0,
        totalEdges: 0,
        depth: 0,
        criticalPath: 0,
        estimatedTimeMs: 0,
        estimatedCostUsd: 0
      }
    };

    // Phase 1: Decompose intent into top-level tasks
    const topLevelTasks = this.decomposeIntent(intent);

    // Phase 2: Create nodes and build dependency graph
    topLevelTasks.forEach((task, idx) => {
      const nodeId = uuidv4();
      dag.nodes.push({
        id: nodeId,
        parentIntentId: intent.id,
        title: task.title,
        description: task.description,
        type: task.type, // 'plan', 'research', 'design', 'build', 'test', 'document', 'optimize', 'audit'
        priority: task.priority || 'normal',
        estimatedTimeMs: task.estimatedTimeMs || 60000,
        estimatedCostUsd: task.estimatedCostUsd || 0.01,
        station: this.assignStation(task.type),
        dependencies: task.dependencies || [],
        dod: task.dod || {}, // Definition of Done (acceptance criteria)
        validators: task.validators || [], // Which validators to run
        timeoutMs: this.config.defaultTimeoutMs,
        confidenceThreshold: this.config.defaultConfidenceThreshold,
        retryCount: 0,
        maxRetries: 2,
        status: 'pending',
        artifacts: [],
        createdAt: new Date().toISOString()
      });

      // Create edges based on dependencies
      task.dependencies.forEach(depIndex => {
        if (depIndex < idx) {
          dag.edges.push({
            from: dag.nodes[depIndex].id,
            to: nodeId,
            type: 'dependency'
          });
        }
      });
    });

    // Phase 3: Calculate metrics
    dag.metrics.totalNodes = dag.nodes.length;
    dag.metrics.totalEdges = dag.edges.length;
    dag.metrics.depth = this.calculateDepth(dag);
    dag.metrics.criticalPath = this.calculateCriticalPath(dag);
    dag.metrics.estimatedTimeMs = dag.nodes.reduce((sum, n) => sum + n.estimatedTimeMs, 0);
    dag.metrics.estimatedCostUsd = dag.nodes.reduce((sum, n) => sum + n.estimatedCostUsd, 0);

    // Store DAG
    this.dags.set(dagId, dag);

    // Update stats
    this.stats.totalDAGs++;
    this.stats.totalTasks += dag.nodes.length;
    this.stats.avgTasksPerDAG = this.stats.totalTasks / this.stats.totalDAGs;
    this.stats.avgDepth = (this.stats.avgDepth + dag.metrics.depth) / 2;

    return dag;
  }

  /**
   * Decompose intent into top-level tasks
   */
  decomposeIntent(intent) {
    const prompt = intent.originalPrompt.toLowerCase();

    // Detect intent patterns and suggest decomposition
    const tasks = [];

    // Always start with planning/analysis
    tasks.push({
      title: 'Analyze Requirements',
      description: 'Parse requirements and identify scope',
      type: 'plan',
      priority: 'high',
      estimatedTimeMs: 45000,
      estimatedCostUsd: 0.005,
      dependencies: []
    });

    // Detect research need
    if (/research|analyze|compare|evaluate|survey/i.test(prompt)) {
      tasks.push({
        title: 'Research & Synthesis',
        description: 'Gather information and synthesize findings',
        type: 'research',
        priority: 'high',
        estimatedTimeMs: 120000,
        estimatedCostUsd: 0.02,
        dependencies: [0]
      });
    }

    // Detect design need
    if (/design|layout|ui|ux|mockup|prototype|wireframe/i.test(prompt)) {
      tasks.push({
        title: 'Design & UX',
        description: 'Create design mockups or wireframes',
        type: 'design',
        priority: 'high',
        estimatedTimeMs: 90000,
        estimatedCostUsd: 0.015,
        dependencies: [0]
      });
    }

    // Detect build/code need
    if (/build|code|implement|create|write|develop|script|api|server|database|frontend/i.test(prompt)) {
      const buildIdx = tasks.length;
      tasks.push({
        title: 'Implementation',
        description: 'Write and implement code/features',
        type: 'build',
        priority: 'high',
        estimatedTimeMs: 150000,
        estimatedCostUsd: 0.025,
        dependencies: [0], // Depends on planning
        dod: {
          compilesWithoutErrors: true,
          passesLinting: true,
          hasBasicTests: true,
          isDocumented: false
        },
        validators: ['lint', 'tests', 'type-check']
      });

      // Add testing after build
      tasks.push({
        title: 'Testing & Validation',
        description: 'Run tests and validate implementation',
        type: 'test',
        priority: 'high',
        estimatedTimeMs: 60000,
        estimatedCostUsd: 0.01,
        dependencies: [buildIdx]
      });
    }

    // Detect documentation need
    if (/document|readme|guide|tutorial|explain|write up/i.test(prompt)) {
      tasks.push({
        title: 'Documentation',
        description: 'Write comprehensive documentation',
        type: 'write',
        priority: 'normal',
        estimatedTimeMs: 75000,
        estimatedCostUsd: 0.01,
        dependencies: [0]
      });
    }

    // Detect optimization need
    if (/optimize|improve|refactor|clean up|performance/i.test(prompt)) {
      const buildIdx = tasks.findIndex(t => t.type === 'build');
      tasks.push({
        title: 'Optimization & Refinement',
        description: 'Optimize performance and code quality',
        type: 'optimize',
        priority: 'normal',
        estimatedTimeMs: 60000,
        estimatedCostUsd: 0.01,
        dependencies: buildIdx >= 0 ? [buildIdx] : [0]
      });
    }

    // Always include security/audit review for substantial work
    if (tasks.length > 2) {
      tasks.push({
        title: 'Security & Compliance Review',
        description: 'Audit for security and best practices',
        type: 'audit',
        priority: 'normal',
        estimatedTimeMs: 45000,
        estimatedCostUsd: 0.01,
        dependencies: [] // Run in parallel
      });
    }

    return tasks;
  }

  /**
   * Assign task to optimal station
   */
  assignStation(taskType) {
    const mapping = {
      plan: 'planner',
      research: 'researcher',
      design: 'designer',
      build: 'builder',
      test: 'tester',
      write: 'writer',
      optimize: 'optimizer',
      audit: 'auditor'
    };
    return mapping[taskType] || 'planner';
  }

  /**
   * Calculate DAG depth
   */
  calculateDepth(dag) {
    if (dag.nodes.length === 0) return 0;

    const depths = new Map();
    const processed = new Set();

    const calculateNodeDepth = (nodeId) => {
      if (depths.has(nodeId)) return depths.get(nodeId);

      const node = dag.nodes.find(n => n.id === nodeId);
      if (!node || node.dependencies.length === 0) {
        depths.set(nodeId, 1);
        return 1;
      }

      const depIndices = node.dependencies;
      const depDepths = depIndices.map(idx => {
        if (idx < dag.nodes.length) {
          return calculateNodeDepth(dag.nodes[idx].id);
        }
        return 1;
      });

      const maxDepth = Math.max(...depDepths, 0) + 1;
      depths.set(nodeId, maxDepth);
      return maxDepth;
    };

    let maxDepth = 0;
    dag.nodes.forEach(node => {
      maxDepth = Math.max(maxDepth, calculateNodeDepth(node.id));
    });

    return maxDepth;
  }

  /**
   * Calculate critical path (longest dependency chain)
   */
  calculateCriticalPath(dag) {
    let totalMs = 0;

    // Simplified: sum longest chain of dependencies
    const findLongestPath = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId)) return 0;

      const node = dag.nodes.find(n => n.id === nodeId);
      if (!node) return 0;

      visited.add(nodeId);
      let maxPath = node.estimatedTimeMs;

      // Find dependent nodes
      const dependents = dag.edges
        .filter(e => e.from === nodeId)
        .map(e => e.to);

      if (dependents.length > 0) {
        const longestDep = Math.max(...dependents.map(depId => findLongestPath(depId, new Set(visited))));
        maxPath += longestDep;
      }

      return maxPath;
    };

    // Start from root nodes (no dependencies)
    const rootNodes = dag.nodes.filter(n => n.dependencies.length === 0);
    if (rootNodes.length > 0) {
      totalMs = Math.max(...rootNodes.map(n => findLongestPath(n.id)));
    }

    return totalMs;
  }

  /**
   * Get executable order (topological sort)
   */
  getExecutionOrder(dag) {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        console.warn(`[DAG] Circular dependency detected at ${nodeId}`);
        return;
      }

      visiting.add(nodeId);

      const node = dag.nodes.find(n => n.id === nodeId);
      if (node) {
        node.dependencies.forEach(depIdx => {
          if (depIdx < dag.nodes.length) {
            visit(dag.nodes[depIdx].id);
          }
        });
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    dag.nodes.forEach(node => visit(node.id));
    return order;
  }

  /**
   * Get parallel-executable batches
   */
  getParallelBatches(dag) {
    const batches = [];
    const completed = new Set();

    while (completed.size < dag.nodes.length) {
      const batch = [];

      dag.nodes.forEach(node => {
        if (!completed.has(node.id)) {
          // Check if all dependencies are completed
          const depsComplete = node.dependencies.every(depIdx => {
            return depIdx < dag.nodes.length && completed.has(dag.nodes[depIdx].id);
          });

          if (depsComplete) {
            batch.push(node.id);
          }
        }
      });

      if (batch.length === 0) {
        console.warn('[DAG] No executable tasks found; possible circular dependency');
        break;
      }

      batches.push(batch);
      batch.forEach(nodeId => completed.add(nodeId));
    }

    return batches;
  }

  /**
   * Get DAG by ID
   */
  getDAG(dagId) {
    return this.dags.get(dagId);
  }

  /**
   * Get all DAGs (with optional filtering)
   */
  getAllDAGs(filter = {}) {
    let results = Array.from(this.dags.values());

    if (filter.intentId) {
      results = results.filter(d => d.intentId === filter.intentId);
    }
    if (filter.status) {
      results = results.filter(d => d.status === filter.status);
    }

    return results;
  }

  /**
   * Update node status
   */
  updateNodeStatus(dagId, nodeId, newStatus, data = {}) {
    const dag = this.dags.get(dagId);
    if (!dag) throw new Error(`DAG ${dagId} not found`);

    const node = dag.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    node.status = newStatus;
    if (data.artifact) node.artifacts.push(data.artifact);
    if (data.error) node.error = data.error;
    if (data.confidence) node.confidence = data.confidence;

    // Update DAG status if all nodes complete
    const allComplete = dag.nodes.every(n => ['complete', 'failed', 'skipped'].includes(n.status));
    if (allComplete) {
      dag.status = dag.nodes.some(n => n.status === 'failed') ? 'failed' : 'complete';
    }

    return node;
  }

  /**
   * Get stats
   */
  getStats() {
    return { ...this.stats };
  }
}

export default DAGBuilder;
