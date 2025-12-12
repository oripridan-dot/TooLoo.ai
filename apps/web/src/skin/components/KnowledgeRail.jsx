// @version 3.3.443
// TooLoo.ai KnowledgeRail - Context & Provenance Sidebar
// ═══════════════════════════════════════════════════════════════════════════
// Right sidebar showing retrieved context, citations, and knowledge graph
// Maps directly to: Hippocampus memory retrieval + VectorStore + KnowledgeGraph
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKnowledge, useSystemState } from '../store/systemStateStore.js';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * ContextCard - Single retrieved context item
 */
const ContextCard = ({ context, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle different context formats
  const content =
    typeof context === 'string' ? context : context.content || context.text || context.chunk || '';
  const metadata = typeof context === 'object' ? context : {};
  const similarity = metadata.score || metadata.similarity || null;
  const source = metadata.source || metadata.file || metadata.type || 'memory';

  return (
    <motion.div
      className="context-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        padding: '12px',
        marginBottom: '8px',
        background: 'var(--surface-card, rgba(255,255,255,0.03))',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            color: 'var(--text-muted, #666)',
            fontWeight: 500,
          }}
        >
          {source}
        </span>
        {similarity !== null && (
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              background:
                similarity > 0.8
                  ? 'rgba(46,204,113,0.2)'
                  : similarity > 0.6
                    ? 'rgba(243,156,18,0.2)'
                    : 'rgba(231,76,60,0.2)',
              color: similarity > 0.8 ? '#2ECC71' : similarity > 0.6 ? '#F39C12' : '#E74C3C',
              fontFamily: 'monospace',
            }}
          >
            {(similarity * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Content preview */}
      <p
        style={{
          margin: 0,
          fontSize: '12px',
          color: 'var(--text-secondary, #888)',
          lineHeight: 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: isExpanded ? 'unset' : 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {content}
      </p>

      {/* Metadata when expanded */}
      <AnimatePresence>
        {isExpanded && metadata.timestamp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
              fontSize: '10px',
              color: 'var(--text-muted, #666)',
            }}
          >
            📅 {new Date(metadata.timestamp).toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * KnowledgeGraphNode - Visual node in mini graph
 */
const KnowledgeGraphNode = ({ node, x, y, isActive }) => {
  return (
    <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
      <motion.circle
        cx={x}
        cy={y}
        r={isActive ? 12 : 8}
        fill={isActive ? 'var(--accent-primary, #9B59B6)' : 'rgba(255,255,255,0.2)'}
        stroke={isActive ? 'rgba(155,89,182,0.5)' : 'transparent'}
        strokeWidth={3}
        whileHover={{ scale: 1.2 }}
      />
      <text x={x} y={y + 20} textAnchor="middle" fontSize="8" fill="var(--text-muted, #666)">
        {typeof node === 'string' ? node.slice(0, 10) : node.label?.slice(0, 10) || ''}
      </text>
    </motion.g>
  );
};

/**
 * KnowledgeGraphMini - Mini visualization of active graph nodes
 */
const KnowledgeGraphMini = ({ nodes }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div
        style={{
          height: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted, #666)',
          fontSize: '12px',
        }}
      >
        No active nodes
      </div>
    );
  }

  // Simple circular layout
  const centerX = 80;
  const centerY = 50;
  const radius = 35;

  return (
    <svg width="160" height="100" style={{ display: 'block', margin: '0 auto' }}>
      {/* Draw edges to center */}
      {nodes.slice(0, 6).map((node, i) => {
        const angle = (i * 2 * Math.PI) / Math.min(nodes.length, 6);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return (
          <line
            key={`edge-${i}`}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        );
      })}

      {/* Draw nodes */}
      {nodes.slice(0, 6).map((node, i) => {
        const angle = (i * 2 * Math.PI) / Math.min(nodes.length, 6);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return <KnowledgeGraphNode key={`node-${i}`} node={node} x={x} y={y} isActive={i === 0} />;
      })}

      {/* Center node */}
      <circle cx={centerX} cy={centerY} r={10} fill="var(--accent-primary, #9B59B6)" />
    </svg>
  );
};

/**
 * ProvenanceList - Citations and sources
 */
const ProvenanceList = ({ provenance }) => {
  const entries = Object.entries(provenance || {});

  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: '12px',
          color: 'var(--text-muted, #666)',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        No citations yet
      </div>
    );
  }

  return (
    <div className="provenance-list">
      {entries.map(([claimId, source], i) => (
        <div
          key={claimId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            borderBottom:
              i < entries.length - 1
                ? '1px solid var(--border-subtle, rgba(255,255,255,0.05))'
                : 'none',
          }}
        >
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--accent-primary, #9B59B6)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            {i + 1}
          </span>
          <span style={{ color: 'var(--text-secondary, #888)' }}>
            {typeof source === 'string' ? source : source.label || source.type || 'Unknown'}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * SectionHeader - Collapsible section header
 */
const SectionHeader = ({ title, icon, count, isOpen, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary, #fff)',
          }}
        >
          {title}
        </span>
        {count !== undefined && (
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px',
              background: 'var(--accent-primary, #9B59B6)',
              color: '#fff',
            }}
          >
            {count}
          </span>
        )}
      </div>
      <motion.span
        animate={{ rotate: isOpen ? 180 : 0 }}
        style={{ fontSize: '10px', color: 'var(--text-muted, #666)' }}
      >
        ▼
      </motion.span>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const KnowledgeRail = ({ isOpen, onClose }) => {
  const knowledge = useKnowledge();
  const [openSections, setOpenSections] = useState({
    context: true,
    graph: false,
    provenance: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className="knowledge-rail"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '280px',
            background: 'var(--surface-elevated, #1a1a1a)',
            borderLeft: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 90,
            paddingTop: '60px', // Account for ControlDeck
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary, #fff)',
              }}
            >
              📚 Knowledge Context
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

          {/* Scrollable content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {/* Retrieved Context Section */}
            <div className="rail-section">
              <SectionHeader
                title="Retrieved Context"
                icon="🧠"
                count={knowledge.retrievedContext.length}
                isOpen={openSections.context}
                onToggle={() => toggleSection('context')}
              />
              <AnimatePresence>
                {openSections.context && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '8px' }}>
                      {knowledge.retrievedContext.length === 0 ? (
                        <p
                          style={{
                            color: 'var(--text-muted, #666)',
                            fontSize: '12px',
                            textAlign: 'center',
                            padding: '20px',
                          }}
                        >
                          No context retrieved yet
                        </p>
                      ) : (
                        knowledge.retrievedContext.map((ctx, i) => (
                          <ContextCard key={`ctx-${i}`} context={ctx} index={i} />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Knowledge Graph Section */}
            <div className="rail-section">
              <SectionHeader
                title="Knowledge Graph"
                icon="🕸️"
                count={knowledge.activeGraphNodes.length}
                isOpen={openSections.graph}
                onToggle={() => toggleSection('graph')}
              />
              <AnimatePresence>
                {openSections.graph && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '8px' }}>
                      <KnowledgeGraphMini nodes={knowledge.activeGraphNodes} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Provenance Section */}
            <div className="rail-section">
              <SectionHeader
                title="Citations"
                icon="📎"
                count={Object.keys(knowledge.provenance).length}
                isOpen={openSections.provenance}
                onToggle={() => toggleSection('provenance')}
              />
              <AnimatePresence>
                {openSections.provenance && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <ProvenanceList provenance={knowledge.provenance} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer: Memory Stats */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              fontSize: '11px',
              color: 'var(--text-muted, #666)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>💾 {knowledge.memoryCount} memories</span>
            {knowledge.lastSearchQuery && (
              <span>🔍 "{knowledge.lastSearchQuery.slice(0, 15)}..."</span>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default KnowledgeRail;
