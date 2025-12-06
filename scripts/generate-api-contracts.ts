#!/usr/bin/env tsx
// @version 3.3.193
/**
 * API Contracts Generator
 *
 * Scans all route files in src/nexus/routes/ and generates
 * API_CONTRACTS entries for every endpoint.
 *
 * Usage: npx tsx scripts/generate-api-contracts.ts
 * Output: Writes to src/qa/types/index.ts or creates a contracts file
 *
 * @module scripts/generate-api-contracts
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  fullPath: string;
  file: string;
  intent: string;
  owner: 'cortex' | 'precog' | 'nexus' | 'qa';
  line: number;
  auth: boolean;
  deprecated: boolean;
  parameters: Array<{ name: string; type: string; description: string; required: boolean }>;
}

interface ContractEntry {
  key: string;
  method: string;
  path: string;
  intent: string;
  owner: string;
  auth: boolean;
  deprecated: boolean;
  parameters: Array<{ name: string; type: string; description: string; required: boolean }>;
}

// ============================================================================
// ROUTE FILE PATTERNS
// ============================================================================

const ROUTE_FILE_OWNERS: Record<string, 'cortex' | 'precog' | 'nexus' | 'qa'> = {
  // Cortex endpoints
  'agent.ts': 'cortex',
  'cognitive.ts': 'cortex',
  'exploration.ts': 'cortex',
  'learning.ts': 'cortex',
  'emergence.ts': 'cortex',
  'cortex.ts': 'cortex',
  'growth-engine.ts': 'cortex',
  'configuration.ts': 'cortex',
  'orchestrator.ts': 'cortex',
  'serendipity.ts': 'cortex',
  'capabilities.ts': 'cortex',
  'context.ts': 'cortex',
  'visuals.ts': 'cortex',
  'chat.ts': 'cortex',
  'generate.ts': 'cortex',
  'workflows.ts': 'cortex',
  // Nexus endpoints
  'system.ts': 'nexus',
  'self-mod.ts': 'nexus',
  'autonomous-mod.ts': 'nexus',
  'api.ts': 'nexus',
  'projects.ts': 'nexus',
  'design.ts': 'nexus',
  'github.ts': 'nexus',
  'assets.ts': 'nexus',
  'suggestions.ts': 'nexus',
  // Precog endpoints
  'providers.ts': 'precog',
  'cost.ts': 'precog',
  // QA endpoints
  'diagnostic.ts': 'qa',
  'observability.ts': 'qa',
  'qa.ts': 'qa',
};

const ROUTE_BASE_PATHS: Record<string, string> = {
  'agent.ts': '/api/v1/agent',
  'api.ts': '/api/v1',
  'assets.ts': '/api/v1/assets',
  'capabilities.ts': '/api/v1/capabilities',
  'chat.ts': '/api/v1/chat',
  'cognitive.ts': '/api/v1/cognitive',
  'context.ts': '/api/v1/context',
  'cortex.ts': '/api/v1/cortex',
  'cost.ts': '/api/v1/cost',
  'design.ts': '/api/v1/design',
  'diagnostic.ts': '/api/v1/diagnostic',
  'emergence.ts': '/api/v1/emergence',
  'exploration.ts': '/api/v1/exploration',
  'generate.ts': '/api/v1/generate',
  'growth-engine.ts': '/api/v1/growth',
  'configuration.ts': '/api/v1/config',
  'github.ts': '/api/v1/github',
  'learning.ts': '/api/v1/learning',
  'observability.ts': '/api/v1/observability',
  'orchestrator.ts': '/api/v1/orchestrator',
  'projects.ts': '/api/v1/projects',
  'providers.ts': '/api/v1/providers',
  'qa.ts': '/api/v1/qa',
  'self-mod.ts': '/api/v1/system/self',
  'autonomous-mod.ts': '/api/v1/system/autonomous',
  'serendipity.ts': '/api/v1/serendipity',
  'suggestions.ts': '/api/v1/suggestions',
  'system.ts': '/api/v1/system',
  'training.ts': '/api/v1/training',
  'visuals.ts': '/api/v1/visuals',
};

// ============================================================================
// EXTRACTION LOGIC
// ============================================================================

function extractMethodFromContent(
  content: string,
  line: number,
  direction: 'up' | 'down' = 'up'
): 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | null {
  const lines = content.split('\n');
  const searchStart = direction === 'up' ? Math.max(0, line - 10) : line;
  const searchEnd = direction === 'up' ? line : Math.min(lines.length, line + 10);

  const searchText = lines.slice(searchStart, searchEnd).join('\n');

  const match = searchText.match(/router\.(get|post|put|delete|patch)\s*\(/i);
  if (match) {
    return match[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  }

  return null;
}

function extractPathFromRoute(routerCall: string): string | null {
  // Match router.get('/path', ...) or router.post('/path', ...)
  const match = routerCall.match(/router\.\w+\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (match) {
    return match[1];
  }
  return null;
}

function extractMetadataFromComment(comment: string) {
  const lines = comment.split('\n');
  let intent = 'API endpoint';
  let auth = false;
  let deprecated = false;
  const parameters: Array<{ name: string; type: string; description: string; required: boolean }> =
    [];

  // Extract Intent
  const descMatch = comment.match(/@description\s+(.+?)(?=\n|$)/);
  if (descMatch) {
    intent = descMatch[1].trim();
  } else {
    const intentMatch = comment.match(/@intent\s+(.+?)(?=\n|$)/);
    if (intentMatch) {
      intent = intentMatch[1].trim();
    } else {
      // Fallback: first line of comment
      const cleanLines = lines.filter(
        (l) => l.trim() && !l.includes('*') && !l.trim().startsWith('@')
      );
      if (cleanLines.length > 0) {
        intent = cleanLines[0].trim();
      }
    }
  }

  // Extract Auth
  if (comment.includes('@auth') || comment.includes('@protected')) {
    auth = true;
  }

  // Extract Deprecated
  if (comment.includes('@deprecated')) {
    deprecated = true;
  }

  // Extract Parameters
  // Format: @param {type} [name] - description OR @param {type} name - description
  const paramRegex = /@param\s+\{([^}]+)\}\s+(\[?[\w\.]+\]?)\s*-\s*(.+)/g;
  let match;
  while ((match = paramRegex.exec(comment)) !== null) {
    const type = match[1];
    let name = match[2];
    const description = match[3];
    let required = true;

    if (name.startsWith('[') && name.endsWith(']')) {
      name = name.slice(1, -1);
      required = false;
    }

    parameters.push({ name, type, description, required });
  }

  return { intent, auth, deprecated, parameters };
}

async function scanRouteFile(filePath: string): Promise<ExtractedEndpoint[]> {
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const endpoints: ExtractedEndpoint[] = [];

  const basePath = ROUTE_BASE_PATHS[fileName] || '/api/v1';
  const owner = ROUTE_FILE_OWNERS[fileName] || 'nexus';

  // Find all JSDoc comments followed by router calls
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for router method calls (router.get or xxxRoutes.get)
    const routerMatch = line.match(
      /^\s*(?:export\s+)?(?:const\s+\w+Routes\s*=\s*)?(\w+)\.(get|post|put|delete|patch)\s*\(/i
    );
    if (!routerMatch) continue;

    const variableName = routerMatch[1];
    // Ensure it's a router object
    if (variableName !== 'router' && !variableName.endsWith('Routes')) {
      continue;
    }

    const method = routerMatch[2].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    // Extract path from this line or next few lines
    let pathMatch = line.match(/\(\s*['"`]([^'"`]+)['"`]/);
    let routePath = pathMatch ? pathMatch[1] : null;

    if (!routePath) {
      // Try next line
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        pathMatch = lines[j].match(/['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          routePath = pathMatch[1];
          break;
        }
      }
    }

    if (!routePath) continue;

    // Look for JSDoc comment before this route
    let metadata = { intent: 'API endpoint', auth: false, deprecated: false, parameters: [] };
    for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
      const prevLine = lines[j];
      if (prevLine.includes('/**')) {
        // Found start of JSDoc, extract intent
        const commentBlock = lines.slice(j, i).join('\n');
        metadata = extractMetadataFromComment(commentBlock);
        break;
      }
    }

    const fullPath = basePath + routePath;

    endpoints.push({
      method,
      path: routePath,
      fullPath,
      file: fileName,
      intent: metadata.intent || 'API endpoint',
      owner,
      line: i + 1,
      auth: metadata.auth,
      deprecated: metadata.deprecated,
      parameters: metadata.parameters as any,
    });
  }

  return endpoints;
}

async function generateContracts(): Promise<ContractEntry[]> {
  const projectRoot = process.cwd();
  const allEndpoints: ExtractedEndpoint[] = [];

  const directoriesToScan = [
    path.join(projectRoot, 'src/nexus/routes'),
    path.join(projectRoot, 'src/qa/routes'),
  ];

  for (const routesDir of directoriesToScan) {
    if (!(await fs.pathExists(routesDir))) continue;

    const routeFiles = await glob('*.ts', {
      cwd: routesDir,
      ignore: ['index.ts', '*.test.ts'],
    });

    console.log(
      `[Generator] Found ${routeFiles.length} route files in ${path.relative(projectRoot, routesDir)}`
    );

    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      try {
        const endpoints = await scanRouteFile(filePath);
        allEndpoints.push(...endpoints);
        console.log(`[Generator] ${file}: extracted ${endpoints.length} endpoints`);
      } catch (err) {
        console.error(
          `[Generator] Error scanning ${file}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  // Generate contract entries
  const uniqueEndpoints = new Map<string, ExtractedEndpoint>();

  for (const ep of allEndpoints) {
    const key = `${ep.method} ${ep.fullPath}`;
    if (uniqueEndpoints.has(key)) {
      const existing = uniqueEndpoints.get(key)!;
      // Conflict resolution strategy:
      // 1. Prefer 'cortex' owner over 'nexus' (since nexus often proxies)
      // 2. Prefer non-default intent over default 'API endpoint'

      let replace = false;

      if (existing.owner === 'nexus' && ep.owner === 'cortex') {
        replace = true;
      } else if (existing.intent === 'API endpoint' && ep.intent !== 'API endpoint') {
        replace = true;
      }

      if (replace) {
        console.log(
          `[Generator] Replacing duplicate ${key} (Owner: ${existing.owner} -> ${ep.owner})`
        );
        uniqueEndpoints.set(key, ep);
      } else {
        console.log(`[Generator] Skipping duplicate ${key} from ${ep.file} (Owner: ${ep.owner})`);
      }
    } else {
      uniqueEndpoints.set(key, ep);
    }
  }

  const contracts: ContractEntry[] = Array.from(uniqueEndpoints.values()).map((ep) => ({
    key: `'${ep.method} ${ep.fullPath}'`,
    method: ep.method,
    path: ep.fullPath,
    intent: ep.intent.replace(/'/g, "\\'"),
    owner: ep.owner,
    auth: ep.auth,
    deprecated: ep.deprecated,
    parameters: ep.parameters,
  }));

  console.log(`[Generator] Generated ${contracts.length} contract entries`);

  return contracts.sort((a, b) => a.path.localeCompare(b.path));
}

function generateTypeScriptCode(contracts: ContractEntry[]): string {
  const contractLines = contracts
    .map(
      (c) =>
        `  ${c.key}: {
    method: '${c.method}',
    path: '${c.path}',
    response: z.object({ ok: z.boolean(), data: z.any().optional() }),
    intent: '${c.intent}',
    owner: '${c.owner}' as const,
    auth: ${c.auth},
    deprecated: ${c.deprecated},
    parameters: ${JSON.stringify(c.parameters)},
  },`
    )
    .join('\n');

  return `export const API_CONTRACTS: Record<string, APIContract> = {
${contractLines}
};`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('[API Contracts Generator] Starting...');

  const contracts = await generateContracts();

  const code = generateTypeScriptCode(contracts);

  // Save to a separate file for now
  const outputPath = path.join(process.cwd(), 'src/qa/contracts-generated.ts');
  await fs.writeFile(
    outputPath,
    `// @version 1.0.0
// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated by: scripts/generate-api-contracts.ts

import { z } from 'zod';
import type { APIContract } from './index.js';

${code}
`,
    'utf-8'
  );

  console.log(`[Generator] ✅ Generated contracts saved to: ${outputPath}`);
  console.log(`[Generator] Total contracts: ${contracts.length}`);

  // Summary by owner
  const byOwner = contracts.reduce(
    (acc, c) => {
      acc[c.owner] = (acc[c.owner] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('[Generator] Contracts by owner:');
  Object.entries(byOwner).forEach(([owner, count]) => {
    console.log(`  - ${owner}: ${count}`);
  });
}

main().catch(console.error);
