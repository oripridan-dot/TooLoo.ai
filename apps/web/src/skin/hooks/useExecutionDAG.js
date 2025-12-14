// @version 3.3.539
// TooLoo.ai - Execution DAG Hook
// Connects to Socket.IO synapsys:event stream and builds task DAG state
// For use with TaskDAG visualization component

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemState } from '../store/systemStateStore';

/**
 * Task status constants matching backend execution states
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETE: 'complete',
  FAILED: 'failed',
  BLOCKED: 'blocked',
};

/**
 * Default empty DAG state
 */
const EMPTY_DAG = {
  nodes: [],
  edges: [],
  executionId: null,
  goal: null,
  startTime: null,
  endTime: null,
  progress: 0,
};

/**
 * Hook to subscribe to execution events and build DAG state
 * @param {Object} options - Configuration options
 * @param {number} options.maxHistory - Max historical tasks to keep (default: 100)
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @returns {Object} - DAG state and control methods
 */
export function useExecutionDAG(options = {}) {
  const { maxHistory = 100, autoConnect = true } = options;
  
  // Socket from system state
  const socket = useSystemState((s) => s.connection?.socket);
  const isConnected = useSystemState((s) => s.connection?.status === 'connected');
  
  // DAG state
  const [dag, setDag] = useState(EMPTY_DAG);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Track node updates by ID
  const nodesMapRef = useRef(new Map());

  /**
   * Process incoming synapsys events and update DAG
   */
  const handleSynapsysEvent = useCallback((event) => {
    const { type, payload, timestamp } = event;
    
    // Planning events - initial DAG creation
    if (type === 'planning:intent') {
      // New intent/goal - prepare for new execution
      setDag(prev => ({
        ...EMPTY_DAG,
        goal: payload?.goal || payload?.intent,
        startTime: timestamp || Date.now(),
      }));
      setIsExecuting(true);
      nodesMapRef.current.clear();
    }
    
    if (type === 'planning:dag_created' || type === 'cortex:planning_complete') {
      // Full DAG structure from planner
      const tasks = payload?.tasks || payload?.plan?.tasks || [];
      const dependencies = payload?.dependencies || payload?.plan?.dependencies || [];
      
      const nodes = tasks.map((task, index) => ({
        id: task.id || `task-${index}`,
        label: task.name || task.description || `Task ${index + 1}`,
        status: task.status || TASK_STATUS.PENDING,
        type: task.type || 'task',
        estimatedTime: task.estimatedTime,
        metadata: task.metadata || {},
      }));
      
      // Build edges from dependencies
      const edges = [];
      dependencies.forEach(dep => {
        if (dep.from && dep.to) {
          edges.push({ from: dep.from, to: dep.to });
        } else if (dep.depends && dep.task) {
          // Alternative format: { task: 'id', depends: ['id1', 'id2'] }
          dep.depends.forEach(d => edges.push({ from: d, to: dep.task }));
        }
      });
      
      // Update nodes map
      nodes.forEach(n => nodesMapRef.current.set(n.id, n));
      
      setDag(prev => ({
        ...prev,
        nodes,
        edges,
        executionId: payload?.executionId || prev.executionId,
      }));
    }
    
    // Motor events - task execution updates
    if (type === 'motor:execute' || type === 'motor:task_start') {
      const taskId = payload?.taskId || payload?.id;
      if (taskId && nodesMapRef.current.has(taskId)) {
        const node = nodesMapRef.current.get(taskId);
        node.status = TASK_STATUS.RUNNING;
        node.startTime = timestamp || Date.now();
        nodesMapRef.current.set(taskId, node);
        
        setDag(prev => ({
          ...prev,
          nodes: Array.from(nodesMapRef.current.values()),
        }));
      }
    }
    
    if (type === 'motor:result' || type === 'motor:task_complete') {
      const taskId = payload?.taskId || payload?.id;
      const success = payload?.success !== false;
      
      if (taskId && nodesMapRef.current.has(taskId)) {
        const node = nodesMapRef.current.get(taskId);
        node.status = success ? TASK_STATUS.COMPLETE : TASK_STATUS.FAILED;
        node.endTime = timestamp || Date.now();
        node.result = payload?.result;
        node.error = payload?.error;
        nodesMapRef.current.set(taskId, node);
        
        setDag(prev => ({
          ...prev,
          nodes: Array.from(nodesMapRef.current.values()),
        }));
      }
    }
    
    if (type === 'motor:task_failed' || type === 'motor:error') {
      const taskId = payload?.taskId || payload?.id;
      
      if (taskId && nodesMapRef.current.has(taskId)) {
        const node = nodesMapRef.current.get(taskId);
        node.status = TASK_STATUS.FAILED;
        node.endTime = timestamp || Date.now();
        node.error = payload?.error || payload?.message;
        nodesMapRef.current.set(taskId, node);
        
        setDag(prev => ({
          ...prev,
          nodes: Array.from(nodesMapRef.current.values()),
        }));
        
        setError(payload?.error || payload?.message);
      }
    }
    
    // Smart execution progress
    if (type === 'smart:progress') {
      const { executionId, update } = payload || {};
      
      setDag(prev => {
        if (executionId && prev.executionId !== executionId) return prev;
        
        return {
          ...prev,
          progress: update?.progress || prev.progress,
        };
      });
    }
    
    // Execution completion
    if (type === 'smart:execution:completed' || type === 'cortex:execution_complete') {
      setIsExecuting(false);
      
      setDag(prev => {
        const completedDag = {
          ...prev,
          endTime: timestamp || Date.now(),
          progress: 100,
        };
        
        // Add to history
        setHistory(h => {
          const newHistory = [completedDag, ...h].slice(0, maxHistory);
          return newHistory;
        });
        
        return completedDag;
      });
    }
    
    // Cortex response may contain step updates
    if (type === 'cortex:response') {
      const { step, totalSteps, currentTask } = payload || {};
      
      if (step && totalSteps) {
        setDag(prev => ({
          ...prev,
          progress: Math.round((step / totalSteps) * 100),
        }));
      }
      
      if (currentTask) {
        const taskId = currentTask.id;
        if (taskId && nodesMapRef.current.has(taskId)) {
          const node = nodesMapRef.current.get(taskId);
          node.status = TASK_STATUS.RUNNING;
          nodesMapRef.current.set(taskId, node);
          
          setDag(prev => ({
            ...prev,
            nodes: Array.from(nodesMapRef.current.values()),
          }));
        }
      }
    }
  }, [maxHistory]);

  /**
   * Subscribe to socket events
   */
  useEffect(() => {
    if (!socket || !autoConnect) return;
    
    socket.on('synapsys:event', handleSynapsysEvent);
    
    return () => {
      socket.off('synapsys:event', handleSynapsysEvent);
    };
  }, [socket, autoConnect, handleSynapsysEvent]);

  /**
   * Request re-run of a specific task
   */
  const rerunTask = useCallback((taskId) => {
    if (!socket || !isConnected) {
      console.warn('[useExecutionDAG] Cannot rerun task: not connected');
      return;
    }
    
    socket.emit('task:rerun', { taskId });
    
    // Optimistically update status
    if (nodesMapRef.current.has(taskId)) {
      const node = nodesMapRef.current.get(taskId);
      node.status = TASK_STATUS.PENDING;
      node.result = null;
      node.error = null;
      nodesMapRef.current.set(taskId, node);
      
      setDag(prev => ({
        ...prev,
        nodes: Array.from(nodesMapRef.current.values()),
      }));
    }
  }, [socket, isConnected]);

  /**
   * Clear current DAG and start fresh
   */
  const clearDag = useCallback(() => {
    setDag(EMPTY_DAG);
    setIsExecuting(false);
    setError(null);
    nodesMapRef.current.clear();
  }, []);

  /**
   * Load a historical execution
   */
  const loadFromHistory = useCallback((index) => {
    if (index >= 0 && index < history.length) {
      const historical = history[index];
      setDag(historical);
      
      // Rebuild nodes map
      nodesMapRef.current.clear();
      historical.nodes.forEach(n => nodesMapRef.current.set(n.id, n));
    }
  }, [history]);

  /**
   * Calculate execution statistics
   */
  const stats = {
    totalTasks: dag.nodes.length,
    completed: dag.nodes.filter(n => n.status === TASK_STATUS.COMPLETE).length,
    failed: dag.nodes.filter(n => n.status === TASK_STATUS.FAILED).length,
    running: dag.nodes.filter(n => n.status === TASK_STATUS.RUNNING).length,
    pending: dag.nodes.filter(n => n.status === TASK_STATUS.PENDING).length,
    duration: dag.endTime && dag.startTime 
      ? dag.endTime - dag.startTime 
      : dag.startTime 
        ? Date.now() - dag.startTime 
        : 0,
    successRate: dag.nodes.length > 0
      ? Math.round((dag.nodes.filter(n => n.status === TASK_STATUS.COMPLETE).length / dag.nodes.length) * 100)
      : 0,
  };

  return {
    // State
    dag,
    isExecuting,
    isConnected,
    history,
    error,
    stats,
    
    // Actions
    rerunTask,
    clearDag,
    loadFromHistory,
  };
}

export default useExecutionDAG;
