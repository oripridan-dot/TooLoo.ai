import React from 'react';
import { Check, X, RefreshCw, Eye } from 'lucide-react';

const PreviewPanel = ({ preview, onApprove, onModify, onReject, isLoading }) => {
  if (!preview) return null;

  return (
    <div className="preview-panel bg-white border border-blue-200 rounded-lg shadow-lg p-4 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Eye className="w-5 h-5 mr-2 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Preview Changes</h3>
        </div>
        <span className="text-sm text-gray-500">
          {preview.files?.length || 0} file(s) affected
        </span>
      </div>

      {/* Description */}
      {preview.description && (
        <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
          <p className="text-sm text-gray-700">{preview.description}</p>
        </div>
      )}

      {/* Files Preview */}
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {preview.files?.map((file, index) => (
          <div key={index} className="border rounded p-3">
            {/* File Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-semibold text-gray-700">
                {file.path}
              </span>
              {file.isNew ? (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  NEW FILE
                </span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  MODIFIED
                </span>
              )}
            </div>

            {/* Code Preview */}
            <div className="bg-gray-900 rounded p-3 overflow-x-auto">
              <pre className="text-sm text-gray-100 font-mono">
                <code className={`language-${file.language || 'javascript'}`}>
                  {file.isNew ? (
                    // New file: show all content in green
                    <span className="text-green-400">{file.newContent}</span>
                  ) : (
                    // Modified file: show snippet with context
                    <div>
                      <span className="text-gray-500">// ... existing code ...</span>
                      {'\n'}
                      <span className="text-green-400">
                        {file.newContent.split('\n').slice(0, 10).join('\n')}
                      </span>
                      {file.newContent.split('\n').length > 10 && (
                        <span className="text-gray-500">
                          {'\n'}// ... {file.newContent.split('\n').length - 10} more lines ...
                        </span>
                      )}
                    </div>
                  )}
                </code>
              </pre>
            </div>

            {/* Quick Stats */}
            <div className="mt-2 text-xs text-gray-500">
              {file.newContent.split('\n').length} lines
              {file.currentContent && ` • ${Math.abs(file.newContent.length - file.currentContent.length)} chars changed`}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          Approve & Apply
        </button>
        
        <button
          onClick={onModify}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          Modify
        </button>
        
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
          Reject
        </button>
      </div>

      {/* Hint */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        💡 You can also type "approve", "modify: make it darker", or "cancel" in the chat
      </div>
    </div>
  );
};

export default PreviewPanel;
