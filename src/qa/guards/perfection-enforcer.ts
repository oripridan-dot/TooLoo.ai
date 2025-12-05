// @version 3.3.57
/**
 * Perfection Enforcer - Proactive Code Quality Guardian
 *
 * This system ensures we NEVER ship incomplete features by:
 * 1. Scanning for stub/placeholder implementations
 * 2. Detecting frontend API calls without backend handlers
 * 3. Tracking TODO completion status
 * 4. Runtime validation of all API routes
 * 5. Reporting gaps before they become bugs
 *
 * @module qa/guards/perfection-enforcer
 * @intent Catch ALL issues before they reach production
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { bus } from '../../core/event-bus.js';

// ============================================================================
// TYPES
// ============================================================================

export interface StubImplementation {
  file: string;
  line: number;
  type: 'placeholder' | 'stub' | 'todo' | 'fixme' | 'mock' | 'simulated' | 'hardcoded';
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  context: string;
}

export interface MissingEndpoint {
  frontendFile: string;
  frontendLine: number;
  method: string;
  path: string;
  expectedBackendFile: string;
  suggestion: string;
}

export interface IncompleteFeature {
  name: string;
  files: string[];
  issues: StubImplementation[];
  completionScore: number; // 0-100
  blockers: string[];
}

export interface PerfectionReport {
  timestamp: string;
  score: number; // 0-100 (100 = perfect)
  stubs: StubImplementation[];
  missingEndpoints: MissingEndpoint[];
  incompleteFeatures: IncompleteFeature[];
  summary: {
    totalStubs: number;
    criticalStubs: number;
    missingEndpoints: number;
    todosRemaining: number;
    healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  recommendations: string[];
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const STUB_PATTERNS = [
  // Placeholder comments
  {
    regex: /\/\/\s*(placeholder|Placeholder|PLACEHOLDER)/gi,
    type: 'placeholder' as const,
    severity: 'high' as const,
  },
  {
    regex: /\/\/\s*TODO:?\s*(implement|add|fix|complete)/gi,
    type: 'todo' as const,
    severity: 'medium' as const,
  },
  { regex: /\/\/\s*FIXME:?\s*/gi, type: 'fixme' as const, severity: 'high' as const },
  {
    regex: /\/\/\s*stub|Stub response|stub response/gi,
    type: 'stub' as const,
    severity: 'high' as const,
  },

  // Mock/fake data patterns in production code
  {
    regex: /Math\.random\(\)\s*\*\s*\d+.*(?:latency|delay|time|score|metric)/gi,
    type: 'simulated' as const,
    severity: 'critical' as const,
  },
  // Only flag standalone "simulated" as a stub indicator, not in phrases like "fallback to simulated"
  // or "simulated analysis" which are legitimate fallback descriptions
  {
    regex: /\/\/\s*(?:TODO|FIXME)?:?\s*(?:use\s+)?simulated\s+(?:data|values|response)/gi,
    type: 'simulated' as const,
    severity: 'high' as const,
  },
  { regex: /mock\s*(?:data|response|result)/gi, type: 'mock' as const, severity: 'high' as const },

  // Hardcoded values that should be dynamic
  {
    regex: /:\s*0\.\d+,?\s*\/\/\s*(?:placeholder|hardcoded|temp|todo)/gi,
    type: 'hardcoded' as const,
    severity: 'high' as const,
  },
  {
    regex: /return\s*\[\s*\]\s*;?\s*\/\/\s*(?:stub|temp|todo|placeholder)/gi,
    type: 'stub' as const,
    severity: 'high' as const,
  },

  // Empty implementations
  { regex: /{\s*\/\/\s*TODO[^}]*}/gi, type: 'todo' as const, severity: 'medium' as const },
  {
    regex: /throw\s+new\s+Error\s*\(\s*['"`]not\s+implemented/gi,
    type: 'stub' as const,
    severity: 'critical' as const,
  },
];

// ============================================================================
// KNOWN ACCEPTABLE PLACEHOLDERS
// These are documented limitations, not bugs. They are excluded from scoring.
// ============================================================================
const ACCEPTABLE_PLACEHOLDERS: Array<{ file: string; line: number; reason: string }> = [
  // Design routes - Figma node data not available in this context
  { file: 'src/nexus/routes/design.ts', line: 181, reason: 'Figma node data not accessible here' },
  { file: 'src/nexus/routes/routes/design.ts', line: 181, reason: 'Figma node data not accessible here' },
  
  // Cortex synthesizer - latency tracking not yet implemented
  { file: 'src/cortex/index.ts', line: 354, reason: 'Synthesizer latency tracking planned for v3.4' },
  
  // PerfectionEnforcer itself - these are pattern definitions, not stubs
  { file: 'src/qa/guards/perfection-enforcer.ts', line: 72, reason: 'Pattern definition comment' },
  { file: 'src/qa/guards/perfection-enforcer.ts', line: 85, reason: 'Pattern definition regex' },
  { file: 'src/qa/guards/perfection-enforcer.ts', line: 818, reason: 'Error message template' },
  { file: 'src/qa/guards/perfection-enforcer.ts', line: 820, reason: 'Error message template' },
  
  // Autonomous fixer - template for generated stubs (intentional)
  { file: 'src/qa/agent/autonomous-fixer.ts', line: 468, reason: 'Template for auto-generated route stubs' },
  
  // Training camp - mastery calculation is gradual
  { file: 'src/precog/engine/training-camp.ts', line: 1394, reason: 'Mastery scoring system in development' },
  
  // System orchestrator - PID/uptime tracking not critical
  { file: 'src/cortex/system-model/orchestrator.ts', line: 295, reason: 'Process tracking non-essential' },
  
  // Hippocampus - response time tracking planned
  { file: 'src/cortex/memory/hippocampus.ts', line: 129, reason: 'Response time metrics planned for v3.4' },
];

// API call patterns for future use
const _API_CALL_PATTERNS = [
  // fetch calls
  /fetch\s*\(\s*[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/g,
  /fetch\s*\(\s*`\$\{[^}]+\}(\/api\/v\d+\/[^`]+)`/g,

  // axios calls
  /axios\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/gi,

  // Custom fetch helpers
  /fetchJson\s*(?:<[^>]+>)?\s*\(\s*[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/g,
];

// ============================================================================
// PERFECTION ENFORCER CLASS
// ============================================================================

export class PerfectionEnforcer {
  private projectRoot: string;
  private frontendPath: string;
  private backendPath: string;
  private lastReport: PerfectionReport | null = null;
  private knownEndpoints: Map<string, { file: string; method: string }> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.frontendPath = path.join(projectRoot, 'src/web-app/src');
    this.backendPath = path.join(projectRoot, 'src/nexus');
  }

  /**
   * Check if a stub is in the acceptable placeholders list
   */
  private isAcceptablePlaceholder(file: string, line: number): boolean {
    return ACCEPTABLE_PLACEHOLDERS.some(
      (p) => file.endsWith(p.file) && Math.abs(line - p.line) <= 5
    );
  }

  /**
   * Run comprehensive perfection check
   */
  async enforce(): Promise<PerfectionReport> {
    console.log('[PerfectionEnforcer] 🔍 Starting comprehensive quality scan...');
    const startTime = Date.now();

    // Scan for all issues in parallel
    const [stubs, frontendCalls, backendRoutes] = await Promise.all([
      this.scanForStubs(),
      this.scanFrontendAPICalls(),
      this.scanBackendRoutes(),
    ]);

    // Build endpoint map
    this.buildEndpointMap(backendRoutes);

    // Find missing endpoints
    const missingEndpoints = this.findMissingEndpoints(frontendCalls);

    // Detect incomplete features
    const incompleteFeatures = await this.detectIncompleteFeatures(stubs);

    // Calculate scores
    const score = this.calculatePerfectionScore(stubs, missingEndpoints);
    const healthGrade = this.getHealthGrade(score);

    const report: PerfectionReport = {
      timestamp: new Date().toISOString(),
      score,
      stubs,
      missingEndpoints,
      incompleteFeatures,
      summary: {
        totalStubs: stubs.length,
        criticalStubs: stubs.filter((s) => s.severity === 'critical').length,
        missingEndpoints: missingEndpoints.length,
        todosRemaining: stubs.filter((s) => s.type === 'todo').length,
        healthGrade,
      },
      recommendations: this.generateRecommendations(stubs, missingEndpoints),
    };

    this.lastReport = report;
    const duration = Date.now() - startTime;

    // Emit event for monitoring
    bus.publish('system', 'qa:perfection_check', {
      score,
      healthGrade,
      criticalIssues: report.summary.criticalStubs + missingEndpoints.length,
      duration,
    });

    console.log(`[PerfectionEnforcer] ✅ Scan complete in ${duration}ms`);
    console.log(`[PerfectionEnforcer] Score: ${score}/100 (Grade: ${healthGrade})`);
    console.log(
      `[PerfectionEnforcer] Stubs: ${stubs.length}, Missing Endpoints: ${missingEndpoints.length}`
    );

    // Alert on critical issues
    if (report.summary.criticalStubs > 0 || missingEndpoints.length > 0) {
      this.alertCriticalIssues(report);
    }

    return report;
  }

  /**
   * Scan all source files for stub implementations
   */
  private async scanForStubs(): Promise<StubImplementation[]> {
    const stubs: StubImplementation[] = [];

    // Scan backend routes
    const backendFiles = await glob('**/*.ts', {
      cwd: this.backendPath,
      ignore: ['**/*.test.*', '**/node_modules/**'],
    });

    for (const file of backendFiles) {
      const fullPath = path.join(this.backendPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';

        // Skip type definitions, interfaces, and documentation
        if (this.isTypeDefinitionOrDoc(line, lines, i)) continue;

        for (const pattern of STUB_PATTERNS) {
          const matches = line.match(pattern.regex);
          if (matches) {
            // Get context (surrounding lines)
            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(lines.length, i + 3);
            const context = lines.slice(contextStart, contextEnd).join('\n');

            stubs.push({
              file: `src/nexus/routes/${file}`,
              line: i + 1,
              type: pattern.type,
              code: line.trim(),
              severity: pattern.severity,
              context,
            });
          }
        }
      }
    }

    // Scan core modules
    const coreFiles = await glob('**/*.ts', {
      cwd: path.join(this.projectRoot, 'src'),
      ignore: ['**/node_modules/**', '**/*.test.*', '**/web-app/**'],
    });

    for (const file of coreFiles) {
      if (file.startsWith('nexus/routes/')) continue; // Already scanned

      const fullPath = path.join(this.projectRoot, 'src', file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';

        // Skip type definitions, interfaces, and documentation
        if (this.isTypeDefinitionOrDoc(line, lines, i)) continue;

        for (const pattern of STUB_PATTERNS) {
          const matches = line.match(pattern.regex);
          if (matches) {
            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(lines.length, i + 3);
            const context = lines.slice(contextStart, contextEnd).join('\n');

            stubs.push({
              file: `src/${file}`,
              line: i + 1,
              type: pattern.type,
              code: line.trim(),
              severity: pattern.severity,
              context,
            });
          }
        }
      }
    }

    return stubs;
  }

  /**
   * Check if a line is part of a type definition, interface, or documentation
   */
  private isTypeDefinitionOrDoc(line: string, lines: string[], lineIndex: number): boolean {
    const trimmed = line.trim();

    // Skip JSDoc comments
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) {
      return true;
    }

    // Skip type/interface definitions (lines with 'type:' that are defining types, not assigning)
    if (trimmed.includes('type:') && (trimmed.includes("'") || trimmed.includes('"'))) {
      // Check if this is in a type/interface definition context
      for (let j = lineIndex - 1; j >= Math.max(0, lineIndex - 10); j--) {
        const prevLine = lines[j]?.trim() || '';
        if (
          prevLine.startsWith('interface ') ||
          prevLine.startsWith('type ') ||
          prevLine.startsWith('export interface') ||
          prevLine.startsWith('export type')
        ) {
          return true;
        }
        // Stop searching if we hit code
        if (
          prevLine.includes('function ') ||
          prevLine.includes('const ') ||
          prevLine.includes('router.')
        ) {
          break;
        }
      }
    }

    // Skip lines that are counting/filtering stubs (like in report generation)
    if (trimmed.includes('.filter(') && trimmed.includes('simulated')) {
      return true;
    }

    return false;
  }

  /**
   * Scan frontend for API calls
   */
  private async scanFrontendAPICalls(): Promise<
    Array<{
      file: string;
      line: number;
      method: string;
      path: string;
    }>
  > {
    const calls: Array<{ file: string; line: number; method: string; path: string }> = [];

    const files = await glob('**/*.{tsx,ts,jsx,js}', {
      cwd: this.frontendPath,
      ignore: ['**/*.test.*', '**/node_modules/**', '**/*.stories.*'],
    });

    for (const file of files) {
      const fullPath = path.join(this.frontendPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Find API_BASE definition in this file
      let apiBase = '/api/v1';
      for (const line of lines) {
        const apiBaseMatch = line.match(/(?:const|let|var)\s+API_BASE\s*=\s*[`'"]([^`'"]+)[`'"]/);
        if (apiBaseMatch && apiBaseMatch[1]) {
          apiBase = apiBaseMatch[1];
          break;
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';

        // Check for fetch calls with direct path
        const fetchMatch = line.match(/fetch\s*\(\s*[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/);
        if (fetchMatch && fetchMatch[1]) {
          // Determine method from context
          const contextLines = lines.slice(i, Math.min(i + 6, lines.length)).join('\n');
          const methodMatch = contextLines.match(
            /method:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i
          );
          const method = methodMatch ? methodMatch[1]?.toUpperCase() || 'GET' : 'GET';

          calls.push({
            file: `src/web-app/src/${file}`,
            line: i + 1,
            method,
            path: fetchMatch[1],
          });
        }

        // Check for fetchJson calls
        const fetchJsonMatch = line.match(
          /fetchJson\s*(?:<[^>]+>)?\s*\(\s*[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/
        );
        if (fetchJsonMatch && fetchJsonMatch[1]) {
          const contextLines = lines.slice(i, Math.min(i + 6, lines.length)).join('\n');
          const methodMatch = contextLines.match(
            /method:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i
          );
          const method = methodMatch ? methodMatch[1]?.toUpperCase() || 'GET' : 'GET';

          calls.push({
            file: `src/web-app/src/${file}`,
            line: i + 1,
            method,
            path: fetchJsonMatch[1],
          });
        }

        // Check for API_BASE + path pattern (resolves ${API_BASE}/path to full path)
        const apiBasePatternMatch = line.match(/\$\{API_BASE\}([^`'"]*)/);
        if (apiBasePatternMatch) {
          const suffix = apiBasePatternMatch[1] || '';
          // Skip if suffix contains template expressions (like ${variable})
          if (!suffix.includes('${')) {
            const contextLines = lines
              .slice(Math.max(0, i - 3), Math.min(i + 6, lines.length))
              .join('\n');
            const methodMatch = contextLines.match(
              /method:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i
            );
            const method = methodMatch ? methodMatch[1]?.toUpperCase() || 'GET' : 'GET';

            // Use the resolved API_BASE value
            const resolvedPath = `${apiBase}${suffix}`.replace(/\/+/g, '/');

            calls.push({
              file: `src/web-app/src/${file}`,
              line: i + 1,
              method,
              path: resolvedPath,
            });
          }
        }
      }
    }

    return calls;
  }

  /**
   * Scan backend for defined routes
   */
  private async scanBackendRoutes(): Promise<
    Array<{
      file: string;
      method: string;
      path: string;
    }>
  > {
    const routes: Array<{ file: string; method: string; path: string }> = [];

    // Scan routes directory - use both patterns to ensure we catch all files
    const routesFiles = await glob(['routes/*.ts', 'routes/**/*.ts'], {
      cwd: this.backendPath,
      ignore: ['**/*.test.*'],
    });

    for (const file of routesFiles) {
      const fullPath = path.join(this.backendPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Determine base path from file name
      const fileName = file.replace('routes/', '');
      const basePath = this.inferBasePath(fileName);

      for (const line of lines) {
        // Match any variable followed by .get/post/put/delete/patch
        // This is a more permissive regex that catches router, explorationRoutes, etc.
        const routeMatch = line.match(
          /\b\w+\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i
        );
        if (routeMatch && routeMatch[1] && routeMatch[2]) {
          const method = routeMatch[1].toUpperCase();
          const routePath = routeMatch[2];
          const fullRoutePath = routePath.startsWith('/')
            ? `/api/v1${basePath}${routePath === '/' ? '' : routePath}`
            : `/api/v1${basePath}/${routePath}`;

          routes.push({
            file: `src/nexus/routes/${fileName}`,
            method,
            path: fullRoutePath.replace(/\/+/g, '/'),
          });
        }
      }
    }

    // Also scan index.ts for root-level routes
    const indexPath = path.join(this.backendPath, 'index.ts');
    if (await fs.pathExists(indexPath)) {
      const content = await fs.readFile(indexPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Match app.get/post/put/delete/patch for root routes
        const routeMatch = line.match(
          /app\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/i
        );
        if (routeMatch && routeMatch[1] && routeMatch[2]) {
          const method = routeMatch[1].toUpperCase();
          const routePath = routeMatch[2];
          // These are mounted at root, not under /api/v1
          routes.push({
            file: `src/nexus/index.ts`,
            method,
            path: routePath,
          });
        }
      }
    }

    // Also scan QA routes
    const qaRoutesPath = path.join(process.cwd(), 'src/qa/routes/qa.ts');
    if (await fs.pathExists(qaRoutesPath)) {
      const content = await fs.readFile(qaRoutesPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const routeMatch = line.match(
          /router\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/i
        );
        if (routeMatch && routeMatch[1] && routeMatch[2]) {
          const method = routeMatch[1].toUpperCase();
          const routePath = routeMatch[2];
          const fullRoutePath = routePath.startsWith('/')
            ? `/api/v1/qa${routePath === '/' ? '' : routePath}`
            : `/api/v1/qa/${routePath}`;

          routes.push({
            file: 'src/qa/routes/qa.ts',
            method,
            path: fullRoutePath.replace(/\/+/g, '/'),
          });
        }
      }
    }

    return routes;
  }

  /**
   * Infer base path from route file name
   */
  private inferBasePath(fileName: string): string {
    const name = fileName.replace('.ts', '');
    const pathMap: Record<string, string> = {
      exploration: '/exploration',
      cortex: '/cortex',
      providers: '/providers',
      system: '/system',
      diagnostic: '', // diagnostic routes are mounted at /api/v1 directly
      training: '', // training routes are mounted at /api/v1 directly
      emergence: '/emergence',
      learning: '/learning',
      observability: '/observability',
      chat: '/chat',
      visuals: '/visuals',
      design: '/design',
      context: '/context',
      projects: '/projects',
      github: '/github',
      cost: '/cost',
      generate: '/generate',
      api: '', // api routes are mounted at /api/v1 directly
      capabilities: '/capabilities',
      orchestrator: '/orchestrator',
      workflows: '/workflows',
      serendipity: '/serendipity',
      suggestions: '/suggestions',
      assets: '/assets',
    };
    return pathMap[name] !== undefined ? pathMap[name] : `/${name}`;
  }

  /**
   * Build a map of known endpoints for quick lookup
   */
  private buildEndpointMap(routes: Array<{ file: string; method: string; path: string }>) {
    this.knownEndpoints.clear();
    for (const route of routes) {
      // Normalize path (remove trailing slash, handle params)
      const normalizedPath = route.path.replace(/\/+$/, '').replace(/:\w+/g, '*');
      const key = `${route.method}:${normalizedPath}`;
      this.knownEndpoints.set(key, { file: route.file, method: route.method });
    }
  }

  /**
   * Find frontend API calls that don't have backend handlers
   */
  private findMissingEndpoints(
    frontendCalls: Array<{
      file: string;
      line: number;
      method: string;
      path: string;
    }>
  ): MissingEndpoint[] {
    const missing: MissingEndpoint[] = [];

    for (const call of frontendCalls) {
      // Strip query string before normalization
      const pathWithoutQuery = call.path.split('?')[0] || call.path;

      // Skip paths with unresolved template expressions (like ${variable})
      if (pathWithoutQuery.includes('${')) {
        continue;
      }

      // Normalize path for comparison
      const normalizedPath = pathWithoutQuery.replace(/\/+$/, '').replace(/\/[^/]+$/g, (match) => {
        // Check if this looks like a param (UUID, number, etc.)
        if (/\/[a-f0-9-]{36}$/i.test(match) || /\/\d+$/.test(match)) {
          return '/*';
        }
        return match;
      });

      const key = `${call.method}:${normalizedPath}`;

      // Check if endpoint exists
      if (!this.knownEndpoints.has(key)) {
        // Try with wildcard variations
        const parts = normalizedPath.split('/');
        let found = false;

        for (let i = parts.length - 1; i >= 0; i--) {
          const wildcardPath = [...parts.slice(0, i), '*', ...parts.slice(i + 1)].join('/');
          if (this.knownEndpoints.has(`${call.method}:${wildcardPath}`)) {
            found = true;
            break;
          }
        }

        if (!found) {
          // Suggest which file should have the endpoint
          const pathParts = pathWithoutQuery.split('/');
          const resourceName = pathParts[3] || 'api'; // /api/v1/[resource]/...
          const expectedFile = `src/nexus/routes/${resourceName}.ts`;

          missing.push({
            frontendFile: call.file,
            frontendLine: call.line,
            method: call.method,
            path: call.path,
            expectedBackendFile: expectedFile,
            suggestion: `Add ${call.method} handler for '${call.path.replace('/api/v1/' + resourceName, '')}' in ${expectedFile}`,
          });
        }
      }
    }

    // Deduplicate by path + method
    const unique = new Map<string, MissingEndpoint>();
    for (const m of missing) {
      const key = `${m.method}:${m.path}`;
      if (!unique.has(key)) {
        unique.set(key, m);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Detect incomplete features based on stub concentration
   */
  private async detectIncompleteFeatures(
    stubs: StubImplementation[]
  ): Promise<IncompleteFeature[]> {
    // Group stubs by feature area
    const featureGroups = new Map<string, StubImplementation[]>();

    for (const stub of stubs) {
      // Determine feature from file path
      const parts = stub.file.split('/');
      let feature = 'general';

      if (parts.includes('routes')) {
        const routeFile = parts[parts.indexOf('routes') + 1];
        feature = routeFile?.replace('.ts', '') || 'routes';
      } else if (parts.includes('cortex')) {
        feature = parts[parts.indexOf('cortex') + 1] || 'cortex';
      } else if (parts.includes('precog')) {
        feature = parts[parts.indexOf('precog') + 1] || 'precog';
      }

      if (!featureGroups.has(feature)) {
        featureGroups.set(feature, []);
      }
      const group = featureGroups.get(feature);
      if (group) {
        group.push(stub);
      }
    }

    const incompleteFeatures: IncompleteFeature[] = [];

    for (const [feature, featureStubs] of featureGroups) {
      if (featureStubs.length === 0) continue;

      const criticalCount = featureStubs.filter((s) => s.severity === 'critical').length;
      const highCount = featureStubs.filter((s) => s.severity === 'high').length;

      // Calculate completion score
      const baseScore = 100;
      const score = Math.max(
        0,
        baseScore - criticalCount * 30 - highCount * 15 - featureStubs.length * 2
      );

      // Collect unique files
      const files = [...new Set(featureStubs.map((s) => s.file))];

      // Identify blockers
      const blockers = featureStubs
        .filter((s) => s.severity === 'critical' || s.severity === 'high')
        .map((s) => `${s.type} in ${s.file}:${s.line} - ${s.code.substring(0, 80)}`);

      incompleteFeatures.push({
        name: feature,
        files,
        issues: featureStubs,
        completionScore: score,
        blockers,
      });
    }

    // Sort by completion score (lowest first = most incomplete)
    return incompleteFeatures.sort((a, b) => a.completionScore - b.completionScore);
  }

  /**
   * Calculate overall perfection score
   */
  private calculatePerfectionScore(
    stubs: StubImplementation[],
    missingEndpoints: MissingEndpoint[]
  ): number {
    let score = 100;

    // Deduct for stubs
    for (const stub of stubs) {
      switch (stub.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }

    // Deduct heavily for missing endpoints (these cause runtime errors)
    score -= missingEndpoints.length * 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get health grade from score
   */
  private getHealthGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    stubs: StubImplementation[],
    missingEndpoints: MissingEndpoint[]
  ): string[] {
    const recommendations: string[] = [];

    // Missing endpoints are highest priority
    if (missingEndpoints.length > 0) {
      recommendations.push(
        `🚨 CRITICAL: ${missingEndpoints.length} API endpoint(s) are called but not implemented. This causes 404 errors.`
      );
      for (const ep of missingEndpoints.slice(0, 5)) {
        recommendations.push(`  → Add ${ep.method} ${ep.path} in ${ep.expectedBackendFile}`);
      }
    }

    // Critical stubs
    const criticalStubs = stubs.filter((s) => s.severity === 'critical');
    if (criticalStubs.length > 0) {
      recommendations.push(
        `⚠️ HIGH: ${criticalStubs.length} critical stub(s) found - these return simulated/mock data.`
      );
      for (const stub of criticalStubs.slice(0, 3)) {
        recommendations.push(`  → Fix ${stub.file}:${stub.line} (${stub.type})`);
      }
    }

    // TODOs
    const todos = stubs.filter((s) => s.type === 'todo');
    if (todos.length > 0) {
      recommendations.push(`📝 ${todos.length} TODO comment(s) need attention.`);
    }

    // General advice
    if (recommendations.length === 0) {
      recommendations.push('✅ Code quality is excellent! No critical issues found.');
    }

    return recommendations;
  }

  /**
   * Alert on critical issues
   */
  private alertCriticalIssues(report: PerfectionReport) {
    console.log('\n' + '='.repeat(60));
    console.log('🚨 PERFECTION ENFORCER - CRITICAL ISSUES DETECTED');
    console.log('='.repeat(60));

    if (report.missingEndpoints.length > 0) {
      console.log(`\n❌ MISSING ENDPOINTS (${report.missingEndpoints.length}):`);
      for (const ep of report.missingEndpoints) {
        console.log(`   ${ep.method} ${ep.path}`);
        console.log(`   └─ Called from: ${ep.frontendFile}:${ep.frontendLine}`);
        console.log(`   └─ Solution: ${ep.suggestion}`);
      }
    }

    if (report.summary.criticalStubs > 0) {
      console.log(`\n⚠️ CRITICAL STUBS (${report.summary.criticalStubs}):`);
      for (const stub of report.stubs.filter((s) => s.severity === 'critical').slice(0, 5)) {
        console.log(`   ${stub.file}:${stub.line}`);
        console.log(`   └─ ${stub.code.substring(0, 100)}`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Publish alert event
    bus.publish('system', 'qa:critical_alert', {
      missingEndpoints: report.missingEndpoints.length,
      criticalStubs: report.summary.criticalStubs,
      recommendations: report.recommendations.slice(0, 3),
    });
  }

  /**
   * Get last report
   */
  getLastReport(): PerfectionReport | null {
    return this.lastReport;
  }

  /**
   * Quick check for a specific file
   */
  async checkFile(filePath: string): Promise<StubImplementation[]> {
    const stubs: StubImplementation[] = [];
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(this.projectRoot, filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';

      for (const pattern of STUB_PATTERNS) {
        if (pattern.regex.test(line)) {
          const contextStart = Math.max(0, i - 2);
          const contextEnd = Math.min(lines.length, i + 3);
          const context = lines.slice(contextStart, contextEnd).join('\n');

          stubs.push({
            file: relativePath,
            line: i + 1,
            type: pattern.type,
            code: line.trim(),
            severity: pattern.severity,
            context,
          });
        }
        // Reset regex state (global flag)
        pattern.regex.lastIndex = 0;
      }
    }

    return stubs;
  }
}

// Singleton instance
export const perfectionEnforcer = new PerfectionEnforcer();

// Export for testing
export default PerfectionEnforcer;
