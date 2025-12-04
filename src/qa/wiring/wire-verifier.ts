// @version 2.2.175
/**
 * Wire Verifier - Frontend↔Backend Connection Validation
 *
 * Scans frontend code for API calls and socket events,
 * compares against backend routes, and detects mismatches.
 *
 * @module qa/wiring/wire-verifier
 */

import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';
import {
  FrontendAPICall,
  BackendRoute,
  SocketEvent,
  WireMismatch,
  WiringReport,
} from '../types/index.js';

/**
 * WireVerifier - Ensures frontend and backend are properly connected
 */
export class WireVerifier {
  private projectRoot: string;
  private frontendPath: string;
  private backendPath: string;
  private lastReport: WiringReport | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.frontendPath = path.join(projectRoot, 'src/web-app/src');
    this.backendPath = path.join(projectRoot, 'src/nexus/routes');
  }

  /**
   * Run full wiring verification
   */
  async verify(): Promise<WiringReport> {
    console.log('[WireVerifier] 🔌 Starting wiring verification...');

    const [frontendCalls, frontendSocket] = await Promise.all([
      this.scanFrontendAPICalls(),
      this.scanFrontendSocketEvents(),
    ]);

    const [backendRoutes, backendSocket] = await Promise.all([
      this.scanBackendRoutes(),
      this.scanBackendSocketHandlers(),
    ]);

    const mismatches = this.findMismatches(
      frontendCalls,
      frontendSocket,
      backendRoutes,
      backendSocket
    );

    const matched = frontendCalls.length + frontendSocket.length - mismatches.length;
    const total = frontendCalls.length + frontendSocket.length;

    const report: WiringReport = {
      timestamp: new Date().toISOString(),
      frontend: {
        apiCalls: frontendCalls,
        socketEvents: frontendSocket,
      },
      backend: {
        routes: backendRoutes,
        socketHandlers: backendSocket,
      },
      matched,
      mismatches,
      coverage: total > 0 ? (matched / total) * 100 : 100,
    };

    this.lastReport = report;
    console.log(
      `[WireVerifier] ✅ Wiring check complete: ${matched}/${total} connected (${report.coverage.toFixed(1)}%)`
    );

    return report;
  }

  /**
   * Scan frontend files for API calls
   */
  async scanFrontendAPICalls(): Promise<FrontendAPICall[]> {
    const calls: FrontendAPICall[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js}', {
      cwd: this.frontendPath,
      ignore: ['**/*.test.*', '**/node_modules/**'],
    });

    for (const file of files) {
      const fullPath = path.join(this.frontendPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Track API paths and their methods from the entire file context
      const pathsWithMethods = new Map<string, string>();

      // Track variable assignments to API paths
      const variableToPath = new Map<string, string>();

      // First pass: Find all variable assignments to API paths
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        // Match: endpoint = '/api/v1/...' or let url = '/api/v1/...'
        const varAssignMatch = line.match(/(\w+)\s*=\s*[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/);
        if (varAssignMatch && varAssignMatch[1] && varAssignMatch[2]) {
          variableToPath.set(varAssignMatch[1], varAssignMatch[2]);
        }
      }

      // Second pass: Find fetch/fetchJson calls with variables and determine their method
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        // Match: fetch(endpoint, { or fetchJson<T>(url, { or fetchJson(url, {
        const fetchVarCall = line.match(/(?:fetch|fetchJson)\s*(?:<[^>]+>)?\s*\(\s*(\w+)\s*,/);
        if (fetchVarCall && fetchVarCall[1]) {
          const varName = fetchVarCall[1];
          const apiPath = variableToPath.get(varName);
          if (apiPath) {
            // Look for method in surrounding context (next few lines)
            const contextLines = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
            const methodMatch = contextLines.match(
              /method:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i
            );
            const method = methodMatch ? (methodMatch[1]?.toUpperCase() ?? 'GET') : 'GET';
            pathsWithMethods.set(apiPath, method);
          }
        }
      }

      // Third pass: Find direct fetch calls with method in context
      for (let i = 0; i < lines.length; i++) {
        const lineContext = lines
          .slice(Math.max(0, i - 2), Math.min(i + 8, lines.length))
          .join('\n');

        // Check if this context has a method: 'POST'/'PUT'/'DELETE' etc
        const methodMatch = lineContext.match(/method:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i);
        const pathMatch = lineContext.match(/[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/);

        if (methodMatch && pathMatch && pathMatch[1]) {
          pathsWithMethods.set(pathMatch[1], methodMatch[1]?.toUpperCase() ?? 'GET');
        }
      }

      lines.forEach((line, index) => {
        // Match fetch calls with inline path
        const fetchMatch = line.match(/fetch\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/);
        if (fetchMatch && fetchMatch[1]) {
          // Look at surrounding context for method (fetch options often span multiple lines)
          const contextLines = lines.slice(index, Math.min(index + 6, lines.length)).join('\n');
          const method = this.extractMethodFromContext(contextLines, 'GET');
          calls.push({
            file,
            line: index + 1,
            method: method as FrontendAPICall['method'],
            path: fetchMatch[1],
            pattern: 'fetch',
          });
          return; // Skip further processing for this line
        }

        // Match axios calls
        const axiosMatch = line.match(
          /axios\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/i
        );
        if (axiosMatch && axiosMatch[1] && axiosMatch[2]) {
          calls.push({
            file,
            line: index + 1,
            method: axiosMatch[1].toUpperCase() as FrontendAPICall['method'],
            path: axiosMatch[2],
            pattern: 'axios',
          });
          return;
        }

        // Match fetch/fetchJson with variable as endpoint
        const fetchVarMatch = line.match(/(?:fetch|fetchJson)\s*(?:<[^>]+>)?\s*\(\s*(\w+)\s*,/);
        if (fetchVarMatch && fetchVarMatch[1]) {
          // Look for the variable definition in the file
          const varName = fetchVarMatch[1];
          const varDefMatch = content.match(
            new RegExp(`${varName}\\s*=\\s*['\`"](\/api\/[^'\`"]+)['\`"]`)
          );
          if (varDefMatch && varDefMatch[1]) {
            // Look for method in surrounding context
            const lineContext = lines.slice(Math.max(0, index - 2), index + 5).join('\n');
            const methodMatch = lineContext.match(
              /method:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i
            );
            const method = methodMatch && methodMatch[1] ? methodMatch[1].toUpperCase() : 'GET';

            calls.push({
              file,
              line: index + 1,
              method: method as FrontendAPICall['method'],
              path: varDefMatch[1],
              pattern: 'fetch',
            });
            return;
          }
        }

        // Match template literal API paths (only if not already matched by fetch/axios)
        const templateMatch = line.match(/[`'"](\/api\/v\d+\/[^`'"]+)[`'"]/);
        if (templateMatch && templateMatch[1]) {
          // Skip if this looks like a variable assignment that will be used with fetch/fetchJson
          const isVariableAssignment = line.match(/(\w+)\s*=\s*[`'"]/);
          if (isVariableAssignment && isVariableAssignment[1]) {
            const varName = isVariableAssignment[1];
            // Skip - this will be picked up by the fetch/fetchJson with variable pattern
            if (
              content.includes(`fetch(${varName}`) ||
              content.includes(`fetch( ${varName}`) ||
              content.includes(`fetchJson(${varName}`) ||
              (content.includes(`fetchJson<`) && content.includes(`>(${varName}`))
            ) {
              return;
            }
          }

          // Use the method from context if we found one
          const method = pathsWithMethods.get(templateMatch[1]) || 'GET';

          calls.push({
            file,
            line: index + 1,
            method: method as FrontendAPICall['method'],
            path: templateMatch[1],
            pattern: 'fetch',
          });
        }
      });
    }

    return calls;
  }

  /**
   * Scan frontend files for socket events
   */
  async scanFrontendSocketEvents(): Promise<SocketEvent[]> {
    const events: SocketEvent[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js}', {
      cwd: this.frontendPath,
      ignore: ['**/*.test.*', '**/node_modules/**'],
    });

    for (const file of files) {
      const fullPath = path.join(this.frontendPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, _index) => {
        // Match socket.emit
        const emitMatch = line.match(/socket\.emit\s*\(\s*[`'"]([^`'"]+)[`'"]/);
        if (emitMatch && emitMatch[1]) {
          events.push({
            file,
            event: emitMatch[1],
            direction: 'emit',
          });
        }

        // Match socket.on
        const onMatch = line.match(/socket\.on\s*\(\s*[`'"]([^`'"]+)[`'"]/);
        if (onMatch && onMatch[1]) {
          events.push({
            file,
            event: onMatch[1],
            direction: 'on',
          });
        }
      });
    }

    return events;
  }

  /**
   * Scan backend route files
   */
  async scanBackendRoutes(): Promise<BackendRoute[]> {
    const routes: BackendRoute[] = [];

    // Scan both nexus routes and qa routes
    const routeDirs = [
      { dir: this.backendPath, prefix: '' },
      { dir: path.join(this.projectRoot, 'src/qa/routes'), prefix: '' },
    ];

    // Also need to scan index.ts for base paths
    const basePaths = await this.getRouteBasePaths();

    for (const { dir } of routeDirs) {
      if (!(await fs.pathExists(dir))) continue;

      const files = await glob('**/*.ts', {
        cwd: dir,
        ignore: ['**/*.test.*'],
      });

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        const routeFile = file.replace('.ts', '');

        // Determine base path: check mapped paths, or use default pattern
        let basePath = basePaths[routeFile];
        if (!basePath) {
          // Default: /api/v1/{routename} unless it's a root-level route
          basePath = `/api/v1/${routeFile}`;
        }

        lines.forEach((line, index) => {
          // Match router.get/post/etc - handle both single paths and arrays
          // Also match named routers like explorationRoutes.get, qaRoutes.post etc
          const routeMatch = line.match(
            /(?:router|\w+[Rr]outes?)\.(get|post|put|delete|patch)\s*\(\s*(?:\[([^\]]+)\]|[`'"]([^`'"]+)[`'"])/i
          );
          if (routeMatch && routeMatch[1]) {
            const method = routeMatch[1].toUpperCase();
            // Could be array of paths or single path
            const pathsStr = routeMatch[2] ?? routeMatch[3];
            if (!pathsStr) return;
            const paths = pathsStr.includes(',')
              ? pathsStr.split(',').map((p) => p.trim().replace(/[`'"]/g, ''))
              : [pathsStr];

            for (const routePath of paths) {
              routes.push({
                file,
                method,
                path: routePath ?? '',
                fullPath: this.normalizePath(basePath + (routePath ?? '')),
                handler: `${file}:${index + 1}`,
              });
            }
          }

          // Match app.get/post/etc (for index.ts)
          const appMatch = line.match(
            /app\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/i
          );
          if (appMatch && appMatch[1] && appMatch[2]) {
            routes.push({
              file,
              method: appMatch[1].toUpperCase(),
              path: appMatch[2],
              fullPath: appMatch[2],
              handler: `${file}:${index + 1}`,
            });
          }
        });
      }
    }

    return routes;
  }

  /**
   * Scan backend socket handlers
   */
  async scanBackendSocketHandlers(): Promise<SocketEvent[]> {
    const events: SocketEvent[] = [];
    const socketPath = path.join(this.projectRoot, 'src/nexus/socket.ts');

    if (!(await fs.pathExists(socketPath))) {
      return events;
    }

    const content = await fs.readFile(socketPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line) => {
      // Match socket.on
      const onMatch = line.match(/socket\.on\s*\(\s*[`'"]([^`'"]+)[`'"]/);
      if (onMatch && onMatch[1]) {
        events.push({
          file: 'socket.ts',
          event: onMatch[1],
          direction: 'on',
        });
      }

      // Match socket.emit or io.emit
      const emitMatch = line.match(/(socket|io)\.emit\s*\(\s*[`'"]([^`'"]+)[`'"]/);
      if (emitMatch && emitMatch[2]) {
        events.push({
          file: 'socket.ts',
          event: emitMatch[2],
          direction: 'emit',
        });
      }
    });

    return events;
  }

  /**
   * Get route base paths from nexus/index.ts
   */
  private async getRouteBasePaths(): Promise<Record<string, string>> {
    const paths: Record<string, string> = {};
    const indexPath = path.join(this.projectRoot, 'src/nexus/index.ts');

    if (!(await fs.pathExists(indexPath))) {
      return paths;
    }

    const content = await fs.readFile(indexPath, 'utf-8');

    // Match app.use("/api/v1/xxx", xxxRoutes) - handles both xxxRoutes and xxxRoute
    const matches = content.matchAll(
      /app\.use\s*\(\s*[`'"]([^`'"]+)[`'"]\s*,\s*(\w+)Routes?\s*\)/g
    );

    for (const match of matches) {
      if (!match[1] || !match[2]) continue;
      // Extract route name from variable (e.g., "chat" from "chatRoutes")
      const routeName = match[2].toLowerCase();
      const basePath = match[1];

      // Store the base path for this route file
      // Note: apiRoutes and trainingRoutes are at /api/v1 (no extra suffix)
      paths[routeName] = basePath;
    }

    return paths;
  }

  /**
   * Find mismatches between frontend and backend
   */
  private findMismatches(
    frontendCalls: FrontendAPICall[],
    frontendSocket: SocketEvent[],
    backendRoutes: BackendRoute[],
    backendSocket: SocketEvent[]
  ): WireMismatch[] {
    const mismatches: WireMismatch[] = [];

    // Check API calls
    for (const call of frontendCalls) {
      const matchingRoute = this.findMatchingRoute(call, backendRoutes);
      if (!matchingRoute) {
        mismatches.push({
          frontend: call,
          issue: `No backend route for ${call.method} ${call.path}`,
          severity: 'critical',
          suggestion: `Add route in src/nexus/routes/ or fix frontend path`,
        });
      }
    }

    // Check socket emits from frontend
    for (const event of frontendSocket.filter((e) => e.direction === 'emit')) {
      const hasHandler = backendSocket.some((e) => e.direction === 'on' && e.event === event.event);
      if (!hasHandler) {
        mismatches.push({
          frontend: event,
          issue: `No backend handler for socket event "${event.event}"`,
          severity: 'critical',
          suggestion: `Add socket.on("${event.event}", ...) in src/nexus/socket.ts`,
        });
      }
    }

    // Check socket events frontend expects to receive
    for (const event of frontendSocket.filter((e) => e.direction === 'on')) {
      const hasEmitter = backendSocket.some(
        (e) => e.direction === 'emit' && e.event === event.event
      );
      if (!hasEmitter) {
        mismatches.push({
          frontend: event,
          issue: `Frontend listens for "${event.event}" but backend never emits it`,
          severity: 'warning',
          suggestion: `Ensure backend emits "${event.event}" or remove listener`,
        });
      }
    }

    return mismatches;
  }

  /**
   * Find matching backend route for a frontend call
   */
  private findMatchingRoute(
    call: FrontendAPICall,
    routes: BackendRoute[]
  ): BackendRoute | undefined {
    // Normalize the path for comparison
    const normalizedPath = this.normalizePath(call.path);

    return routes.find((route) => {
      if (route.method !== call.method) return false;

      // Exact match
      if (route.fullPath === normalizedPath) return true;

      // Pattern match (handle :params in backend routes)
      const backendPattern = route.fullPath.replace(/:\w+/g, '[^/]+');
      const backendRegex = new RegExp(`^${backendPattern}$`);
      if (backendRegex.test(normalizedPath)) return true;

      // Pattern match (handle ${...} template strings in frontend paths)
      const frontendPattern = normalizedPath.replace(/\$\{[^}]+\}/g, '[^/]+').replace(/\*/g, '.*');
      const frontendRegex = new RegExp(`^${frontendPattern}$`);
      if (frontendRegex.test(route.fullPath)) return true;

      // Handle wildcard routes (e.g., /maintenance/*)
      if (route.fullPath.includes('*')) {
        const wildcardPattern = route.fullPath.replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+');
        const wildcardRegex = new RegExp(`^${wildcardPattern}$`);
        if (wildcardRegex.test(normalizedPath)) return true;
      }

      return false;
    });
  }

  /**
   * Normalize API path
   */
  private normalizePath(p: string): string {
    // Remove query string, trailing slash, collapse multiple slashes
    return (
      p
        .split('?')[0] // Remove query string
        ?.replace(/\/+/g, '/')
        .replace(/\/$/, '') ?? p
    );
  }

  /**
   * Extract HTTP method from fetch call
   */
  private extractMethod(line: string, defaultMethod: string): string {
    const methodMatch = line.match(/method\s*:\s*[`'"](\w+)[`'"]/i);
    if (methodMatch && methodMatch[1]) {
      return methodMatch[1].toUpperCase();
    }
    // POST if there's a body
    if (line.includes('body:')) {
      return 'POST';
    }
    return defaultMethod;
  }

  /**
   * Extract HTTP method from multi-line context (fetch options often span multiple lines)
   */
  private extractMethodFromContext(context: string, defaultMethod: string): string {
    const methodMatch = context.match(/method\s*:\s*[`'"]?(POST|PUT|DELETE|PATCH|GET)[`'"]?/i);
    if (methodMatch && methodMatch[1]) {
      return methodMatch[1].toUpperCase();
    }
    // POST if there's a body
    if (context.includes('body:') || context.includes('body :')) {
      return 'POST';
    }
    return defaultMethod;
  }

  /**
   * Get last report
   */
  getLastReport(): WiringReport | null {
    return this.lastReport;
  }

  /**
   * Get quick summary
   */
  getSummary(): string {
    if (!this.lastReport) {
      return 'No wiring report available. Run verify() first.';
    }

    const { matched, mismatches, coverage } = this.lastReport;
    const status = mismatches.length === 0 ? '✅' : '⚠️';

    return `${status} Wiring: ${matched} connected, ${mismatches.length} issues (${coverage.toFixed(1)}% coverage)`;
  }
}

// Singleton instance
export const wireVerifier = new WireVerifier();
