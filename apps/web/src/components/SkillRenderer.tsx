/**
 * @file SkillRenderer - The Chameleon Frontend
 * @description Renders the UI for the active skill
 * @version 1.0.0
 *
 * This component is the ENTIRE frontend. It:
 * - Asks "What skill is active?"
 * - Loads and renders that skill's UI component
 * - Passes skill data and dispatch function
 *
 * The UI morphs to match whatever skill is active.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { useSynapsys } from '../hooks/useSynapsys';

// =============================================================================
// SKILL COMPONENT REGISTRY
// =============================================================================

// Lazy-loaded skill UI components
// In production, these would be dynamically imported based on skill manifest
const SKILL_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'core.chat': lazy(() =>
    import('../../../src/skills/chat/ui').then((m) => ({ default: m.ChatUI }))
  ),
  'core.system': lazy(() =>
    import('../../../src/skills/system/ui').then((m) => ({ default: m.SystemUI }))
  ),
};

// Fallback for unknown skills
const UnknownSkillUI = ({ skillId }: { skillId: string }) => (
  <div style={styles.unknown}>
    <h2>🔌 Unknown Skill</h2>
    <p>
      No UI component found for skill: <code>{skillId}</code>
    </p>
    <p>Make sure the skill is registered in SKILL_COMPONENTS.</p>
  </div>
);

// Loading placeholder
const SkillLoadingUI = () => (
  <div style={styles.loading}>
    <div style={styles.spinner}>⟳</div>
    <p>Loading skill...</p>
  </div>
);

// Empty state when no skill is active
const EmptyState = ({ onActivate }: { onActivate: (id: string) => void }) => (
  <div style={styles.empty}>
    <h1 style={styles.emptyTitle}>🌐 Synapsys Skill OS</h1>
    <p style={styles.emptySubtitle}>Select a skill to get started</p>

    <div style={styles.quickStart}>
      <button onClick={() => onActivate('core.chat')} style={styles.quickBtn}>
        💬 Chat
      </button>
      <button onClick={() => onActivate('core.system')} style={styles.quickBtn}>
        ⚙️ Settings
      </button>
    </div>
  </div>
);

// =============================================================================
// SKILL RENDERER COMPONENT
// =============================================================================

export interface SkillRendererProps {
  /** API base URL for kernel */
  apiBase?: string;
  /** Default skill to activate */
  defaultSkill?: string;
  /** Custom header component */
  header?: React.ReactNode;
  /** Custom sidebar component */
  sidebar?: React.ReactNode;
}

export function SkillRenderer({
  apiBase,
  defaultSkill = 'core.chat',
  header,
  sidebar,
}: SkillRendererProps) {
  const synapsys = useSynapsys({ apiBase, defaultSkill });

  const {
    activeSkillId,
    activeSkill,
    skillData,
    isLoading,
    error,
    skills,
    activate,
    dispatch,
    clearError,
  } = synapsys;

  // Get the component for the active skill
  const SkillComponent = useMemo(() => {
    if (!activeSkillId) return null;
    return SKILL_COMPONENTS[activeSkillId] ?? null;
  }, [activeSkillId]);

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      {header ?? (
        <header style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🧠</span>
            <span style={styles.logoText}>Synapsys</span>
          </div>

          {activeSkill && (
            <div style={styles.activeIndicator}>
              Active: <strong>{activeSkill.name}</strong>
            </div>
          )}
        </header>
      )}

      <div style={styles.main}>
        {/* Sidebar - Skill Navigation */}
        {sidebar ?? (
          <aside style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>Skills</h3>
            <nav style={styles.nav}>
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => activate(skill.id)}
                  style={{
                    ...styles.navItem,
                    ...(skill.id === activeSkillId ? styles.navItemActive : {}),
                  }}
                >
                  <span style={styles.navIcon}>{getSkillIcon(skill.ui.icon)}</span>
                  <span>{skill.name}</span>
                </button>
              ))}
            </nav>

            <div style={styles.sidebarFooter}>
              <p style={styles.version}>v1.0.0</p>
              <p style={styles.hint}>Press {activeSkill?.ui.shortcut} for shortcut</p>
            </div>
          </aside>
        )}

        {/* Main Content - Active Skill */}
        <main style={styles.content}>
          {!activeSkillId ? (
            <EmptyState onActivate={activate} />
          ) : !SkillComponent ? (
            <UnknownSkillUI skillId={activeSkillId} />
          ) : (
            <Suspense fallback={<SkillLoadingUI />}>
              <SkillComponent
                data={skillData}
                onInteract={dispatch}
                isLoading={isLoading}
                error={error}
              />
            </Suspense>
          )}
        </main>
      </div>

      {/* Global Error Toast */}
      {error && (
        <div style={styles.errorToast}>
          <span>⚠️ {error}</span>
          <button onClick={clearError} style={styles.errorClose}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getSkillIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    'message-circle': '💬',
    settings: '⚙️',
    code: '💻',
    search: '🔍',
    file: '📄',
    image: '🖼️',
    database: '🗄️',
  };
  return iconMap[iconName] ?? '🔌';
}

// =============================================================================
// STYLES
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  activeIndicator: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTitle: {
    padding: '16px 20px 8px',
    margin: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  navItemActive: {
    backgroundColor: '#334155',
    color: '#f1f5f9',
  },
  navIcon: {
    fontSize: '18px',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #334155',
  },
  version: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b',
  },
  hint: {
    margin: '4px 0 0',
    fontSize: '11px',
    color: '#475569',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#0f172a',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
  },
  emptyTitle: {
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
  },
  emptySubtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '8px 0 32px',
  },
  quickStart: {
    display: 'flex',
    gap: '16px',
  },
  quickBtn: {
    padding: '16px 32px',
    fontSize: '16px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#f1f5f9',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  unknown: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748b',
  },
  spinner: {
    fontSize: '48px',
    animation: 'spin 1s linear infinite',
  },
  errorToast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: '#7f1d1d',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '14px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#fca5a5',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 4px',
  },
};

// =============================================================================
// CSS KEYFRAMES (would be in global CSS)
// =============================================================================

// Add this to your global CSS:
// @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

export default SkillRenderer;
