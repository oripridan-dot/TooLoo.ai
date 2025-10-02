import React, { useState, useEffect } from 'react';
import { callApi } from '../utils/apiUtils';
import './FileSystemPanel.css';

interface FileItem {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modified: string | null;
  extension: string | null;
}

interface FileSystemResponse {
  success: boolean;
  path: string;
  items: FileItem[];
  error?: string;
}

interface FileContentResponse {
  success: boolean;
  content: string;
  path: string;
  error?: string;
}

interface FileSystemPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const FileSystemPanel: React.FC<FileSystemPanelProps> = ({ isVisible, onClose }) => {
  const [currentPath, setCurrentPath] = useState<string>('/workspaces/TooLoo.ai');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSource, setActiveSource] = useState<'local' | 'github'>('local');
  const [ghPath, setGhPath] = useState<string>('');
  const [ghItems, setGhItems] = useState<any[]>([]);
  const [ghError, setGhError] = useState<string>('');
  const [ghSelected, setGhSelected] = useState<any | null>(null);
  const [ghFileContent, setGhFileContent] = useState<string>('');
  const [environmentAwareness, setEnvironmentAwareness] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');

  useEffect(() => {
    if (!isVisible) return;
    if (activeSource === 'local') {
      loadDirectoryContents(currentPath);
    } else {
      // Default to repo root when switching to GitHub the first time
      loadGitHubPath(ghPath || '');
    }
    
    // Load environment awareness data
    loadEnvironmentAwareness();
    
    // Set up periodic environment updates
    const interval = setInterval(loadEnvironmentAwareness, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, currentPath, activeSource]);

  const loadEnvironmentAwareness = async () => {
    try {
      const res = await callApi<any>('/environment/awareness');
      if (res?.success) {
        setEnvironmentAwareness(res.data);
        
        // Determine system health based on environment data
        const awareness = res.data.awareness;
        if (awareness.systemHealth) {
          const healthStatuses = Object.values(awareness.systemHealth);
          const hasErrors = healthStatuses.some((status: any) => status.status === 'error');
          const hasWarnings = healthStatuses.some((status: any) => status.status === 'warning' || status.status === 'assumed-healthy');
          
          if (hasErrors) {
            setSystemHealth('error');
          } else if (hasWarnings) {
            setSystemHealth('warning');
          } else {
            setSystemHealth('healthy');
          }
        }
      }
    } catch (e) {
      // Environment awareness is non-critical
      setSystemHealth('warning');
    }
  };

  const loadDirectoryContents = async (path: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await callApi<any>(`/files?dirPath=${encodeURIComponent(path)}`);
      // Server may return { success, data } or direct result; normalize
      const payload: FileSystemResponse = (response?.data || response);
      
      if (payload.success) {
        setFiles(payload.items);
        setCurrentPath(payload.path);
        setSelectedFile(null);
        setFileContent('');
      } else {
        setError('Failed to load directory: ' + (payload.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error loading directory: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- GitHub browsing ---
  const loadGitHubPath = async (path: string) => {
    setGhError('');
    try {
      const res = await callApi<{ success: boolean; data: any }>(`/github/contents?owner=oripridan-dot&repo=TooLoo.ai&path=${encodeURIComponent(path)}&ref=main`);
      if (!res.success) throw new Error('Failed to load GitHub contents');
      const items = Array.isArray(res.data) ? res.data : [res.data];
      setGhItems(items);
      setGhPath(path);
    } catch (e) {
      setGhError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGhItemClick = async (item: any) => {
    try {
      if (item.type === 'dir') {
        await loadGitHubPath(item.path || '');
        setGhSelected(null);
        setGhFileContent('');
      } else if (item.type === 'file') {
        setIsLoading(true);
        const res = await callApi<{ success: boolean; data: any }>(`/github/file?owner=oripridan-dot&repo=TooLoo.ai&path=${encodeURIComponent(item.path)}&ref=main`);
        if (!res.success) throw new Error('Failed to read GitHub file');
        setGhSelected(item);
        setGhFileContent(res.data?.content || '');
      }
    } catch (e) {
      setGhError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (file: FileItem) => {
    if (file.isDirectory) {
      loadDirectoryContents(file.path);
    } else {
      setIsLoading(true);
      setSelectedFile(file);
      
      try {
        const response = await callApi<any>(`/files/read?filePath=${encodeURIComponent(file.path)}`);
        const payload: FileContentResponse = (response?.data || response);
        
        if (payload.success) {
          setFileContent(payload.content);
          setEditedContent(payload.content);
        } else {
          setError('Failed to read file: ' + (payload.error || 'Unknown error'));
        }
      } catch (error) {
        setError(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    
    try {
      const response = await callApi<any>('/files/write', 'POST', { 
        filePath: selectedFile.path, 
        content: editedContent 
      });
      
      const payload = (response?.data || response);
      if (payload.success) {
        setFileContent(editedContent);
        setIsEditing(false);
      } else {
        setError('Failed to save file: ' + (payload.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error saving file: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFile = async () => {
    const fileName = prompt('Enter new file name:');
    if (!fileName) return;
    
    const filePath = `${currentPath}/${fileName}`;
    
    try {
      const response = await callApi<any>('/files/write', 'POST', { 
        filePath, 
        content: '' 
      });
      
      const payload = (response?.data || response);
      if (payload.success) {
        loadDirectoryContents(currentPath);
      } else {
        setError('Failed to create file: ' + (payload.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error creating file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCreateDirectory = async () => {
    const dirName = prompt('Enter new directory name:');
    if (!dirName) return;
    
    const dirPath = `${currentPath}/${dirName}`;
    
    try {
      const response = await callApi<any>('/files/create-directory', 'POST', { dirPath });
      
      if (response.success) {
        loadDirectoryContents(currentPath);
      } else {
        setError('Failed to create directory: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error creating directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteItem = async (item: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    try {
      const response = await callApi<any>('/files/delete', 'POST', { 
        itemPath: item.path,
        recursive: item.isDirectory
      });
      
      if (response.success) {
        if (selectedFile && selectedFile.path === item.path) {
          setSelectedFile(null);
          setFileContent('');
        }
        loadDirectoryContents(currentPath);
      } else {
        setError('Failed to delete item: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error deleting item: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const importGhFileToLocal = async () => {
    if (!ghSelected || !ghFileContent) return;
    
    const fileName = prompt(`Import ${ghSelected.name} to local directory:`, ghSelected.name);
    if (!fileName) return;
    
    const filePath = `${currentPath}/${fileName}`;
    
    try {
      const response = await callApi<any>('/files/write', 'POST', { 
        filePath, 
        content: ghFileContent 
      });
      
      const payload = (response?.data || response);
      if (payload.success) {
        // Trigger environment awareness update
        if (environmentAwareness) {
          await callApi<any>('/environment/action', 'POST', {
            action: 'file-imported-from-github',
            params: { source: ghSelected.path, destination: filePath }
          });
        }
        
        // Switch to local view and refresh
        setActiveSource('local');
        loadDirectoryContents(currentPath);
      } else {
        setError('Failed to import file: ' + (payload.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error importing file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const goToParentDirectory = () => {
    if (activeSource === 'local') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
      loadDirectoryContents(parentPath || '/');
    } else {
      const parts = (ghPath || '').split('/').filter(Boolean);
      const parent = parts.slice(0, -1).join('/');
      loadGitHubPath(parent);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="file-system-panel">
      <div className="file-system-header">
        <h2>Director's File System</h2>
        <div className="environment-status">
          <span className={`health-indicator ${systemHealth}`} title={`System Health: ${systemHealth}`}>
            {systemHealth === 'healthy' && '🟢'}
            {systemHealth === 'warning' && '🟡'}
            {systemHealth === 'error' && '🔴'}
          </span>
          {environmentAwareness && (
            <span className="awareness-indicator" title="Environment Hub Active">🌐</span>
          )}
        </div>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="file-system-toolbar">
        <div className="source-toggle">
          <button
            className={activeSource === 'local' ? 'active' : ''}
            onClick={() => setActiveSource('local')}
            title="Browse local workspace"
          >💻 Local</button>
          <button
            className={activeSource === 'github' ? 'active' : ''}
            onClick={() => setActiveSource('github')}
            title="Browse GitHub repo"
          >🌐 GitHub</button>
        </div>
        <button onClick={goToParentDirectory} disabled={activeSource === 'local' ? currentPath === '/' : (ghPath || '') === ''}>⬆️ Up</button>
        <button onClick={handleCreateFile} disabled={activeSource !== 'local'} title={activeSource !== 'local' ? 'Read-only in GitHub view' : ''}>📄 New File</button>
        <button onClick={handleCreateDirectory} disabled={activeSource !== 'local'} title={activeSource !== 'local' ? 'Read-only in GitHub view' : ''}>📁 New Folder</button>
        <div className="current-path">
          {activeSource === 'local' ? currentPath : `github://oripridan-dot/TooLoo.ai/${ghPath}`}
        </div>
      </div>
      
      {activeSource === 'local' && error && <div className="error-message">{error}</div>}
      {activeSource === 'github' && ghError && <div className="error-message">{ghError}</div>}
      
      <div className="file-system-content">
        {/* Left list panel */}
        <div className="file-list">
          {isLoading && <div className="loading">Loading...</div>}
          {activeSource === 'local' && !isLoading && files.length === 0 && (
            <div className="empty-directory">This directory is empty</div>
          )}
          {activeSource === 'github' && !isLoading && ghItems.length === 0 && (
            <div className="empty-directory">This repo path is empty</div>
          )}

          {activeSource === 'local' && files.map((file) => (
            <div 
              key={file.path}
              className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
              onClick={() => handleFileClick(file)}
            >
              <span className="file-icon">
                {file.isDirectory ? '📁' : '📄'}
              </span>
              <span className="file-name">{file.name}</span>
              <div className="file-actions">
                <button disabled={activeSource !== 'local'} onClick={(e) => { e.stopPropagation(); handleDeleteItem(file); }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {activeSource === 'github' && ghItems.map((item) => (
            <div
              key={item.sha || item.path}
              className={`file-item ${ghSelected?.path === item.path ? 'selected' : ''}`}
              onClick={() => handleGhItemClick(item)}
            >
              <span className="file-icon">
                {item.type === 'dir' ? '📁' : '📄'}
              </span>
              <span className="file-name">{item.name}</span>
              <div className="file-actions">
                <span className="gh-badge">{item.type}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right preview/editor panel */}
        {(activeSource === 'local' && selectedFile) && (
          <div className="file-preview">
            <div className="file-preview-header">
              <h3>{selectedFile.name}</h3>
              {selectedFile.isFile && !isEditing && (
                <button onClick={() => setIsEditing(true)}>✏️ Edit</button>
              )}
              {selectedFile.isFile && isEditing && (
                <div>
                  <button onClick={handleSaveFile}>💾 Save</button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setEditedContent(fileContent);
                  }}>❌ Cancel</button>
                </div>
              )}
            </div>
            {selectedFile.isFile && !isEditing && (
              <pre className="file-content">{fileContent}</pre>
            )}
            {selectedFile.isFile && isEditing && (
              <textarea
                className="file-editor"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
              />
            )}
          </div>
        )}

        {(activeSource === 'github' && ghSelected) && (
          <div className="file-preview">
            <div className="file-preview-header">
              <h3>{ghSelected.name}</h3>
              <div className="github-actions">
                <button onClick={importGhFileToLocal} title="Import this file to local workspace">
                  📥 Import to Local
                </button>
                <span title="GitHub files are read-only here" style={{ opacity: 0.7 }}>🔒 Read-only</span>
              </div>
            </div>
            <pre className="file-content">{ghFileContent}</pre>
            {environmentAwareness && (
              <div className="environment-info">
                <small>Environment Hub: {environmentAwareness.awareness.componentCount} components active</small>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSystemPanel;