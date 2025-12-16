/**
 * SandboxPreview.tsx - Self-Modification Preview System
 * Renders proposed changes in an isolated iframe for approval
 * 
 * @version 1.0.0
 * @skill-os true
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types for proposed changes
export interface ProposedChange {
  id: string;
  type: 'file' | 'skill' | 'component' | 'style' | 'config';
  action: 'create' | 'modify' | 'delete';
  path: string;
  description: string;
  before?: string;
  after: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresRestart: boolean;
  preview?: {
    type: 'component' | 'style' | 'code';
    content: string;
  };
}

export interface SandboxPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ProposedChange[];
  onApprove: (changes: ProposedChange[]) => Promise<void>;
  onReject: (reason: string) => void;
}

// Risk level colors
const riskColors = {
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

// Diff viewer component
const DiffViewer: React.FC<{ before?: string; after: string }> = ({ before, after }) => {
  if (!before) {
    return (
      <div className="font-mono text-sm">
        <div className="px-3 py-1 bg-emerald-500/10 border-l-2 border-emerald-500">
          <span className="text-emerald-400">+ New file</span>
        </div>
        <pre className="p-3 bg-black/30 overflow-x-auto text-gray-300">
          {after.split('\n').map((line, i) => (
            <div key={i} className="flex">
              <span className="w-8 text-gray-600 select-none">{i + 1}</span>
              <span className="text-emerald-400">+ {line}</span>
            </div>
          ))}
        </pre>
      </div>
    );
  }

  // Simple line-by-line diff
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  
  return (
    <div className="font-mono text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="px-2 py-1 text-xs text-gray-500 border-b border-white/10">Before</div>
        <div className="px-2 py-1 text-xs text-gray-500 border-b border-white/10">After</div>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        <pre className="p-3 bg-black/30">
          {Array.from({ length: maxLen }).map((_, i) => {
            const beforeLine = beforeLines[i] || '';
            const afterLine = afterLines[i] || '';
            const changed = beforeLine !== afterLine;
            
            return (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div className={changed ? 'bg-red-500/10 text-red-400' : 'text-gray-500'}>
                  {changed ? '- ' : '  '}{beforeLine}
                </div>
                <div className={changed ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-500'}>
                  {changed ? '+ ' : '  '}{afterLine}
                </div>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};

// Component preview in iframe
const ComponentPreview: React.FC<{ code: string }> = ({ code }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (!iframeRef.current) return;
    
    // Create sandboxed HTML with the component
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            body { 
              background: #0a0a0a; 
              color: white;
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
            }
            .preview-error {
              background: rgba(239, 68, 68, 0.2);
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 8px;
              padding: 16px;
              color: #f87171;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            try {
              ${code}
              
              // Try to render if there's a default export or component
              const root = ReactDOM.createRoot(document.getElementById('root'));
              if (typeof Preview !== 'undefined') {
                root.render(<Preview />);
              } else if (typeof Component !== 'undefined') {
                root.render(<Component />);
              } else {
                root.render(<div className="text-gray-400">No component to preview</div>);
              }
            } catch (err) {
              document.getElementById('root').innerHTML = 
                '<div class="preview-error">Error: ' + err.message + '</div>';
            }
          </script>
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
    
    return () => {
      if (iframeRef.current?.src) {
        URL.revokeObjectURL(iframeRef.current.src);
      }
    };
  }, [code]);
  
  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-xs text-gray-500 ml-2">Live Preview (Sandboxed)</span>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="w-full h-[300px] bg-black/50"
        title="Component Preview"
      />
    </div>
  );
};

// Change card component
const ChangeCard: React.FC<{
  change: ProposedChange;
  selected: boolean;
  onToggle: () => void;
}> = ({ change, selected, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const risk = riskColors[change.riskLevel];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${selected ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 bg-white/5'}`}
    >
      <div 
        className="p-4 flex items-start gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Selection checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-5 h-5 rounded flex items-center justify-center border ${
            selected 
              ? 'bg-blue-500 border-blue-500' 
              : 'border-white/20 hover:border-white/40'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        
        {/* Change info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${risk.bg} ${risk.text} ${risk.border} border`}>
              {change.riskLevel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
              {change.action}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
              {change.type}
            </span>
            {change.requiresRestart && (
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                ⚡ Restart
              </span>
            )}
          </div>
          <div className="font-mono text-sm text-white truncate">{change.path}</div>
          <div className="text-sm text-gray-400 mt-1">{change.description}</div>
        </div>
        
        {/* Expand arrow */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </div>
      
      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Diff view */}
              <DiffViewer before={change.before} after={change.after} />
              
              {/* Component preview */}
              {change.preview?.type === 'component' && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Live Preview:</div>
                  <ComponentPreview code={change.preview.content} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main SandboxPreview component
export const SandboxPreview: React.FC<SandboxPreviewProps> = ({
  isOpen,
  onClose,
  changes,
  onApprove,
  onReject,
}) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set(changes.map(c => c.id)));
  const [isApproving, setIsApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const toggleChange = useCallback((id: string) => {
    setSelectedChanges(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleApprove = async () => {
    setIsApproving(true);
    const approved = changes.filter(c => selectedChanges.has(c.id));
    await onApprove(approved);
    setIsApproving(false);
    onClose();
  };
  
  const handleReject = () => {
    onReject(rejectReason || 'User rejected changes');
    setShowRejectModal(false);
    onClose();
  };
  
  // Calculate risk summary
  const riskSummary = changes.reduce((acc, c) => {
    acc[c.riskLevel] = (acc[c.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const hasRestart = changes.some(c => selectedChanges.has(c.id) && c.requiresRestart);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🔬</span>
                Self-Modification Preview
              </h2>
              <p className="text-gray-400 mt-1">
                Review and approve proposed changes before they're applied
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Risk summary */}
          <div className="flex items-center gap-3 mt-4">
            {Object.entries(riskSummary).map(([level, count]) => {
              const colors = riskColors[level as keyof typeof riskColors];
              return (
                <span key={level} className={`text-xs px-2 py-1 rounded ${colors.bg} ${colors.text} ${colors.border} border`}>
                  {count} {level}
                </span>
              );
            })}
            {hasRestart && (
              <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <span>⚡</span> Requires restart
              </span>
            )}
          </div>
        </div>
        
        {/* Changes list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {changes.map(change => (
            <ChangeCard
              key={change.id}
              change={change}
              selected={selectedChanges.has(change.id)}
              onToggle={() => toggleChange(change.id)}
            />
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedChanges.size} of {changes.length} changes selected
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={handleApprove}
              disabled={selectedChanges.size === 0 || isApproving}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isApproving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  ✓ Approve {selectedChanges.size} Change{selectedChanges.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Reject modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Reject Changes</h3>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Optional: Why are you rejecting these changes?"
                className="w-full p-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder-gray-500 resize-none h-24 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SandboxPreview;
