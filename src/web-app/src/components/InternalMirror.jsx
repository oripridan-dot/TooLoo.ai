// @version 3.3.410
// TooLoo Internal Mirror - Self-Hosted Code Editor
// Uses Monaco Editor for code editing with SelfModificationEngine backend
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';

// API base URL
const API_BASE = '/api/v1/system/self';

/**
 * TooLoo Internal Mirror
 * Self-hosted development environment powered by SelfModificationEngine
 * 
 * Features:
 * - Monaco Editor with full IDE capabilities
 * - File tree navigation
 * - Real-time file operations (read/edit/create/delete)
 * - Git integration
 * - Safety backups before every modification
 */
export const InternalMirror = () => {
  // File tree state
  const [fileTree, setFileTree] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState(new Set(['src']));
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Status
  const [status, setStatus] = useState({ message: '', type: 'info' });
  const [modificationLog, setModificationLog] = useState([]);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Editor ref
  const editorRef = useRef(null);

  // Load file tree on mount
  useEffect(() => {
    loadFileTree('src');
    loadCapabilities();
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const loadCapabilities = async () => {
    try {
      const res = await fetch(`${API_BASE}/info`);
      const data = await res.json();
      if (data.ok) {
        setStatus({ message: 'Self-Modification Engine ready', type: 'success' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to connect to Self-Modification Engine', type: 'error' });
    }
  };

  const loadFileTree = async (dir = 'src') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/files?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.ok) {
        setFileTree(data.files || []);
      }
    } catch (err) {
      setStatus({ message: `Failed to load files: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (filePath) => {
    try {
      setStatus({ message: `Loading ${filePath}...`, type: 'info' });
      const res = await fetch(`${API_BASE}/read?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      
      if (data.ok && data.content !== undefined) {
        setSelectedFile(filePath);
        setContent(data.content);
        setOriginalContent(data.content);
        setStatus({ message: `Loaded: ${filePath}`, type: 'success' });
      } else {
        setStatus({ message: data.error || 'Failed to load file', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: `Error loading file: ${err.message}`, type: 'error' });
    }
  };

  const saveFile = async () => {
    if (!selectedFile || !hasChanges) return;
    
    setSaving(true);
    setStatus({ message: 'Creating backup and saving...', type: 'info' });
    
    try {
      const res = await fetch(`${API_BASE}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile,
          oldCode: originalContent,
          newCode: content,
          reason: 'Manual edit via Internal Mirror',
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setOriginalContent(content);
        setHasChanges(false);
        setModificationLog(prev => [{
          timestamp: new Date().toISOString(),
          file: selectedFile,
          backup: data.backup,
        }, ...prev.slice(0, 9)]);
        setStatus({ message: `Saved: ${selectedFile} (backup created)`, type: 'success' });
      } else {
        setStatus({ message: data.error || 'Failed to save file', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: `Save error: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const searchCodebase = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.ok) {
        setSearchResults(data.results || []);
        setStatus({ message: `Found ${data.results?.length || 0} matches`, type: 'success' });
      }
    } catch (err) {
      setStatus({ message: `Search error: ${err.message}`, type: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const createNewFile = async () => {
    const fileName = prompt('Enter file name (relative to src/):');
    if (!fileName) return;
    
    try {
      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: fileName.startsWith('src/') ? fileName : `src/${fileName}`,
          content: getTemplateForFile(fileName),
        }),
      });
      
      const data = await res.json();
      if (data.ok) {
        setStatus({ message: `Created: ${data.filePath}`, type: 'success' });
        loadFileTree('src');
        loadFile(data.filePath);
      } else {
        setStatus({ message: data.error || 'Failed to create file', type: 'error' });
      }
    } catch (err) {
      setStatus({ message: `Create error: ${err.message}`, type: 'error' });
    }
  };

  const getTemplateForFile = (fileName) => {
    if (fileName.endsWith('.ts')) {
      return `// @version 3.3.408
// TooLoo.ai - ${fileName}
// Created via Internal Mirror

export function placeholder() {
  // TODO: Implement
}
`;
    }
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      return `// @version 3.3.408
import React from 'react';

export const Component = () => {
  return (
    <div>
      {/* TODO: Implement */}
    </div>
  );
};

export default Component;
`;
    }
    return '// New file\n';
  };

  const getLanguage = (filePath) => {
    if (!filePath) return 'typescript';
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.md')) return 'markdown';
    if (filePath.endsWith('.css')) return 'css';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) return 'yaml';
    return 'plaintext';
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    
    // Add keyboard shortcuts
    editor.addCommand(monaco => monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, selectedFile, content, originalContent]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <span>🪞</span>
          </div>
          <div>
            <h1 className="font-bold">Internal Mirror</h1>
            <p className="text-xs text-gray-400">Self-Modification Engine</p>
          </div>
        </div>

        {/* Status */}
        <div className={`px-3 py-1 rounded-full text-sm ${
          status.type === 'success' ? 'bg-green-900/50 text-green-300' :
          status.type === 'error' ? 'bg-red-900/50 text-red-300' :
          'bg-gray-800 text-gray-300'
        }`}>
          {status.message}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={createNewFile}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            + New File
          </button>
          <button
            onClick={saveFile}
            disabled={!hasChanges || saving}
            className={`px-4 py-1 rounded text-sm font-medium ${
              hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : hasChanges ? '💾 Save (Ctrl+S)' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Tree */}
        <div className="w-64 border-r border-gray-700 flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <div className="flex gap-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCodebase()}
                placeholder="Search codebase..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={searchCodebase}
                disabled={searching}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                🔍
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-2">
                  Search Results ({searchResults.length})
                  <button
                    onClick={() => setSearchResults([])}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                {searchResults.map((result, i) => (
                  <div
                    key={i}
                    onClick={() => loadFile(result.filePath)}
                    className="p-2 bg-gray-800 rounded text-xs cursor-pointer hover:bg-gray-700"
                  >
                    <div className="text-emerald-400 truncate">{result.filePath}</div>
                    <div className="text-gray-400 mt-1">Line {result.lineNumber}</div>
                    <div className="text-gray-300 truncate">{result.lineContent}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {fileTree.map((file, i) => (
                  <div
                    key={i}
                    onClick={() => !file.isDirectory && loadFile(file.path)}
                    className={`px-2 py-1 rounded text-sm cursor-pointer truncate ${
                      selectedFile === file.path
                        ? 'bg-emerald-600/30 text-emerald-300'
                        : 'hover:bg-gray-800'
                    } ${file.isDirectory ? 'text-gray-400' : 'text-gray-200'}`}
                  >
                    {file.isDirectory ? '📁 ' : '📄 '}
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modification Log */}
          {modificationLog.length > 0 && (
            <div className="border-t border-gray-700 p-2">
              <div className="text-xs text-gray-500 mb-1">Recent Changes</div>
              <div className="space-y-1 max-h-32 overflow-auto">
                {modificationLog.map((log, i) => (
                  <div key={i} className="text-xs text-gray-400 truncate">
                    <span className="text-emerald-400">✓</span> {log.file}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* File tabs */}
          {selectedFile && (
            <div className="border-b border-gray-700 px-2 py-1 flex items-center">
              <div className={`px-3 py-1 rounded-t text-sm ${
                hasChanges ? 'bg-gray-800 text-yellow-400' : 'bg-gray-800 text-gray-300'
              }`}>
                {hasChanges && '● '}
                {selectedFile.split('/').pop()}
              </div>
              <span className="text-xs text-gray-500 ml-2">{selectedFile}</span>
            </div>
          )}

          {/* Monaco Editor */}
          <div className="flex-1">
            {selectedFile ? (
              <Editor
                height="100%"
                language={getLanguage(selectedFile)}
                value={content}
                onChange={(value) => setContent(value || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 10 },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">🪞</div>
                  <div className="text-lg">Internal Mirror</div>
                  <div className="text-sm mt-2">Select a file to edit</div>
                  <div className="text-xs mt-4 text-gray-600">
                    TooLoo can now modify its own code.<br/>
                    All changes create automatic backups.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalMirror;
