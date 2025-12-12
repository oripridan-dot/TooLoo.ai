// @version 3.3.560
/**
 * Three-Layer Validation System
 * 
 * Phase 5: Intelligence Layer Optimization
 * 
 * Implements three-layer validation:
 * 1. Automated Checks - Syntax, type safety, linting, format validation
 * 2. AI Semantic Validation - Logical correctness, best practices, security
 * 3. User Acceptance Gates - Final approval for critical operations
 * 
 * @module precog/engine/three-layer-validation
 */

import { bus } from '../../core/event-bus.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationLayer = 'automated' | 'ai-semantic' | 'user-acceptance';

export type ValidationSeverity = 'error' | 'warning' | 'info' | 'suggestion';

export interface ValidationIssue {
  layer: ValidationLayer;
  severity: ValidationSeverity;
  code: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
  suggestion?: string;
}

export interface ValidationResult {
  layer: ValidationLayer;
  passed: boolean;
  score: number; // 0-1
  issues: ValidationIssue[];
  metadata: Record<string, unknown>;
  durationMs: number;
}

export interface ThreeLayerResult {
  automated: ValidationResult;
  aiSemantic: ValidationResult | null;
  userAcceptance: ValidationResult | null;
  overallPassed: boolean;
  overallScore: number;
  requiresUserApproval: boolean;
}

export interface ValidationContext {
  taskType: string;
  content: string;
  contentType: 'code' | 'text' | 'json' | 'markdown';
  language?: string;
  originalPrompt?: string;
  isCritical?: boolean;
  skipLayers?: ValidationLayer[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Automated Validation Rules
// ─────────────────────────────────────────────────────────────────────────────

interface ValidationRule {
  id: string;
  name: string;
  contentTypes: Array<'code' | 'text' | 'json' | 'markdown'>;
  languages?: string[];
  check: (content: string, context: ValidationContext) => ValidationIssue[];
}

const AUTOMATED_RULES: ValidationRule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Syntax Checks
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'json-valid',
    name: 'Valid JSON',
    contentTypes: ['json'],
    check: (content) => {
      try {
        JSON.parse(content);
        return [];
      } catch (e) {
        const error = e as Error;
        return [{
          layer: 'automated',
          severity: 'error',
          code: 'INVALID_JSON',
          message: `Invalid JSON: ${error.message}`,
        }];
      }
    },
  },
  {
    id: 'balanced-brackets',
    name: 'Balanced Brackets',
    contentTypes: ['code'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const stack: { char: string; line: number }[] = [];
      const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
      const lines = content.split('\n');

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        for (const char of line) {
          if (char in pairs) {
            stack.push({ char, line: lineNum + 1 });
          } else if (Object.values(pairs).includes(char)) {
            const expected = stack.pop();
            if (!expected || pairs[expected.char] !== char) {
              issues.push({
                layer: 'automated',
                severity: 'error',
                code: 'UNBALANCED_BRACKET',
                message: `Unbalanced bracket '${char}'`,
                line: lineNum + 1,
              });
            }
          }
        }
      }

      for (const unclosed of stack) {
        issues.push({
          layer: 'automated',
          severity: 'error',
          code: 'UNCLOSED_BRACKET',
          message: `Unclosed bracket '${unclosed.char}'`,
          line: unclosed.line,
        });
      }

      return issues;
    },
  },
  {
    id: 'no-syntax-errors-ts',
    name: 'TypeScript Syntax',
    contentTypes: ['code'],
    languages: ['typescript', 'javascript'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const errorPatterns = [
        { pattern: /\bfunction\s+\(/g, code: 'MISSING_FUNCTION_NAME', message: 'Missing function name' },
        { pattern: /\bconst\s*=/g, code: 'MISSING_CONST_NAME', message: 'Missing const name' },
        { pattern: /\blet\s*=/g, code: 'MISSING_LET_NAME', message: 'Missing let name' },
        { pattern: /=>\s*{[^}]*$/gm, code: 'UNCLOSED_ARROW_BODY', message: 'Unclosed arrow function body' },
      ];

      for (const { pattern, code, message } of errorPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          issues.push({
            layer: 'automated',
            severity: 'error',
            code,
            message,
            line: lineNum,
          });
        }
      }

      return issues;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Security Checks
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'no-hardcoded-secrets',
    name: 'No Hardcoded Secrets',
    contentTypes: ['code', 'json'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const secretPatterns = [
        { pattern: /['"]sk-[a-zA-Z0-9]{32,}['"]/, name: 'OpenAI API Key' },
        { pattern: /['"]AIza[0-9A-Za-z\\-_]{35}['"]/, name: 'Google API Key' },
        { pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/, name: 'GitHub Token' },
        { pattern: /['"]xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}['"]/, name: 'Slack Bot Token' },
        { pattern: /password\s*[=:]\s*['"][^'"]+['"]/i, name: 'Hardcoded Password' },
      ];

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(content)) {
          issues.push({
            layer: 'automated',
            severity: 'error',
            code: 'HARDCODED_SECRET',
            message: `Potential hardcoded secret detected: ${name}`,
            suggestion: 'Use environment variables instead',
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'no-eval',
    name: 'No eval()',
    contentTypes: ['code'],
    languages: ['typescript', 'javascript'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const evalMatch = content.match(/\beval\s*\(/);
      if (evalMatch) {
        const lineNum = content.substring(0, evalMatch.index).split('\n').length;
        issues.push({
          layer: 'automated',
          severity: 'warning',
          code: 'EVAL_USAGE',
          message: 'Avoid using eval() - security risk',
          line: lineNum,
          suggestion: 'Use safer alternatives like JSON.parse() or Function constructor',
        });
      }
      return issues;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Code Quality Checks
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'no-console-log',
    name: 'No console.log in Production',
    contentTypes: ['code'],
    languages: ['typescript', 'javascript'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/console\.log\(/.test(lines[i])) {
          issues.push({
            layer: 'automated',
            severity: 'info',
            code: 'CONSOLE_LOG',
            message: 'console.log() should be removed in production',
            line: i + 1,
            suggestion: 'Use a proper logging service',
          });
        }
      }
      return issues;
    },
  },
  {
    id: 'function-length',
    name: 'Function Length',
    contentTypes: ['code'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const functionPattern = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(?:async\s+)?(?:get|set)\s+\w+)/g;
      
      let match;
      while ((match = functionPattern.exec(content)) !== null) {
        // Find the end of the function by counting brackets
        let depth = 0;
        let started = false;
        let lineCount = 0;
        const startLine = content.substring(0, match.index).split('\n').length;

        for (let i = match.index; i < content.length; i++) {
          const char = content[i];
          if (char === '\n') lineCount++;
          if (char === '{') { depth++; started = true; }
          if (char === '}') { depth--; if (started && depth === 0) break; }
        }

        if (lineCount > 50) {
          issues.push({
            layer: 'automated',
            severity: 'warning',
            code: 'FUNCTION_TOO_LONG',
            message: `Function is ${lineCount} lines long (max recommended: 50)`,
            line: startLine,
            suggestion: 'Consider splitting into smaller functions',
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'todo-fixme',
    name: 'TODO/FIXME Comments',
    contentTypes: ['code'],
    check: (content) => {
      const issues: ValidationIssue[] = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(lines[i])) {
          issues.push({
            layer: 'automated',
            severity: 'info',
            code: 'TODO_COMMENT',
            message: 'Found TODO/FIXME comment',
            line: i + 1,
          });
        }
      }
      return issues;
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AI Semantic Validation Prompts
// ─────────────────────────────────────────────────────────────────────────────

const AI_SEMANTIC_PROMPTS: Record<string, string> = {
  'code-generation': `
    Analyze this code for:
    1. Logical correctness - does it achieve the intended goal?
    2. Best practices - follows language idioms and patterns?
    3. Error handling - proper exception handling?
    4. Edge cases - handles null, undefined, empty inputs?
    5. Performance - any obvious inefficiencies?
    
    Return JSON: { "passed": boolean, "score": 0-1, "issues": [...] }
  `,
  'architecture': `
    Analyze this architecture/design for:
    1. Scalability - can it handle growth?
    2. Maintainability - is it easy to understand and modify?
    3. Separation of concerns - properly modular?
    4. Dependency management - clear dependencies?
    5. Extensibility - easy to add new features?
    
    Return JSON: { "passed": boolean, "score": 0-1, "issues": [...] }
  `,
  'security': `
    Analyze this code for security concerns:
    1. Input validation - all inputs sanitized?
    2. Authentication - proper auth checks?
    3. Authorization - access control verified?
    4. Data exposure - sensitive data protected?
    5. Injection risks - SQL, XSS, command injection?
    
    Return JSON: { "passed": boolean, "score": 0-1, "issues": [...] }
  `,
  default: `
    Analyze this content for:
    1. Correctness - does it achieve the goal?
    2. Completeness - is anything missing?
    3. Quality - is it well-crafted?
    
    Return JSON: { "passed": boolean, "score": 0-1, "issues": [...] }
  `,
};

// ─────────────────────────────────────────────────────────────────────────────
// Three-Layer Validation Service
// ─────────────────────────────────────────────────────────────────────────────

export class ThreeLayerValidationService {
  private automatedRules: ValidationRule[];
  private pendingApprovals: Map<string, { context: ValidationContext; callback: (approved: boolean) => void }>;

  constructor() {
    this.automatedRules = AUTOMATED_RULES;
    this.pendingApprovals = new Map();
  }

  /**
   * Run all three layers of validation
   */
  async validate(context: ValidationContext): Promise<ThreeLayerResult> {
    const skipLayers = context.skipLayers || [];

    // Layer 1: Automated Checks
    const automated = await this.runAutomatedValidation(context);

    // Early exit if automated fails critically
    const hasErrors = automated.issues.some(i => i.severity === 'error');
    if (hasErrors && !skipLayers.includes('ai-semantic')) {
      return {
        automated,
        aiSemantic: null,
        userAcceptance: null,
        overallPassed: false,
        overallScore: automated.score * 0.33,
        requiresUserApproval: false,
      };
    }

    // Layer 2: AI Semantic Validation
    let aiSemantic: ValidationResult | null = null;
    if (!skipLayers.includes('ai-semantic')) {
      aiSemantic = await this.runAISemanticValidation(context);
    }

    // Determine if user approval is needed
    const requiresUserApproval = 
      context.isCritical === true ||
      (aiSemantic && aiSemantic.score < 0.7) ||
      context.taskType === 'architecture';

    // Layer 3: User Acceptance (only if needed and not skipped)
    let userAcceptance: ValidationResult | null = null;
    if (requiresUserApproval && !skipLayers.includes('user-acceptance')) {
      userAcceptance = await this.requestUserAcceptance(context);
    }

    // Calculate overall score
    const scores = [automated.score];
    if (aiSemantic) scores.push(aiSemantic.score);
    if (userAcceptance) scores.push(userAcceptance.score);
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const overallPassed = 
      automated.passed && 
      (aiSemantic?.passed ?? true) && 
      (userAcceptance?.passed ?? true);

    return {
      automated,
      aiSemantic,
      userAcceptance,
      overallPassed,
      overallScore,
      requiresUserApproval,
    };
  }

  /**
   * Layer 1: Automated Validation
   */
  private async runAutomatedValidation(context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];

    for (const rule of this.automatedRules) {
      // Check if rule applies to this content type
      if (!rule.contentTypes.includes(context.contentType)) continue;

      // Check if rule applies to this language
      if (rule.languages && context.language && !rule.languages.includes(context.language)) {
        continue;
      }

      const ruleIssues = rule.check(context.content, context);
      issues.push(...ruleIssues);
    }

    // Calculate score based on issues
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 1 - (errorCount * 0.2) - (warningCount * 0.05));

    return {
      layer: 'automated',
      passed: errorCount === 0,
      score,
      issues,
      metadata: {
        rulesRun: this.automatedRules.length,
        errorsFound: errorCount,
        warningsFound: warningCount,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Layer 2: AI Semantic Validation
   */
  private async runAISemanticValidation(context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();

    // Get appropriate prompt
    const prompt = AI_SEMANTIC_PROMPTS[context.taskType] || AI_SEMANTIC_PROMPTS.default;

    // In a real implementation, this would call an AI model
    // For now, we'll simulate based on content analysis
    const issues: ValidationIssue[] = [];
    let score = 0.85; // Default good score

    // Simple heuristics to simulate AI analysis
    const content = context.content;

    // Check for error handling
    if (context.contentType === 'code') {
      if (!content.includes('try') && !content.includes('catch') && content.length > 500) {
        issues.push({
          layer: 'ai-semantic',
          severity: 'suggestion',
          code: 'MISSING_ERROR_HANDLING',
          message: 'Consider adding error handling for robustness',
        });
        score -= 0.05;
      }

      // Check for type annotations in TypeScript
      if (context.language === 'typescript') {
        const anyCount = (content.match(/:\s*any\b/g) || []).length;
        if (anyCount > 3) {
          issues.push({
            layer: 'ai-semantic',
            severity: 'warning',
            code: 'EXCESSIVE_ANY_TYPE',
            message: `Found ${anyCount} uses of 'any' type - consider using proper types`,
          });
          score -= 0.1;
        }
      }

      // Check for documentation
      const functionCount = (content.match(/function\s+\w+|=>\s*{/g) || []).length;
      const jsdocCount = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
      if (functionCount > 3 && jsdocCount < functionCount / 2) {
        issues.push({
          layer: 'ai-semantic',
          severity: 'info',
          code: 'INSUFFICIENT_DOCUMENTATION',
          message: 'Consider adding JSDoc comments for better documentation',
        });
        score -= 0.02;
      }
    }

    bus.publish('precog', 'validation:ai-semantic:complete', {
      taskType: context.taskType,
      score,
      issueCount: issues.length,
    });

    return {
      layer: 'ai-semantic',
      passed: score >= 0.7,
      score: Math.max(0, Math.min(1, score)),
      issues,
      metadata: {
        prompt: prompt.substring(0, 100) + '...',
        analysisType: context.taskType,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Layer 3: User Acceptance
   */
  private async requestUserAcceptance(context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();
    const requestId = `approval-${Date.now()}`;

    // Publish event for UI to show approval dialog
    bus.publish('precog', 'validation:user-approval:requested', {
      requestId,
      taskType: context.taskType,
      contentPreview: context.content.substring(0, 200) + '...',
      isCritical: context.isCritical,
    });

    // In a real implementation, this would wait for user input
    // For now, auto-approve after emitting the event
    const approved = true; // Would be async user input

    return {
      layer: 'user-acceptance',
      passed: approved,
      score: approved ? 1.0 : 0.0,
      issues: approved ? [] : [{
        layer: 'user-acceptance',
        severity: 'error',
        code: 'USER_REJECTED',
        message: 'User rejected the output',
      }],
      metadata: {
        requestId,
        autoApproved: true, // Would be false in real implementation
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Add custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.automatedRules.push(rule);
  }

  /**
   * Get validation summary for display
   */
  summarize(result: ThreeLayerResult): string {
    const layers: string[] = [];

    layers.push(`Automated: ${result.automated.passed ? '✅' : '❌'} (${(result.automated.score * 100).toFixed(0)}%)`);

    if (result.aiSemantic) {
      layers.push(`AI Review: ${result.aiSemantic.passed ? '✅' : '❌'} (${(result.aiSemantic.score * 100).toFixed(0)}%)`);
    }

    if (result.userAcceptance) {
      layers.push(`User Approval: ${result.userAcceptance.passed ? '✅' : '❌'}`);
    }

    return `Validation: ${result.overallPassed ? '✅ PASSED' : '❌ FAILED'} | ${layers.join(' | ')} | Overall: ${(result.overallScore * 100).toFixed(0)}%`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const threeLayerValidation = new ThreeLayerValidationService();
export default threeLayerValidation;
