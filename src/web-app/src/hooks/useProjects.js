// @version 3.3.395
/**
 * Project Management Hooks
 *
 * React hooks for Figma/GitHub-style project management.
 * Provides data fetching, caching, and mutations for projects.
 *
 * @module hooks/useProjects
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// API BASE
// ============================================================================

const API_BASE = '/api/v1/projects';

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {'private' | 'internal' | 'public'} ProjectVisibility
 * @typedef {'active' | 'archived' | 'draft' | 'template'} ProjectStatus
 * @typedef {'general' | 'web-app' | 'api' | 'library' | 'design-system' | 'documentation' | 'experiment' | 'prototype'} ProjectType
 */

// ============================================================================
// useProjects - List & Filter Projects
// ============================================================================

/**
 * Hook for listing and filtering projects
 *
 * @param {Object} options - Filter options
 * @param {string[]} [options.type] - Filter by project type
 * @param {string[]} [options.status] - Filter by status
 * @param {string[]} [options.visibility] - Filter by visibility
 * @param {string[]} [options.tags] - Filter by tags
 * @param {string} [options.search] - Search query
 * @param {boolean} [options.starred] - Filter starred only
 * @param {string} [options.sortBy] - Sort field
 * @param {string} [options.sortOrder] - Sort direction
 * @param {number} [options.limit] - Page size
 * @param {number} [options.offset] - Page offset
 */
export function useProjects(options = {}) {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Build query string from options
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (options.type?.length) params.set('type', options.type.join(','));
    if (options.status?.length) params.set('status', options.status.join(','));
    if (options.visibility?.length) params.set('visibility', options.visibility.join(','));
    if (options.tags?.length) params.set('tags', options.tags.join(','));
    if (options.search) params.set('search', options.search);
    if (options.starred) params.set('starred', 'true');
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    return params.toString();
  }, [options]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        setProjects(data.projects || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    total,
    loading,
    error,
    refresh: fetchProjects,
    hasMore: projects.length < total,
  };
}

// ============================================================================
// useProject - Single Project Details
// ============================================================================

/**
 * Hook for fetching a single project
 *
 * @param {string} projectId - Project ID to fetch
 */
export function useProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${projectId}`);
      const data = await response.json();

      if (data.ok) {
        setProject(data.project);
      } else {
        setError(data.error || 'Failed to fetch project');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refresh: fetchProject,
  };
}

// ============================================================================
// useProjectMutations - Create, Update, Delete Projects
// ============================================================================

/**
 * Hook for project mutations (create, update, delete)
 */
export function useProjectMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createProject = useCallback(async (input) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await response.json();

      if (data.ok) {
        return data.project;
      } else {
        setError(data.error || 'Failed to create project');
        return null;
      }
    } catch (e) {
      setError(e.message || 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();

      if (data.ok) {
        return data.project;
      } else {
        setError(data.error || 'Failed to update project');
        return null;
      }
    } catch (e) {
      setError(e.message || 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.ok) {
        return true;
      } else {
        setError(data.error || 'Failed to delete project');
        return false;
      }
    } catch (e) {
      setError(e.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const starProject = useCallback(async (id, starred = true) => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred }),
      });
      const data = await response.json();

      if (data.ok) {
        return data.stars;
      } else {
        setError(data.error || 'Failed to star project');
        return null;
      }
    } catch (e) {
      setError(e.message || 'Network error');
      return null;
    }
  }, []);

  const forkProject = useCallback(async (id, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${id}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const data = await response.json();

      if (data.ok) {
        return data.project;
      } else {
        setError(data.error || 'Failed to fork project');
        return null;
      }
    } catch (e) {
      setError(e.message || 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    starProject,
    forkProject,
  };
}

// ============================================================================
// useProjectBranches - Branch Management
// ============================================================================

/**
 * Hook for managing project branches
 *
 * @param {string} projectId - Project ID
 */
export function useProjectBranches(projectId) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBranches = useCallback(async () => {
    if (!projectId) {
      setBranches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${projectId}/branches`);
      const data = await response.json();

      if (data.ok) {
        setBranches(data.branches || []);
      } else {
        setError(data.error || 'Failed to fetch branches');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const createBranch = useCallback(
    async (name, fromBranch) => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/${projectId}/branches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, fromBranch }),
        });
        const data = await response.json();

        if (data.ok) {
          await fetchBranches();
          return data.branch;
        } else {
          setError(data.error || 'Failed to create branch');
          return null;
        }
      } catch (e) {
        setError(e.message || 'Network error');
        return null;
      }
    },
    [projectId, fetchBranches]
  );

  const deleteBranch = useCallback(
    async (branchName) => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/${projectId}/branches/${branchName}`, {
          method: 'DELETE',
        });
        const data = await response.json();

        if (data.ok) {
          await fetchBranches();
          return true;
        } else {
          setError(data.error || 'Failed to delete branch');
          return false;
        }
      } catch (e) {
        setError(e.message || 'Network error');
        return false;
      }
    },
    [projectId, fetchBranches]
  );

  return {
    branches,
    loading,
    error,
    refresh: fetchBranches,
    createBranch,
    deleteBranch,
  };
}

// ============================================================================
// useProjectVersions - Version Management
// ============================================================================

/**
 * Hook for managing project versions
 *
 * @param {string} projectId - Project ID
 */
export function useProjectVersions(projectId) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVersions = useCallback(async () => {
    if (!projectId) {
      setVersions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${projectId}/versions`);
      const data = await response.json();

      if (data.ok) {
        setVersions(data.versions || []);
      } else {
        setError(data.error || 'Failed to fetch versions');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const createVersion = useCallback(
    async (number, options = {}) => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/${projectId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, ...options }),
        });
        const data = await response.json();

        if (data.ok) {
          await fetchVersions();
          return data.version;
        } else {
          setError(data.error || 'Failed to create version');
          return null;
        }
      } catch (e) {
        setError(e.message || 'Network error');
        return null;
      }
    },
    [projectId, fetchVersions]
  );

  return {
    versions,
    loading,
    error,
    refresh: fetchVersions,
    createVersion,
  };
}

// ============================================================================
// useProjectFiles - File Management
// ============================================================================

/**
 * Hook for managing project files
 *
 * @param {string} projectId - Project ID
 * @param {string} [currentPath] - Current directory path
 */
export function useProjectFiles(projectId, currentPath = '.') {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    if (!projectId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/${projectId}/files?path=${encodeURIComponent(currentPath)}`
      );
      const data = await response.json();

      if (data.ok) {
        setFiles(data.files || []);
      } else {
        setError(data.error || 'Failed to fetch files');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId, currentPath]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const getFileContent = useCallback(
    async (filePath) => {
      try {
        const response = await fetch(
          `${API_BASE}/${projectId}/files/content?path=${encodeURIComponent(filePath)}`
        );
        const data = await response.json();

        if (data.ok) {
          return data.content;
        } else {
          throw new Error(data.error || 'Failed to get file content');
        }
      } catch (e) {
        throw new Error(e.message || 'Network error');
      }
    },
    [projectId]
  );

  const saveFile = useCallback(
    async (filePath, content, message) => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/${projectId}/files/content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content, message }),
        });
        const data = await response.json();

        if (data.ok) {
          await fetchFiles();
          return true;
        } else {
          setError(data.error || 'Failed to save file');
          return false;
        }
      } catch (e) {
        setError(e.message || 'Network error');
        return false;
      }
    },
    [projectId, fetchFiles]
  );

  const deleteFile = useCallback(
    async (filePath) => {
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE}/${projectId}/files?path=${encodeURIComponent(filePath)}`,
          { method: 'DELETE' }
        );
        const data = await response.json();

        if (data.ok) {
          await fetchFiles();
          return true;
        } else {
          setError(data.error || 'Failed to delete file');
          return false;
        }
      } catch (e) {
        setError(e.message || 'Network error');
        return false;
      }
    },
    [projectId, fetchFiles]
  );

  return {
    files,
    loading,
    error,
    refresh: fetchFiles,
    getFileContent,
    saveFile,
    deleteFile,
  };
}

// ============================================================================
// useProjectActivity - Activity Feed
// ============================================================================

/**
 * Hook for fetching project activity
 *
 * @param {string} projectId - Project ID
 * @param {number} [limit] - Number of activities to fetch
 */
export function useProjectActivity(projectId, limit = 20) {
  const [activity, setActivity] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = useCallback(async () => {
    if (!projectId) {
      setActivity([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${projectId}/activity?limit=${limit}`);
      const data = await response.json();

      if (data.ok) {
        setActivity(data.activity || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to fetch activity');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId, limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return {
    activity,
    total,
    loading,
    error,
    refresh: fetchActivity,
  };
}

// ============================================================================
// useProjectTemplates - Template Listing
// ============================================================================

/**
 * Hook for fetching project templates
 */
export function useProjectTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/templates/list`);
      const data = await response.json();

      if (data.ok) {
        setTemplates(data.templates || []);
      } else {
        setError(data.error || 'Failed to fetch templates');
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
  };
}

// ============================================================================
// useActiveProject - Active Project Management
// ============================================================================

/**
 * Hook for managing the active/selected project
 * Integrates with chat context and system-wide project scope
 *
 * @returns {Object} Active project state and controls
 */
export function useActiveProject() {
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActiveProject = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/active/current`);
      const data = await response.json();

      if (data.ok) {
        setActiveProject(data.activeProject);
      }
    } catch (e) {
      console.warn('[useActiveProject] Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/active/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await response.json();

      if (data.ok) {
        setActiveProject(data.activeProject);
        return data.activeProject;
      } else {
        setError(data.error || 'Failed to set active project');
        return null;
      }
    } catch (e) {
      setError(e.message || 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearProject = useCallback(async () => {
    return selectProject(null);
  }, [selectProject]);

  useEffect(() => {
    fetchActiveProject();
  }, [fetchActiveProject]);

  // Listen for project events via Socket.IO
  useEffect(() => {
    const handleProjectEvent = (event) => {
      if (event.type.startsWith('project:')) {
        // Refresh active project when relevant events occur
        if (
          event.type === 'project:activated' ||
          event.type === 'project:deactivated' ||
          event.type === 'project:updated'
        ) {
          fetchActiveProject();
        }
      }
    };

    // Assuming socket is available globally or via context
    if (typeof window !== 'undefined' && window.__tooloo_socket) {
      window.__tooloo_socket.on('synapsys:event', handleProjectEvent);
      return () => {
        window.__tooloo_socket.off('synapsys:event', handleProjectEvent);
      };
    }
  }, [fetchActiveProject]);

  return {
    activeProject,
    loading,
    error,
    selectProject,
    clearProject,
    refresh: fetchActiveProject,
    hasActiveProject: !!activeProject,
  };
}

export default {
  useProjects,
  useProject,
  useProjectMutations,
  useProjectBranches,
  useProjectVersions,
  useProjectFiles,
  useProjectActivity,
  useProjectTemplates,
  useActiveProject,
};
