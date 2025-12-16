/**
 * RichResponse.jsx - Visual Brief Response System
 * 
 * Transforms AI responses into visually rich, designed content.
 * Instead of walls of text, presents information as:
 * - Key insight cards
 * - Visual diagrams (Mermaid)
 * - Code snippets with live preview
 * - Comparison tables
 * - Action buttons
 * - Highlighted callouts
 * 
 * Philosophy: Your brain absorbs more with less stress from visual content
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Lightbulb: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.71.71M1 12h2M4.22 19.78l.71-.71M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"/>
    </svg>
  ),
  Code: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Warning: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Info: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
  ),
  Diagram: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/>
      <rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3a1 1 0 0 0 1 1h4"/>
      <path d="M18 9v3a1 1 0 0 1-1 1h-4"/>
    </svg>
  ),
};

// ============================================================================
// BLOCK PARSERS - Convert markdown to visual blocks
// ============================================================================

/**
 * Parse response content into visual blocks
 */
function parseToVisualBlocks(content) {
  if (!content) return [];
  
  const blocks = [];
  const lines = content.split('\n');
  let currentBlock = null;
  let buffer = [];
  
  const flushBuffer = () => {
    if (buffer.length > 0) {
      const text = buffer.join('\n').trim();
      if (text) {
        // Check for special patterns in text
        if (text.match(/^(TL;?DR|Key (Insight|Takeaway)|Summary):/i)) {
          blocks.push({ type: 'insight', content: text.replace(/^[^:]+:\s*/i, '') });
        } else if (text.match(/^(⚠️|Warning|Caution|Note|💡|Tip):/i)) {
          const isWarning = text.match(/^(⚠️|Warning|Caution)/i);
          blocks.push({ 
            type: 'callout', 
            variant: isWarning ? 'warning' : 'info',
            content: text.replace(/^[^:]+:\s*/i, '') 
          });
        } else if (text.match(/^\d+\.\s+\*\*[^*]+\*\*/)) {
          // Numbered list with bold headers - convert to steps
          blocks.push({ type: 'steps', content: text });
        } else {
          blocks.push({ type: 'text', content: text });
        }
      }
      buffer = [];
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Code block start
    if (line.startsWith('```')) {
      flushBuffer();
      const language = line.slice(3).trim();
      
      // Special: Mermaid diagrams
      if (language === 'mermaid') {
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'diagram', content: codeLines.join('\n'), language: 'mermaid' });
        continue;
      }
      
      // Regular code block
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines.join('\n'), language: language || 'text' });
      continue;
    }
    
    // Table detection
    if (line.includes('|') && line.trim().startsWith('|')) {
      flushBuffer();
      const tableLines = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      i--; // Back up one
      blocks.push({ type: 'table', content: tableLines.join('\n') });
      continue;
    }
    
    // H2 headers become section dividers
    if (line.match(/^##\s+/)) {
      flushBuffer();
      blocks.push({ type: 'heading', content: line.replace(/^##\s+/, ''), level: 2 });
      continue;
    }
    
    // H3 headers
    if (line.match(/^###\s+/)) {
      flushBuffer();
      blocks.push({ type: 'heading', content: line.replace(/^###\s+/, ''), level: 3 });
      continue;
    }
    
    // Action items / recommendations
    if (line.match(/^[-*]\s+\[[ x]\]/i)) {
      flushBuffer();
      const actionLines = [line];
      i++;
      while (i < lines.length && lines[i].match(/^[-*]\s+\[[ x]\]/i)) {
        actionLines.push(lines[i]);
        i++;
      }
      i--;
      blocks.push({ type: 'actions', content: actionLines.join('\n') });
      continue;
    }
    
    buffer.push(line);
  }
  
  flushBuffer();
  return blocks;
}

/**
 * Parse markdown table to structured data
 */
function parseTable(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const parseRow = (line) => 
    line.split('|').filter(c => c.trim()).map(c => c.trim());
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow); // Skip header and separator
  
  return { headers, rows };
}

// ============================================================================
// VISUAL BLOCK COMPONENTS
// ============================================================================

/**
 * Key Insight Card - The hero takeaway
 */
const InsightCard = memo(function InsightCard({ content }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 p-6 mb-6"
    >
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl" />
      
      <div className="relative flex gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
          <Icons.Lightbulb />
        </div>
        <div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
            Key Insight
          </div>
          <p className="text-lg text-white/90 leading-relaxed font-medium">
            {content}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Callout Box - Warnings, tips, notes
 */
const CalloutBox = memo(function CalloutBox({ content, variant = 'info' }) {
  const styles = {
    warning: {
      bg: 'from-amber-500/10 to-red-500/10',
      border: 'border-amber-500/30',
      icon: <Icons.Warning />,
      iconBg: 'from-amber-500 to-red-500',
      label: 'Warning',
      labelColor: 'text-amber-400',
    },
    info: {
      bg: 'from-blue-500/10 to-cyan-500/10',
      border: 'border-blue-500/30',
      icon: <Icons.Info />,
      iconBg: 'from-blue-500 to-cyan-500',
      label: 'Note',
      labelColor: 'text-blue-400',
    },
    tip: {
      bg: 'from-emerald-500/10 to-teal-500/10',
      border: 'border-emerald-500/30',
      icon: <Icons.Sparkles />,
      iconBg: 'from-emerald-500 to-teal-500',
      label: 'Pro Tip',
      labelColor: 'text-emerald-400',
    },
  };
  
  const style = styles[variant] || styles.info;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-3 p-4 rounded-xl bg-gradient-to-r ${style.bg} border ${style.border} mb-4`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${style.iconBg} flex items-center justify-center text-white`}>
        {style.icon}
      </div>
      <div>
        <div className={`text-xs font-semibold ${style.labelColor} uppercase tracking-wide mb-1`}>
          {style.label}
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{content}</p>
      </div>
    </motion.div>
  );
});

/**
 * Code Block with Preview
 */
const CodeBlock = memo(function CodeBlock({ content, language }) {
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState(null);
  
  const lineCount = content.split('\n').length;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleRun = () => {
    if (!['javascript', 'js'].includes(language?.toLowerCase())) return;
    try {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' '));
      
      try {
        const result = new Function(content)();
        console.log = originalLog;
        setOutput(logs.length > 0 ? logs.join('\n') : String(result ?? 'undefined'));
      } finally {
        console.log = originalLog;
      }
      setShowOutput(true);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
      setShowOutput(true);
    }
  };
  
  const canRun = ['javascript', 'js'].includes(language?.toLowerCase());
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icons.Code />
          <span className="text-xs font-mono text-gray-400">{language || 'code'}</span>
          <span className="text-xs text-gray-600">• {lineCount} lines</span>
        </div>
        <div className="flex items-center gap-2">
          {canRun && (
            <button
              onClick={handleRun}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all"
            >
              <Icons.Play /> Run
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
          >
            {copied ? <Icons.Check /> : <Icons.Copy />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Code */}
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-gray-200 max-h-96 overflow-y-auto">
        {content}
      </pre>
      
      {/* Output */}
      <AnimatePresence>
        {showOutput && output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-black/40"
          >
            <div className="px-4 py-2 flex items-center gap-2 text-xs text-gray-500">
              <span>Output</span>
            </div>
            <pre className={`px-4 pb-4 text-sm font-mono ${output.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Visual Table
 */
const VisualTable = memo(function VisualTable({ content }) {
  const { headers, rows } = useMemo(() => parseTable(content), [content]);
  
  if (headers.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden border border-white/10 mb-4"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold text-gray-300 border-b border-white/10">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-gray-400 border-b border-white/5">
                    {/* Render checkmarks/x marks nicely */}
                    {cell === '✅' ? <span className="text-emerald-400">{cell}</span> :
                     cell === '❌' ? <span className="text-red-400">{cell}</span> :
                     cell === '⚠️' ? <span className="text-amber-400">{cell}</span> :
                     cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});

/**
 * Mermaid Diagram Renderer
 */
const DiagramBlock = memo(function DiagramBlock({ content }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const renderDiagram = async () => {
      try {
        // Dynamic import mermaid only when needed
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ 
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#fff',
            primaryBorderColor: '#60a5fa',
            lineColor: '#60a5fa',
            secondaryColor: '#8b5cf6',
            tertiaryColor: '#1e1e1e',
            background: '#0a0a0a',
            mainBkg: '#1e1e1e',
            nodeBorder: '#60a5fa',
            clusterBkg: '#1e1e1e',
            titleColor: '#fff',
            edgeLabelBackground: '#1e1e1e',
          }
        });
        
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, content);
        setSvg(svg);
      } catch (err) {
        console.error('Mermaid error:', err);
        setError(err.message);
      }
    };
    
    renderDiagram();
  }, [content]);
  
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
        Diagram rendering error: {error}
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] p-6 mb-4"
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <Icons.Diagram />
        <span>Visual Diagram</span>
      </div>
      {svg ? (
        <div 
          ref={containerRef}
          className="flex justify-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
});

/**
 * Section Heading
 */
const SectionHeading = memo(function SectionHeading({ content, level = 2 }) {
  const sizes = {
    2: 'text-xl font-bold',
    3: 'text-lg font-semibold',
  };
  
  return (
    <motion.h3
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`${sizes[level] || sizes[2]} text-white mt-6 mb-4 flex items-center gap-2`}
    >
      <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
      {content}
    </motion.h3>
  );
});

/**
 * Action Items / Recommendations
 */
const ActionItems = memo(function ActionItems({ content }) {
  const items = content.split('\n').filter(l => l.trim()).map(line => {
    const checked = line.includes('[x]') || line.includes('[X]');
    const text = line.replace(/^[-*]\s+\[[ xX]\]\s*/, '');
    return { checked, text };
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
        <Icons.Check />
        <span>Recommended Actions</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5 ${
              item.checked 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-white/5 text-gray-500 border border-white/10'
            }`}>
              {item.checked && <Icons.Check />}
            </div>
            <span className={`text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

/**
 * Steps / Process
 */
const StepsBlock = memo(function StepsBlock({ content }) {
  const steps = content.split('\n').filter(l => l.trim()).map(line => {
    const match = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*[:\s]*(.*)/);
    if (match) {
      return { number: match[1], title: match[2], description: match[3] };
    }
    return null;
  }).filter(Boolean);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-4"
    >
      <div className="space-y-3">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-4"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/20">
              {step.number}
            </div>
            <div className="flex-1 pt-1">
              <div className="font-semibold text-white mb-1">{step.title}</div>
              {step.description && (
                <p className="text-sm text-gray-400">{step.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/**
 * Plain Text Block
 */
const TextBlock = memo(function TextBlock({ content }) {
  // Parse inline formatting
  const formatText = (text) => {
    return text
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
    />
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RichResponse - Visual Brief Response Renderer
 * 
 * Transforms AI text into designed visual content
 */
export const RichResponse = memo(function RichResponse({ content, isStreaming = false }) {
  const blocks = useMemo(() => parseToVisualBlocks(content), [content]);
  
  return (
    <div className="rich-response">
      <AnimatePresence mode="popLayout">
        {blocks.map((block, index) => {
          const key = `${block.type}-${index}`;
          
          switch (block.type) {
            case 'insight':
              return <InsightCard key={key} content={block.content} />;
            case 'callout':
              return <CalloutBox key={key} content={block.content} variant={block.variant} />;
            case 'code':
              return <CodeBlock key={key} content={block.content} language={block.language} />;
            case 'table':
              return <VisualTable key={key} content={block.content} />;
            case 'diagram':
              return <DiagramBlock key={key} content={block.content} />;
            case 'heading':
              return <SectionHeading key={key} content={block.content} level={block.level} />;
            case 'actions':
              return <ActionItems key={key} content={block.content} />;
            case 'steps':
              return <StepsBlock key={key} content={block.content} />;
            case 'text':
            default:
              return <TextBlock key={key} content={block.content} />;
          }
        })}
      </AnimatePresence>
      
      {/* Streaming indicator */}
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-blue-400 rounded-sm animate-pulse ml-1" />
      )}
    </div>
  );
});

export default RichResponse;
