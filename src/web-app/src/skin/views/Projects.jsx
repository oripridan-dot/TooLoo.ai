// @version 3.3.385
/**
 * Projects View - Figma/GitHub-style Project Management
 *
 * Features:
 * - Grid/List view toggle
 * - Search & Filters
 * - Project cards with thumbnails
 * - Create/Fork/Star actions
 * - Activity timeline
 *
 * @module views/Projects
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjects, useProjectMutations, useProjectTemplates } from '../../hooks/useProjects';

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Grid: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  List: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Star: ({ filled }) => (
    <svg
      className="w-4 h-4"
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  ),
  Fork: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  ),
  Branch: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  Private: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  Public: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Dots: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ============================================================================
// PROJECT TYPE CONFIG
// ============================================================================

const PROJECT_TYPES = {
  general: { icon: '📁', label: 'General', color: '#6366f1' },
  'web-app': { icon: '🌐', label: 'Web App', color: '#06b6d4' },
  api: { icon: '🔌', label: 'API', color: '#10b981' },
  library: { icon: '📚', label: 'Library', color: '#8b5cf6' },
  'design-system': { icon: '🎨', label: 'Design System', color: '#f43f5e' },
  documentation: { icon: '📖', label: 'Documentation', color: '#f59e0b' },
  experiment: { icon: '🧪', label: 'Experiment', color: '#ec4899' },
  prototype: { icon: '✨', label: 'Prototype', color: '#14b8a6' },
};

// ============================================================================
// PROJECT CARD
// ============================================================================

const ProjectCard = memo(({ project, viewMode, onSelect, onStar, onFork, onOptions }) => {
  const typeConfig = PROJECT_TYPES[project.type] || PROJECT_TYPES.general;
  const [isHovered, setIsHovered] = useState(false);

  const timeAgo = useMemo(() => {
    const date = new Date(project.updatedAt);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  }, [project.updatedAt]);

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onSelect(project)}
        className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-colors"
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${typeConfig.color}20` }}
        >
          {project.icon || typeConfig.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{project.name}</h3>
            {project.visibility === 'private' && (
              <span className="text-gray-500">
                <Icons.Private />
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm truncate">
            {project.description || 'No description'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <span className="flex items-center gap-1">
            <Icons.Star filled={false} />
            {project.stats?.stars || 0}
          </span>
          <span className="flex items-center gap-1">
            <Icons.Fork />
            {project.stats?.forks || 0}
          </span>
          <span className="flex items-center gap-1">
            <Icons.Users />
            {project.stats?.collaborators || 1}
          </span>
        </div>

        {/* Tags */}
        <div className="hidden lg:flex items-center gap-2">
          {project.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
              {tag}
            </span>
          ))}
        </div>

        {/* Time */}
        <span className="text-gray-500 text-sm whitespace-nowrap">{timeAgo}</span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onStar(project);
            }}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <Icons.Star filled={project.isStarred} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onOptions(project, e);
            }}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
          >
            <Icons.Dots />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect(project)}
      className="group relative bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 overflow-hidden cursor-pointer transition-colors"
    >
      {/* Thumbnail / Header */}
      <div
        className="h-32 relative"
        style={{
          background: `linear-gradient(135deg, ${typeConfig.color}30, ${typeConfig.color}10)`,
        }}
      >
        {project.thumbnail?.url ? (
          <img
            src={project.thumbnail.url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-50">
            {project.icon || typeConfig.icon}
          </div>
        )}

        {/* Visibility badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              project.visibility === 'public'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {project.visibility}
          </span>
        </div>

        {/* Quick actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 right-2 flex gap-1"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStar(project);
                }}
                className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
              >
                <Icons.Star filled={project.isStarred} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFork(project);
                }}
                className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
              >
                <Icons.Fork />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white font-medium truncate flex-1">{project.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOptions(project, e);
            }}
            className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Icons.Dots />
          </button>
        </div>

        <p className="text-gray-500 text-sm line-clamp-2 mb-3">
          {project.description || 'No description'}
        </p>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats & Time */}
        <div className="flex items-center justify-between text-gray-500 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Icons.Star filled={false} />
              {project.stats?.stars || 0}
            </span>
            <span className="flex items-center gap-1">
              <Icons.Fork />
              {project.stats?.forks || 0}
            </span>
          </div>
          <span>{timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
});

ProjectCard.displayName = 'ProjectCard';

// ============================================================================
// CREATE PROJECT MODAL
// ============================================================================

const CreateProjectModal = memo(({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');
  const [visibility, setVisibility] = useState('private');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const { templates } = useProjectTemplates();

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    await onCreate({
      name: name.trim(),
      description: description.trim(),
      type,
      visibility,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setLoading(false);

    // Reset form
    setName('');
    setDescription('');
    setType('general');
    setVisibility('private');
    setTags('');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Create New Project</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <Icons.Close />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-project"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          {/* Type & Visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {Object.entries(PROJECT_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="private">🔒 Private</option>
                <option value="internal">🏢 Internal</option>
                <option value="public">🌍 Public</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="react, typescript, api"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Templates Quick Select */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quick Start Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setType(template.id);
                      if (!name) setName(template.name);
                      if (!description) setDescription(template.description);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <span>{template.icon}</span>
                    <span>{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Icons.Plus />
                Create Project
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

CreateProjectModal.displayName = 'CreateProjectModal';

// ============================================================================
// PROJECT DETAILS PANEL
// ============================================================================

const ProjectDetailsPanel = memo(({ project, onClose, onFork, onDelete }) => {
  if (!project) return null;

  const typeConfig = PROJECT_TYPES[project.type] || PROJECT_TYPES.general;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-96 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-40 overflow-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white truncate">{project.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <Icons.Close />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Thumbnail */}
        <div
          className="h-40 rounded-xl flex items-center justify-center text-6xl"
          style={{
            background: `linear-gradient(135deg, ${typeConfig.color}30, ${typeConfig.color}10)`,
          }}
        >
          {project.icon || typeConfig.icon}
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
          <p className="text-gray-300">{project.description || 'No description'}</p>
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{project.stats?.stars || 0}</div>
              <div className="text-xs text-gray-500">Stars</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{project.stats?.forks || 0}</div>
              <div className="text-xs text-gray-500">Forks</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{project.stats?.branches || 1}</div>
              <div className="text-xs text-gray-500">Branches</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-white/5 rounded text-sm text-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="text-gray-300 flex items-center gap-1">
                {typeConfig.icon} {typeConfig.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Visibility</span>
              <span className="text-gray-300">{project.visibility}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="text-gray-300">{project.currentVersion || '0.1.0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-300">
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated</span>
              <span className="text-gray-300">
                {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => onFork(project)}
            className="w-full px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icons.Fork />
            Fork Project
          </button>
          <button
            onClick={() => onDelete(project)}
            className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            Delete Project
          </button>
        </div>
      </div>
    </motion.div>
  );
});

ProjectDetailsPanel.displayName = 'ProjectDetailsPanel';

// ============================================================================
// MAIN PROJECTS VIEW
// ============================================================================

const Projects = () => {
  // State
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Hooks
  const { projects, total, loading, error, refresh } = useProjects({
    search: searchQuery || undefined,
    type: selectedType ? [selectedType] : undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const { createProject, starProject, forkProject, deleteProject } = useProjectMutations();

  // Handlers
  const handleCreateProject = async (input) => {
    const project = await createProject(input);
    if (project) {
      setShowCreateModal(false);
      refresh();
    }
  };

  const handleStarProject = async (project) => {
    await starProject(project.id, !project.isStarred);
    refresh();
  };

  const handleForkProject = async (project) => {
    const forked = await forkProject(project.id);
    if (forked) {
      refresh();
    }
  };

  const handleDeleteProject = async (project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      await deleteProject(project.id);
      setSelectedProject(null);
      refresh();
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  const handleProjectOptions = (project, event) => {
    // Could show context menu
    setSelectedProject(project);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-500">{total} projects</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Icons.Search />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-64 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Icons.Search />
            </span>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">All Types</option>
            {Object.entries(PROJECT_TYPES).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Icons.Grid />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Icons.List />
            </button>
          </div>

          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Icons.Plus />
            New Project
          </motion.button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 flex items-center gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              <span>Loading projects...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 mb-2">Error loading projects</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-4">Create your first project to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Icons.Plus />
              Create Project
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            }
          >
            <AnimatePresence mode="popLayout">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  onSelect={handleSelectProject}
                  onStar={handleStarProject}
                  onFork={handleForkProject}
                  onOptions={handleProjectOptions}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateProjectModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateProject}
          />
        )}
      </AnimatePresence>

      {/* Details Panel */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailsPanel
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onFork={handleForkProject}
            onDelete={handleDeleteProject}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
