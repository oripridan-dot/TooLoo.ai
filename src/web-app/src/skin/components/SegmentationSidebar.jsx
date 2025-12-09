// @version 3.3.444
// TooLoo.ai SegmentationSidebar - Conversation TOC Navigator
// ═══════════════════════════════════════════════════════════════════════════
// Left sidebar showing conversation segments as a table of contents
// Maps directly to: Planning layer segmentation + Motor execution stages
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSkills, useSystemState } from '../store/systemStateStore.js';

// ============================================================================
// SEGMENT TYPE ICONS
// ============================================================================

const SEGMENT_ICONS = {
  question: '❓',
  answer: '💬',
  task: '📋',
  analysis: '🔍',
  code: '💻',
  plan: '📊',
  result: '✅',
  error: '❌',
  thought: '💭',
  tool: '🔧',
  default: '📝',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * SegmentItem - Single segment in the TOC
 */
const SegmentItem = ({ segment, index, isActive, onClick }) => {
  const icon = SEGMENT_ICONS[segment.type] || SEGMENT_ICONS.default;
  const title = segment.title || segment.summary || segment.content?.slice(0, 50) || `Segment ${index + 1}`;
  
  return (
    <motion.div
      className="segment-item"
      onClick={() => onClick(segment, index)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ x: 4 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        margin: '4px 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: isActive 
          ? 'var(--accent-primary-dim, rgba(155,89,182,0.15))' 
          : 'transparent',
        borderLeft: isActive 
          ? '3px solid var(--accent-primary, #9B59B6)' 
          : '3px solid transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Icon */}
      <span style={{
        fontSize: '14px',
        lineHeight: 1,
        marginTop: '2px',
      }}>
        {icon}
      </span>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: '12px',
          fontWeight: isActive ? 600 : 400,
          color: isActive 
            ? 'var(--text-primary, #fff)' 
            : 'var(--text-secondary, #888)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </p>
        
        {/* Timestamp if available */}
        {segment.timestamp && (
          <span style={{
            fontSize: '10px',
            color: 'var(--text-muted, #666)',
          }}>
            {formatTimestamp(segment.timestamp)}
          </span>
        )}
      </div>
      
      {/* Status indicator */}
      {segment.status && (
        <span style={{
          fontSize: '8px',
          padding: '2px 4px',
          borderRadius: '4px',
          background: getStatusColor(segment.status),
          color: '#fff',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          {segment.status}
        </span>
      )}
    </motion.div>
  );
};

/**
 * DAGView - Mini DAG visualization for planning mode
 */
const DAGView = ({ dag, onNodeClick }) => {
  if (!dag || !dag.nodes || dag.nodes.length === 0) {
    return null;
  }
  
  const nodes = dag.nodes || [];
  const edges = dag.edges || [];
  
  return (
    <div className="dag-view" style={{
      padding: '12px',
      borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
    }}>
      <h4 style={{
        margin: '0 0 10px 0',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'var(--text-muted, #666)',
        letterSpacing: '0.5px',
      }}>
        📊 Task DAG
      </h4>
      
      <svg 
        width="100%" 
        height={Math.max(80, nodes.length * 30)} 
        style={{ display: 'block' }}
      >
        {/* Draw edges */}
        {edges.map((edge, i) => {
          const fromIndex = nodes.findIndex(n => n.id === edge.from);
          const toIndex = nodes.findIndex(n => n.id === edge.to);
          if (fromIndex === -1 || toIndex === -1) return null;
          
          return (
            <line
              key={`edge-${i}`}
              x1={20}
              y1={fromIndex * 30 + 15}
              x2={20}
              y2={toIndex * 30 + 15}
              stroke="var(--accent-primary, #9B59B6)"
              strokeWidth="2"
              strokeDasharray="4,2"
              opacity={0.5}
            />
          );
        })}
        
        {/* Draw nodes */}
        {nodes.map((node, i) => (
          <g 
            key={node.id || `dag-node-${i}`} 
            onClick={() => onNodeClick?.(node)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={20}
              cy={i * 30 + 15}
              r={8}
              fill={getNodeColor(node.status)}
              stroke="var(--border-subtle, rgba(255,255,255,0.2))"
              strokeWidth={1}
            />
            <text
              x={35}
              y={i * 30 + 18}
              fontSize="11"
              fill="var(--text-secondary, #888)"
            >
              {node.label?.slice(0, 20) || node.task?.slice(0, 20) || `Task ${i + 1}`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

/**
 * ExecutionStatus - Shows current task execution status
 */
const ExecutionStatus = ({ status, currentTask }) => {
  const statusConfig = {
    idle: { icon: '⏸️', label: 'Idle', color: '#6C757D' },
    queued: { icon: '📥', label: 'Queued', color: '#3498DB' },
    executing: { icon: '⚙️', label: 'Executing', color: '#F39C12' },
    validating: { icon: '🔍', label: 'Validating', color: '#9B59B6' },
    complete: { icon: '✅', label: 'Complete', color: '#2ECC71' },
    error: { icon: '❌', label: 'Error', color: '#E74C3C' },
  };
  
  const config = statusConfig[status] || statusConfig.idle;
  
  return (
    <div style={{
      padding: '10px 12px',
      margin: '8px',
      borderRadius: '8px',
      background: `${config.color}15`,
      border: `1px solid ${config.color}30`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: currentTask ? '6px' : 0,
      }}>
        <motion.span
          animate={status === 'executing' ? { rotate: 360 } : {}}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        >
          {config.icon}
        </motion.span>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: config.color,
        }}>
          {config.label}
        </span>
      </div>
      
      {currentTask && (
        <p style={{
          margin: 0,
          fontSize: '11px',
          color: 'var(--text-secondary, #888)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {currentTask.name || currentTask.task || 'Processing...'}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTimestamp = (ts) => {
  const date = new Date(ts);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

const getStatusColor = (status) => {
  const colors = {
    pending: '#6C757D',
    active: '#3498DB',
    complete: '#2ECC71',
    error: '#E74C3C',
  };
  return colors[status] || colors.pending;
};

const getNodeColor = (status) => {
  const colors = {
    pending: '#6C757D',
    running: '#F39C12',
    complete: '#2ECC71',
    error: '#E74C3C',
  };
  return colors[status] || colors.pending;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SegmentationSidebar = ({ isOpen, onClose, onSegmentClick }) => {
  const skills = useSkills();
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(null);
  const scrollRef = useRef(null);
  
  // Auto-scroll to new segments
  useEffect(() => {
    if (scrollRef.current && skills.segments.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [skills.segments.length]);
  
  const handleSegmentClick = (segment, index) => {
    setActiveSegmentIndex(index);
    onSegmentClick?.(segment, index);
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className="segmentation-sidebar"
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '240px',
            background: 'var(--surface-elevated, #1a1a1a)',
            borderRight: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 90,
            paddingTop: '60px', // Account for ControlDeck
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '14px', 
              fontWeight: 600,
              color: 'var(--text-primary, #fff)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              📑 Conversation
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #666)',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>
          
          {/* DAG View (only in planner mode) */}
          {skills.currentDAG && (
            <DAGView dag={skills.currentDAG} onNodeClick={handleSegmentClick} />
          )}
          
          {/* Execution Status */}
          {skills.executionStatus !== 'idle' && (
            <ExecutionStatus 
              status={skills.executionStatus} 
              currentTask={skills.currentTask}
            />
          )}
          
          {/* Segments List */}
          <div 
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingTop: '8px',
            }}
          >
            {skills.segments.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted, #666)',
                fontSize: '12px',
              }}>
                <p style={{ marginBottom: '8px' }}>No segments yet</p>
                <p style={{ fontSize: '11px', opacity: 0.7 }}>
                  Start a conversation to see the structure here
                </p>
              </div>
            ) : (
              skills.segments.map((segment, index) => (
                <SegmentItem
                  key={segment.id || `seg-${index}-${segment.timestamp || Date.now()}`}
                  segment={segment}
                  index={index}
                  isActive={activeSegmentIndex === index}
                  onClick={handleSegmentClick}
                />
              ))
            )}
          </div>
          
          {/* Footer: Task Queue */}
          {skills.taskQueue.length > 0 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              fontSize: '11px',
              color: 'var(--text-muted, #666)',
            }}>
              <span style={{ fontWeight: 600 }}>📥 Queue:</span> {skills.taskQueue.length} tasks
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default SegmentationSidebar;
