// @version 2.1.0
/**
 * Visual Context Analyzer
 * Extracts design tokens, UI patterns, and requirements from context
 * Enables visual providers (Nano Banana, DALL-E) to make intelligent code generation decisions
 */

import {
  VisualContext,
  VisualContextAnalysis,
} from "../../precog/providers/types.js";

export interface PatternMatch {
  pattern: string;
  confidence: number;
  suggestions: string[];
}

export interface TokenExtraction {
  category: string;
  tokens: Record<string, unknown>;
  coverage: number; // Percentage of standard tokens covered
}

export default class VisualContextAnalyzer {
  private static instance: VisualContextAnalyzer;
  private commonPatterns = [
    "card",
    "grid",
    "sidebar",
    "modal",
    "navbar",
    "footer",
    "hero",
    "form",
    "table",
    "list",
    "breadcrumb",
    "dropdown",
    "tooltip",
    "popover",
    "accordion",
    "tabs",
    "stepper",
    "carousel",
    "pagination",
    "badge",
    "alert",
    "notification",
  ];

  private commonColorTokens = [
    "primary",
    "secondary",
    "tertiary",
    "success",
    "warning",
    "error",
    "info",
    "neutral",
    "background",
    "surface",
    "text",
  ];

  private commonSpacingTokens = ["xs", "sm", "md", "lg", "xl", "2xl"];

  private constructor() {}

  static getInstance(): VisualContextAnalyzer {
    if (!VisualContextAnalyzer.instance) {
      VisualContextAnalyzer.instance = new VisualContextAnalyzer();
    }
    return VisualContextAnalyzer.instance;
  }

  /**
   * Analyze visual context comprehensively
   */
  analyze(context: VisualContext): VisualContextAnalysis {
    const analysis: VisualContextAnalysis = {
      extractedTokens: this.extractTokens(context),
      identifiedPatterns: this.identifyPatterns(context),
      requirements: this.extractRequirements(context),
      recommendations: this.generateRecommendations(context),
      codeGenStrategy: this.determineCodeGenStrategy(context),
    };

    return analysis;
  }

  /**
   * Extract and normalize design tokens
   */
  private extractTokens(context: VisualContext): Record<string, unknown> {
    const extracted: Record<string, unknown> = {};

    // Extract color tokens
    if (context.designTokens?.colors) {
      extracted.colors = this.normalizeColorTokens(context.designTokens.colors);
    }

    // Extract typography tokens
    if (context.designTokens?.typography) {
      extracted.typography = this.normalizeTypographyTokens(
        context.designTokens.typography,
      );
    }

    // Extract spacing tokens
    if (context.designTokens?.spacing) {
      extracted.spacing = this.normalizeSpacingTokens(
        context.designTokens.spacing,
      );
    }

    // Extract border radius tokens
    if (context.designTokens?.borderRadius) {
      extracted.borderRadius = context.designTokens.borderRadius;
    }

    // Extract brand guidelines
    if (context.brandGuidelines) {
      extracted.brand = {
        primaryColor: context.brandGuidelines.primaryColor,
        fontFamily: context.brandGuidelines.fontFamily,
        tone: context.brandGuidelines.tone,
      };
    }

    return extracted;
  }

  /**
   * Normalize and validate color tokens
   */
  private normalizeColorTokens(
    colors: Record<string, string>,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(colors)) {
      // Validate hex, rgb, hsl formats
      if (this.isValidColor(value)) {
        normalized[key.toLowerCase().replace(/\s+/g, "-")] = value;
      }
    }

    return normalized;
  }

  /**
   * Check if a string is a valid color
   */
  private isValidColor(value: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbRegex = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/;
    const rgbaRegex = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;
    const hslRegex = /^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/;
    const namedColors =
      /^(red|blue|green|white|black|gray|yellow|orange|purple|pink)$/i;

    return (
      hexRegex.test(value) ||
      rgbRegex.test(value) ||
      rgbaRegex.test(value) ||
      hslRegex.test(value) ||
      namedColors.test(value)
    );
  }

  /**
   * Normalize typography tokens
   */
  private normalizeTypographyTokens(
    typography: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(typography)) {
      normalized[key.toLowerCase().replace(/\s+/g, "-")] = value;
    }

    return normalized;
  }

  /**
   * Normalize spacing tokens
   */
  private normalizeSpacingTokens(
    spacing: Record<string, string>,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(spacing)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, "-");
      // Support both raw values (4px) and token names (sm, md)
      normalized[normalizedKey] = value;
    }

    return normalized;
  }

  /**
   * Identify UI patterns in context
   */
  private identifyPatterns(context: VisualContext): string[] {
    const patterns = new Set<string>();

    // Add explicit patterns
    if (context.uiPatterns) {
      context.uiPatterns.forEach((p) => patterns.add(p));
    }

    // Infer patterns from component requirements
    if (context.componentRequirements) {
      for (const comp of context.componentRequirements) {
        const inferred = this.inferPatternsFromComponent(
          comp.name,
          comp.purpose,
        );
        inferred.forEach((p) => patterns.add(p));
      }
    }

    // Detect patterns from custom instructions
    if (context.customInstructions) {
      const detected = this.detectPatternsInText(context.customInstructions);
      detected.forEach((p) => patterns.add(p));
    }

    return Array.from(patterns);
  }

  /**
   * Infer patterns from component name/purpose
   */
  private inferPatternsFromComponent(name: string, purpose: string): string[] {
    const patterns: string[] = [];
    const combined = `${name} ${purpose}`.toLowerCase();

    for (const pattern of this.commonPatterns) {
      if (combined.includes(pattern)) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Detect patterns mentioned in text
   */
  private detectPatternsInText(text: string): string[] {
    const patterns: string[] = [];
    const lowerText = text.toLowerCase();

    for (const pattern of this.commonPatterns) {
      if (lowerText.includes(pattern)) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Extract functional and design requirements
   */
  private extractRequirements(context: VisualContext): string[] {
    const requirements: string[] = [];

    // From component requirements
    if (context.componentRequirements) {
      for (const comp of context.componentRequirements) {
        requirements.push(`Component: ${comp.name} - ${comp.purpose}`);
        if (comp.props) {
          const propsList = Object.keys(comp.props).join(", ");
          requirements.push(`  Props: ${propsList}`);
        }
      }
    }

    // From design tokens
    if (context.designTokens) {
      requirements.push(
        `Design tokens: colors, typography, spacing, border-radius`,
      );
    }

    // From brand guidelines
    if (context.brandGuidelines) {
      requirements.push(`Follow brand guidelines and visual identity`);
    }

    // From custom instructions
    if (context.customInstructions) {
      requirements.push(context.customInstructions);
    }

    return requirements;
  }

  /**
   * Generate code generation recommendations
   */
  private generateRecommendations(context: VisualContext): string[] {
    const recommendations: string[] = [];

    // Token-based recommendations
    if (context.designTokens?.colors) {
      recommendations.push(
        "Use color tokens for consistency across components",
      );
    }
    if (context.designTokens?.typography) {
      recommendations.push("Apply typography scales for text hierarchy");
    }
    if (context.designTokens?.spacing) {
      recommendations.push("Use spacing scale for consistent layout");
    }

    // Pattern-based recommendations
    const patterns = this.identifyPatterns(context);
    if (patterns.length > 0) {
      recommendations.push(
        `Follow ${patterns.slice(0, 3).join(", ")} patterns in design`,
      );
    }

    // Accessibility recommendations
    recommendations.push("Ensure semantic HTML and WCAG 2.1 AA accessibility");

    // Performance recommendations
    if (
      context.componentRequirements &&
      context.componentRequirements.length > 3
    ) {
      recommendations.push("Optimize for component reusability");
    }

    // Brand recommendations
    if (context.brandGuidelines) {
      recommendations.push(
        `Maintain ${context.brandGuidelines.tone || "professional"} tone in UI`,
      );
    }

    return recommendations;
  }

  /**
   * Determine the most appropriate code generation strategy
   */
  private determineCodeGenStrategy(
    context: VisualContext,
  ): "component" | "layout" | "system" | "utility" {
    // System strategy: full design system
    if (context.designTokens && Object.keys(context.designTokens).length >= 3) {
      if (
        context.componentRequirements &&
        context.componentRequirements.length >= 5
      ) {
        return "system";
      }
    }

    // Layout strategy: complex multi-component layout
    if (context.uiPatterns && context.uiPatterns.length > 2) {
      if (
        context.componentRequirements &&
        context.componentRequirements.length >= 3
      ) {
        return "layout";
      }
    }

    // Utility strategy: reusable utility classes
    if (
      context.customInstructions?.toLowerCase().includes("utility") ||
      context.customInstructions?.toLowerCase().includes("tailwind")
    ) {
      return "utility";
    }

    // Component strategy: single or few components
    return "component";
  }

  /**
   * Generate a comprehensive analysis report
   */
  generateReport(analysis: VisualContextAnalysis): string {
    let report = "# Visual Context Analysis Report\n\n";

    report += "## Extracted Design Tokens\n";
    report += `\`\`\`json\n${JSON.stringify(analysis.extractedTokens, null, 2)}\n\`\`\`\n\n`;

    report += "## Identified UI Patterns\n";
    report +=
      analysis.identifiedPatterns.map((p) => `- ${p}`).join("\n") + "\n\n";

    report += "## Requirements\n";
    report += analysis.requirements.map((r) => `- ${r}`).join("\n") + "\n\n";

    report += "## Code Generation Strategy\n";
    report += `**${analysis.codeGenStrategy.toUpperCase()}** strategy selected\n\n`;

    report += "## Recommendations\n";
    report += analysis.recommendations.map((r) => `- ${r}`).join("\n") + "\n";

    return report;
  }
}
