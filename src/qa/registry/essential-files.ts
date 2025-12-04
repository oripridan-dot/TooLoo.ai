/**
 * Essential Files Registry
 * Defines which files/directories are actively used by TooLoo.ai
 * vs orphan/legacy files that should be excluded from QA checks
 *
 * @version 1.0.0
 * @synapsys QA Module
 */

/**
 * Essential directories that ARE actively used by the running application
 * These should receive full QA attention
 */
export const ESSENTIAL_DIRECTORIES = [
  // Core Infrastructure
  'src/core',

  // Main Modules (entry points)
  'src/cortex',
  'src/precog',
  'src/nexus',
  'src/qa',

  // Web App (frontend)
  'src/web-app/src',
] as const;

/**
 * Specific subdirectories within essential modules that are orphaned
 * These are NOT imported anywhere and should be excluded
 */
export const ORPHAN_SUBDIRECTORIES = [
  // Cortex orphans - not imported by cortex/index.ts
  'src/cortex/system-model',
  'src/cortex/legacy-map.json',

  // Nexus orphans - not imported
  'src/nexus/interface/reports-server.ts',
  'src/nexus/interface/ui-activity-monitor.ts',
  'src/nexus/traits', // empty

  // Core orphans
  'src/core/data', // Database.ts not imported

  // Precog orphans
  'src/precog/oracle', // empty

  // Shared orphans
  'src/shared/tools', // empty
] as const;

/**
 * Entire directories that are NOT connected to any entry point
 * These are standalone tools, SDKs, or legacy code
 */
export const EXCLUDED_DIRECTORIES = [
  // SDK - external use only, not imported by main app
  'src/sdk',

  // CLI - standalone tool, separate entry point
  'src/cli',

  // MLOps - Python layer, not TypeScript
  'src/mlops',

  // Data directory - JSON only
  'src/data',

  // Lib - empty or minimal
  'src/lib',

  // Shared - mostly empty
  'src/shared',

  // Web App legacy/static directories
  'src/web-app/_legacy',
  'src/web-app/scanner',
  'src/web-app/ai-chat-analysis',
  'src/web-app/beast-mode-demo',
  'src/web-app/beast-mode-full',
  'src/web-app/blueprints',
  'src/web-app/real-comparison-results',
  'src/web-app/node_modules',
  'src/web-app/dist',
] as const;

/**
 * File patterns to always exclude from QA checks
 */
export const EXCLUDED_FILE_PATTERNS = [
  // Test files (handled separately)
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,

  // Type definitions
  /\.d\.ts$/,

  // Config files
  /^.*\.(json|yaml|yml|md|html|css)$/,

  // Build artifacts
  /node_modules/,
  /dist\//,
  /\.next\//,

  // Python files (different runtime)
  /\.py$/,

  // Legacy map
  /legacy-map\.json$/,
] as const;

/**
 * Entry points that are valid even if not imported elsewhere
 */
export const VALID_ENTRY_POINTS = [
  'src/main.ts',
  'src/cortex/index.ts',
  'src/precog/index.ts',
  'src/nexus/index.ts',
  'src/qa/index.ts',
  'src/cli/index.ts', // CLI has its own entry point
] as const;

/**
 * Directories where files don't need to be imported (singletons, routes, etc.)
 */
export const IMPLICIT_ENTRY_DIRECTORIES = [
  // Routes are mounted dynamically by Express
  '/routes/',
  // Agents are often singletons
  '/agent/',
  // Guards run on their own
  '/guards/',
  // Core files are often singletons
  '/core/',
  // Index files re-export
  'index.ts',
  // Service files are often singletons
  '-service.ts',
] as const;

/**
 * Critical files that should NEVER be archived, regardless of orphan detection
 * These are essential to the system even if import detection fails
 */
export const PROTECTED_FILES = [
  // QA Registry itself - CRITICAL!
  'src/qa/registry/essential-files.ts',
  'src/qa/registry/index.ts',
  // DisCover Agent - Emergence coordination module
  'src/cortex/discover/discover-agent.ts',
  'src/cortex/discover/emergence-artifact.ts',
  'src/cortex/discover/index.ts',
  // Session context service - critical for UI state
  'src/cortex/session-context-service.ts',
  // Main cortex services
  'src/cortex/context-manager.ts',
  'src/cortex/reasoning-chain.ts',
  'src/cortex/context-resonance.ts',
  // V3 Cognition module - multi-provider validation
  'src/cortex/cognition/index.ts',
  'src/cortex/cognition/validation-loop.ts',
  // XAI Transparency module - V3 core
  'src/shared/xai/index.ts',
  'src/shared/xai/schemas.ts',
  'src/shared/xai/config.ts',
  'src/shared/xai/transparency-wrapper.ts',
  // Feedback engine - used by cortex
  'src/cortex/feedback/provider-feedback-engine.ts',
  // Core infrastructure
  'src/core/event-bus.ts',
  'src/core/module-registry.ts',
  'src/core/env-loader.ts',
  // Web App stores - used by components
  'src/web-app/src/store/visual-store.ts',
  'src/web-app/src/store/theme-store.ts',
  // Main entry
  'src/main.ts',
] as const;

/**
 * Check if a file should be excluded from QA checks
 */
export function shouldExcludeFile(filePath: string): boolean {
  // Check excluded directories
  for (const dir of EXCLUDED_DIRECTORIES) {
    if (filePath.startsWith(dir) || filePath.includes(`/${dir}/`)) {
      return true;
    }
  }

  // Check orphan subdirectories
  for (const dir of ORPHAN_SUBDIRECTORIES) {
    if (filePath.startsWith(dir) || filePath === dir) {
      return true;
    }
  }

  // Check file patterns
  for (const pattern of EXCLUDED_FILE_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a file is protected from archiving
 */
export function isProtectedFile(filePath: string): boolean {
  // Check protected files list
  for (const protected_file of PROTECTED_FILES) {
    if (filePath === protected_file || filePath.endsWith(protected_file)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file is a valid entry point or implicitly valid
 */
export function isValidEntryPoint(filePath: string): boolean {
  // Protected files are always valid entry points
  if (isProtectedFile(filePath)) {
    return true;
  }

  // Explicit entry points
  if (VALID_ENTRY_POINTS.includes(filePath as (typeof VALID_ENTRY_POINTS)[number])) {
    return true;
  }

  // Implicit entry directories
  for (const pattern of IMPLICIT_ENTRY_DIRECTORIES) {
    if (filePath.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a directory is essential
 */
export function isEssentialDirectory(dirPath: string): boolean {
  for (const essential of ESSENTIAL_DIRECTORIES) {
    if (dirPath.startsWith(essential)) {
      // But not if it's an orphan subdirectory
      for (const orphan of ORPHAN_SUBDIRECTORIES) {
        if (dirPath.startsWith(orphan)) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Get QA priority level for a file
 * @returns "critical" | "high" | "normal" | "low" | "exclude"
 */
export function getFilePriority(
  filePath: string
): 'critical' | 'high' | 'normal' | 'low' | 'exclude' {
  if (shouldExcludeFile(filePath)) {
    return 'exclude';
  }

  // Critical: entry points and core infrastructure
  if (
    filePath === 'src/main.ts' ||
    filePath.endsWith('/index.ts') ||
    filePath.startsWith('src/core/')
  ) {
    return 'critical';
  }

  // High: API routes and providers
  if (
    filePath.includes('/routes/') ||
    filePath.includes('/providers/') ||
    filePath.includes('/agent/')
  ) {
    return 'high';
  }

  // Normal: main module code
  if (
    filePath.startsWith('src/cortex/') ||
    filePath.startsWith('src/precog/') ||
    filePath.startsWith('src/nexus/') ||
    filePath.startsWith('src/qa/')
  ) {
    return 'normal';
  }

  // Low: web app and other
  return 'low';
}

/**
 * Summary stats for logging
 */
export const REGISTRY_STATS = {
  essentialDirectories: ESSENTIAL_DIRECTORIES.length,
  orphanSubdirectories: ORPHAN_SUBDIRECTORIES.length,
  excludedDirectories: EXCLUDED_DIRECTORIES.length,
  excludedPatterns: EXCLUDED_FILE_PATTERNS.length,
  entryPoints: VALID_ENTRY_POINTS.length,
} as const;
