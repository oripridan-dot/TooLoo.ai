// @version 2.2.123
/**
 * Architecture Analyzer
 * Static analysis engine for detecting duplicate functionality,
 * overlapping components, and architectural inconsistencies.
 *
 * @version 2.2.121
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// Types for analysis results
export interface SimilarityResult {
  file1: string;
  file2: string;
  score: number; // 0-100
  reasons: string[];
  category: DuplicationType;
}

export interface DuplicateReport {
  timestamp: Date;
  totalFilesAnalyzed: number;
  duplicatesFound: SimilarityResult[];
  warnings: ArchitectureWarning[];
  criticalIssues: ArchitectureWarning[];
}

export interface ArchitectureWarning {
  type: WarningType;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  files: string[];
  suggestion: string;
}

export type DuplicationType =
  | "class-name-similar"
  | "function-signature-duplicate"
  | "interface-reimplemented"
  | "event-subscription-overlap"
  | "api-route-overlap"
  | "component-purpose-overlap";

export type WarningType =
  | "duplicate-functionality"
  | "missing-uses-annotation"
  | "overlapping-responsibility"
  | "orphaned-code"
  | "circular-dependency";

// Known patterns to detect
const FUNCTIONALITY_PATTERNS = {
  providerTracking: [
    /class\s+\w*Provider\w*(Engine|Tracker|Scorecard|Manager)/i,
    /trackProvider|providerMetrics|providerStatus/i,
    /successRate|latency.*provider/i,
  ],
  memorySystem: [
    /class\s+\w*(Memory|Hippocampus|Context)\w*/i,
    /shortTerm|longTerm|episodic|semantic/i,
    /vectorStore|embedding/i,
  ],
  eventHandling: [
    /bus\.(on|subscribe|publish|emit)/,
    /addEventListener|EventEmitter/,
    /socket\.(on|emit)/,
  ],
  apiRoutes: [
    /router\.(get|post|put|delete|patch)/i,
    /app\.(get|post|put|delete|patch)/i,
  ],
  uiComponents: [
    /export\s+(default\s+)?function\s+\w+.*\(/,
    /const\s+\w+\s*=\s*\(\s*\{.*\}\s*\)\s*=>/,
    /React\.(FC|Component)/,
  ],
};

// Responsibility categories
const RESPONSIBILITY_CATEGORIES = [
  "provider-tracking",
  "provider-routing",
  "memory-storage",
  "memory-retrieval",
  "context-management",
  "session-tracking",
  "event-bus",
  "file-system",
  "api-gateway",
  "authentication",
  "logging",
  "metrics",
  "health-check",
  "ui-provider-display",
  "ui-memory-display",
  "ui-activity-log",
] as const;

export type ResponsibilityCategory =
  (typeof RESPONSIBILITY_CATEGORIES)[number];

/**
 * Main Architecture Analyzer class
 */
export class ArchitectureAnalyzer {
  private projectRoot: string;
  private fileCache: Map<string, string> = new Map();
  private analysisCache: Map<string, FileAnalysis> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze the entire codebase for duplicates
   */
  async analyzeCodebase(options: {
    includePatterns?: string[];
    excludePatterns?: string[];
    similarityThreshold?: number;
  } = {}): Promise<DuplicateReport> {
    const {
      includePatterns = [
        "src/**/*.ts",
        "src/**/*.tsx",
        "src/**/*.js",
        "src/**/*.jsx",
      ],
      excludePatterns = [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      similarityThreshold = 70,
    } = options;

    console.log("[ArchitectureAnalyzer] Starting codebase analysis...");

    // Get all files
    const files: string[] = [];
    for (const pattern of includePatterns) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: excludePatterns,
      });
      files.push(...matches);
    }

    console.log(`[ArchitectureAnalyzer] Found ${files.length} files to analyze`);

    // Analyze each file
    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Find duplicates
    const duplicates = this.findDuplicates(similarityThreshold);
    const warnings = this.generateWarnings(duplicates);

    const report: DuplicateReport = {
      timestamp: new Date(),
      totalFilesAnalyzed: files.length,
      duplicatesFound: duplicates,
      warnings: warnings.filter((w) => w.severity !== "critical"),
      criticalIssues: warnings.filter((w) => w.severity === "critical"),
    };

    console.log(
      `[ArchitectureAnalyzer] Analysis complete. Found ${duplicates.length} potential duplicates.`
    );

    return report;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const fullPath = path.join(this.projectRoot, filePath);

    if (this.analysisCache.has(filePath)) {
      return this.analysisCache.get(filePath)!;
    }

    let content: string;
    if (this.fileCache.has(filePath)) {
      content = this.fileCache.get(filePath)!;
    } else {
      content = fs.readFileSync(fullPath, "utf-8");
      this.fileCache.set(filePath, content);
    }

    const analysis: FileAnalysis = {
      filePath,
      classes: this.extractClasses(content),
      functions: this.extractFunctions(content),
      interfaces: this.extractInterfaces(content),
      eventSubscriptions: this.extractEventSubscriptions(content),
      apiRoutes: this.extractApiRoutes(content),
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      annotations: this.extractAnnotations(content),
      responsibilities: this.detectResponsibilities(content, filePath),
      functionalityPatterns: this.detectFunctionalityPatterns(content),
    };

    this.analysisCache.set(filePath, analysis);
    return analysis;
  }

  /**
   * Extract class definitions
   */
  private extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classRegex =
      /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;

    let match;
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        extends: match[2] || null,
        implements: match[3]?.split(",").map((s) => s.trim()) || [],
        methods: this.extractMethods(content, match[1]),
      });
    }

    return classes;
  }

  /**
   * Extract methods from a class
   */
  private extractMethods(content: string, className: string): string[] {
    const methods: string[] = [];
    // Simplified method extraction - looks for method patterns
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g;

    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      if (!["if", "for", "while", "switch", "catch", "function"].includes(match[1])) {
        methods.push(match[1]);
      }
    }

    return [...new Set(methods)];
  }

  /**
   * Extract standalone functions
   */
  private extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const funcRegex =
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    const arrowRegex =
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[\w<>[\]|]+)?\s*=>/g;

    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        params: match[2].split(",").map((p) => p.trim()).filter(Boolean),
        isAsync: content.slice(Math.max(0, match.index - 10), match.index).includes("async"),
      });
    }

    while ((match = arrowRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        params: [],
        isAsync: content.slice(Math.max(0, match.index - 10), match.index).includes("async"),
      });
    }

    return functions;
  }

  /**
   * Extract interfaces
   */
  private extractInterfaces(content: string): string[] {
    const interfaces: string[] = [];
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;

    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push(match[1]);
    }

    return interfaces;
  }

  /**
   * Extract event subscriptions
   */
  private extractEventSubscriptions(content: string): EventSubscription[] {
    const subscriptions: EventSubscription[] = [];
    const busOnRegex = /bus\.(on|subscribe)\s*\(\s*["']([^"']+)["']/g;
    const socketOnRegex = /socket\.(on)\s*\(\s*["']([^"']+)["']/g;

    let match;
    while ((match = busOnRegex.exec(content)) !== null) {
      subscriptions.push({ type: "bus", event: match[2] });
    }
    while ((match = socketOnRegex.exec(content)) !== null) {
      subscriptions.push({ type: "socket", event: match[2] });
    }

    return subscriptions;
  }

  /**
   * Extract API routes
   */
  private extractApiRoutes(content: string): ApiRoute[] {
    const routes: ApiRoute[] = [];
    const routeRegex =
      /router\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi;

    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      routes.push({ method: match[1].toUpperCase(), path: match[2] });
    }

    return routes;
  }

  /**
   * Extract imports
   */
  private extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+["']([^"']+)["']/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        names: match[1]?.split(",").map((s) => s.trim()) || [match[2]],
        from: match[3],
      });
    }

    return imports;
  }

  /**
   * Extract exports
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    const defaultExportRegex = /export\s+default\s+(?:function\s+)?(\w+)?/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    while ((match = defaultExportRegex.exec(content)) !== null) {
      if (match[1]) exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Extract @uses, @extends, @duplicates-intentional annotations
   */
  private extractAnnotations(content: string): ArchitectureAnnotation[] {
    const annotations: ArchitectureAnnotation[] = [];
    const annotationRegex =
      /@(uses|extends|duplicates-intentional|responsibility|category)\s*[:\s]+([^\n\r]+)/gi;

    let match;
    while ((match = annotationRegex.exec(content)) !== null) {
      annotations.push({
        type: match[1].toLowerCase() as AnnotationType,
        value: match[2].trim(),
      });
    }

    return annotations;
  }

  /**
   * Detect which functionality patterns are present
   */
  private detectFunctionalityPatterns(content: string): string[] {
    const patterns: string[] = [];

    for (const [name, regexes] of Object.entries(FUNCTIONALITY_PATTERNS)) {
      for (const regex of regexes) {
        if (regex.test(content)) {
          patterns.push(name);
          break;
        }
      }
    }

    return patterns;
  }

  /**
   * Detect responsibilities based on file path and content
   */
  private detectResponsibilities(
    content: string,
    filePath: string
  ): ResponsibilityCategory[] {
    const responsibilities: ResponsibilityCategory[] = [];

    // Path-based detection
    if (filePath.includes("/feedback/") || filePath.includes("provider-feedback")) {
      responsibilities.push("provider-tracking");
    }
    if (filePath.includes("/memory/") || filePath.includes("hippocampus")) {
      responsibilities.push("memory-storage");
    }
    if (filePath.includes("/routes/")) {
      responsibilities.push("api-gateway");
    }

    // Content-based detection
    if (/providerScorecard|providerMetrics|trackProvider/i.test(content)) {
      if (!responsibilities.includes("provider-tracking")) {
        responsibilities.push("provider-tracking");
      }
    }
    if (/shortTermMemory|longTermMemory|episodicMemory/i.test(content)) {
      if (!responsibilities.includes("memory-storage")) {
        responsibilities.push("memory-storage");
      }
    }
    if (/router\.(get|post)/i.test(content)) {
      if (!responsibilities.includes("api-gateway")) {
        responsibilities.push("api-gateway");
      }
    }

    return responsibilities;
  }

  /**
   * Find duplicates between all analyzed files
   */
  private findDuplicates(threshold: number): SimilarityResult[] {
    const duplicates: SimilarityResult[] = [];
    const files = Array.from(this.analysisCache.keys());

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const analysis1 = this.analysisCache.get(files[i])!;
        const analysis2 = this.analysisCache.get(files[j])!;

        const similarity = this.calculateSimilarity(analysis1, analysis2);

        if (similarity.score >= threshold) {
          duplicates.push(similarity);
        }
      }
    }

    return duplicates.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate similarity between two files
   */
  private calculateSimilarity(
    analysis1: FileAnalysis,
    analysis2: FileAnalysis
  ): SimilarityResult {
    const reasons: string[] = [];
    let totalScore = 0;
    let weights = 0;

    // Check for @uses annotations (legitimate composition)
    const hasUsesRelationship =
      analysis1.annotations.some(
        (a) =>
          a.type === "uses" &&
          a.value.includes(path.basename(analysis2.filePath, path.extname(analysis2.filePath)))
      ) ||
      analysis2.annotations.some(
        (a) =>
          a.type === "uses" &&
          a.value.includes(path.basename(analysis1.filePath, path.extname(analysis1.filePath)))
      );

    // Check for intentional duplicate annotation
    const isIntentional =
      analysis1.annotations.some((a) => a.type === "duplicates-intentional") ||
      analysis2.annotations.some((a) => a.type === "duplicates-intentional");

    if (isIntentional) {
      return {
        file1: analysis1.filePath,
        file2: analysis2.filePath,
        score: 0,
        reasons: ["Marked as intentional duplicate"],
        category: "class-name-similar",
      };
    }

    // 1. Class name similarity (weight: 30)
    const classNameSimilarity = this.compareClassNames(
      analysis1.classes,
      analysis2.classes
    );
    if (classNameSimilarity > 0) {
      totalScore += classNameSimilarity * 30;
      weights += 30;
      if (classNameSimilarity > 0.5) {
        reasons.push(`Similar class names (${Math.round(classNameSimilarity * 100)}%)`);
      }
    }

    // 2. Method overlap (weight: 25)
    const methodOverlap = this.compareMethodNames(
      analysis1.classes,
      analysis2.classes
    );
    if (methodOverlap > 0) {
      totalScore += methodOverlap * 25;
      weights += 25;
      if (methodOverlap > 0.3) {
        reasons.push(`Overlapping method names (${Math.round(methodOverlap * 100)}%)`);
      }
    }

    // 3. Functionality pattern overlap (weight: 25)
    const patternOverlap = this.compareArrays(
      analysis1.functionalityPatterns,
      analysis2.functionalityPatterns
    );
    if (patternOverlap > 0) {
      totalScore += patternOverlap * 25;
      weights += 25;
      if (patternOverlap > 0.5) {
        reasons.push(`Similar functionality patterns (${Math.round(patternOverlap * 100)}%)`);
      }
    }

    // 4. Event subscription overlap (weight: 15)
    const eventOverlap = this.compareEvents(
      analysis1.eventSubscriptions,
      analysis2.eventSubscriptions
    );
    if (eventOverlap > 0) {
      totalScore += eventOverlap * 15;
      weights += 15;
      if (eventOverlap > 0.3) {
        reasons.push(`Same event subscriptions (${Math.round(eventOverlap * 100)}%)`);
      }
    }

    // 5. Responsibility overlap (weight: 20)
    const responsibilityOverlap = this.compareArrays(
      analysis1.responsibilities,
      analysis2.responsibilities
    );
    if (responsibilityOverlap > 0) {
      totalScore += responsibilityOverlap * 20;
      weights += 20;
      if (responsibilityOverlap > 0.5) {
        reasons.push(`Overlapping responsibilities (${Math.round(responsibilityOverlap * 100)}%)`);
      }
    }

    // Reduce score if there's a @uses relationship
    let finalScore = weights > 0 ? (totalScore / weights) * 100 : 0;
    if (hasUsesRelationship && finalScore > 50) {
      finalScore = finalScore * 0.5; // Halve the score for legitimate composition
      reasons.push("(Score reduced due to @uses annotation)");
    }

    // Determine category
    let category: DuplicationType = "class-name-similar";
    if (patternOverlap > 0.5) category = "function-signature-duplicate";
    if (eventOverlap > 0.5) category = "event-subscription-overlap";
    if (responsibilityOverlap > 0.5) category = "component-purpose-overlap";

    return {
      file1: analysis1.filePath,
      file2: analysis2.filePath,
      score: Math.round(finalScore),
      reasons,
      category,
    };
  }

  /**
   * Compare class names using Levenshtein-like similarity
   */
  private compareClassNames(classes1: ClassInfo[], classes2: ClassInfo[]): number {
    if (classes1.length === 0 || classes2.length === 0) return 0;

    let maxSimilarity = 0;
    for (const c1 of classes1) {
      for (const c2 of classes2) {
        const similarity = this.stringSimilarity(c1.name, c2.name);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    return maxSimilarity;
  }

  /**
   * Compare method names between classes
   */
  private compareMethodNames(classes1: ClassInfo[], classes2: ClassInfo[]): number {
    const methods1 = new Set(classes1.flatMap((c) => c.methods));
    const methods2 = new Set(classes2.flatMap((c) => c.methods));

    if (methods1.size === 0 || methods2.size === 0) return 0;

    const intersection = [...methods1].filter((m) => methods2.has(m));
    const union = new Set([...methods1, ...methods2]);

    return intersection.length / union.size;
  }

  /**
   * Compare arrays for overlap
   */
  private compareArrays(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = [...set1].filter((x) => set2.has(x));
    const union = new Set([...set1, ...set2]);

    return intersection.length / union.size;
  }

  /**
   * Compare event subscriptions
   */
  private compareEvents(
    events1: EventSubscription[],
    events2: EventSubscription[]
  ): number {
    const eventNames1 = events1.map((e) => e.event);
    const eventNames2 = events2.map((e) => e.event);
    return this.compareArrays(eventNames1, eventNames2);
  }

  /**
   * Simple string similarity (Jaccard on character trigrams)
   */
  private stringSimilarity(s1: string, s2: string): number {
    const trigrams = (s: string): Set<string> => {
      const result = new Set<string>();
      const lower = s.toLowerCase();
      for (let i = 0; i <= lower.length - 3; i++) {
        result.add(lower.slice(i, i + 3));
      }
      return result;
    };

    const t1 = trigrams(s1);
    const t2 = trigrams(s2);

    if (t1.size === 0 || t2.size === 0) return 0;

    const intersection = [...t1].filter((t) => t2.has(t));
    const union = new Set([...t1, ...t2]);

    return intersection.length / union.size;
  }

  /**
   * Generate warnings from duplicate analysis
   */
  private generateWarnings(duplicates: SimilarityResult[]): ArchitectureWarning[] {
    const warnings: ArchitectureWarning[] = [];

    for (const dup of duplicates) {
      const severity =
        dup.score >= 90
          ? "critical"
          : dup.score >= 80
            ? "high"
            : dup.score >= 70
              ? "medium"
              : "low";

      warnings.push({
        type: "duplicate-functionality",
        severity,
        message: `${dup.score}% similarity detected: ${dup.reasons.join(", ")}`,
        files: [dup.file1, dup.file2],
        suggestion: this.generateSuggestion(dup),
      });
    }

    return warnings;
  }

  /**
   * Generate actionable suggestion for a duplicate
   */
  private generateSuggestion(dup: SimilarityResult): string {
    switch (dup.category) {
      case "class-name-similar":
        return `Consider consolidating these classes or adding @uses annotation if one depends on the other.`;
      case "function-signature-duplicate":
        return `Extract shared functionality into a common utility or base class.`;
      case "event-subscription-overlap":
        return `These files subscribe to the same events. Consider creating a single handler that dispatches to both.`;
      case "component-purpose-overlap":
        return `These components serve similar purposes. Consider creating a shared base component.`;
      default:
        return `Review these files for potential consolidation.`;
    }
  }

  /**
   * Generate a report as formatted string
   */
  formatReport(report: DuplicateReport): string {
    const lines: string[] = [
      "╔════════════════════════════════════════════════════════════════╗",
      "║           ARCHITECTURE ANALYSIS REPORT                        ║",
      "╚════════════════════════════════════════════════════════════════╝",
      "",
      `Analysis Time: ${report.timestamp.toISOString()}`,
      `Files Analyzed: ${report.totalFilesAnalyzed}`,
      `Potential Duplicates: ${report.duplicatesFound.length}`,
      `Warnings: ${report.warnings.length}`,
      `Critical Issues: ${report.criticalIssues.length}`,
      "",
    ];

    if (report.criticalIssues.length > 0) {
      lines.push("🔴 CRITICAL ISSUES:");
      lines.push("─".repeat(60));
      for (const issue of report.criticalIssues) {
        lines.push(`  ${issue.message}`);
        lines.push(`  Files: ${issue.files.join(" <-> ")}`);
        lines.push(`  💡 ${issue.suggestion}`);
        lines.push("");
      }
    }

    if (report.warnings.length > 0) {
      lines.push("🟡 WARNINGS:");
      lines.push("─".repeat(60));
      for (const warning of report.warnings.slice(0, 10)) {
        lines.push(`  [${warning.severity.toUpperCase()}] ${warning.message}`);
        lines.push(`  Files: ${warning.files.join(" <-> ")}`);
        lines.push("");
      }
      if (report.warnings.length > 10) {
        lines.push(`  ... and ${report.warnings.length - 10} more warnings`);
      }
    }

    if (report.duplicatesFound.length === 0) {
      lines.push("✅ No significant duplicates detected!");
    }

    return lines.join("\n");
  }
}

// Type definitions
interface FileAnalysis {
  filePath: string;
  classes: ClassInfo[];
  functions: FunctionInfo[];
  interfaces: string[];
  eventSubscriptions: EventSubscription[];
  apiRoutes: ApiRoute[];
  imports: ImportInfo[];
  exports: string[];
  annotations: ArchitectureAnnotation[];
  responsibilities: ResponsibilityCategory[];
  functionalityPatterns: string[];
}

interface ClassInfo {
  name: string;
  extends: string | null;
  implements: string[];
  methods: string[];
}

interface FunctionInfo {
  name: string;
  params: string[];
  isAsync: boolean;
}

interface EventSubscription {
  type: "bus" | "socket";
  event: string;
}

interface ApiRoute {
  method: string;
  path: string;
}

interface ImportInfo {
  names: string[];
  from: string;
}

interface ArchitectureAnnotation {
  type: AnnotationType;
  value: string;
}

type AnnotationType =
  | "uses"
  | "extends"
  | "duplicates-intentional"
  | "responsibility"
  | "category";

// Singleton instance
export const architectureAnalyzer = new ArchitectureAnalyzer();

// CLI entry point
if (process.argv[1]?.includes("architecture-analyzer")) {
  (async () => {
    const report = await architectureAnalyzer.analyzeCodebase();
    console.log(architectureAnalyzer.formatReport(report));
  })();
}
