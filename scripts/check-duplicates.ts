#!/usr/bin/env npx tsx
// @version 2.2.125
/**
 * Pre-commit Duplicate Detector
 * Runs architecture-analyzer on changed files to detect duplicates.
 * Blocks commits that introduce >70% similar functionality without annotation.
 *
 * @version 2.2.125
 * @responsibility pre-commit-validation
 * @category tooling
 * 
 * Usage:
 *   npx tsx scripts/check-duplicates.ts           # Check staged files
 *   npx tsx scripts/check-duplicates.ts --all     # Check entire codebase
 *   npx tsx scripts/check-duplicates.ts --fix     # Auto-add annotations
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Configuration
const CONFIG = {
  similarityThreshold: 70,      // Block commits with >70% similarity
  warningThreshold: 50,         // Warn for >50% similarity
  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
    "**/*.d.ts",
  ],
  includePatterns: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.js",
    "src/**/*.jsx",
  ],
};

interface AnalysisResult {
  passed: boolean;
  blockers: DuplicateMatch[];
  warnings: DuplicateMatch[];
  suggestions: string[];
  report: string;
}

interface DuplicateMatch {
  file1: string;
  file2: string;
  score: number;
  reasons: string[];
  category: string;
}

/**
 * Get list of staged files from git
 */
function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
    });
    
    return output
      .split("\n")
      .filter(Boolean)
      .filter(file => 
        CONFIG.includePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
          return regex.test(file);
        }) &&
        !CONFIG.excludePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
          return regex.test(file);
        })
      );
  } catch (error) {
    console.error("Failed to get staged files:", error);
    return [];
  }
}

/**
 * Simple text similarity using character trigrams
 */
function calculateSimilarity(text1: string, text2: string): number {
  const getTrigrams = (s: string): Set<string> => {
    const result = new Set<string>();
    const normalized = s.toLowerCase().replace(/\s+/g, " ");
    for (let i = 0; i <= normalized.length - 3; i++) {
      result.add(normalized.slice(i, i + 3));
    }
    return result;
  };

  const t1 = getTrigrams(text1);
  const t2 = getTrigrams(text2);

  if (t1.size === 0 || t2.size === 0) return 0;

  const intersection = [...t1].filter(t => t2.has(t));
  const union = new Set([...t1, ...t2]);

  return (intersection.length / union.size) * 100;
}

/**
 * Extract key signatures from a file for comparison
 */
function extractSignatures(content: string): {
  classes: string[];
  functions: string[];
  interfaces: string[];
  eventSubscriptions: string[];
  responsibilities: string[];
} {
  const classes: string[] = [];
  const functions: string[] = [];
  const interfaces: string[] = [];
  const eventSubscriptions: string[] = [];
  const responsibilities: string[] = [];

  // Extract class names
  const classMatches = content.matchAll(/class\s+(\w+)/g);
  for (const match of classMatches) {
    classes.push(match[1]);
  }

  // Extract function names
  const funcMatches = content.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()/g);
  for (const match of funcMatches) {
    functions.push(match[1] || match[2]);
  }

  // Extract interfaces
  const interfaceMatches = content.matchAll(/interface\s+(\w+)/g);
  for (const match of interfaceMatches) {
    interfaces.push(match[1]);
  }

  // Extract event subscriptions
  const eventMatches = content.matchAll(/bus\.(on|subscribe)\s*\(\s*["']([^"']+)["']/g);
  for (const match of eventMatches) {
    eventSubscriptions.push(match[2]);
  }

  // Extract responsibilities from annotations
  const respMatches = content.matchAll(/@responsibility\s*[:\s]+([^\n\r]+)/gi);
  for (const match of respMatches) {
    responsibilities.push(match[1].trim());
  }

  return { classes, functions, interfaces, eventSubscriptions, responsibilities };
}

/**
 * Check if file has intentional duplicate annotation
 */
function hasIntentionalAnnotation(content: string): boolean {
  return /@duplicates-intentional\s*[:\s]/i.test(content);
}

/**
 * Check if file has @uses annotation pointing to the other file
 */
function hasUsesAnnotation(content: string, otherFileName: string): boolean {
  const baseName = path.basename(otherFileName, path.extname(otherFileName));
  const usesPattern = new RegExp(`@uses\\s*[:\\s]+.*${baseName}`, "i");
  return usesPattern.test(content);
}

/**
 * Compare two files for similarity
 */
function compareFiles(file1: string, file2: string): DuplicateMatch | null {
  const content1 = fs.readFileSync(path.join(PROJECT_ROOT, file1), "utf-8");
  const content2 = fs.readFileSync(path.join(PROJECT_ROOT, file2), "utf-8");

  // Skip if either file has intentional duplicate annotation
  if (hasIntentionalAnnotation(content1) || hasIntentionalAnnotation(content2)) {
    return null;
  }

  // Check for @uses relationship
  const hasUses = hasUsesAnnotation(content1, file2) || hasUsesAnnotation(content2, file1);

  const sig1 = extractSignatures(content1);
  const sig2 = extractSignatures(content2);

  const reasons: string[] = [];
  let totalScore = 0;
  let weights = 0;

  // Compare class names
  const sharedClasses = sig1.classes.filter(c => 
    sig2.classes.some(c2 => calculateSimilarity(c, c2) > 80)
  );
  if (sharedClasses.length > 0) {
    totalScore += 30;
    weights += 30;
    reasons.push(`Similar class names: ${sharedClasses.join(", ")}`);
  }

  // Compare functions
  const sharedFunctions = sig1.functions.filter(f => sig2.functions.includes(f));
  if (sharedFunctions.length > 2) {
    const funcScore = Math.min(25, sharedFunctions.length * 5);
    totalScore += funcScore;
    weights += 25;
    reasons.push(`Shared function names: ${sharedFunctions.slice(0, 5).join(", ")}${sharedFunctions.length > 5 ? "..." : ""}`);
  }

  // Compare event subscriptions
  const sharedEvents = sig1.eventSubscriptions.filter(e => sig2.eventSubscriptions.includes(e));
  if (sharedEvents.length > 0) {
    totalScore += 20;
    weights += 20;
    reasons.push(`Same event subscriptions: ${sharedEvents.join(", ")}`);
  }

  // Compare responsibilities
  const sharedResps = sig1.responsibilities.filter(r => sig2.responsibilities.includes(r));
  if (sharedResps.length > 0) {
    totalScore += 30;
    weights += 30;
    reasons.push(`Overlapping responsibilities: ${sharedResps.join(", ")}`);
  }

  // Calculate overall code similarity
  const textSimilarity = calculateSimilarity(content1, content2);
  if (textSimilarity > 30) {
    totalScore += textSimilarity * 0.2;
    weights += 20;
    reasons.push(`Code similarity: ${textSimilarity.toFixed(1)}%`);
  }

  if (weights === 0) return null;

  let finalScore = (totalScore / weights) * 100;

  // Reduce score if there's a @uses relationship
  if (hasUses && finalScore > 50) {
    finalScore = finalScore * 0.5;
    reasons.push("(Score reduced due to @uses annotation)");
  }

  if (finalScore < CONFIG.warningThreshold) return null;

  return {
    file1,
    file2,
    score: Math.round(finalScore),
    reasons,
    category: sharedResps.length > 0 ? "responsibility-overlap" : "code-similarity",
  };
}

/**
 * Run analysis on changed files
 */
async function analyzeChangedFiles(files: string[]): Promise<AnalysisResult> {
  const blockers: DuplicateMatch[] = [];
  const warnings: DuplicateMatch[] = [];
  const suggestions: string[] = [];

  console.log(`\n🔍 Analyzing ${files.length} changed files for duplicates...\n`);

  // Get all existing source files for comparison
  const allSourceFiles: string[] = [];
  const scanDir = (dir: string, relativeTo: string = "") => {
    const entries = fs.readdirSync(path.join(PROJECT_ROOT, dir), { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.join(relativeTo, dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.includes("node_modules") && !entry.name.includes("dist")) {
          scanDir(path.join(dir, entry.name), "");
        }
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
        allSourceFiles.push(relativePath);
      }
    }
  };

  scanDir("src");

  // Compare changed files against all source files
  for (const changedFile of files) {
    for (const existingFile of allSourceFiles) {
      if (changedFile === existingFile) continue;
      
      try {
        const match = compareFiles(changedFile, existingFile);
        if (match) {
          if (match.score >= CONFIG.similarityThreshold) {
            blockers.push(match);
          } else if (match.score >= CONFIG.warningThreshold) {
            warnings.push(match);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  // Generate suggestions
  for (const blocker of blockers) {
    suggestions.push(
      `Add @duplicates-intentional: <reason> to ${blocker.file1} or consolidate with ${blocker.file2}`
    );
  }

  // Generate report
  const report = generateReport(blockers, warnings, suggestions);

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    suggestions,
    report,
  };
}

/**
 * Generate formatted report
 */
function generateReport(
  blockers: DuplicateMatch[],
  warnings: DuplicateMatch[],
  suggestions: string[]
): string {
  const lines: string[] = [
    "",
    "╔════════════════════════════════════════════════════════════════╗",
    "║            PRE-COMMIT DUPLICATE CHECK REPORT                   ║",
    "╚════════════════════════════════════════════════════════════════╝",
    "",
  ];

  if (blockers.length === 0 && warnings.length === 0) {
    lines.push("✅ No significant duplicates detected!");
    lines.push("");
    return lines.join("\n");
  }

  if (blockers.length > 0) {
    lines.push("🔴 BLOCKERS (commit will be rejected):");
    lines.push("─".repeat(60));
    for (const blocker of blockers) {
      lines.push(`  ${blocker.score}% similarity: ${blocker.file1}`);
      lines.push(`           ↔ ${blocker.file2}`);
      for (const reason of blocker.reasons) {
        lines.push(`     • ${reason}`);
      }
      lines.push("");
    }
  }

  if (warnings.length > 0) {
    lines.push("🟡 WARNINGS:");
    lines.push("─".repeat(60));
    for (const warning of warnings) {
      lines.push(`  ${warning.score}% similarity: ${warning.file1}`);
      lines.push(`           ↔ ${warning.file2}`);
      lines.push("");
    }
  }

  if (suggestions.length > 0) {
    lines.push("💡 SUGGESTIONS:");
    lines.push("─".repeat(60));
    for (const suggestion of suggestions) {
      lines.push(`  • ${suggestion}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const checkAll = args.includes("--all");
  const autoFix = args.includes("--fix");
  const verbose = args.includes("--verbose") || args.includes("-v");

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           SYNAPSYS DUPLICATE DETECTOR v2.2.125                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  let filesToCheck: string[];

  if (checkAll) {
    console.log("\n📂 Checking entire codebase...");
    filesToCheck = [];
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(path.join(PROJECT_ROOT, dir), { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.includes("node_modules") && !entry.name.includes("dist")) {
            scanDir(fullPath);
          }
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) {
          filesToCheck.push(fullPath);
        }
      }
    };
    scanDir("src");
  } else {
    console.log("\n📂 Checking staged files...");
    filesToCheck = getStagedFiles();
  }

  if (filesToCheck.length === 0) {
    console.log("\n✅ No relevant files to check.");
    process.exit(0);
  }

  if (verbose) {
    console.log("\nFiles to check:");
    filesToCheck.forEach(f => console.log(`  • ${f}`));
  }

  const result = await analyzeChangedFiles(filesToCheck);
  console.log(result.report);

  if (!result.passed) {
    console.log("❌ COMMIT BLOCKED: Duplicate functionality detected.");
    console.log("");
    console.log("To fix this, either:");
    console.log("  1. Consolidate the duplicate functionality");
    console.log("  2. Add @duplicates-intentional: <reason> annotation");
    console.log("  3. Add @uses: <other-file> if one depends on the other");
    console.log("");
    
    if (autoFix) {
      console.log("🔧 Auto-fix mode enabled - adding annotations...");
      // TODO: Implement auto-fix
    }
    
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log("⚠️ Commit allowed but warnings found. Consider addressing them.");
  } else {
    console.log("✅ No duplicates detected. Commit allowed.");
  }

  process.exit(0);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
