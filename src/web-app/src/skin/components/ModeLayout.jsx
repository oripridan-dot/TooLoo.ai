// @version 3.3.445
// TooLoo.ai ModeLayout - Adaptive Layout Based on UI Mode
// ═══════════════════════════════════════════════════════════════════════════
// Smart layout wrapper that morphs based on detected intent/mode
// Maps directly to: Planning layer intent detection → Visual layout
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIMode, useSystemState } from '../store/systemStateStore.js';
import { ControlDeck } from './ControlDeck.jsx';
import { KnowledgeRail } from './KnowledgeRail.jsx';
import { SegmentationSidebar } from './SegmentationSidebar.jsx';

// ============================================================================
// LAYOUT CONFIGURATIONS
// ============================================================================

const LAYOUT_CONFIGS = {
  chat: {
    name: 'Chat',
    description: 'Conversational interface',
    showLeftSidebar: false,
    showRightSidebar: true,  // Knowledge context helpful during chat
    contentMaxWidth: '800px',
    contentPadding: '20px',
  },
  planner: {
    name: 'Planner',
    description: 'Task planning and execution',
    showLeftSidebar: true,   // Show DAG and segments
    showRightSidebar: true,  // Show context
    contentMaxWidth: '100%', // Full width for planning
    contentPadding: '20px',
  },
  analysis: {
    name: 'Analysis',
    description: 'Deep research and investigation',
    showLeftSidebar: false,
    showRightSidebar: true,  // Critical for citations/provenance
    contentMaxWidth: '900px',
    contentPadding: '24px',
  },
  studio: {
    name: 'Studio',
    description: 'Creation and code generation',
    showLeftSidebar: true,   // File tree / segments
    showRightSidebar: false, // More space for code
    contentMaxWidth: '100%',
    contentPadding: '16px',
  },
};

// ============================================================================
// TOGGLE BUTTON
// ============================================================================

const SidebarToggle = ({ side, isOpen, onClick, icon }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'fixed',
        [side]: isOpen ? (side === 'left' ? '250px' : '290px') : '10px',
        top: '70px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: 'none',
        background: 'var(--surface-elevated, #1a1a1a)',
        color: 'var(--text-secondary, #888)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 95,
        transition: side === 'left' ? 'left 0.3s ease' : 'right 0.3s ease',
      }}
    >
      {icon}
    </motion.button>
  );
};

// ============================================================================
// MODE INDICATOR
// ============================================================================

const ModeIndicator = ({ mode, config }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: 'absolute',
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '6px 16px',
        borderRadius: '20px',
        background: 'var(--accent-primary-dim, rgba(155,89,182,0.15))',
        border: '1px solid var(--accent-primary, #9B59B6)',
        fontSize: '12px',
        color: 'var(--accent-primary, #9B59B6)',
        fontWeight: 500,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {config.name} Mode: {config.description}
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ModeLayout = ({ children }) => {
  const uiMode = useUIMode();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [showModeIndicator, setShowModeIndicator] = useState(false);
  
  const config = LAYOUT_CONFIGS[uiMode] || LAYOUT_CONFIGS.chat;
  
  // Auto-adjust sidebars when mode changes
  useEffect(() => {
    setLeftOpen(config.showLeftSidebar);
    setRightOpen(config.showRightSidebar);
    
    // Show mode indicator briefly
    setShowModeIndicator(true);
    const timer = setTimeout(() => setShowModeIndicator(false), 2000);
    return () => clearTimeout(timer);
  }, [uiMode, config.showLeftSidebar, config.showRightSidebar]);
  
  // Handle segment click (scroll to that part of conversation)
  const handleSegmentClick = useCallback((segment, index) => {
    // Find and scroll to the corresponding message
    const messageEl = document.querySelector(`[data-segment-index="${index}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);
  
  // Calculate main content margins based on sidebar state
  const getMainStyle = () => {
    const leftMargin = leftOpen ? '240px' : '0px';
    const rightMargin = rightOpen ? '280px' : '0px';
    
    return {
      marginLeft: leftMargin,
      marginRight: rightMargin,
      transition: 'margin 0.3s ease',
      minHeight: 'calc(100vh - 60px)', // Account for ControlDeck
      display: 'flex',
      flexDirection: 'column',
    };
  };
  
  return (
    <div className="mode-layout" style={{ 
      minHeight: '100vh',
      background: 'var(--surface-base, #0d0d0d)',
    }}>
      {/* Control Deck (Header) */}
      <ControlDeck />
      
      {/* Mode Indicator (temporary) */}
      <AnimatePresence>
        {showModeIndicator && (
          <ModeIndicator mode={uiMode} config={config} />
        )}
      </AnimatePresence>
      
      {/* Left Sidebar (Segmentation) */}
      <SegmentationSidebar 
        isOpen={leftOpen} 
        onClose={() => setLeftOpen(false)}
        onSegmentClick={handleSegmentClick}
      />
      
      {/* Left Toggle Button */}
      <SidebarToggle
        side="left"
        isOpen={leftOpen}
        onClick={() => setLeftOpen(!leftOpen)}
        icon={leftOpen ? '◀' : '📑'}
      />
      
      {/* Right Sidebar (Knowledge Rail) */}
      <KnowledgeRail 
        isOpen={rightOpen} 
        onClose={() => setRightOpen(false)}
      />
      
      {/* Right Toggle Button */}
      <SidebarToggle
        side="right"
        isOpen={rightOpen}
        onClick={() => setRightOpen(!rightOpen)}
        icon={rightOpen ? '▶' : '📚'}
      />
      
      {/* Main Content Area */}
      <motion.main
        className="main-content"
        layout
        style={getMainStyle()}
      >
        <div style={{
          maxWidth: config.contentMaxWidth,
          width: '100%',
          margin: '0 auto',
          padding: config.contentPadding,
          paddingTop: '20px',
          flex: 1,
        }}>
          {children}
        </div>
      </motion.main>
    </div>
  );
};

export default ModeLayout;
