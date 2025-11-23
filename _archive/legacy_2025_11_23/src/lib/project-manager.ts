// Project Manager - Handles multi-file projects
// Supports file tree navigation, open files, and project structure

const projects = new Map();

export default {
  // Create new project
  createProject(projectId, projectName) {
    if (projects.has(projectId)) {
      return { ok: false, error: 'Project already exists' };
    }

    const project = {
      id: projectId,
      name: projectName,
      files: new Map(),
      openFiles: new Set(),
      activeFile: null,
      createdAt: new Date().toISOString()
    };

    projects.set(projectId, project);
    return { ok: true, project: { id: projectId, name: projectName } };
  },

  // Get project
  getProject(projectId) {
    return projects.get(projectId) || null;
  },

  // Add file to project
  addFile(projectId, filePath, content = '', language = 'javascript') {
    const project = projects.get(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    project.files.set(filePath, {
      path: filePath,
      content,
      language,
      unsavedChanges: false,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });

    return { ok: true, file: filePath };
  },

  // Update file content
  updateFile(projectId, filePath, content) {
    const project = projects.get(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const file = project.files.get(filePath);
    if (!file) return { ok: false, error: 'File not found' };

    file.content = content;
    file.unsavedChanges = true;
    file.lastModified = new Date().toISOString();

    return { ok: true, file: filePath };
  },

  // Get file content
  getFile(projectId, filePath) {
    const project = projects.get(projectId);
    if (!project) return null;

    return project.files.get(filePath) || null;
  },

  // Delete file
  deleteFile(projectId, filePath) {
    const project = projects.get(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    project.files.delete(filePath);
    project.openFiles.delete(filePath);

    if (project.activeFile === filePath) {
      project.activeFile = project.openFiles.size > 0 
        ? Array.from(project.openFiles)[0] 
        : null;
    }

    return { ok: true };
  },

  // Open file in editor
  openFile(projectId, filePath) {
    const project = projects.get(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    if (!project.files.has(filePath)) {
      return { ok: false, error: 'File not found' };
    }

    project.openFiles.add(filePath);
    project.activeFile = filePath;

    return { ok: true, file: project.files.get(filePath) };
  },

  // Close file
  closeFile(projectId, filePath) {
    const project = projects.get(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    project.openFiles.delete(filePath);

    if (project.activeFile === filePath) {
      project.activeFile = project.openFiles.size > 0
        ? Array.from(project.openFiles)[0]
        : null;
    }

    return { ok: true };
  },

  // Get list of open files
  getOpenFiles(projectId) {
    const project = projects.get(projectId);
    if (!project) return null;

    return Array.from(project.openFiles).map(path => {
      const file = project.files.get(path);
      return {
        path,
        hasUnsavedChanges: file.unsavedChanges
      };
    });
  },

  // Get file tree structure
  getFileTree(projectId) {
    const project = projects.get(projectId);
    if (!project) return null;

    const tree = { type: 'folder', name: project.name, children: [] };
    const pathMap = new Map();

    // Build tree structure
    for (const [filePath, file] of project.files) {
      const parts = filePath.split('/');
      let current = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const fullPath = parts.slice(0, i + 1).join('/');

        if (i === parts.length - 1) {
          // This is a file
          current.children.push({
            type: 'file',
            name: part,
            path: filePath,
            language: file.language,
            unsavedChanges: file.unsavedChanges
          });
        } else {
          // This is a folder
          let folder = pathMap.get(fullPath);
          if (!folder) {
            folder = { type: 'folder', name: part, path: fullPath, children: [] };
            current.children.push(folder);
            pathMap.set(fullPath, folder);
          }
          current = folder;
        }
      }
    }

    return tree;
  },

  // Save all files
  saveAll(projectId) {
    const project = projects.get(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    let saved = 0;
    for (const file of project.files.values()) {
      if (file.unsavedChanges) {
        file.unsavedChanges = false;
        saved++;
      }
    }

    return { ok: true, filesSaved: saved };
  },

  // Get project summary
  getSummary(projectId) {
    const project = projects.get(projectId);
    if (!project) return null;

    const fileCount = project.files.size;
    const unsavedCount = Array.from(project.files.values()).filter(f => f.unsavedChanges).length;
    const languages = new Set(Array.from(project.files.values()).map(f => f.language));

    return {
      id: projectId,
      name: project.name,
      fileCount,
      unsavedCount,
      openFileCount: project.openFiles.size,
      activeFile: project.activeFile,
      languages: Array.from(languages),
      createdAt: project.createdAt
    };
  },

  // Delete project
  deleteProject(projectId) {
    projects.delete(projectId);
    return { ok: true };
  },

  // Get all projects
  listProjects() {
    return Array.from(projects.values()).map(p => ({
      id: p.id,
      name: p.name,
      fileCount: p.files.size
    }));
  }
};
