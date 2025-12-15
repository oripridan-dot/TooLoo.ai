/**
 * @file AppSkillOS - Main Application Shell
 * @description The empty shell that loads and renders skills
 * @version 1.0.0
 *
 * This is the ENTIRE application. It's just a shell that:
 * 1. Boots the Synapsys kernel
 * 2. Renders the SkillRenderer
 *
 * Everything else is handled by Skills.
 */

import React from 'react';
import { SkillRenderer } from './SkillRenderer';

// =============================================================================
// SKILL OS APPLICATION
// =============================================================================

export function AppSkillOS() {
  return <SkillRenderer apiBase="/synapsys" defaultSkill="core.chat" />;
}

// =============================================================================
// ALTERNATIVE: With Custom Header/Sidebar
// =============================================================================

export function AppSkillOSCustom() {
  return (
    <SkillRenderer
      apiBase="/synapsys"
      defaultSkill="core.chat"
      header={<CustomHeader />}
      sidebar={<CustomSidebar />}
    />
  );
}

// Custom header example
function CustomHeader() {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #16213e',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '20px',
          background: 'linear-gradient(90deg, #e94560, #0f3460)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        TooLoo.ai
      </h1>
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>Skill OS v1.0</span>
    </header>
  );
}

// Custom sidebar example
function CustomSidebar() {
  return (
    <aside
      style={{
        width: '60px',
        backgroundColor: '#1a1a2e',
        borderRight: '1px solid #16213e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '8px',
      }}
    >
      <button style={iconButtonStyle} title="Chat">
        💬
      </button>
      <button style={iconButtonStyle} title="Code">
        💻
      </button>
      <button style={iconButtonStyle} title="Settings">
        ⚙️
      </button>
      <div style={{ flex: 1 }} />
      <button style={iconButtonStyle} title="Help">
        ❓
      </button>
    </aside>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  borderRadius: '8px',
  fontSize: '20px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export default AppSkillOS;
