// @version 3.3.533
/**
 * @file TaskDAG - Task Dependency Graph Visualization
 * @version 3.3.531
 * 
 * Renders a directed acyclic graph (DAG) of task execution.
 * Shows task dependencies, status, and execution flow.
 * 
 * Features:
 * - Interactive node selection
 * - Real-time status updates
 * - Zoom and pan controls
 * - Animated execution flow
 * - Expandable task details
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  AlertCircle,
  Circle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

/**
 * @typedef {Object} TaskNode
 * @property {string} id - Unique task ID
 * @property {string} label - Display name
 * @property {string} type - Task type (generate, validate, transform, etc.)
 * @property {'pending' | 'running' | 'completed' | 'failed' | 'skipped'} status
 * @property {string[]} dependencies - IDs of prerequisite tasks
 * @property {Object} [result] - Task execution result
 * @property {number} [duration] - Execution time in ms
 * @property {string} [error] - Error message if failed
 */

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS = {
  pending: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)', icon: '#888' },
  running: { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.5)', icon: '#818cf8' },
  completed: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', icon: '#22c55e' },
  failed: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.5)', icon: '#ef4444' },
  skipped: { bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.3)', icon: '#6b7280' },
};

const STATUS_ICONS = {
  pending: Circle,
  running: Loader,
  completed: CheckCircle,
  failed: XCircle,
  skipped: Circle,
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 40;

// ============================================================================
// Layout Algorithm - Layered DAG Layout
// ============================================================================

function calculateLayers(tasks) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const layers = [];
  const assigned = new Set();

  // Find tasks with no dependencies (roots)
  const roots = tasks.filter(t => !t.dependencies || t.dependencies.length === 0);
  if (roots.length > 0) {
    layers.push(roots.map(t => t.id));
    roots.forEach(t => assigned.add(t.id));
  }

  // Assign remaining tasks to layers
  while (assigned.size < tasks.length) {
    const nextLayer = [];
    
    for (const task of tasks) {
      if (assigned.has(task.id)) continue;
      
      // Check if all dependencies are assigned
      const deps = task.dependencies || [];
      if (deps.every(depId => assigned.has(depId))) {
        nextLayer.push(task.id);
      }
    }

    if (nextLayer.length === 0) {
      // Circular dependency or orphan - add remaining
      for (const task of tasks) {
        if (!assigned.has(task.id)) {
          nextLayer.push(task.id);
        }
      }
    }

    nextLayer.forEach(id => assigned.add(id));
    if (nextLayer.length > 0) {
      layers.push(nextLayer);
    }
  }

  return layers;
}

function calculateNodePositions(tasks, layers) {
  const positions = new Map();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  layers.forEach((layer, layerIndex) => {
    const x = layerIndex * (NODE_WIDTH + HORIZONTAL_GAP);
    const layerHeight = layer.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;
    
    layer.forEach((taskId, nodeIndex) => {
      const y = nodeIndex * (NODE_HEIGHT + VERTICAL_GAP) - layerHeight / 2;
      positions.set(taskId, { x, y });
    });
  });

  return positions;
}

// ============================================================================
// Edge Path Generation
// ============================================================================

function generateEdgePath(from, to) {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;
  
  // Bezier curve for smooth edges
  const midX = (startX + endX) / 2;
  
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

// ============================================================================
// Component
// ============================================================================

export function TaskDAG({
  tasks = [],
  selectedTaskId,
  onSelectTask,
  onRerunTask,
  className = '',
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Calculate layout
  const { layers, positions, edges, bounds } = useMemo(() => {
    if (!tasks.length) {
      return { layers: [], positions: new Map(), edges: [], bounds: { width: 0, height: 0 } };
    }

    const layers = calculateLayers(tasks);
    const positions = calculateNodePositions(tasks, layers);

    // Generate edges
    const edges = [];
    for (const task of tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const fromPos = positions.get(depId);
          const toPos = positions.get(task.id);
          if (fromPos && toPos) {
            edges.push({
              id: `${depId}->${task.id}`,
              from: depId,
              to: task.id,
              path: generateEdgePath(fromPos, toPos),
            });
          }
        }
      }
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    }

    const padding = 60;
    return {
      layers,
      positions,
      edges,
      bounds: {
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
        offsetX: -minX + padding,
        offsetY: -minY + padding,
      },
    };
  }, [tasks]);

  // Center view on mount or when tasks change
  useEffect(() => {
    if (containerRef.current && bounds.width > 0) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const scaleX = containerRect.width / bounds.width;
      const scaleY = containerRect.height / bounds.height;
      const newZoom = Math.min(1, Math.min(scaleX, scaleY) * 0.9);
      
      setZoom(newZoom);
      setPan({
        x: (containerRect.width - bounds.width * newZoom) / 2,
        y: (containerRect.height - bounds.height * newZoom) / 2,
      });
    }
  }, [tasks.length, bounds]);

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handlers
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(2, Math.max(0.3, z * delta)));
  }, []);

  const zoomIn = () => setZoom(z => Math.min(2, z * 1.2));
  const zoomOut = () => setZoom(z => Math.max(0.3, z / 1.2));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!tasks.length) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'rgba(255, 255, 255, 0.4)',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Circle size={48} style={{ opacity: 0.3 }} />
        <div style={{ fontSize: '14px' }}>No tasks in execution</div>
        <div style={{ fontSize: '12px', opacity: 0.6 }}>
          Tasks will appear here when running
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
      }}
    >
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
      >
        <ControlButton onClick={zoomIn} title="Zoom In">
          <ZoomIn size={16} />
        </ControlButton>
        <ControlButton onClick={zoomOut} title="Zoom Out">
          <ZoomOut size={16} />
        </ControlButton>
        <ControlButton onClick={resetView} title="Reset View">
          <Maximize2 size={16} />
        </ControlButton>
      </div>

      {/* Stats */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          gap: '12px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          zIndex: 10,
        }}
      >
        <span>{tasks.length} tasks</span>
        <span>•</span>
        <span>{tasks.filter(t => t.status === 'completed').length} completed</span>
        {tasks.some(t => t.status === 'running') && (
          <>
            <span>•</span>
            <span style={{ color: '#818cf8' }}>
              {tasks.filter(t => t.status === 'running').length} running
            </span>
          </>
        )}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="rgba(255, 255, 255, 0.3)"
            />
          </marker>
          
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g transform={`translate(${bounds.offsetX}, ${bounds.offsetY})`}>
            {/* Edges */}
            {edges.map((edge) => {
              const fromTask = tasks.find(t => t.id === edge.from);
              const toTask = tasks.find(t => t.id === edge.to);
              const isActive = fromTask?.status === 'completed' && toTask?.status === 'running';
              
              return (
                <motion.path
                  key={edge.id}
                  d={edge.path}
                  fill="none"
                  stroke={isActive ? '#818cf8' : 'rgba(255, 255, 255, 0.2)'}
                  strokeWidth={isActive ? 2 : 1.5}
                  markerEnd="url(#arrowhead)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  filter={isActive ? 'url(#glow)' : undefined}
                />
              );
            })}

            {/* Nodes */}
            {tasks.map((task) => {
              const pos = positions.get(task.id);
              if (!pos) return null;
              
              return (
                <TaskNodeComponent
                  key={task.id}
                  task={task}
                  x={pos.x}
                  y={pos.y}
                  isSelected={task.id === selectedTaskId}
                  onClick={() => onSelectTask?.(task.id)}
                  onRerun={() => onRerunTask?.(task.id)}
                />
              );
            })}
          </g>
        </g>
      </svg>

      {/* Selected Task Details */}
      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetails
            task={tasks.find(t => t.id === selectedTaskId)}
            onClose={() => onSelectTask?.(null)}
            onRerun={() => onRerunTask?.(selectedTaskId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Task Node Component
// ============================================================================

function TaskNodeComponent({ task, x, y, isSelected, onClick, onRerun }) {
  const colors = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
  const StatusIcon = STATUS_ICONS[task.status] || Circle;

  return (
    <motion.g
      transform={`translate(${x}, ${y})`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Node background */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        fill={colors.bg}
        stroke={isSelected ? '#6366f1' : colors.border}
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Status icon */}
      <foreignObject x={12} y={(NODE_HEIGHT - 24) / 2} width={24} height={24}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StatusIcon
            size={18}
            style={{
              color: colors.icon,
              animation: task.status === 'running' ? 'spin 1s linear infinite' : undefined,
            }}
          />
        </div>
      </foreignObject>

      {/* Task label */}
      <text
        x={44}
        y={NODE_HEIGHT / 2 - 4}
        fill="white"
        fontSize={12}
        fontWeight={500}
        dominantBaseline="middle"
      >
        {task.label.length > 15 ? task.label.slice(0, 15) + '...' : task.label}
      </text>

      {/* Task type */}
      <text
        x={44}
        y={NODE_HEIGHT / 2 + 12}
        fill="rgba(255, 255, 255, 0.4)"
        fontSize={10}
        dominantBaseline="middle"
      >
        {task.type}
      </text>

      {/* Duration badge */}
      {task.duration && (
        <foreignObject x={NODE_WIDTH - 50} y={NODE_HEIGHT - 22} width={44} height={18}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
            }}
          >
            {task.duration}ms
          </div>
        </foreignObject>
      )}
    </motion.g>
  );
}

// ============================================================================
// Task Details Panel
// ============================================================================

function TaskDetails({ task, onClose, onRerun }) {
  if (!task) return null;
  
  const colors = STATUS_COLORS[task.status];
  const StatusIcon = STATUS_ICONS[task.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        right: '12px',
        background: 'rgba(20, 20, 30, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        maxHeight: '200px',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StatusIcon size={18} style={{ color: colors.icon }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>{task.label}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{task.type}</div>
        </div>
        {(task.status === 'failed' || task.status === 'completed') && onRerun && (
          <button
            onClick={onRerun}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '6px',
              color: '#a5b4fc',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Rerun
          </button>
        )}
      </div>

      {/* Task info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <InfoItem label="Status" value={task.status} />
        <InfoItem label="Duration" value={task.duration ? `${task.duration}ms` : '-'} />
        <InfoItem label="Dependencies" value={task.dependencies?.length || 0} />
      </div>

      {/* Error message */}
      {task.error && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#fca5a5',
          }}
        >
          <AlertCircle size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {task.error}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ControlButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.7)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
      }}
    >
      {children}
    </button>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'white' }}>{value}</div>
    </div>
  );
}

// ============================================================================
// CSS for spinning animation (add to global styles)
// ============================================================================

const spinKeyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

// Inject keyframes if not present
if (typeof document !== 'undefined') {
  const styleId = 'task-dag-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = spinKeyframes;
    document.head.appendChild(style);
  }
}

export default TaskDAG;
