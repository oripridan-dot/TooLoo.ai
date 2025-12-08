// @version 3.3.396
/**
 * Project Selector Component
 *
 * A dropdown/modal component for selecting the active project.
 * Shows in the header and integrates with the chat context.
 *
 * @module skin/components/ProjectSelector
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjects, useActiveProject } from '../../hooks/useProjects';

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
  },
  triggerHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  projectIcon: {
    fontSize: '16px',
  },
  projectName: {
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: '12px',
    opacity: 0.6,
    transition: 'transform 0.2s ease',
  },
  chevronOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    minWidth: '280px',
    maxWidth: '360px',
    background: '#1a1a1a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  clearBtn: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  searchInput: {
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  projectList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  projectItemHover: {
    background: 'rgba(255, 255, 255, 0.05)',
  },
  projectItemActive: {
    background: 'rgba(99, 102, 241, 0.15)',
  },
  itemIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  emptyState: {
    padding: '24px 16px',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '13px',
  },
  newProjectBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  activeBadge: {
    padding: '2px 6px',
    background: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
  },
};

// ============================================================================
// PROJECT SELECTOR COMPONENT
// ============================================================================

export function ProjectSelector({ onNewProject, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoverTrigger, setHoverTrigger] = useState(false);
  const [hoverItem, setHoverItem] = useState(null);
  const dropdownRef = useRef(null);

  const { projects, loading: projectsLoading } = useProjects({ limit: 20 });
  const { activeProject, selectProject, clearProject, loading: activeLoading } = useActiveProject();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter projects by search
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (project) => {
    await selectProject(project.id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = async () => {
    await clearProject();
    setIsOpen(false);
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        style={{
          ...styles.trigger,
          ...(hoverTrigger ? styles.triggerHover : {}),
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setHoverTrigger(true)}
        onMouseLeave={() => setHoverTrigger(false)}
        whileTap={{ scale: 0.98 }}
      >
        {activeProject ? (
          <>
            <span
              style={{
                ...styles.itemIcon,
                background: activeProject.color || '#6366f1',
                width: '24px',
                height: '24px',
                fontSize: '12px',
              }}
            >
              {activeProject.icon || '📁'}
            </span>
            {!compact && (
              <span style={styles.projectName}>{activeProject.name}</span>
            )}
          </>
        ) : (
          <>
            <span style={styles.projectIcon}>📁</span>
            {!compact && <span>Select Project</span>}
          </>
        )}
        <span
          style={{
            ...styles.chevron,
            ...(isOpen ? styles.chevronOpen : {}),
          }}
        >
          ▼
        </span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            style={styles.dropdown}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div style={styles.header}>
              <span style={styles.headerTitle}>Projects</span>
              {activeProject && (
                <motion.span
                  style={styles.clearBtn}
                  onClick={handleClear}
                  whileHover={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
                >
                  Clear Selection
                </motion.span>
              )}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />

            {/* Project List */}
            <div style={styles.projectList}>
              {projectsLoading ? (
                <div style={styles.emptyState}>Loading projects...</div>
              ) : filteredProjects.length === 0 ? (
                <div style={styles.emptyState}>
                  {search ? 'No projects match your search' : 'No projects yet'}
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const isActive = activeProject?.id === project.id;
                  return (
                    <motion.div
                      key={project.id}
                      style={{
                        ...styles.projectItem,
                        ...(hoverItem === project.id ? styles.projectItemHover : {}),
                        ...(isActive ? styles.projectItemActive : {}),
                      }}
                      onClick={() => handleSelect(project)}
                      onMouseEnter={() => setHoverItem(project.id)}
                      onMouseLeave={() => setHoverItem(null)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span
                        style={{
                          ...styles.itemIcon,
                          background: project.color || '#6366f1',
                        }}
                      >
                        {project.icon || '📁'}
                      </span>
                      <div style={styles.itemInfo}>
                        <div style={styles.itemName}>{project.name}</div>
                        <div style={styles.itemMeta}>
                          <span>{project.type}</span>
                          {project.stats?.stars > 0 && (
                            <span>⭐ {project.stats.stars}</span>
                          )}
                        </div>
                      </div>
                      {isActive && <span style={styles.activeBadge}>Active</span>}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* New Project Button */}
            {onNewProject && (
              <motion.div
                style={styles.newProjectBtn}
                onClick={() => {
                  setIsOpen(false);
                  onNewProject();
                }}
                whileHover={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }}
              >
                <span>+</span>
                <span>New Project</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// COMPACT PROJECT INDICATOR
// ============================================================================

/**
 * A minimal indicator showing the active project
 * For use in tight spaces like the chat header
 */
export function ProjectIndicator({ onClick }) {
  const { activeProject, loading } = useActiveProject();

  if (loading || !activeProject) {
    return null;
  }

  return (
    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: activeProject.color || 'rgba(99, 102, 241, 0.2)',
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        fontSize: '12px',
        color: '#fff',
      }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      <span>{activeProject.icon || '📁'}</span>
      <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {activeProject.name}
      </span>
    </motion.div>
  );
}

export default ProjectSelector;
