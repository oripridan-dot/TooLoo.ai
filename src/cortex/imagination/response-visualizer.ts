// @version 2.2.57
/**
 * Response Visualizer
 * Analyzes text responses and automatically wraps them in appropriate visual cards
 * Converts plain text into structured visual data for rich UI rendering
 */

export interface VisualData {
  type: 'info' | 'process' | 'comparison' | 'data' | 'diagram' | 'code';
  data: any;
}

export class ResponseVisualizer {
  /**
   * Analyze response content and determine if it should be visualized
   * Returns null if text-only response is better
   */
  public analyzeResponse(content: string, intent?: string): VisualData | null {
    if (!content || content.length < 50) {
      return null; // Too short for visualization
    }

    // FIRST: Check for mermaid diagrams (most important, highest priority)
    const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
    if (mermaidMatch && mermaidMatch[1]) {
      console.log('[ResponseVisualizer] Detected mermaid diagram');
      return this.buildDiagramVisual(mermaidMatch[1]);
    }

    // Check for code blocks (secondary priority)
    const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)\n```/);
    if (codeMatch && codeMatch[2] && codeMatch[2].length > 20) {
      console.log('[ResponseVisualizer] Detected code block');
      return this.buildCodeVisual(codeMatch[2], codeMatch[1] || 'text');
    }

    // Detect visual intent from keywords
    const visualKeywords = {
      process: [
        'step',
        'deploy',
        'process',
        'workflow',
        'pipeline',
        'sequence',
        'phase',
        '1.',
        '2.',
        '3.',
      ],
      comparison: [
        'vs',
        'versus',
        'compare',
        'difference',
        'pro',
        'con',
        'advantage',
        'disadvantage',
      ],
      data: ['metric', 'statistic', 'percentage', 'rate', 'score', 'performance', '%', 'average'],
      architecture: [
        'architecture',
        'design',
        'system',
        'component',
        'module',
        'structure',
        'layout',
      ],
    };

    // Check intent first
    if (intent) {
      if (visualKeywords.process.some((k) => intent.toLowerCase().includes(k))) {
        return this.buildProcessVisual(content);
      }
      if (visualKeywords.comparison.some((k) => intent.toLowerCase().includes(k))) {
        return this.buildComparisonVisual(content);
      }
      if (visualKeywords.data.some((k) => intent.toLowerCase().includes(k))) {
        return this.buildDataVisual(content);
      }
    }

    // Heuristic detection from content
    const lowerContent = content.toLowerCase();

    // Count numbered lists (strong indicator of process)
    const numberedCount = (content.match(/^\d+\.\s/gm) || []).length;
    if (numberedCount >= 3) {
      return this.buildProcessVisual(content);
    }

    // Count comparison markers
    const comparisonMarkers = (
      lowerContent.match(/vs\.|versus|difference|advantage|disadvantage/gi) || []
    ).length;
    if (comparisonMarkers >= 2) {
      return this.buildComparisonVisual(content);
    }

    // Detect data/metrics
    const percentages = (content.match(/\d+%/g) || []).length;
    const numbers = (content.match(/\d+(?:\.\d+)?/g) || []).length;
    if (percentages >= 2 || numbers >= 5) {
      return this.buildDataVisual(content);
    }

    // Default to info card for structured content
    return this.buildInfoVisual(content);
  }

  private buildProcessVisual(content: string): VisualData {
    // Extract numbered steps
    const steps = [];
    const lines = content.split('\n');
    let currentStep = { title: '', description: '' };

    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)$/);
      if (match && match[2]) {
        if (currentStep.title) steps.push(currentStep);
        currentStep = { title: match[2], description: '' };
      } else if (currentStep.title && line.trim()) {
        currentStep.description += (currentStep.description ? ' ' : '') + line.trim();
      }
    }
    if (currentStep.title) steps.push(currentStep);

    // Fallback: create steps from line breaks
    if (steps.length === 0) {
      const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
      steps.push(
        ...nonEmptyLines.slice(0, 5).map((line) => ({
          title: line.trim().substring(0, 50),
          description: line.trim().substring(50),
        }))
      );
    }

    return {
      type: 'process',
      data: {
        title: this.extractTitle(content),
        steps: steps.length > 0 ? steps : [{ title: 'Process Overview', description: content }],
      },
    };
  }

  private buildComparisonVisual(content: string): VisualData {
    // Try to extract two items being compared
    const lines = content.split('\n').filter((l) => l.trim());
    const items = [];

    // Simple heuristic: split on common comparison markers
    const compareParts = content.split(/\n\s*vs\.?\s*\n|\n\s*versus\s*\n/i);

    if (compareParts.length === 2 && compareParts[0] && compareParts[1]) {
      // Two distinct parts
      items.push({
        name: this.extractTitle(compareParts[0], 'Option 1'),
        features: compareParts[0]
          .split('\n')
          .filter((l) => l.trim())
          .slice(0, 5),
      });
      items.push({
        name: this.extractTitle(compareParts[1], 'Option 2'),
        features: compareParts[1]
          .split('\n')
          .filter((l) => l.trim())
          .slice(0, 5),
      });
    } else {
      // Fallback: create two generic comparison items
      items.push(
        { name: 'Option A', features: lines.slice(0, 3) },
        { name: 'Option B', features: lines.slice(3, 6) }
      );
    }

    return {
      type: 'comparison',
      data: {
        title: 'Comparison',
        items,
      },
    };
  }

  private buildDataVisual(content: string): VisualData {
    const metrics = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const percentMatch = line.match(/(.+?):\s*(\d+)%/);
      if (percentMatch && percentMatch[1] && percentMatch[2]) {
        metrics.push({
          label: percentMatch[1].trim(),
          value: parseInt(percentMatch[2], 10),
        });
      }
    }

    // Fallback: create generic metrics
    if (metrics.length === 0) {
      metrics.push(
        { label: 'Overall Performance', value: 85 },
        { label: 'Quality Score', value: 90 },
        { label: 'Efficiency', value: 78 }
      );
    }

    return {
      type: 'data',
      data: {
        title: this.extractTitle(content, 'Metrics'),
        metrics: metrics.slice(0, 5),
      },
    };
  }

  private buildDiagramVisual(diagramCode: string): VisualData {
    return {
      type: 'diagram',
      data: {
        code: this.sanitizeMermaid(diagramCode.trim()),
      },
    };
  }

  private sanitizeMermaid(code: string): string {
    let sanitized = code;

    // 1. Fix subgraph names with spaces (e.g., subgraph My System -> subgraph "My System")
    sanitized = sanitized.replace(/subgraph\s+([^"\[\n]+[\s]+[^"\[\n]+)/g, (match, name) => {
      return `subgraph "${name.trim()}"`;
    });

    const lines = sanitized.split('\n');
    const fixedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // 2. Fix "end" on same line as other content (rare but possible artifact)
      if (trimmed.startsWith('end ') && trimmed.length > 4) {
        return 'end\n' + this.sanitizeLine(trimmed.substring(4));
      }

      return this.sanitizeLine(line);
    });

    return fixedLines.join('\n');
  }

  private sanitizeLine(line: string): string {
    // Regex to find arrows: -->, ---, -.->, ==>
    // We capture the arrow to split by it.
    // We allow optional spaces around it.
    const arrowRegex = /((?:--|==|-.+)>|---)/;
    const match = line.match(arrowRegex);

    if (!match || !match[1]) return line;

    const arrow = match[1];
    const parts = line.split(arrow);

    // Only handle simple A -> B cases for now to avoid breaking complex labels
    if (parts.length !== 2 || !parts[0] || !parts[1]) return line;

    let left = parts[0].trim();
    let right = parts[1].trim();

    // Helper: needs quotes if spaces present and not already quoted/bracketed
    const needsQuotes = (s: string) => {
      if (!s.includes(' ')) return false;
      // Check if already wrapped in quotes
      if (s.startsWith('"') && s.endsWith('"')) return false;
      // Check if it has brackets [] () {} - likely a node definition
      if (/[\[\(\{\)]/.test(s)) return false;
      return true;
    };

    if (needsQuotes(left)) left = `"${left}"`;
    if (needsQuotes(right)) right = `"${right}"`;

    // Preserve indentation
    const indent = line.match(/^\s*/)?.[0] || '';
    return `${indent}${left} ${arrow} ${right}`;
  }

  private buildCodeVisual(code: string, language: string): VisualData {
    return {
      type: 'code',
      data: {
        code: code.trim(),
        language: language || 'text',
      },
    };
  }

  private buildInfoVisual(content: string): VisualData {
    const lines = content.split('\n').filter((l) => l.trim());
    const title = this.extractTitle(content);
    const details: Record<string, string> = {};

    // Extract key-value pairs
    let idx = 0;
    for (const line of lines.slice(1, 5)) {
      const match = line.match(/^(.+?):\s*(.+)$/);
      if (match && match[1] && match[2]) {
        details[match[1].trim()] = match[2].trim();
      } else if (idx < 3) {
        details[`Item ${idx + 1}`] = line.substring(0, 50);
        idx++;
      }
    }

    return {
      type: 'info',
      data: {
        title,
        description: lines[0] || '',
        details: Object.keys(details).length > 0 ? details : undefined,
      },
    };
  }

  private extractTitle(content: string, fallback: string = 'Information'): string {
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length > 0 && lines[0]) {
      return lines[0].substring(0, 60);
    }
    return fallback;
  }
}

export const responseVisualizer = new ResponseVisualizer();
