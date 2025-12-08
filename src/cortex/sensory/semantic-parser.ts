// @version 2.2.76 - Re-enabled memory storage with chunking and rate limiting
import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import { EventBus } from '../../core/event-bus.js';

// Rate limiting configuration
const MEMORY_STORE_DELAY_MS = 500; // Delay between memory store events
const MAX_CHUNK_SIZE = 5000; // Max characters per chunk to avoid large payload issues

interface FunctionInfo {
  name: string;
  documentation: string;
}

interface InterfaceInfo {
  name: string;
  documentation: string;
}

interface ClassInfo {
  name: string;
  documentation: string;
  methods: string[];
}

interface SymbolInfo {
  path: string;
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
}

interface ProjectInfo {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  tsconfig: any;
  symbols: SymbolInfo[];
}

export class SemanticParser {
  private cachePath: string;
  private memoryStoreEnabled: boolean = true;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string
  ) {
    this.cachePath = path.join(workspaceRoot, 'data/memory/semantic-cache.json');
  }

  /**
   * Store data to memory with chunking and rate limiting to prevent 429 errors
   */
  private async storeToMemoryChunked(
    description: string,
    content: string,
    tags: string[]
  ): Promise<void> {
    if (!this.memoryStoreEnabled) return;

    // If content is small enough, store directly
    if (content.length <= MAX_CHUNK_SIZE) {
      this.bus.publish('cortex', 'memory:store', {
        description,
        content,
        type: 'system',
        tags,
      });
      return;
    }

    // Split into chunks for large content
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += MAX_CHUNK_SIZE) {
      chunks.push(content.slice(i, i + MAX_CHUNK_SIZE));
    }

    console.log(`[SemanticParser] Storing ${chunks.length} chunks for: ${description}`);

    // Store chunks with rate limiting
    for (let i = 0; i < chunks.length; i++) {
      this.bus.publish('cortex', 'memory:store', {
        description: `${description} (Part ${i + 1}/${chunks.length})`,
        content: chunks[i],
        type: 'system',
        tags: [...tags, `chunk-${i + 1}`],
      });

      // Rate limit between chunks
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, MEMORY_STORE_DELAY_MS));
      }
    }
  }

  async analyzeProject() {
    console.log('[SemanticParser] Analyzing project structure...');

    // Try to load cache first for immediate response
    let cachedInfo = null;
    try {
      if (await fs.pathExists(this.cachePath)) {
        cachedInfo = await fs.readJson(this.cachePath);
        console.log('[SemanticParser] Loaded cached analysis.');

        // Publish cached summary (not full content to avoid large payloads)
        await this.storeToMemoryChunked(
          'Project Structure Analysis (Cached)',
          JSON.stringify({
            dependencyCount: Object.keys(cachedInfo.dependencies || {}).length,
            scriptCount: Object.keys(cachedInfo.scripts || {}).length,
            symbolCount: cachedInfo.symbols?.length || 0,
            cachedAt: new Date().toISOString(),
          }),
          ['project-analysis', 'structure', 'cached']
        );
      }
    } catch (e) {
      console.warn('[SemanticParser] Cache load failed, proceeding with full analysis.');
    }

    // Run full analysis in background if we have cache, or await if we don't
    const analysisPromise = this.runFullAnalysis();

    if (cachedInfo) {
      // Don't await, let it run in background
      analysisPromise.catch((err) =>
        console.error('[SemanticParser] Background analysis failed:', err)
      );
      return cachedInfo;
    } else {
      return await analysisPromise;
    }
  }

  private async runFullAnalysis() {
    const projectInfo: ProjectInfo = {
      dependencies: {},
      scripts: {},
      tsconfig: {},
      symbols: [],
    };

    // 1. Parse package.json
    try {
      const pkgPath = path.join(this.workspaceRoot, 'package.json');
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath);
        projectInfo.dependencies = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };
        projectInfo.scripts = pkg.scripts;
        console.log(
          `[SemanticParser] Found ${Object.keys(projectInfo.dependencies).length} dependencies.`
        );
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`[SemanticParser] Failed to parse package.json: ${errorMessage}`);
    }

    // 2. Parse tsconfig.json
    let compilerOptions: ts.CompilerOptions = {};
    try {
      const tsconfigPath = path.join(this.workspaceRoot, 'tsconfig.json');
      if (await fs.pathExists(tsconfigPath)) {
        const tsconfig = await fs.readJson(tsconfigPath);
        projectInfo.tsconfig = tsconfig.compilerOptions;

        // Convert JSON config to TS CompilerOptions
        const parsedConfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this.workspaceRoot);
        compilerOptions = parsedConfig.options;
        console.log('[SemanticParser] Found tsconfig.json');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`[SemanticParser] Failed to parse tsconfig.json: ${errorMessage}`);
    }

    // 3. Deep Symbol Analysis
    try {
      projectInfo.symbols = await this.analyzeSourceFiles(compilerOptions);
      console.log(`[SemanticParser] Analyzed ${projectInfo.symbols.length} source files.`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`[SemanticParser] Failed to analyze source files: ${errorMessage}`);
    }

    // 4. Publish findings summary to Memory (Hippocampus)
    // Re-enabled with chunking - stores a summary instead of full data to avoid quota issues
    await this.storeToMemoryChunked(
      'Project Structure Analysis',
      JSON.stringify({
        dependencyCount: Object.keys(projectInfo.dependencies).length,
        scriptCount: Object.keys(projectInfo.scripts).length,
        symbolCount: projectInfo.symbols.length,
        topDependencies: Object.keys(projectInfo.dependencies).slice(0, 20),
        analyzedAt: new Date().toISOString(),
      }),
      ['project-analysis', 'structure', 'symbols']
    );

    // 5. Cache the result
    try {
      await fs.ensureFile(this.cachePath);
      await fs.writeJson(this.cachePath, projectInfo);
      console.log('[SemanticParser] Analysis cached.');
    } catch (e) {
      console.warn('[SemanticParser] Failed to cache analysis.');
    }

    return projectInfo;
  }

  private async analyzeSourceFiles(options: ts.CompilerOptions): Promise<SymbolInfo[]> {
    const files = await glob('src/**/*.ts', {
      cwd: this.workspaceRoot,
      absolute: true,
    });

    const program = ts.createProgram(files, options);
    const checker = program.getTypeChecker();
    const results: SymbolInfo[] = [];

    for (const file of files) {
      const sourceFile = program.getSourceFile(file);
      if (!sourceFile) continue;

      const fileSymbols: SymbolInfo = {
        path: path.relative(this.workspaceRoot, file),
        classes: [],
        interfaces: [],
        functions: [],
      };

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isClassDeclaration(node) && node.name) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) {
            fileSymbols.classes.push({
              name: symbol.getName(),
              documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
              methods: this.extractMethods(node, checker),
            });
          }
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) {
            fileSymbols.interfaces.push({
              name: symbol.getName(),
              documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
            });
          }
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          const symbol = checker.getSymbolAtLocation(node.name);
          if (symbol) {
            fileSymbols.functions.push({
              name: symbol.getName(),
              documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
            });
          }
        }
      });

      if (
        fileSymbols.classes.length > 0 ||
        fileSymbols.interfaces.length > 0 ||
        fileSymbols.functions.length > 0
      ) {
        results.push(fileSymbols);
      }
    }

    return results;
  }

  private extractMethods(classNode: ts.ClassDeclaration, checker: ts.TypeChecker): string[] {
    const methods: string[] = [];
    classNode.members.forEach((member) => {
      if (ts.isMethodDeclaration(member) && member.name) {
        const symbol = checker.getSymbolAtLocation(member.name);
        if (symbol) {
          methods.push(symbol.getName());
        }
      }
    });
    return methods;
  }
}
