// @version 3.3.577
// TooLoo.ai Multi-Format Visual Renderers
// ═══════════════════════════════════════════════════════════════════════════
// DIVERSIFIED VISUAL COMMUNICATION - React Components for All Formats
// Fixed Chart.js animation conflicts, improved error handling
//
// Renders visual artifacts in many formats beyond just SVG:
// ASCII, Markdown Tables, Mermaid, Charts, Emoji, Terminal, Math, etc.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiquidEngine } from '../effects/LiquidEngine';
import mermaid from 'mermaid';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ============================================================================
// MERMAID INITIALIZATION
// ============================================================================

let mermaidInitialized = false;

const initMermaid = () => {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#6366f1',
      primaryTextColor: '#fff',
      primaryBorderColor: '#4f46e5',
      lineColor: '#6366f1',
      secondaryColor: '#1e1e2f',
      tertiaryColor: '#0f0f1a',
      background: '#0a0a0f',
      mainBkg: '#1e1e2f',
      nodeBorder: '#6366f1',
      clusterBkg: '#1e1e2f',
      clusterBorder: '#4f46e5',
      titleColor: '#fff',
      edgeLabelBackground: '#1e1e2f',
    },
    flowchart: {
      curve: 'basis',
      padding: 15,
    },
    sequence: {
      actorMargin: 50,
      boxMargin: 10,
      mirrorActors: true,
    },
  });
  mermaidInitialized = true;
};

// ============================================================================
// ASCII ART RENDERER
// ============================================================================

export const ASCIIRenderer = memo(({ 
  content, 
  title,
  charset = 'unicode',
  className = '' 
}) => {
  const { getEmotionValues } = useLiquidEngine();
  const emotionVals = getEmotionValues();
  
  const charsetStyles = {
    standard: 'font-mono',
    unicode: 'font-mono',
    'box-drawing': 'font-mono',
    extended: 'font-mono',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden bg-[#0a0a0f] border border-white/10 ${className}`}
      style={{
        boxShadow: `0 0 ${20 * emotionVals.energy}px rgba(99, 102, 241, 0.1)`,
      }}
    >
      {title && (
        <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center gap-2">
          <span className="text-xs">📝</span>
          <span className="text-sm text-gray-400">{title}</span>
          <span className="ml-auto text-xs text-gray-600 uppercase">ASCII</span>
        </div>
      )}
      <pre className={`p-4 text-sm text-emerald-400 overflow-auto ${charsetStyles[charset]}`}>
        <code>{content}</code>
      </pre>
    </motion.div>
  );
});

ASCIIRenderer.displayName = 'ASCIIRenderer';

// ============================================================================
// MARKDOWN TABLE RENDERER
// ============================================================================

export const MarkdownTableRenderer = memo(({
  headers,
  rows,
  alignment,
  caption,
  className = '',
  interactive = true,
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [hoveredRow, setHoveredRow] = useState(null);
  
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  const sortedRows = useMemo(() => {
    if (sortColumn === null || !interactive) return rows;
    return [...rows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDirection === 'asc' ? comp : -comp;
    });
  }, [rows, sortColumn, sortDirection, interactive]);
  
  const handleSort = (index) => {
    if (!interactive) return;
    if (sortColumn === index) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(index);
      setSortDirection('asc');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden bg-[#0a0a0f] border border-white/10 ${className}`}
    >
      {caption && (
        <div className="px-4 py-2 bg-black/40 border-b border-white/10 text-sm text-gray-400">
          📊 {caption}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              {headers.map((header, i) => (
                <th
                  key={`th-${i}`}
                  onClick={() => handleSort(i)}
                  className={`px-4 py-3 font-semibold text-gray-300 border-b border-white/10 
                    ${alignClass[alignment?.[i] || 'left']}
                    ${interactive ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
                >
                  <span className="flex items-center gap-1 justify-start">
                    {header}
                    {interactive && sortColumn === i && (
                      <span className="text-cyan-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <motion.tr
                key={`row-${rowIndex}`}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
                animate={{
                  backgroundColor: hoveredRow === rowIndex 
                    ? 'rgba(99, 102, 241, 0.1)' 
                    : 'transparent'
                }}
                className="border-b border-white/5 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className={`px-4 py-3 text-gray-300 ${alignClass[alignment?.[cellIndex] || 'left']}`}
                  >
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});

MarkdownTableRenderer.displayName = 'MarkdownTableRenderer';

// ============================================================================
// MERMAID DIAGRAM RENDERER
// ============================================================================

export const MermaidRenderer = memo(({
  code,
  type = 'flowchart',
  title,
  className = '',
}) => {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const id = useMemo(() => `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, []);

  useEffect(() => {
    initMermaid();
    
    const render = async () => {
      try {
        // Clean up any previous diagrams
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        
        const { svg: rendered } = await mermaid.render(id, code);
        setSvg(rendered);
        setError(null);
      } catch (err) {
        console.error('[MermaidRenderer] Error:', err);
        setError(err.message || 'Failed to render diagram');
      }
    };
    
    render();
  }, [code, id]);

  const handleZoom = (delta) => {
    setScale(prev => Math.min(2, Math.max(0.5, prev + delta * 0.25)));
  };

  if (error) {
    return (
      <div className={`rounded-xl bg-red-900/20 border border-red-500/30 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <span>⚠️</span>
          <span className="font-semibold">Diagram Error</span>
        </div>
        <pre className="text-xs text-red-300/70 overflow-auto">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">Show code</summary>
          <pre className="mt-2 text-xs text-gray-400 bg-black/40 p-2 rounded overflow-auto">{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden bg-[#0a0a0f] border border-white/10 ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs">🔀</span>
          <span className="text-sm text-gray-400">{title || `${type} Diagram`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-1)}
            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white text-xs"
          >
            −
          </button>
          <span className="text-xs text-gray-600 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => handleZoom(1)}
            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white text-xs"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Diagram */}
      <div
        ref={containerRef}
        className="p-4 overflow-auto flex items-center justify-center min-h-[200px]"
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="transition-transform duration-200"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </motion.div>
  );
});

MermaidRenderer.displayName = 'MermaidRenderer';

// ============================================================================
// CHART RENDERER (Chart.js integration ready)
// ============================================================================

export const ChartRenderer = memo(({
  type = 'bar',
  data,
  options,
  title,
  className = '',
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  
  // Color palette
  const palette = [
    'rgba(99, 102, 241, 0.8)',   // Indigo
    'rgba(139, 92, 246, 0.8)',   // Purple
    'rgba(6, 182, 212, 0.8)',    // Cyan
    'rgba(16, 185, 129, 0.8)',   // Emerald
    'rgba(245, 158, 11, 0.8)',   // Amber
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(236, 72, 153, 0.8)',   // Pink
  ];

  // Validate and enhance data
  const enhancedData = useMemo(() => {
    if (!data) return null;
    
    // Handle both {data: {...}} and direct data format
    const chartData = data.data || data;
    
    if (!chartData.labels || !chartData.datasets) {
      console.warn('[ChartRenderer] Invalid data structure:', data);
      return null;
    }
    
    return {
      labels: chartData.labels,
      datasets: chartData.datasets.map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || palette[i % palette.length],
        borderColor: ds.borderColor || (palette[i % palette.length] || '').replace('0.8', '1'),
        borderWidth: ds.borderWidth || 2,
      })),
    };
  }, [data]);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined' || !enhancedData) return;
    
    let isMounted = true;
    
    // Dynamic import of Chart.js
    const initChart = async () => {
      try {
        const Chart = (await import('chart.js/auto')).default;
        
        if (!isMounted) return;
        
        // Destroy existing chart
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
        
        // Create new chart with disabled animations to prevent conflicts
        chartRef.current = new Chart(canvasRef.current, {
          type,
          data: enhancedData,
          options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
              duration: 750,  // Controlled animation
              easing: 'easeOutQuart',
            },
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: { 
                  color: '#9ca3af',
                  font: { size: 12 },
                  padding: 15,
                },
              },
              title: {
                display: !!title,
                text: title || '',
                color: '#fff',
                font: { size: 14, weight: 'bold' },
              },
            },
            scales: (type !== 'pie' && type !== 'doughnut' && type !== 'radar' && type !== 'polarArea') ? {
              x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { 
                  color: '#9ca3af',
                  font: { size: 11 },
                },
              },
              y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { 
                  color: '#9ca3af',
                  font: { size: 11 },
                },
                beginAtZero: true,
              },
            } : undefined,
            ...options,
          },
        });
        
        setIsLoaded(true);
        setError(null);
      } catch (err) {
        console.error('[ChartRenderer] Error loading Chart.js:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load chart');
        }
      }
    };
    
    initChart();
    
    return () => {
      isMounted = false;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, enhancedData, options, title]);

  // Error state
  if (error) {
    return (
      <div className={`rounded-xl bg-red-900/20 border border-red-500/30 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <span>⚠️</span>
          <span className="font-semibold">Chart Error</span>
        </div>
        <pre className="text-xs text-red-300/70">{error}</pre>
      </div>
    );
  }

  // Invalid data state
  if (!enhancedData) {
    return (
      <div className={`rounded-xl bg-yellow-900/20 border border-yellow-500/30 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <span>⚠️</span>
          <span className="font-semibold">Invalid Chart Data</span>
        </div>
        <pre className="text-xs text-yellow-300/70 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden bg-[#0a0a0f] border border-white/10 ${className}`}>
      {title && (
        <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center gap-2">
          <span className="text-xs">📊</span>
          <span className="text-sm text-gray-400">{title}</span>
          <span className="ml-auto text-xs text-gray-600 uppercase">{type}</span>
        </div>
      )}
      <div className="p-4 min-h-[250px] flex items-center justify-center">
        <canvas ref={canvasRef} style={{ maxHeight: '400px' }} />
      </div>
    </div>
  );
});

ChartRenderer.displayName = 'ChartRenderer';

// ============================================================================
// EMOJI COMPOSITION RENDERER
// ============================================================================

export const EmojiRenderer = memo(({
  composition,
  layout = 'inline',
  scale = 1,
  animated = true,
  className = '',
}) => {
  const layoutStyles = {
    inline: 'flex items-center gap-2',
    grid: 'grid grid-cols-5 gap-2 justify-items-center',
    flow: 'flex flex-wrap gap-2 justify-center',
    scene: 'flex items-end justify-center gap-1',
  };

  // Parse emoji composition (space-separated)
  const emojis = composition.split(/\s+/).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl bg-[#0a0a0f] border border-white/10 ${className}`}
    >
      <div className={layoutStyles[layout]} style={{ fontSize: `${scale * 2}rem` }}>
        {emojis.map((emoji, i) => (
          <motion.span
            key={`emoji-${i}`}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: animated ? i * 0.1 : 0,
              type: 'spring',
              stiffness: 200,
            }}
            whileHover={animated ? { scale: 1.2, rotate: 5 } : {}}
            className="inline-block"
          >
            {emoji}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
});

EmojiRenderer.displayName = 'EmojiRenderer';

// ============================================================================
// TERMINAL OUTPUT RENDERER
// ============================================================================

export const TerminalRenderer = memo(({
  output,
  prompt = '$',
  commands = [],
  colorize = true,
  title = 'Terminal',
  className = '',
}) => {
  const [currentLine, setCurrentLine] = useState(0);
  const [typing, setTyping] = useState(true);
  
  // ANSI color mapping
  const colorMap = {
    '\\x1b[31m': 'text-red-400',
    '\\x1b[32m': 'text-green-400',
    '\\x1b[33m': 'text-yellow-400',
    '\\x1b[34m': 'text-blue-400',
    '\\x1b[35m': 'text-purple-400',
    '\\x1b[36m': 'text-cyan-400',
    '\\x1b[0m': 'text-gray-300',
  };

  const lines = output.split('\n');

  useEffect(() => {
    if (currentLine < lines.length) {
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setTyping(false);
    }
  }, [currentLine, lines.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden bg-[#0d1117] border border-[#30363d] ${className}`}
    >
      {/* Terminal header */}
      <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="ml-2 text-xs text-gray-500">{title}</span>
      </div>
      
      {/* Terminal content */}
      <div className="p-4 font-mono text-sm text-gray-300 min-h-[100px] overflow-auto">
        {commands.length > 0 && commands.map((cmd, i) => (
          <div key={`cmd-${i}`} className="mb-2">
            <span className="text-green-400">{prompt}</span>
            <span className="ml-2 text-white">{cmd}</span>
          </div>
        ))}
        {lines.slice(0, currentLine).map((line, i) => (
          <div key={`line-${i}`} className="whitespace-pre-wrap">
            {line || ' '}
          </div>
        ))}
        {typing && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-green-400"
          >
            ▊
          </motion.span>
        )}
      </div>
    </motion.div>
  );
});

TerminalRenderer.displayName = 'TerminalRenderer';

// ============================================================================
// MATH/LATEX RENDERER
// ============================================================================

export const MathRenderer = memo(({
  expression,
  displayMode = false,
  className = '',
}) => {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const rendered = katex.renderToString(expression, {
        displayMode,
        throwOnError: false,
        errorColor: '#ef4444',
        trust: false,
      });
      setHtml(rendered);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [expression, displayMode]);

  if (error) {
    return (
      <div className={`p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm ${className}`}>
        <span>Math error: {error}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${displayMode ? 'py-4 text-center' : 'inline-block'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

MathRenderer.displayName = 'MathRenderer';

// ============================================================================
// GRADIENT CARD RENDERER
// ============================================================================

export const GradientCardRenderer = memo(({
  title,
  subtitle,
  value,
  icon,
  gradient = ['#6366f1', '#8b5cf6'],
  footer,
  className = '',
}) => {
  const gradientStyle = gradient.length === 2
    ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
    : `linear-gradient(135deg, ${gradient.join(', ')})`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: gradientStyle,
        boxShadow: `0 10px 40px ${gradient[0]}33`,
      }}
    >
      <div className="p-6 backdrop-blur-sm bg-black/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            {subtitle && (
              <p className="text-white/70 text-sm mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <span className="text-3xl">{icon}</span>
          )}
        </div>
        
        {/* Value */}
        {value && (
          <div className="text-4xl font-bold text-white mb-2">
            {value}
          </div>
        )}
        
        {/* Footer */}
        {footer && (
          <div className="mt-4 pt-4 border-t border-white/20 text-white/60 text-sm">
            {footer}
          </div>
        )}
      </div>
    </motion.div>
  );
});

GradientCardRenderer.displayName = 'GradientCardRenderer';

// ============================================================================
// COMPARISON RENDERER
// ============================================================================

export const ComparisonRenderer = memo(({
  items,
  compareBy,
  className = '',
}) => {
  const [highlightedFeature, setHighlightedFeature] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden bg-[#0a0a0f] border border-white/10 ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header with items */}
          <thead>
            <tr className="bg-white/5">
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Feature</th>
              {items.map((item, i) => (
                <th
                  key={`item-${i}`}
                  className={`px-4 py-3 text-center font-medium ${
                    item.highlight ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareBy.map((feature, fi) => (
              <motion.tr
                key={`feature-${fi}`}
                onMouseEnter={() => setHighlightedFeature(feature)}
                onMouseLeave={() => setHighlightedFeature(null)}
                animate={{
                  backgroundColor: highlightedFeature === feature
                    ? 'rgba(99, 102, 241, 0.05)'
                    : 'transparent'
                }}
                className="border-t border-white/5"
              >
                <td className="px-4 py-3 text-gray-400">{feature}</td>
                {items.map((item, i) => {
                  const val = item.features[feature];
                  return (
                    <td
                      key={`cell-${fi}-${i}`}
                      className={`px-4 py-3 text-center ${
                        item.highlight ? 'bg-indigo-500/10' : ''
                      }`}
                    >
                      {typeof val === 'boolean' ? (
                        val ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )
                      ) : (
                        <span className="text-gray-300">{val}</span>
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});

ComparisonRenderer.displayName = 'ComparisonRenderer';

// ============================================================================
// TIMELINE RENDERER
// ============================================================================

export const TimelineRenderer = memo(({
  events,
  orientation = 'vertical',
  className = '',
}) => {
  const typeColors = {
    milestone: { bg: 'bg-indigo-500', ring: 'ring-indigo-500/30' },
    event: { bg: 'bg-cyan-500', ring: 'ring-cyan-500/30' },
    checkpoint: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  };

  if (orientation === 'horizontal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`p-6 rounded-xl bg-[#0a0a0f] border border-white/10 overflow-x-auto ${className}`}
      >
        <div className="flex items-start min-w-max">
          {events.map((event, i) => {
            const colors = typeColors[event.type || 'event'];
            return (
              <motion.div
                key={`event-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center min-w-[150px]"
              >
                {/* Dot and line */}
                <div className="flex items-center w-full">
                  {i > 0 && <div className="flex-1 h-0.5 bg-white/10" />}
                  <div className={`w-4 h-4 rounded-full ${colors.bg} ring-4 ${colors.ring}`} />
                  {i < events.length - 1 && <div className="flex-1 h-0.5 bg-white/10" />}
                </div>
                
                {/* Content */}
                <div className="mt-3 text-center px-2">
                  <div className="text-xs text-gray-500">{event.date}</div>
                  <div className="text-sm font-medium text-white mt-1">{event.title}</div>
                  {event.description && (
                    <div className="text-xs text-gray-400 mt-1">{event.description}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // Vertical timeline
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`p-6 rounded-xl bg-[#0a0a0f] border border-white/10 ${className}`}
    >
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
        
        {events.map((event, i) => {
          const colors = typeColors[event.type || 'event'];
          return (
            <motion.div
              key={`event-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative pl-12 pb-8 last:pb-0"
            >
              {/* Dot */}
              <div
                className={`absolute left-2 w-5 h-5 rounded-full ${colors.bg} ring-4 ${colors.ring}`}
              >
                {event.icon && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs">
                    {event.icon}
                  </span>
                )}
              </div>
              
              {/* Content */}
              <div className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="text-xs text-gray-500 mb-1">{event.date}</div>
                <div className="text-sm font-medium text-white">{event.title}</div>
                {event.description && (
                  <div className="text-xs text-gray-400 mt-2">{event.description}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});

TimelineRenderer.displayName = 'TimelineRenderer';

// ============================================================================
// TREE RENDERER
// ============================================================================

export const TreeRenderer = memo(({
  root,
  style = 'file-tree',
  className = '',
}) => {
  const [expanded, setExpanded] = useState({});
  
  const toggleExpand = (path) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const renderNode = (node, path = '', level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[path] !== false; // Default expanded
    
    const icons = {
      'file-tree': hasChildren ? (isExpanded ? '📂' : '📁') : '📄',
      'org-chart': '👤',
      'mind-map': hasChildren ? '🔮' : '💡',
      'indented': hasChildren ? '▸' : '•',
    };

    return (
      <motion.div
        key={path}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: level * 0.05 }}
      >
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer ${
            hasChildren ? 'font-medium' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => hasChildren && toggleExpand(path)}
        >
          <span className="text-sm">{node.icon || icons[style]}</span>
          <span className="text-sm text-gray-300">{node.label}</span>
          {hasChildren && style !== 'indented' && (
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              className="text-gray-500 text-xs ml-auto"
            >
              ▶
            </motion.span>
          )}
        </div>
        
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {node.children.map((child, i) => 
                renderNode(child, `${path}-${i}`, level + 1)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-[#0a0a0f] border border-white/10 p-4 ${className}`}
    >
      {renderNode(root)}
    </motion.div>
  );
});

TreeRenderer.displayName = 'TreeRenderer';

// ============================================================================
// STATS CARD RENDERER
// ============================================================================

export const StatsCardRenderer = memo(({
  stats,
  layout = 'grid',
  className = '',
}) => {
  const layoutStyles = {
    grid: 'grid grid-cols-2 md:grid-cols-4 gap-4',
    row: 'flex flex-wrap gap-4',
    stack: 'space-y-4',
  };

  const changeColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    flat: 'text-gray-400',
  };

  const changeIcons = {
    up: '↑',
    down: '↓',
    flat: '→',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-[#0a0a0f] border border-white/10 p-4 ${className}`}
    >
      <div className={layoutStyles[layout]}>
        {stats.map((stat, i) => (
          <motion.div
            key={`stat-${i}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            style={{
              borderLeft: stat.color ? `3px solid ${stat.color}` : undefined,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {stat.value}
                </div>
              </div>
              {stat.icon && (
                <span className="text-2xl">{stat.icon}</span>
              )}
            </div>
            
            {stat.change && (
              <div className={`mt-2 text-sm flex items-center gap-1 ${changeColors[stat.change.direction]}`}>
                <span>{changeIcons[stat.change.direction]}</span>
                <span>{Math.abs(stat.change.value)}%</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

StatsCardRenderer.displayName = 'StatsCardRenderer';

// ============================================================================
// UNIVERSAL FORMAT RENDERER - Auto-detects and renders any format
// ============================================================================

export const UniversalFormatRenderer = memo(({
  artifact,
  className = '',
}) => {
  const { format, content, metadata, style } = artifact;

  const renderByFormat = () => {
    switch (format) {
      case 'ascii':
        return <ASCIIRenderer content={content} title={metadata?.title} />;
      
      case 'markdown-table':
        return (
          <MarkdownTableRenderer
            headers={content.headers}
            rows={content.rows}
            alignment={content.alignment}
            caption={metadata?.title}
          />
        );
      
      case 'mermaid':
        return (
          <MermaidRenderer
            code={content.code || content}
            type={content.type}
            title={metadata?.title}
          />
        );
      
      case 'chart':
        return (
          <ChartRenderer
            type={content.type}
            data={content.data}
            options={content.options}
            title={metadata?.title}
          />
        );
      
      case 'emoji':
        return (
          <EmojiRenderer
            composition={typeof content === 'string' ? content : content.composition}
            layout={content?.layout}
            animated={artifact.animated}
          />
        );
      
      case 'terminal':
        return (
          <TerminalRenderer
            output={typeof content === 'string' ? content : content.output}
            commands={content?.commands}
            title={metadata?.title}
          />
        );
      
      case 'math':
        return (
          <MathRenderer
            expression={typeof content === 'string' ? content : content.expression}
            displayMode={content?.displayMode ?? true}
          />
        );
      
      case 'gradient-card':
        return (
          <GradientCardRenderer
            title={content.title}
            subtitle={content.subtitle}
            value={content.value}
            icon={content.icon}
            gradient={content.gradient}
            footer={content.footer}
          />
        );
      
      case 'comparison':
        return (
          <ComparisonRenderer
            items={content.items}
            compareBy={content.compareBy}
          />
        );
      
      case 'timeline':
        return (
          <TimelineRenderer
            events={content.events}
            orientation={content.orientation}
          />
        );
      
      case 'tree':
        return (
          <TreeRenderer
            root={content.root || content}
            style={content.style}
          />
        );
      
      case 'stats-card':
        return (
          <StatsCardRenderer
            stats={content.stats || content}
            layout={content.layout}
          />
        );
      
      default:
        // Fallback: try to render as text
        return (
          <div className="p-4 rounded-xl bg-[#0a0a0f] border border-white/10">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
              {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      {renderByFormat()}
    </div>
  );
});

UniversalFormatRenderer.displayName = 'UniversalFormatRenderer';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ASCIIRenderer,
  MarkdownTableRenderer,
  MermaidRenderer,
  ChartRenderer,
  EmojiRenderer,
  TerminalRenderer,
  MathRenderer,
  GradientCardRenderer,
  ComparisonRenderer,
  TimelineRenderer,
  TreeRenderer,
  StatsCardRenderer,
  UniversalFormatRenderer,
};
