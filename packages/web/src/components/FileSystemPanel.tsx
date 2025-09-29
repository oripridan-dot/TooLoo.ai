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

  useEffect(() => {
    if (isVisible) {
      loadDirectoryContents(currentPath);
    }
  }, [isVisible, currentPath]);

  const loadDirectoryContents = async (path: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await callApi<FileSystemResponse>(`/files?dirPath=${encodeURIComponent(path)}`);
      
      if (response.success) {
        setFiles(response.items);
        setCurrentPath(response.path);
        setSelectedFile(null);
        setFileContent('');
      } else {
        setError('Failed to load directory: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setError(`Error loading directory: ${error instanceof Error ? error.message : String(error)}`);
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
        const response = await callApi<FileContentResponse>(`/files/read?filePath=${encodeURIComponent(file.path)}`);
        
        if (response.success) {
          setFileContent(response.content);
          setEditedContent(response.content);
        } else {
          setError('Failed to read file: ' + (response.error || 'Unknown error'));
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
      
      if (response.success) {
        setFileContent(editedContent);
        setIsEditing(false);
      } else {
        setError('Failed to save file: ' + (response.error || 'Unknown error'));
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
      
      if (response.success) {
        loadDirectoryContents(currentPath);
      } else {
        setError('Failed to create file: ' + (response.error || 'Unknown error'));
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

  const goToParentDirectory = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectoryContents(parentPath || '/');
  };

  if (!isVisible) return null;

  return (
    <div className="file-system-panel">
      <div className="file-system-header">
        <h2>Director's File System</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="file-system-toolbar">
        <button onClick={goToParentDirectory} disabled={currentPath === '/'}>⬆️ Up</button>
        <button onClick={handleCreateFile}>📄 New File</button>
        <button onClick={handleCreateDirectory}>📁 New Folder</button>
        <div className="current-path">{currentPath}</div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="file-system-content">
        <div className="file-list">
          {isLoading && <div className="loading">Loading...</div>}
          
          {!isLoading && files.length === 0 && (
            <div className="empty-directory">This directory is empty</div>
          )}
          
          {files.map((file) => (
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
                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(file); }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {selectedFile && (
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
      </div>
    </div>
  );
};

export default FileSystemPanel;