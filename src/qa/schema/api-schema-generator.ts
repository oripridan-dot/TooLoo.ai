// @version 2.2.395
/**
 * API Schema Generator
 *
 * Generates OpenAPI 3.0 specification from route files.
 * Provides contract-first validation for frontend↔backend consistency.
 *
 * Features:
 * - Scans route files for endpoints
 * - Extracts request/response types where possible
 * - Generates OpenAPI 3.0 spec
 * - Can be used in CI to detect breaking changes
 *
 * @module qa/schema/api-schema-generator
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

interface Operation {
  summary: string;
  description?: string;
  operationId: string;
  tags: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  schema: SchemaObject;
}

interface RequestBody {
  required: boolean;
  content: Record<string, { schema: SchemaObject }>;
}

interface Response {
  description: string;
  content?: Record<string, { schema: SchemaObject }>;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  $ref?: string;
}

interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
}

interface ExtractedRoute {
  method: string;
  path: string;
  fullPath: string;
  handler: string;
  file: string;
  line: number;
  tag: string;
}

export class APISchemaGenerator {
  private projectRoot: string;
  private routesDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.routesDir = path.join(projectRoot, 'src/nexus/routes');
  }

  /**
   * Generate OpenAPI spec from route files
   */
  async generate(): Promise<OpenAPISpec> {
    console.log('[APISchemaGenerator] 📝 Generating OpenAPI specification...');

    const routes = await this.scanRoutes();
    const spec = this.buildSpec(routes);

    console.log(`[APISchemaGenerator] ✅ Generated spec with ${routes.length} endpoints`);

    return spec;
  }

  /**
   * Generate and save to file
   */
  async generateAndSave(outputPath?: string): Promise<string> {
    const spec = await this.generate();
    const filePath = outputPath || path.join(this.projectRoot, 'docs', 'openapi.json');

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJSON(filePath, spec, { spaces: 2 });

    console.log(`[APISchemaGenerator] 💾 Saved to ${filePath}`);
    return filePath;
  }

  /**
   * Scan route files for endpoints
   */
  private async scanRoutes(): Promise<ExtractedRoute[]> {
    const routes: ExtractedRoute[] = [];
    const files = await glob('**/*.ts', {
      cwd: this.routesDir,
      ignore: ['**/*.test.ts', '**/index.ts'],
    });

    for (const file of files) {
      const fullPath = path.join(this.routesDir, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Extract the base path from app.use or router prefix
      const tag = path.basename(file, '.ts');
      const basePath = this.extractBasePath(content, tag);

      // Find all route definitions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const routeMatch = line.match(
          /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/i
        );

        if (routeMatch && routeMatch[1] && routeMatch[2]) {
          const method = routeMatch[1].toUpperCase();
          const routePath = routeMatch[2];

          routes.push({
            method,
            path: routePath,
            fullPath: basePath + routePath.replace(/^\/?/, '/'),
            handler: `${file}:${i + 1}`,
            file,
            line: i + 1,
            tag,
          });
        }
      }
    }

    return routes;
  }

  /**
   * Extract base path from router usage
   */
  private extractBasePath(content: string, tag: string): string {
    // Look for app.use('/api/v1/...', router)
    const useMatch = content.match(/app\.use\s*\(\s*[`'"]([^`'"]+)[`'"]/);
    if (useMatch && useMatch[1]) {
      return useMatch[1];
    }

    // Default based on tag
    return `/api/v1/${tag}`;
  }

  /**
   * Build OpenAPI spec from extracted routes
   */
  private buildSpec(routes: ExtractedRoute[]): OpenAPISpec {
    const paths: Record<string, PathItem> = {};

    for (const route of routes) {
      // Convert Express path params to OpenAPI format
      const openApiPath = route.fullPath.replace(/:(\w+)/g, '{$1}');

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      const methodLower = route.method.toLowerCase() as keyof PathItem;
      const operation: Operation = {
        summary: `${route.method} ${route.path}`,
        operationId: this.generateOperationId(route),
        tags: [route.tag],
        parameters: this.extractParameters(route),
        responses: this.generateResponses(route),
      };

      // Add request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        };
      }

      paths[openApiPath][methodLower] = operation;
    }

    return {
      openapi: '3.0.3',
      info: {
        title: 'TooLoo.ai API',
        version: '2.2.391',
        description: 'Auto-generated API specification for TooLoo.ai backend routes',
      },
      servers: [{ url: 'http://localhost:4000', description: 'Development server' }],
      paths,
      components: {
        schemas: {
          StandardResponse: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              data: { type: 'object' },
              error: { type: 'string' },
              timestamp: { type: 'number' },
              version: { type: 'string' },
            },
            required: ['ok', 'timestamp'],
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              error: { type: 'string' },
              timestamp: { type: 'number' },
            },
            required: ['ok', 'error', 'timestamp'],
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };
  }

  /**
   * Generate operation ID from route
   */
  private generateOperationId(route: ExtractedRoute): string {
    const pathParts = route.path.replace(/^\//, '').replace(/:/g, '').split('/').filter(Boolean);

    const camelParts = pathParts.map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    );

    return (
      route.method.toLowerCase() +
      route.tag.charAt(0).toUpperCase() +
      route.tag.slice(1) +
      camelParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
    );
  }

  /**
   * Extract path and query parameters
   */
  private extractParameters(route: ExtractedRoute): Parameter[] {
    const params: Parameter[] = [];

    // Extract path parameters
    const pathParamMatches = route.path.matchAll(/:(\w+)/g);
    for (const match of pathParamMatches) {
      if (match[1]) {
        params.push({
          name: match[1],
          in: 'path',
          required: true,
          schema: { type: 'string' },
        });
      }
    }

    return params;
  }

  /**
   * Generate standard responses
   */
  private generateResponses(route: ExtractedRoute): Record<string, Response> {
    return {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StandardResponse' },
          },
        },
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    };
  }

  /**
   * Compare current routes against saved spec to detect breaking changes
   */
  async detectBreakingChanges(savedSpecPath: string): Promise<{
    breaking: string[];
    additions: string[];
    compatible: boolean;
  }> {
    const currentRoutes = await this.scanRoutes();

    let savedSpec: OpenAPISpec;
    try {
      savedSpec = await fs.readJSON(savedSpecPath);
    } catch {
      return {
        breaking: [],
        additions: currentRoutes.map((r) => `${r.method} ${r.fullPath}`),
        compatible: true,
      };
    }

    const savedPaths = new Set(
      Object.entries(savedSpec.paths).flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`)
      )
    );

    const currentPaths = new Set(
      currentRoutes.map((r) => `${r.method} ${r.fullPath.replace(/:(\w+)/g, '{$1}')}`)
    );

    const breaking: string[] = [];
    const additions: string[] = [];

    // Check for removed routes (breaking)
    for (const path of savedPaths) {
      if (!currentPaths.has(path)) {
        breaking.push(`REMOVED: ${path}`);
      }
    }

    // Check for added routes
    for (const path of currentPaths) {
      if (!savedPaths.has(path)) {
        additions.push(`ADDED: ${path}`);
      }
    }

    return {
      breaking,
      additions,
      compatible: breaking.length === 0,
    };
  }
}

// Singleton instance
export const apiSchemaGenerator = new APISchemaGenerator();
