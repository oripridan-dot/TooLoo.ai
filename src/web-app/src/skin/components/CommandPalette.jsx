// @version 3.3.532
/**
 * @file CommandPalette - Cmd+K Command Palette Component
 * @version 3.3.531
 * 
 * A VS Code/Raycast-style command palette for quick actions.
 * Triggered by Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 * 
 * Features:
 * - Fuzzy search across commands
 * - Recent commands tracking
 * - Keyboard navigation
 * - Action categories
 * - Real-time filtering
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Command,
  MessageSquare,
  FolderPlus,
  Settings,
  Zap,
  Code,
  FileText,
  GitBranch,
  Sparkles,
  Brain,
  Layout,
  Terminal,
  Palette,
  Save,
  RefreshCw,
  Play,
  X,
  ChevronRight,
  History,
  Star,
} from 'lucide-react';

// ============================================================================
// Command Definitions
// ============================================================================

const COMMANDS = [
  // Project Actions
  {
    id: 'new-project',
    label: 'New Project',
    description: 'Create a new project workspace',
    category: 'project',
    icon: FolderPlus,
    keywords: ['create', 'start', 'new', 'project'],
    action: 'project:create',
  },
  {
    id: 'open-project',
    label: 'Open Project',
    description: 'Open an existing project',
    category: 'project',
    icon: FolderPlus,
    keywords: ['open', 'load', 'project'],
    action: 'project:open',
  },
  {
    id: 'save-project',
    label: 'Save Project',
    description: 'Save current project state',
    category: 'project',
    icon: Save,
    keywords: ['save', 'persist', 'project'],
    shortcut: '⌘S',
    action: 'project:save',
  },

  // AI Actions
  {
    id: 'new-chat',
    label: 'New Chat',
    description: 'Start a new AI conversation',
    category: 'ai',
    icon: MessageSquare,
    keywords: ['chat', 'conversation', 'talk', 'ai'],
    shortcut: '⌘N',
    action: 'chat:new',
  },
  {
    id: 'generate-code',
    label: 'Generate Code',
    description: 'Ask AI to generate code',
    category: 'ai',
    icon: Code,
    keywords: ['generate', 'code', 'write', 'create'],
    action: 'ai:generate',
  },
  {
    id: 'explain-code',
    label: 'Explain Code',
    description: 'Get AI explanation of selected code',
    category: 'ai',
    icon: Brain,
    keywords: ['explain', 'understand', 'code', 'what'],
    action: 'ai:explain',
  },
  {
    id: 'refactor-code',
    label: 'Refactor Code',
    description: 'AI-assisted code refactoring',
    category: 'ai',
    icon: Sparkles,
    keywords: ['refactor', 'improve', 'optimize', 'clean'],
    action: 'ai:refactor',
  },

  // View Actions
  {
    id: 'toggle-chat',
    label: 'Toggle Chat Panel',
    description: 'Show or hide the chat panel',
    category: 'view',
    icon: Layout,
    keywords: ['toggle', 'chat', 'panel', 'show', 'hide'],
    shortcut: '⌘1',
    action: 'view:toggle-chat',
  },
  {
    id: 'toggle-artifacts',
    label: 'Toggle Artifacts Panel',
    description: 'Show or hide the artifacts panel',
    category: 'view',
    icon: FileText,
    keywords: ['toggle', 'artifacts', 'files', 'panel'],
    shortcut: '⌘2',
    action: 'view:toggle-artifacts',
  },
  {
    id: 'toggle-tasks',
    label: 'Toggle Tasks Panel',
    description: 'Show or hide the task execution panel',
    category: 'view',
    icon: Zap,
    keywords: ['toggle', 'tasks', 'execution', 'dag'],
    shortcut: '⌘3',
    action: 'view:toggle-tasks',
  },
  {
    id: 'focus-mode',
    label: 'Focus Mode',
    description: 'Enter distraction-free focus mode',
    category: 'view',
    icon: Layout,
    keywords: ['focus', 'zen', 'distraction', 'free'],
    action: 'view:focus-mode',
  },

  // System Actions
  {
    id: 'open-settings',
    label: 'Open Settings',
    description: 'Configure TooLoo settings',
    category: 'system',
    icon: Settings,
    keywords: ['settings', 'config', 'preferences', 'options'],
    shortcut: '⌘,',
    action: 'system:settings',
  },
  {
    id: 'open-terminal',
    label: 'Open Terminal',
    description: 'Open integrated terminal',
    category: 'system',
    icon: Terminal,
    keywords: ['terminal', 'shell', 'command', 'console'],
    shortcut: '⌘`',
    action: 'system:terminal',
  },
  {
    id: 'refresh-system',
    label: 'Refresh System',
    description: 'Refresh system state and connections',
    category: 'system',
    icon: RefreshCw,
    keywords: ['refresh', 'reload', 'sync', 'update'],
    action: 'system:refresh',
  },
  {
    id: 'run-task',
    label: 'Run Task',
    description: 'Execute a background task',
    category: 'system',
    icon: Play,
    keywords: ['run', 'execute', 'task', 'job'],
    action: 'system:run-task',
  },

  // Theme/Visual Actions
  {
    id: 'change-theme',
    label: 'Change Theme',
    description: 'Switch color theme',
    category: 'theme',
    icon: Palette,
    keywords: ['theme', 'color', 'dark', 'light'],
    action: 'theme:change',
  },

  // Git Actions
  {
    id: 'git-commit',
    label: 'Git Commit',
    description: 'Commit changes with AI message',
    category: 'git',
    icon: GitBranch,
    keywords: ['git', 'commit', 'save', 'version'],
    action: 'git:commit',
  },
  {
    id: 'git-branch',
    label: 'Create Branch',
    description: 'Create a new git branch',
    category: 'git',
    icon: GitBranch,
    keywords: ['git', 'branch', 'create', 'feature'],
    action: 'git:branch',
  },
];

const CATEGORY_LABELS = {
  project: 'Project',
  ai: 'AI Assistant',
  view: 'View',
  system: 'System',
  theme: 'Theme',
  git: 'Git',
};

const CATEGORY_ORDER = ['ai', 'project', 'view', 'system', 'git', 'theme'];

// ============================================================================
// Fuzzy Search
// ============================================================================

function fuzzyMatch(query, text) {
  if (!query) return true;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Direct substring match
  if (textLower.includes(queryLower)) return true;
  
  // Fuzzy character match
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

function scoreMatch(query, command) {
  if (!query) return 100;
  
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Exact label match
  if (command.label.toLowerCase() === queryLower) return 1000;
  
  // Label starts with query
  if (command.label.toLowerCase().startsWith(queryLower)) score += 100;
  
  // Label contains query
  if (command.label.toLowerCase().includes(queryLower)) score += 50;
  
  // Keywords match
  for (const keyword of command.keywords) {
    if (keyword.startsWith(queryLower)) score += 30;
    else if (keyword.includes(queryLower)) score += 15;
  }
  
  // Description contains query
  if (command.description.toLowerCase().includes(queryLower)) score += 10;
  
  return score;
}

// ============================================================================
// Component
// ============================================================================

export function CommandPalette({ isOpen, onClose, onAction }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load recent commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tooloo:recent-commands');
      if (stored) {
        setRecentCommands(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    let commands = COMMANDS.filter(cmd => {
      if (!query) return true;
      return (
        fuzzyMatch(query, cmd.label) ||
        fuzzyMatch(query, cmd.description) ||
        cmd.keywords.some(kw => fuzzyMatch(query, kw))
      );
    });

    // Sort by match score
    commands.sort((a, b) => scoreMatch(query, b) - scoreMatch(query, a));

    return commands;
  }, [query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = new Map();
    
    for (const cmd of filteredCommands) {
      if (!groups.has(cmd.category)) {
        groups.set(cmd.category, []);
      }
      groups.get(cmd.category).push(cmd);
    }

    // Sort groups by category order
    const sortedGroups = [];
    for (const cat of CATEGORY_ORDER) {
      if (groups.has(cat)) {
        sortedGroups.push({
          category: cat,
          label: CATEGORY_LABELS[cat],
          commands: groups.get(cat),
        });
      }
    }

    return sortedGroups;
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return groupedCommands.flatMap(g => g.commands);
  }, [groupedCommands]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          executeCommand(flatCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatCommands, selectedIndex, onClose]);

  // Execute a command
  const executeCommand = useCallback((command) => {
    // Update recent commands
    const newRecent = [
      command.id,
      ...recentCommands.filter(id => id !== command.id),
    ].slice(0, 5);
    setRecentCommands(newRecent);
    
    try {
      localStorage.setItem('tooloo:recent-commands', JSON.stringify(newRecent));
    } catch (e) {
      // Ignore localStorage errors
    }

    // Close palette and execute action
    onClose();
    if (onAction) {
      onAction(command.action, command);
    }
  }, [recentCommands, onClose, onAction]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatCommands[selectedIndex]) {
      const item = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatCommands]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="command-palette-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '15vh',
        }}
      >
        <motion.div
          className="command-palette"
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '560px',
            background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Search size={20} style={{ color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                color: 'white',
                fontFamily: 'inherit',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <Command size={12} />K
            </div>
          </div>

          {/* Commands List */}
          <div
            ref={listRef}
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {/* Recent Commands */}
            {!query && recentCommands.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <History size={12} />
                  Recent
                </div>
                {recentCommands.map((cmdId, idx) => {
                  const cmd = COMMANDS.find(c => c.id === cmdId);
                  if (!cmd) return null;
                  const Icon = cmd.icon;
                  const flatIndex = flatCommands.findIndex(c => c.id === cmdId);
                  const isSelected = flatIndex === selectedIndex;
                  
                  return (
                    <CommandItem
                      key={`recent-${cmdId}`}
                      command={cmd}
                      isSelected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      dataIndex={flatIndex}
                    />
                  );
                })}
              </div>
            )}

            {/* Grouped Commands */}
            {groupedCommands.map((group) => (
              <div key={group.category} style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {group.label}
                </div>
                {group.commands.map((cmd) => {
                  const flatIndex = flatCommands.findIndex(c => c.id === cmd.id);
                  const isSelected = flatIndex === selectedIndex;
                  
                  return (
                    <CommandItem
                      key={cmd.id}
                      command={cmd}
                      isSelected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      dataIndex={flatIndex}
                    />
                  );
                })}
              </div>
            ))}

            {/* No Results */}
            {flatCommands.length === 0 && (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <Search size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px' }}>No commands found</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Try a different search term
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          >
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} />
              TooLoo.ai
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Command Item Component
// ============================================================================

function CommandItem({ command, isSelected, onClick, dataIndex }) {
  const Icon = command.icon;
  
  return (
    <div
      data-index={dataIndex}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
        transition: 'all 0.1s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          background: isSelected
            ? 'rgba(99, 102, 241, 0.3)'
            : 'rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}
      >
        <Icon size={18} style={{ color: isSelected ? '#a5b4fc' : 'rgba(255, 255, 255, 0.6)' }} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: isSelected ? 'white' : 'rgba(255, 255, 255, 0.9)',
          }}
        >
          {command.label}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {command.description}
        </div>
      </div>

      {command.shortcut && (
        <div
          style={{
            padding: '4px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {command.shortcut}
        </div>
      )}

      <ChevronRight
        size={16}
        style={{
          color: 'rgba(255, 255, 255, 0.2)',
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// ============================================================================
// Hook for Global Keyboard Shortcut
// ============================================================================

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

export default CommandPalette;
