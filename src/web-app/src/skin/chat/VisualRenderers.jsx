// @version 3.3.373
// TooLoo.ai Visual Renderers
// v3.3.371 - Added SVG validation to reject malformed diagrams, corner-based curves
// Rich visual components for rendering AI-generated visual content
// User sees ONLY rendered output - never source code

import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiquidEngine } from '../effects/LiquidEngine';
import { LiveProvider, LivePreview, LiveError } from 'react-live';

// ============================================================================
// SVG RENDERER - Safe SVG rendering with dark theme
// v3.3.127 - Fixed height="auto" (invalid for SVG) and invalid transform sanitization
// ============================================================================

export const SVGRenderer = memo(
  ({ code, title, className = '', maxHeight = 500, allowZoom = true }) => {
    const [scale, setScale] = useState(1);
    const [error, setError] = useState(null);
    const containerRef = useRef(null);

    // Sanitize and prepare SVG
    const sanitizedSVG = useMemo(() => {
      try {
        // Extract SVG from code block if wrapped
        let svg = code;
        const svgMatch = code.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch) {
          svg = svgMatch[0];
        }

        // VALIDATION: Count different element types
        const rectCount = (svg.match(/<rect[^>]*>/gi) || []).length;
        const circleCount = (svg.match(/<circle[^>]*>/gi) || []).length;
        const ellipseCount = (svg.match(/<ellipse[^>]*>/gi) || []).length;
        const textCount = (svg.match(/<text[^>]*>/gi) || []).length;
        const pathCount = (svg.match(/<path[^>]*>/gi) || []).length;
        const lineCount = (svg.match(/<line[^>]*>/gi) || []).length;
        const polyCount = (svg.match(/<poly(line|gon)[^>]*>/gi) || []).length;
        
        // Total elements
        const shapeElements = rectCount + circleCount + ellipseCount;
        const lineElements = pathCount + lineCount + polyCount;
        const totalElements = shapeElements + lineElements + textCount;
        
        // STRICT VALIDATION: A proper diagram needs:
        // 1. At least some shapes (rects, circles) OR text labels
        // 2. Not just decorative lines/paths
        
        // Reject if too few total elements
        if (totalElements < 3) {
          console.warn('[SVGRenderer] Rejecting SVG: too few elements', totalElements);
          setError('Insufficient content');
          return null;
        }
        
        // Reject if it's ONLY lines/paths with no shapes or text (decorative garbage)
        if (shapeElements === 0 && textCount === 0 && lineElements > 0) {
          console.warn('[SVGRenderer] Rejecting SVG: only lines/paths, no shapes or text');
          setError('Invalid diagram - no shapes or labels');
          return null;
        }
        
        // Reject if lines vastly outnumber meaningful shapes (likely decorative)
        if (lineElements > 5 && shapeElements < 2 && textCount < 2) {
          console.warn('[SVGRenderer] Rejecting SVG: too many lines vs shapes', { lineElements, shapeElements, textCount });
          setError('Invalid diagram structure');
          return null;
        }
        
        // Check for dashed lines (often decorative garbage)
        const dashedCount = (svg.match(/stroke-dasharray/gi) || []).length;
        if (dashedCount > 3 && textCount === 0 && shapeElements < 2) {
          console.warn('[SVGRenderer] Rejecting SVG: many dashed lines, no labels');
          setError('Decorative SVG rejected');
          return null;
        }

        // Ensure viewBox exists - critical for proper rendering
        if (!svg.includes('viewBox')) {
          const widthMatch = svg.match(/width=["']?(\d+)/);
          const heightMatch = svg.match(/height=["']?(\d+)/);
          const w = widthMatch ? widthMatch[1] : 800;
          const h = heightMatch ? heightMatch[1] : 500;
          svg = svg.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
        }

        // Ensure dark background
        if (!svg.includes('style=') && !svg.includes('<style>')) {
          svg = svg.replace('<svg', '<svg style="background: #0a0a0f;"');
        }

        // Make responsive
        if (!svg.includes('width=') || svg.includes('width="100%"')) {
          // Already responsive
        } else {
          svg = svg.replace(/width=["'][^"']*["']/, 'width="100%"');
          svg = svg.replace(/height=["'][^"']*["']/g, '');
        }

        // Sanitize invalid transforms
        svg = svg.replace(/transform=["'][^"']*slate\([^)]*\)[^"']*["']/gi, '');
        svg = svg.replace(/transform=["'][^"']*perspective\([^)]*\)[^"']*["']/gi, '');
        svg = svg.replace(/translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/g, 'translate($1, $2)');

        setError(null);
        return svg;
      } catch (e) {
        setError(e.message);
        return null;
      }
    }, [code]);

    const handleZoom = (direction) => {
      setScale((prev) => Math.max(0.5, Math.min(3, prev + direction * 0.25)));
    };

    if (error || !sanitizedSVG) {
      return (
        <div className={`p-6 rounded-xl bg-gray-900/50 border border-white/10 text-center ${className}`}>
          <span className="text-3xl mb-2 block">🎨</span>
          <p className="text-sm text-gray-400">Couldn't display this diagram</p>
        </div>
      );
    }

    return (
      <div className={`relative group ${className}`}>
        {/* Title bar */}
        {title && (
          <div className="flex items-center justify-between px-3 py-2 bg-black/40 rounded-t-xl border-b border-white/10">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <span>🎨</span>
              {title}
            </span>
            {allowZoom && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleZoom(-1)}
                  className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                >
                  −
                </button>
                <span className="text-xs text-gray-500 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => handleZoom(1)}
                  className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* SVG container */}
        <div
          ref={containerRef}
          className="overflow-auto bg-[#0a0a0a] rounded-b-xl p-4"
          style={{ maxHeight }}
        >
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            className="transition-transform duration-200"
            dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
          />
        </div>

        {/* Download button */}
        <button
          onClick={() => {
            const blob = new Blob([sanitizedSVG], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'diagram'}.svg`;
            a.click();
          }}
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-gray-400"
        >
          ↓ Download
        </button>
      </div>
    );
  }
);

SVGRenderer.displayName = 'SVGRenderer';

// ============================================================================
// REACT COMPONENT RENDERER - Live preview of generated React components
// ============================================================================

export const ReactComponentRenderer = memo(({ code, title, className = '', scope = {} }) => {
  const [renderError, setRenderError] = useState(false);

  // Default scope for generated components
  const defaultScope = useMemo(
    () => ({
      React,
      useState: React.useState,
      useEffect: React.useEffect,
      useCallback: React.useCallback,
      useMemo: React.useMemo,
      useRef: React.useRef,
      motion,
      ...scope,
    }),
    [scope]
  );

  // Clean code - extract component
  const cleanCode = useMemo(() => {
    try {
      let cleaned = code || '';

      // Remove import statements
      cleaned = cleaned.replace(/^import\s+.*?['"];?\s*$/gm, '');

      // Remove export statements but keep the component
      cleaned = cleaned.replace(/^export\s+default\s+/gm, '');
      cleaned = cleaned.replace(/^export\s+/gm, '');

      // If it's a function component, make sure it renders
      if (cleaned.includes('function') && !cleaned.includes('render(')) {
        const match = cleaned.match(/function\s+(\w+)/);
        if (match) {
          cleaned += `\nrender(<${match[1]} />);`;
        }
      }

      return cleaned.trim();
    } catch {
      setRenderError(true);
      return '';
    }
  }, [code]);

  // Graceful error display
  const GracefulError = () => (
    <div className="p-4 text-center">
      <span className="text-2xl mb-2 block">⚠️</span>
      <p className="text-sm text-gray-400">Couldn't display this interactive element</p>
    </div>
  );

  if (renderError || !cleanCode) {
    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] ${className}`}>
        <GracefulError />
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 ${className}`}>
      {/* Header - simplified, no code toggle */}
      {title && (
        <div className="flex items-center px-3 py-2 bg-black/40 border-b border-white/10">
          <span className="text-sm text-gray-400 flex items-center gap-2">
            <span>✨</span>
            {title}
          </span>
        </div>
      )}

      {/* Live Preview only - no code view */}
      <LiveProvider code={cleanCode} scope={defaultScope} noInline>
        <div className="p-4 bg-[#0a0a0a] min-h-[100px]">
          <LivePreview />
          {/* Graceful error instead of technical stack trace */}
          <LiveError component={GracefulError} />
        </div>
      </LiveProvider>
    </div>
  );
});

ReactComponentRenderer.displayName = 'ReactComponentRenderer';

// ============================================================================
// INFOGRAPHIC CARD - Stylized data display
// ============================================================================

export const InfographicCard = memo(
  ({
    title,
    stats = [],
    visualType = 'bars', // bars, circles, icons
    accent = 'cyan',
    className = '',
  }) => {
    const { getEmotionValues, globalPulse } = useLiquidEngine();
    const emotionVals = getEmotionValues();

    const accentColors = {
      cyan: { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' },
      purple: { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.3)' },
      emerald: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
      amber: { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
      rose: { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' },
    };

    const colors = accentColors[accent] || accentColors.cyan;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-6 ${className}`}
      >
        {title && (
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span style={{ color: colors.main }}>📊</span>
            {title}
          </h3>
        )}

        <div className="space-y-4">
          {stats.map((stat, i) => (
            <div key={`stat-${stat.label}-${i}`} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <span className="text-lg font-bold" style={{ color: colors.main }}>
                  {stat.value}
                  {stat.unit || ''}
                </span>
              </div>

              {visualType === 'bars' && stat.percentage !== undefined && (
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.percentage}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${colors.main}, ${colors.glow})`,
                      boxShadow: `0 0 10px ${colors.glow}`,
                    }}
                  />
                </div>
              )}

              {visualType === 'circles' && stat.percentage !== undefined && (
                <div className="flex items-center gap-2">
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <circle
                      cx="30"
                      cy="30"
                      r="25"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="4"
                    />
                    <motion.circle
                      cx="30"
                      cy="30"
                      r="25"
                      fill="none"
                      stroke={colors.main}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${stat.percentage * 1.57} 157`}
                      transform="rotate(-90 30 30)"
                      initial={{ strokeDasharray: '0 157' }}
                      animate={{ strokeDasharray: `${stat.percentage * 1.57} 157` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                    <text x="30" y="35" textAnchor="middle" className="text-xs fill-white">
                      {stat.percentage}%
                    </text>
                  </svg>
                  <span className="text-sm text-gray-500">{stat.description || ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
);

InfographicCard.displayName = 'InfographicCard';

// ============================================================================
// ANIMATED TIMELINE - Visual timeline with animations
// ============================================================================

export const AnimatedTimeline = memo(
  ({
    events = [],
    orientation = 'vertical', // vertical, horizontal
    className = '',
  }) => {
    const [activeIndex, setActiveIndex] = useState(-1);

    return (
      <div className={`relative ${className}`}>
        {orientation === 'vertical' ? (
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-cyan-500/50" />

            {/* Events */}
            {events.map((event, i) => (
              <motion.div
                key={`timeline-v-${event.title || event.date}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                onHoverStart={() => setActiveIndex(i)}
                onHoverEnd={() => setActiveIndex(-1)}
                className="relative mb-8 last:mb-0"
              >
                {/* Node */}
                <motion.div
                  animate={{
                    scale: activeIndex === i ? 1.2 : 1,
                    boxShadow:
                      activeIndex === i
                        ? '0 0 20px rgba(6, 182, 212, 0.5)'
                        : '0 0 0 rgba(6, 182, 212, 0)',
                  }}
                  className="absolute left-0 w-6 h-6 -translate-x-1/2 bg-[#0f1117] border-2 border-cyan-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-xs">{event.icon || '●'}</span>
                </motion.div>

                {/* Content */}
                <div className="ml-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors">
                  <div className="text-xs text-cyan-400 mb-1">{event.date || event.time}</div>
                  <h4 className="font-medium text-white mb-1">{event.title}</h4>
                  <p className="text-sm text-gray-400">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-start overflow-x-auto pb-4">
            {events.map((event, i) => (
              <motion.div
                key={`timeline-h-${event.title || event.date}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 w-48 mx-2 first:ml-0 last:mr-0"
              >
                <div className="text-center mb-2">
                  <div className="w-4 h-4 mx-auto bg-cyan-500 rounded-full" />
                  <div className="h-8 w-0.5 mx-auto bg-cyan-500/50" />
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs text-cyan-400 mb-1">{event.date}</div>
                  <h4 className="text-sm font-medium text-white mb-1">{event.title}</h4>
                  <p className="text-xs text-gray-400">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AnimatedTimeline.displayName = 'AnimatedTimeline';

// ============================================================================
// COMPARISON TABLE - Side-by-side comparison
// ============================================================================

export const ComparisonTable = memo(({ items = [], criteria = [], title, className = '' }) => {
  const [highlightedItem, setHighlightedItem] = useState(null);

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 ${className}`}>
      {title && (
        <div className="px-4 py-3 bg-black/40 border-b border-white/10">
          <h3 className="font-medium text-white flex items-center gap-2">
            <span>⚖️</span>
            {title}
          </h3>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-sm text-gray-400 font-medium">Criteria</th>
              {items.map((item, i) => (
                <th
                  key={`compare-header-${item.name}-${i}`}
                  className="px-4 py-3 text-center text-sm font-medium"
                  style={{
                    color: highlightedItem === i ? '#06b6d4' : 'white',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={() => setHighlightedItem(i)}
                  onMouseLeave={() => setHighlightedItem(null)}
                >
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, ci) => (
              <tr key={ci} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-sm text-gray-400">{criterion}</td>
                {items.map((item, ii) => {
                  const value = item.values?.[ci];
                  const isHighlighted = highlightedItem === ii;

                  return (
                    <td
                      key={`compare-cell-${ii}-${ci}`}
                      className="px-4 py-3 text-center text-sm"
                      style={{
                        background: isHighlighted ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                      }}
                    >
                      {typeof value === 'boolean' ? (
                        value ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-red-400">✗</span>
                        )
                      ) : typeof value === 'number' ? (
                        <div className="flex items-center justify-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={`star-${ci}-${ii}-${i}`}
                              className={i < value ? 'text-amber-400' : 'text-gray-700'}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

ComparisonTable.displayName = 'ComparisonTable';

// ============================================================================
// MIND MAP NODE - Interactive mind map visualization
// ============================================================================

export const MindMapNode = memo(
  ({ data, level = 0, expanded = true, onToggle, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(expanded);
    const hasChildren = data.children && data.children.length > 0;

    const colors = [
      { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300' },
      { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-300' },
      { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300' },
      { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300' },
    ];
    const color = colors[level % colors.length];

    return (
      <div className={`${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${color.bg} border ${color.border} cursor-pointer`}
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        >
          {hasChildren && (
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              className="text-xs text-gray-400"
            >
              ▶
            </motion.span>
          )}
          <span className={`font-medium ${color.text}`}>{data.label}</span>
          {data.icon && <span>{data.icon}</span>}
        </motion.div>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-8 mt-2 space-y-2 border-l border-white/10 pl-4"
            >
              {data.children.map((child, i) => (
                <MindMapNode
                  key={`mind-${child.label || child.id || i}-${level}`}
                  data={child}
                  level={level + 1}
                  expanded={level < 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

MindMapNode.displayName = 'MindMapNode';

// ============================================================================
// DOCUMENT PREVIEW - Formatted document display
// ============================================================================

export const DocumentPreview = memo(
  ({
    content,
    title,
    author,
    date,
    type = 'report', // report, article, brief, memo
    className = '',
  }) => {
    const typeStyles = {
      report: { icon: '📋', accent: 'cyan' },
      article: { icon: '📰', accent: 'purple' },
      brief: { icon: '📝', accent: 'emerald' },
      memo: { icon: '📎', accent: 'amber' },
    };

    const style = typeStyles[type] || typeStyles.report;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden ${className}`}
      >
        {/* Document header */}
        <div className="px-6 py-4 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{style.icon}</span>
                {title || 'Untitled Document'}
              </h2>
              {(author || date) && (
                <div className="mt-1 text-sm text-gray-500">
                  {author && <span>{author}</span>}
                  {author && date && <span className="mx-2">•</span>}
                  {date && <span>{date}</span>}
                </div>
              )}
            </div>
            <span className="px-2 py-1 rounded text-xs bg-white/10 text-gray-400 uppercase">
              {type}
            </span>
          </div>
        </div>

        {/* Document content */}
        <div className="px-6 py-6 prose prose-invert prose-sm max-w-none">
          {typeof content === 'string' ? (
            <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">{content}</div>
          ) : (
            content
          )}
        </div>

        {/* Document footer */}
        <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
          <span>Generated by TooLoo.ai</span>
          <div className="flex items-center gap-2">
            <button className="hover:text-cyan-400 transition-colors">Copy</button>
            <span>•</span>
            <button className="hover:text-cyan-400 transition-colors">Export</button>
          </div>
        </div>
      </motion.div>
    );
  }
);

DocumentPreview.displayName = 'DocumentPreview';

// ============================================================================
// VISUAL BLOCK PARSER - Parse and render visual blocks from AI responses
// ============================================================================

export const VisualBlockParser = memo(({ content, className = '' }) => {
  const blocks = useMemo(() => {
    const result = [];
    let remaining = content;

    // Parse SVG blocks
    const svgRegex = /```svg\n([\s\S]*?)```/g;
    let svgMatch;
    while ((svgMatch = svgRegex.exec(content)) !== null) {
      result.push({ type: 'svg', code: svgMatch[1], index: svgMatch.index });
    }

    // Parse JSX/React blocks
    const jsxRegex = /```(?:jsx|react)\n([\s\S]*?)```/g;
    let jsxMatch;
    while ((jsxMatch = jsxRegex.exec(content)) !== null) {
      result.push({ type: 'jsx', code: jsxMatch[1], index: jsxMatch.index });
    }

    // Parse special visual markers [[visual:type|data]]
    const visualMarkerRegex = /\[\[visual:(\w+)\|([^\]]+)\]\]/g;
    let markerMatch;
    while ((markerMatch = visualMarkerRegex.exec(content)) !== null) {
      result.push({
        type: 'marker',
        visualType: markerMatch[1],
        data: markerMatch[2],
        index: markerMatch.index,
      });
    }

    return result.sort((a, b) => a.index - b.index);
  }, [content]);

  // Render text with embedded visuals
  const renderContent = () => {
    if (blocks.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    const elements = [];
    let lastIndex = 0;

    blocks.forEach((block, i) => {
      // Add text before this block
      if (block.index > lastIndex) {
        const textBefore = content.slice(lastIndex, block.index);
        if (textBefore.trim()) {
          elements.push(
            <div key={`text-${i}`} className="whitespace-pre-wrap mb-4">
              {textBefore}
            </div>
          );
        }
      }

      // Add the visual block
      if (block.type === 'svg') {
        elements.push(
          <SVGRenderer
            key={`svg-${i}`}
            code={block.code}
            title="Generated Diagram"
            className="my-4"
          />
        );
        lastIndex = block.index + block.code.length + 10; // account for ```svg\n...\n```
      } else if (block.type === 'jsx') {
        elements.push(
          <ReactComponentRenderer
            key={`jsx-${i}`}
            code={block.code}
            title="Interactive Component"
            className="my-4"
          />
        );
        lastIndex = block.index + block.code.length + 10;
      }
    });

    // Add remaining text
    if (lastIndex < content.length) {
      const textAfter = content.slice(lastIndex);
      if (textAfter.trim()) {
        elements.push(
          <div key="text-end" className="whitespace-pre-wrap">
            {textAfter}
          </div>
        );
      }
    }

    return elements;
  };

  return <div className={className}>{renderContent()}</div>;
});

VisualBlockParser.displayName = 'VisualBlockParser';

// ============================================================================
// UNIVERSAL CODE SANDBOX - Output-only visual renderer
// v3.3.200 - Zero-code UX: Shows only rendered output, never source code
// ============================================================================

export const UniversalCodeSandbox = memo(
  ({
    code,
    language,
    title,
    className = '',
    showPreview = true,
    showExecute = true,
    onExecutionResult,
  }) => {
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState(null);
    const [renderError, setRenderError] = useState(false);

    // Detect language from code if not provided
    const detectedLanguage = useMemo(() => {
      if (language) return language.toLowerCase();

      const code_ = code || '';
      if (
        code_.includes('import React') ||
        code_.includes('useState') ||
        (code_.includes('function') && code_.includes('return'))
      ) {
        return 'jsx';
      }
      if (code_.includes('<svg') || code_.includes('viewBox')) {
        return 'svg';
      }
      if (
        code_.includes('def ') ||
        (code_.includes('import ') && !code_.includes("from 'react'"))
      ) {
        return 'python';
      }
      if (code_.includes('console.log') || code_.includes('const ') || code_.includes('let ')) {
        return 'javascript';
      }
      return 'text';
    }, [code, language]);

    // Can this code be previewed live?
    const canPreview = ['jsx', 'react', 'svg'].includes(detectedLanguage);

    // Can this code be executed server-side?
    const canExecute = ['javascript', 'typescript', 'python', 'shell', 'bash'].includes(
      detectedLanguage
    );

    // Friendly output type labels instead of language codes
    const outputTypeLabel = useMemo(() => {
      if (['svg'].includes(detectedLanguage)) return 'Diagram';
      if (['jsx', 'react'].includes(detectedLanguage)) return 'Interactive';
      if (['python', 'javascript', 'typescript'].includes(detectedLanguage)) return 'Script';
      return '';
    }, [detectedLanguage]);

    const handleExecute = async () => {
      if (executing) return;
      setExecuting(true);
      setResult(null);

      try {
        const response = await fetch('/api/v1/agent/task/team-execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'code_execution',
            prompt: `Execute this ${detectedLanguage} code`,
            code: code,
            options: {
              useTeam: true,
              qualityThreshold: 0.8,
            },
          }),
        });

        const data = await response.json();
        const newResult = {
          success: data.ok,
          output: data.data?.output || (data.ok ? 'Completed' : 'Something went wrong'),
        };

        setResult(newResult);
        onExecutionResult?.(newResult);
      } catch {
        setResult({ success: false, output: 'Couldn\'t run this right now' });
      } finally {
        setExecuting(false);
      }
    };

    // Clean JSX code for preview
    const cleanedCode = useMemo(() => {
      if (!['jsx', 'react'].includes(detectedLanguage)) return code;

      try {
        let cleaned = code || '';
        // Remove imports
        cleaned = cleaned.replace(/^import\s+.*?['"];?\s*$/gm, '');
        // Remove exports
        cleaned = cleaned.replace(/^export\s+default\s+/gm, '');
        cleaned = cleaned.replace(/^export\s+/gm, '');
        // Add render call if missing
        if (cleaned.includes('function') && !cleaned.includes('render(')) {
          const match = cleaned.match(/function\s+(\w+)/);
          if (match) {
            cleaned += `\nrender(<${match[1]} />);`;
          }
        }
        return cleaned.trim();
      } catch {
        setRenderError(true);
        return '';
      }
    }, [code, detectedLanguage]);

    const defaultScope = useMemo(
      () => ({
        React,
        useState: React.useState,
        useEffect: React.useEffect,
        useCallback: React.useCallback,
        useMemo: React.useMemo,
        useRef: React.useRef,
        motion,
      }),
      []
    );

    // Graceful error display
    const GracefulError = () => (
      <div className="p-4 text-center">
        <span className="text-2xl mb-2 block">⚠️</span>
        <p className="text-sm text-gray-400">Couldn't display this content</p>
      </div>
    );

    // If we can't render anything useful, show placeholder
    if (renderError || (!canPreview && !canExecute)) {
      return (
        <div className={`rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] p-4 ${className}`}>
          {title && (
            <div className="flex items-center gap-2 mb-3">
              <span>📄</span>
              <span className="text-sm text-gray-400">{title}</span>
            </div>
          )}
          <div className="text-center py-4">
            <span className="text-2xl mb-2 block">📋</span>
            <p className="text-sm text-gray-400">Content ready</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-black/30 ${className}`}>
        {/* Header - simplified, no code toggle */}
        <div className="flex items-center justify-between px-3 py-2 bg-black/50 border-b border-white/10">
          <div className="flex items-center gap-2">
            {outputTypeLabel && (
              <span className="text-xs text-cyan-400/70">{outputTypeLabel}</span>
            )}
            {title && <span className="text-sm text-gray-400">{title}</span>}
          </div>

          <div className="flex items-center gap-1">
            {/* Execute button for runnable code */}
            {canExecute && showExecute && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-2 py-1 text-xs rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors flex items-center gap-1"
              >
                {executing ? '⚡ Running...' : '▶ Run'}
              </button>
            )}
          </div>
        </div>

        {/* Content - output only, no code view */}
        <div className="relative">
          {/* Visual Preview for SVG/JSX */}
          {canPreview && (
            <div className="p-4 min-h-[100px]">
              {detectedLanguage === 'svg' ? (
                <SVGRenderer code={code} />
              ) : (
                <LiveProvider code={cleanedCode} scope={defaultScope} noInline>
                  <LivePreview />
                  <LiveError component={GracefulError} />
                </LiveProvider>
              )}
            </div>
          )}

          {/* For non-previewable but executable code, show run prompt */}
          {!canPreview && canExecute && !result && (
            <div className="p-6 text-center">
              <span className="text-2xl mb-2 block">⚡</span>
              <p className="text-sm text-gray-400">Click Run to execute</p>
            </div>
          )}

          {/* Execution Result - shown as output, not code */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10 overflow-hidden"
              >
                <div className={`p-3 ${result.success ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={result.success ? 'text-emerald-400' : 'text-orange-400'}>
                      {result.success ? '✓' : '⚠️'}
                    </span>
                    <span className={`text-xs font-medium ${result.success ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {result.success ? 'Done' : 'Hmm...'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {result.output}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

UniversalCodeSandbox.displayName = 'UniversalCodeSandbox';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  SVGRenderer,
  ReactComponentRenderer,
  InfographicCard,
  AnimatedTimeline,
  ComparisonTable,
  MindMapNode,
  DocumentPreview,
  VisualBlockParser,
  UniversalCodeSandbox,
};
