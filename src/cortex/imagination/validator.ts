import { VisualData } from '../../core/event-bus.js';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  issues: string[];
  suggestion?: string;
}

export class VisualValidator {
  /**
   * Validates a visual artifact before it is shown to the user.
   */
  public async validate(visual: VisualData): Promise<ValidationResult> {
    switch (visual.type) {
      case 'diagram':
        return this.validateDiagram(visual.data);
      case 'component':
        return this.validateComponent(visual.data);
      case 'image':
        return this.validateImage(visual.data);
      default:
        return { isValid: true, score: 1, issues: [] };
    }
  }

  private validateDiagram(mermaidCode: string): ValidationResult {
    const issues: string[] = [];

    // Basic Mermaid Syntax Checks
    if (!mermaidCode.trim()) {
      return { isValid: false, score: 0, issues: ['Empty diagram code'] };
    }

    const validStarts = [
      'graph',
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'erDiagram',
      'gantt',
      'pie',
    ];
    const startsWithValid = validStarts.some((start) => mermaidCode.trim().startsWith(start));

    if (!startsWithValid) {
      issues.push('Diagram does not start with a valid Mermaid keyword (graph, flowchart, etc.)');
    }

    // Check for common syntax errors
    if (
      mermaidCode.includes('-->') &&
      !mermaidCode.includes('graph') &&
      !mermaidCode.includes('flowchart')
    ) {
      // Sequence diagrams use ->> or ->, not --> usually, but this is a loose check
    }

    return {
      isValid: issues.length === 0,
      score: issues.length === 0 ? 1 : 0.5,
      issues,
      suggestion:
        issues.length > 0 ? "Ensure the diagram starts with 'graph TD' or similar." : undefined,
    };
  }

  private validateComponent(componentJson: string): ValidationResult {
    const issues: string[] = [];
    try {
      const component = JSON.parse(componentJson);

      if (!component.type) issues.push("Missing 'type' field");
      if (!component.props) issues.push("Missing 'props' field");

      // Check for dangerous props
      if (JSON.stringify(component.props).includes('dangerouslySetInnerHTML')) {
        issues.push('Component uses dangerouslySetInnerHTML which is flagged for review.');
      }
    } catch (e) {
      issues.push('Invalid JSON format for component definition');
    }

    return {
      isValid: issues.length === 0,
      score: issues.length === 0 ? 1 : 0,
      issues,
    };
  }

  private validateImage(base64Data: string): ValidationResult {
    // In a real implementation, we would check image dimensions or use a vision model
    // For now, just check if it's a valid base64 string
    if (!base64Data || base64Data.length < 100) {
      return {
        isValid: false,
        score: 0,
        issues: ['Image data is too small or empty'],
      };
    }
    return { isValid: true, score: 1, issues: [] };
  }
}

export const visualValidator = new VisualValidator();
