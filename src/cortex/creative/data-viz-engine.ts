// @version 3.3.159
// TooLoo.ai Data Visualization Engine
// Professional chart and graph generation for Visual Cortex 2.0
// Generates beautiful, animated SVG data visualizations

import { bus } from '../../core/event-bus.js';
import { animationEngine, EASING_CURVES } from './animation-engine.js';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface DataSeries {
  name: string;
  data: DataPoint[];
  color?: string;
  type?: 'bar' | 'line' | 'area';
}

export interface ChartOptions {
  width?: number;
  height?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  backgroundColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  animate?: boolean;
  animationDuration?: number;
  animationStagger?: number;
  theme?: 'dark' | 'light' | 'vibrant' | 'minimal';
  title?: string;
  subtitle?: string;
}

// ============================================================================
// COLOR PALETTES
// ============================================================================

export const CHART_PALETTES = {
  vibrant: [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#f5576c',
    '#4facfe',
    '#00f2fe',
    '#43e97b',
    '#38f9d7',
    '#fa709a',
    '#fee140',
    '#a8edea',
    '#fed6e3',
  ],
  dark: [
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
    '#f43f5e',
    '#f97316',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
  ],
  light: [
    '#818cf8',
    '#a78bfa',
    '#c084fc',
    '#e879f9',
    '#f472b6',
    '#fb7185',
    '#fb923c',
    '#fbbf24',
    '#a3e635',
    '#4ade80',
    '#2dd4bf',
    '#22d3ee',
  ],
  minimal: ['#3b82f6', '#64748b', '#94a3b8', '#cbd5e1', '#1e293b', '#475569', '#6b7280', '#9ca3af'],
  gradient: [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
  ],
} as const;

export type ChartPalette = keyof typeof CHART_PALETTES;

// ============================================================================
// SVG UTILITIES
// ============================================================================

/**
 * Generate a gradient definition for SVG
 */
function generateGradient(
  id: string,
  colors: string | string[],
  direction: 'vertical' | 'horizontal' = 'vertical'
): string {
  const colorArray = Array.isArray(colors) ? colors : [colors, colors];
  const x2 = direction === 'horizontal' ? '100%' : '0%';
  const y2 = direction === 'vertical' ? '100%' : '0%';

  const stops = colorArray
    .map((color, i) => {
      const offset = (i / (colorArray.length - 1)) * 100;
      return `<stop offset="${offset}%" style="stop-color:${color};stop-opacity:1"/>`;
    })
    .join('\n      ');

  return `<linearGradient id="${id}" x1="0%" y1="0%" x2="${x2}" y2="${y2}">
      ${stops}
    </linearGradient>`;
}

/**
 * Generate filter effects
 */
function generateFilters(): string {
  return `
    <!-- Glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Shadow filter -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
    
    <!-- Soft shadow -->
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.2"/>
    </filter>
  `.trim();
}

/**
 * Get theme colors
 */
function getThemeColors(theme: ChartOptions['theme'] = 'dark'): {
  background: string;
  gridColor: string;
  textColor: string;
  textMuted: string;
} {
  const themes = {
    dark: {
      background: '#0f0f1a',
      gridColor: 'rgba(255,255,255,0.1)',
      textColor: '#ffffff',
      textMuted: '#94a3b8',
    },
    light: {
      background: '#ffffff',
      gridColor: 'rgba(0,0,0,0.1)',
      textColor: '#1e293b',
      textMuted: '#64748b',
    },
    vibrant: {
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1e1e3f 100%)',
      gridColor: 'rgba(255,255,255,0.08)',
      textColor: '#ffffff',
      textMuted: '#a5b4fc',
    },
    minimal: {
      background: '#fafafa',
      gridColor: 'rgba(0,0,0,0.05)',
      textColor: '#374151',
      textMuted: '#9ca3af',
    },
  };

  return themes[theme];
}

// ============================================================================
// DATA VISUALIZATION ENGINE
// ============================================================================

export class DataVizEngine {
  private static instance: DataVizEngine;

  static getInstance(): DataVizEngine {
    if (!this.instance) {
      this.instance = new DataVizEngine();
    }
    return this.instance;
  }

  constructor() {
    // Subscribe to visualization requests
    bus.on('cortex:dataviz_request', async (event) => {
      try {
        const result = await this.handleVizRequest(event.payload);
        bus.publish('cortex', 'cortex:dataviz_response', {
          ...result,
          requestId: event.payload?.requestId,
        });
      } catch (error) {
        bus.publish('cortex', 'cortex:dataviz_error', {
          error: error instanceof Error ? error.message : 'Visualization failed',
          requestId: event.payload?.requestId,
        });
      }
    });

    console.log('📊 Data Visualization Engine initialized');
  }

  // -------------------------------------------------------------------------
  // BAR CHART
  // -------------------------------------------------------------------------

  /**
   * Generate a beautiful bar chart SVG
   */
  generateBarChart(data: DataPoint[], options: ChartOptions = {}): string {
    const {
      width = 800,
      height = 500,
      padding = { top: 60, right: 40, bottom: 60, left: 60 },
      showGrid = true,
      showLabels = true,
      showValues = true,
      animate = true,
      animationDuration = 800,
      animationStagger = 100,
      theme = 'dark',
      title,
      subtitle,
    } = options;

    const themeColors = getThemeColors(theme);
    const palette = CHART_PALETTES[theme === 'light' || theme === 'minimal' ? 'light' : 'vibrant'];

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = Math.min(60, (chartWidth / data.length) * 0.7);
    const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

    const maxValue = Math.max(...data.map((d) => d.value));
    const gridLines = 5;

    // Generate gradient definitions
    const gradients = data
      .map((_, i) => {
        const gradient = CHART_PALETTES.gradient[i % CHART_PALETTES.gradient.length];
        return generateGradient(
          `barGradient${i}`,
          gradient ? Array.from(gradient) : ['#667eea', '#764ba2']
        );
      })
      .join('\n    ');

    // Generate grid lines
    const gridLinesMarkup = showGrid
      ? Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = padding.top + (i / gridLines) * chartHeight;
          return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${themeColors.gridColor}" stroke-width="1"/>`;
        }).join('\n    ')
      : '';

    // Generate bars
    const bars = data
      .map((point, i) => {
        const barHeight = (point.value / maxValue) * chartHeight;
        const x = padding.left + barGap + i * (barWidth + barGap);
        const y = padding.top + chartHeight - barHeight;
        const color = point.color || `url(#barGradient${i})`;

        let animationMarkup = '';
        if (animate) {
          const delay = i * animationStagger;
          animationMarkup = `
          <animate attributeName="height" from="0" to="${barHeight}" dur="${animationDuration}ms" begin="${delay}ms" fill="freeze"/>
          <animate attributeName="y" from="${padding.top + chartHeight}" to="${y}" dur="${animationDuration}ms" begin="${delay}ms" fill="freeze"/>`;
        }

        const valueLabel = showValues
          ? `<text x="${x + barWidth / 2}" y="${y - 10}" fill="${themeColors.textColor}" font-size="12" text-anchor="middle" opacity="0">
              ${point.value}
              ${animate ? `<animate attributeName="opacity" from="0" to="1" dur="200ms" begin="${i * animationStagger + animationDuration}ms" fill="freeze"/>` : ''}
            </text>`
          : '';

        return `
        <rect x="${x}" y="${animate ? padding.top + chartHeight : y}" width="${barWidth}" height="${animate ? 0 : barHeight}" fill="${color}" rx="4" filter="url(#dropShadow)">${animationMarkup}
        </rect>
        ${valueLabel}`;
      })
      .join('\n    ');

    // Generate x-axis labels
    const labels = showLabels
      ? data
          .map((point, i) => {
            const x = padding.left + barGap + i * (barWidth + barGap) + barWidth / 2;
            return `<text x="${x}" y="${height - padding.bottom + 30}" fill="${themeColors.textMuted}" font-size="12" text-anchor="middle">${point.label}</text>`;
          })
          .join('\n    ')
      : '';

    // Generate y-axis labels
    const yLabels = Array.from({ length: gridLines + 1 }, (_, i) => {
      const value = Math.round((maxValue / gridLines) * (gridLines - i));
      const y = padding.top + (i / gridLines) * chartHeight;
      return `<text x="${padding.left - 15}" y="${y + 4}" fill="${themeColors.textMuted}" font-size="11" text-anchor="end">${value}</text>`;
    }).join('\n    ');

    // Title markup
    const titleMarkup = title
      ? `<text x="${width / 2}" y="30" fill="${themeColors.textColor}" font-size="20" font-weight="bold" text-anchor="middle">${title}</text>
    ${subtitle ? `<text x="${width / 2}" y="50" fill="${themeColors.textMuted}" font-size="12" text-anchor="middle">${subtitle}</text>` : ''}`
      : '';

    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradients}
    ${generateFilters()}
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${themeColors.background}" rx="20"/>
  
  <!-- Title -->
  ${titleMarkup}
  
  <!-- Grid -->
  <g class="grid">
    ${gridLinesMarkup}
  </g>
  
  <!-- Y-Axis Labels -->
  <g class="y-labels" font-family="system-ui, -apple-system, sans-serif">
    ${yLabels}
  </g>
  
  <!-- Bars -->
  <g class="bars" filter="url(#softShadow)">
    ${bars}
  </g>
  
  <!-- X-Axis Labels -->
  <g class="x-labels" font-family="system-ui, -apple-system, sans-serif">
    ${labels}
  </g>
</svg>`;
  }

  // -------------------------------------------------------------------------
  // LINE CHART
  // -------------------------------------------------------------------------

  /**
   * Generate a beautiful line chart SVG
   */
  generateLineChart(series: DataSeries[], options: ChartOptions = {}): string {
    const {
      width = 800,
      height = 500,
      padding = { top: 60, right: 40, bottom: 60, left: 60 },
      showGrid = true,
      showLabels = true,
      animate = true,
      animationDuration = 1500,
      theme = 'dark',
      title,
    } = options;

    const themeColors = getThemeColors(theme);
    const palette = CHART_PALETTES[theme === 'light' || theme === 'minimal' ? 'light' : 'vibrant'];

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate bounds
    const allValues = series.flatMap((s) => s.data.map((d) => d.value));
    const maxValue = Math.max(...allValues) * 1.1;
    const minValue = Math.min(0, ...allValues);
    const valueRange = maxValue - minValue || 1;

    const firstSeries = series[0];
    const labels = firstSeries?.data.map((d) => d.label) ?? [];
    const pointCount = Math.max(1, labels.length);

    // Generate gradient definitions for lines
    const gradients = series
      .map((s, i) => {
        const color = s.color ?? palette[i % palette.length] ?? '#667eea';
        return generateGradient(`lineGradient${i}`, [color, color], 'horizontal');
      })
      .join('\n    ');

    // Area gradients
    const areaGradients = series
      .map((s, i) => {
        const color = s.color || palette[i % palette.length];
        return `<linearGradient id="areaGradient${i}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${color};stop-opacity:0"/>
    </linearGradient>`;
      })
      .join('\n    ');

    // Grid lines
    const gridLines = 5;
    const gridMarkup = showGrid
      ? Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = padding.top + (i / gridLines) * chartHeight;
          return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${themeColors.gridColor}" stroke-width="1"/>`;
        }).join('\n    ')
      : '';

    // Generate lines and areas
    const linesMarkup = series
      .map((s, seriesIndex) => {
        const color = s.color || palette[seriesIndex % palette.length];
        const points = s.data.map((d, i) => {
          const x = padding.left + (i / (pointCount - 1)) * chartWidth;
          const y = padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
          return { x, y };
        });

        // Path for line
        const linePath = points
          .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
          .join(' ');

        // Path for area (with null safety)
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];
        const areaPath =
          lastPoint && firstPoint
            ? `${linePath} L${lastPoint.x},${padding.top + chartHeight} L${firstPoint.x},${padding.top + chartHeight} Z`
            : linePath;

        // Calculate path length for animation
        let pathLength = 0;
        for (let i = 1; i < points.length; i++) {
          const prevPoint = points[i - 1];
          const currPoint = points[i];
          if (prevPoint && currPoint) {
            const dx = currPoint.x - prevPoint.x;
            const dy = currPoint.y - prevPoint.y;
            pathLength += Math.sqrt(dx * dx + dy * dy);
          }
        }

        const animationAttrs = animate
          ? `stroke-dasharray="${pathLength}" stroke-dashoffset="${pathLength}">
          <animate attributeName="stroke-dashoffset" from="${pathLength}" to="0" dur="${animationDuration}ms" fill="freeze" calcMode="spline" keySplines="0.645 0.045 0.355 1"/>`
          : '>';

        // Data points
        const dataPoints = points
          .map((p, i) => {
            const delay = animate ? (i / points.length) * animationDuration : 0;
            return `<circle cx="${p.x}" cy="${p.y}" r="0" fill="${color}" filter="url(#glow)">
            ${animate ? `<animate attributeName="r" from="0" to="6" dur="200ms" begin="${delay}ms" fill="freeze"/>` : ''}
          </circle>`;
          })
          .join('\n      ');

        return `
      <!-- Area fill -->
      <path d="${areaPath}" fill="url(#areaGradient${seriesIndex})" opacity="${animate ? 0 : 1}">
        ${animate ? `<animate attributeName="opacity" from="0" to="1" dur="${animationDuration}ms" fill="freeze"/>` : ''}
      </path>
      
      <!-- Line -->
      <path d="${linePath}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" ${animationAttrs}
      </path>
      
      <!-- Data points -->
      ${dataPoints}`;
      })
      .join('\n    ');

    // X-axis labels
    const xLabels = showLabels
      ? labels
          .map((label, i) => {
            const x = padding.left + (i / (labels.length - 1)) * chartWidth;
            return `<text x="${x}" y="${height - padding.bottom + 30}" fill="${themeColors.textMuted}" font-size="11" text-anchor="middle">${label}</text>`;
          })
          .join('\n    ')
      : '';

    // Y-axis labels
    const yLabels = Array.from({ length: gridLines + 1 }, (_, i) => {
      const value = Math.round(maxValue - (i / gridLines) * valueRange);
      const y = padding.top + (i / gridLines) * chartHeight;
      return `<text x="${padding.left - 15}" y="${y + 4}" fill="${themeColors.textMuted}" font-size="11" text-anchor="end">${value}</text>`;
    }).join('\n    ');

    // Title
    const titleMarkup = title
      ? `<text x="${width / 2}" y="30" fill="${themeColors.textColor}" font-size="20" font-weight="bold" text-anchor="middle">${title}</text>`
      : '';

    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradients}
    ${areaGradients}
    ${generateFilters()}
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${themeColors.background}" rx="20"/>
  
  <!-- Title -->
  ${titleMarkup}
  
  <!-- Grid -->
  <g class="grid">
    ${gridMarkup}
  </g>
  
  <!-- Y-Axis Labels -->
  <g class="y-labels" font-family="system-ui, -apple-system, sans-serif">
    ${yLabels}
  </g>
  
  <!-- Lines and Areas -->
  <g class="series">
    ${linesMarkup}
  </g>
  
  <!-- X-Axis Labels -->
  <g class="x-labels" font-family="system-ui, -apple-system, sans-serif">
    ${xLabels}
  </g>
</svg>`;
  }

  // -------------------------------------------------------------------------
  // PIE / DONUT CHART
  // -------------------------------------------------------------------------

  /**
   * Generate a beautiful pie/donut chart SVG
   */
  generatePieChart(
    data: DataPoint[],
    options: ChartOptions & { donut?: boolean; donutWidth?: number } = {}
  ): string {
    const {
      width = 500,
      height = 500,
      animate = true,
      animationDuration = 1000,
      theme = 'dark',
      title,
      donut = true,
      donutWidth = 60,
      showLabels = true,
      showLegend = true,
    } = options;

    const themeColors = getThemeColors(theme);
    const palette = CHART_PALETTES[theme === 'light' || theme === 'minimal' ? 'light' : 'vibrant'];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;
    const innerRadius = donut ? radius - donutWidth : 0;

    const total = data.reduce((sum, d) => sum + d.value, 0);

    // Generate slices
    let currentAngle = -90; // Start at 12 o'clock
    const slices = data.map((point, i) => {
      const percentage = point.value / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const color = point.color || palette[i % palette.length];

      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate arc path
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      let path: string;
      if (donut) {
        const ix1 = centerX + innerRadius * Math.cos(startRad);
        const iy1 = centerY + innerRadius * Math.sin(startRad);
        const ix2 = centerX + innerRadius * Math.cos(endRad);
        const iy2 = centerY + innerRadius * Math.sin(endRad);

        path = `M${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} L${ix2},${iy2} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${ix1},${iy1} Z`;
      } else {
        path = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
      }

      // Label position
      const midAngle = (((startAngle + endAngle) / 2) * Math.PI) / 180;
      const labelRadius = donut ? (radius + innerRadius) / 2 : radius * 0.65;
      const labelX = centerX + labelRadius * Math.cos(midAngle);
      const labelY = centerY + labelRadius * Math.sin(midAngle);

      const animationDelay = i * (animationDuration / data.length);

      return {
        path,
        color,
        percentage: Math.round(percentage * 100),
        label: point.label,
        labelX,
        labelY,
        animationDelay,
      };
    });

    // Generate gradients
    const gradients = data
      .map((_, i) => {
        const gradient = CHART_PALETTES.gradient[i % CHART_PALETTES.gradient.length];
        return generateGradient(
          `pieGradient${i}`,
          gradient ? Array.from(gradient) : ['#667eea', '#764ba2']
        );
      })
      .join('\n    ');

    // Generate slice paths
    const sliceMarkup = slices
      .map((slice, i) => {
        const animationAttrs = animate
          ? `stroke-dasharray="1000" stroke-dashoffset="1000">
          <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="${animationDuration}ms" begin="${slice.animationDelay}ms" fill="freeze"/>`
          : '>';

        return `<path d="${slice.path}" fill="url(#pieGradient${i})" stroke="${themeColors.background}" stroke-width="2" filter="url(#softShadow)">
        ${animate ? `<animate attributeName="opacity" from="0" to="1" dur="200ms" begin="${slice.animationDelay}ms" fill="freeze"/>` : ''}
      </path>`;
      })
      .join('\n    ');

    // Generate labels
    const labelMarkup = showLabels
      ? slices
          .map((slice) => {
            return `<text x="${slice.labelX}" y="${slice.labelY}" fill="${themeColors.textColor}" font-size="14" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${slice.percentage}%</text>`;
          })
          .join('\n    ')
      : '';

    // Center text for donut
    const centerText = donut
      ? `<text x="${centerX}" y="${centerY - 10}" fill="${themeColors.textColor}" font-size="32" font-weight="bold" text-anchor="middle">${total}</text>
    <text x="${centerX}" y="${centerY + 20}" fill="${themeColors.textMuted}" font-size="14" text-anchor="middle">Total</text>`
      : '';

    // Legend
    const legendMarkup = showLegend
      ? data
          .map((point, i) => {
            const y = height - 40;
            const x = 40 + i * 100;
            const color = point.color || palette[i % palette.length];
            return `<g class="legend-item">
        <rect x="${x}" y="${y}" width="12" height="12" fill="${color}" rx="2"/>
        <text x="${x + 18}" y="${y + 10}" fill="${themeColors.textMuted}" font-size="11">${point.label}</text>
      </g>`;
          })
          .join('\n    ')
      : '';

    // Title
    const titleMarkup = title
      ? `<text x="${centerX}" y="30" fill="${themeColors.textColor}" font-size="20" font-weight="bold" text-anchor="middle">${title}</text>`
      : '';

    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradients}
    ${generateFilters()}
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${themeColors.background}" rx="20"/>
  
  <!-- Title -->
  ${titleMarkup}
  
  <!-- Slices -->
  <g class="slices">
    ${sliceMarkup}
  </g>
  
  <!-- Labels -->
  <g class="labels" font-family="system-ui, -apple-system, sans-serif">
    ${labelMarkup}
  </g>
  
  <!-- Center Text -->
  <g class="center" font-family="system-ui, -apple-system, sans-serif">
    ${centerText}
  </g>
  
  <!-- Legend -->
  <g class="legend" font-family="system-ui, -apple-system, sans-serif">
    ${legendMarkup}
  </g>
</svg>`;
  }

  // -------------------------------------------------------------------------
  // GAUGE / RADIAL PROGRESS
  // -------------------------------------------------------------------------

  /**
   * Generate a gauge/progress indicator SVG
   */
  generateGauge(
    value: number,
    options: ChartOptions & {
      max?: number;
      min?: number;
      label?: string;
      unit?: string;
      colorStops?: { value: number; color: string }[];
    } = {}
  ): string {
    const {
      width = 300,
      height = 200,
      animate = true,
      animationDuration = 1500,
      theme = 'dark',
      max = 100,
      min = 0,
      label = '',
      unit = '',
      colorStops = [
        { value: 0, color: '#22c55e' },
        { value: 50, color: '#eab308' },
        { value: 75, color: '#f97316' },
        { value: 90, color: '#ef4444' },
      ],
    } = options;

    const themeColors = getThemeColors(theme);

    const centerX = width / 2;
    const centerY = height - 30;
    const radius = Math.min(width / 2, height) - 40;
    const strokeWidth = 20;

    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const angle = (percentage / 100) * 180;

    // Find current color based on percentage
    const firstStop = colorStops[0];
    let currentColor = firstStop?.color ?? '#22c55e';
    for (const stop of colorStops) {
      if (percentage >= stop.value) {
        currentColor = stop.color;
      }
    }

    // Generate arc path
    const startAngle = 180;
    const endAngle = 180 + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    // Background arc (full semicircle)
    const bgX2 = centerX + radius * Math.cos(0);
    const bgY2 = centerY + radius * Math.sin(0);
    const bgPath = `M${x1},${y1} A${radius},${radius} 0 0,1 ${bgX2},${bgY2}`;

    // Value arc
    const valuePath = `M${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2}`;

    // Calculate arc length for animation
    const arcLength = (angle / 180) * Math.PI * radius;

    // Tick marks
    const ticks = Array.from({ length: 11 }, (_, i) => {
      const tickAngle = 180 + i * 18;
      const tickRad = (tickAngle * Math.PI) / 180;
      const innerR = radius - strokeWidth / 2 - 5;
      const outerR = radius - strokeWidth / 2 - 15;

      const ix = centerX + innerR * Math.cos(tickRad);
      const iy = centerY + innerR * Math.sin(tickRad);
      const ox = centerX + outerR * Math.cos(tickRad);
      const oy = centerY + outerR * Math.sin(tickRad);

      return `<line x1="${ix}" y1="${iy}" x2="${ox}" y2="${oy}" stroke="${themeColors.gridColor}" stroke-width="${i % 5 === 0 ? 2 : 1}"/>`;
    }).join('\n    ');

    // Gradient for value arc
    const gradient = `<linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      ${colorStops
        .map((stop, i) => `<stop offset="${stop.value}%" style="stop-color:${stop.color}"/>`)
        .join('\n      ')}
    </linearGradient>`;

    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradient}
    ${generateFilters()}
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${themeColors.background}" rx="16"/>
  
  <!-- Tick marks -->
  <g class="ticks">
    ${ticks}
  </g>
  
  <!-- Background arc -->
  <path d="${bgPath}" stroke="${themeColors.gridColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>
  
  <!-- Value arc -->
  <path d="${valuePath}" stroke="${currentColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" filter="url(#glow)"
    ${
      animate
        ? `stroke-dasharray="${arcLength}" stroke-dashoffset="${arcLength}">
    <animate attributeName="stroke-dashoffset" from="${arcLength}" to="0" dur="${animationDuration}ms" fill="freeze" calcMode="spline" keySplines="0.645 0.045 0.355 1"/>`
        : '>'
    }
  </path>
  
  <!-- Center value -->
  <g font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">
    <text x="${centerX}" y="${centerY - 20}" fill="${themeColors.textColor}" font-size="36" font-weight="bold">
      ${value}${unit}
      ${animate ? `<animate attributeName="opacity" from="0" to="1" dur="500ms" begin="${animationDuration - 200}ms" fill="freeze"/>` : ''}
    </text>
    ${label ? `<text x="${centerX}" y="${centerY + 5}" fill="${themeColors.textMuted}" font-size="14">${label}</text>` : ''}
  </g>
  
  <!-- Min/Max labels -->
  <text x="${centerX - radius + 10}" y="${centerY + 20}" fill="${themeColors.textMuted}" font-size="11" text-anchor="middle">${min}</text>
  <text x="${centerX + radius - 10}" y="${centerY + 20}" fill="${themeColors.textMuted}" font-size="11" text-anchor="middle">${max}</text>
</svg>`;
  }

  // -------------------------------------------------------------------------
  // SPARKLINE
  // -------------------------------------------------------------------------

  /**
   * Generate a compact sparkline SVG
   */
  generateSparkline(
    values: number[],
    options: {
      width?: number;
      height?: number;
      color?: string;
      showDots?: boolean;
      fill?: boolean;
    } = {}
  ): string {
    const { width = 120, height = 40, color = '#6366f1', showDots = false, fill = true } = options;

    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = padding + (i / (values.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((v - min) / range) * chartHeight;
      return { x, y };
    });

    const linePath = points
      .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
      .join(' ');

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const areaPath =
      fill && lastPoint && firstPoint
        ? `${linePath} L${lastPoint.x},${height - padding} L${firstPoint.x},${height - padding} Z`
        : '';

    const dotsMarkup = showDots
      ? points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="2" fill="${color}"/>`).join('\n  ')
      : '';

    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sparkFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${color};stop-opacity:0"/>
    </linearGradient>
  </defs>
  ${fill ? `<path d="${areaPath}" fill="url(#sparkFill)"/>` : ''}
  <path d="${linePath}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${dotsMarkup}
</svg>`;
  }

  // -------------------------------------------------------------------------
  // EVENT HANDLING
  // -------------------------------------------------------------------------

  private async handleVizRequest(payload: unknown): Promise<{
    success: boolean;
    svg?: string;
    type?: string;
  }> {
    if (!payload || typeof payload !== 'object') {
      return { success: false };
    }

    const request = payload as {
      type: 'bar' | 'line' | 'pie' | 'gauge' | 'sparkline';
      data?: DataPoint[] | DataSeries[] | number[];
      value?: number;
      options?: ChartOptions;
    };

    try {
      switch (request.type) {
        case 'bar':
          return {
            success: true,
            svg: this.generateBarChart(request.data as DataPoint[], request.options),
            type: 'bar',
          };

        case 'line':
          return {
            success: true,
            svg: this.generateLineChart(request.data as DataSeries[], request.options),
            type: 'line',
          };

        case 'pie':
          return {
            success: true,
            svg: this.generatePieChart(request.data as DataPoint[], request.options),
            type: 'pie',
          };

        case 'gauge':
          return {
            success: true,
            svg: this.generateGauge(request.value || 0, request.options),
            type: 'gauge',
          };

        case 'sparkline':
          return {
            success: true,
            svg: this.generateSparkline(request.data as number[], request.options),
            type: 'sparkline',
          };

        default:
          return { success: false };
      }
    } catch (error) {
      console.error('Data viz generation error:', error);
      return { success: false };
    }
  }
}

// Export singleton instance
export const dataVizEngine = DataVizEngine.getInstance();

export default dataVizEngine;
