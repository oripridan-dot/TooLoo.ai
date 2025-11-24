// @version 2.1.201
import fs from "fs-extra";
import * as path from "path";
import { glob } from "glob";
import * as ts from "typescript";
import { EventBus } from "../../core/event-bus.js";

export class SemanticParser {
  private cachePath: string;

  constructor(private bus: EventBus, private workspaceRoot: string) {
    this.cachePath = path.join(workspaceRoot, "data/memory/semantic-cache.json");
  }

  async analyzeProject() {
    console.log("[SemanticParser] Analyzing project structure...");
    
    // Try to load cache first for immediate response
    let cachedInfo = null;
    try {
        if (await fs.pathExists(this.cachePath)) {
            cachedInfo = await fs.readJson(this.cachePath);
            console.log("[SemanticParser] Loaded cached analysis.");
            
            // Publish cached findings immediately
            this.bus.publish("cortex", "memory:store", {
                description: "Project Structure Analysis (Cached)",
                content: JSON.stringify(cachedInfo),
                type: "system",
                tags: ["project-analysis", "structure", "symbols"]
            });
        }
    } catch (e) {
        console.warn("[SemanticParser] Cache load failed, proceeding with full analysis.");
    }

    // Run full analysis in background if we have cache, or await if we don't
    const analysisPromise = this.runFullAnalysis();
    
    if (cachedInfo) {
        // Don't await, let it run in background
        analysisPromise.catch(err => console.error("[SemanticParser] Background analysis failed:", err));
        return cachedInfo;
    } else {
        return await analysisPromise;
    }
  }

  private async runFullAnalysis() {
    const projectInfo: any = {
        dependencies: {},
        scripts: {},
        tsconfig: {},
        symbols: []
    };

    // 1. Parse package.json
    try {
        const pkgPath = path.join(this.workspaceRoot, "package.json");
        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            projectInfo.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
            projectInfo.scripts = pkg.scripts;
            console.log(`[SemanticParser] Found ${Object.keys(projectInfo.dependencies).length} dependencies.`);
        }
    } catch (e: any) {
        console.warn(`[SemanticParser] Failed to parse package.json: ${e.message}`);
    }

    // 2. Parse tsconfig.json
    let compilerOptions: ts.CompilerOptions = {};
    try {
        const tsconfigPath = path.join(this.workspaceRoot, "tsconfig.json");
        if (await fs.pathExists(tsconfigPath)) {
            const tsconfig = await fs.readJson(tsconfigPath);
            projectInfo.tsconfig = tsconfig.compilerOptions;
            
            // Convert JSON config to TS CompilerOptions
            const parsedConfig = ts.parseJsonConfigFileContent(
                tsconfig,
                ts.sys,
                this.workspaceRoot
            );
            compilerOptions = parsedConfig.options;
            console.log("[SemanticParser] Found tsconfig.json");
        }
    } catch (e: any) {
        console.warn(`[SemanticParser] Failed to parse tsconfig.json: ${e.message}`);
    }

    // 3. Deep Symbol Analysis
    try {
        projectInfo.symbols = await this.analyzeSourceFiles(compilerOptions);
        console.log(`[SemanticParser] Analyzed ${projectInfo.symbols.length} source files.`);
    } catch (e: any) {
        console.warn(`[SemanticParser] Failed to analyze source files: ${e.message}`);
    }

    // 4. Publish findings to Memory (Hippocampus)
    this.bus.publish("cortex", "memory:store", {
        description: "Project Structure Analysis",
        content: JSON.stringify(projectInfo),
        type: "system",
        tags: ["project-analysis", "structure", "symbols"]
    });

    // 5. Cache the result
    try {
        await fs.ensureFile(this.cachePath);
        await fs.writeJson(this.cachePath, projectInfo);
        console.log("[SemanticParser] Analysis cached.");
    } catch (e) {
        console.warn("[SemanticParser] Failed to cache analysis.");
    }

    return projectInfo;
  }

  private async analyzeSourceFiles(options: ts.CompilerOptions): Promise<any[]> {
    const files = await glob("src/**/*.ts", { cwd: this.workspaceRoot, absolute: true });
    
    const program = ts.createProgram(files, options);
    const checker = program.getTypeChecker();
    const results: any[] = [];

    for (const file of files) {
        const sourceFile = program.getSourceFile(file);
        if (!sourceFile) continue;

        const fileSymbols: any = {
            path: path.relative(this.workspaceRoot, file),
            classes: [],
            interfaces: [],
            functions: []
        };

        ts.forEachChild(sourceFile, (node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                const symbol = checker.getSymbolAtLocation(node.name);
                if (symbol) {
                    fileSymbols.classes.push({
                        name: symbol.getName(),
                        documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
                        methods: this.extractMethods(node, checker)
                    });
                }
            } else if (ts.isInterfaceDeclaration(node) && node.name) {
                const symbol = checker.getSymbolAtLocation(node.name);
                if (symbol) {
                    fileSymbols.interfaces.push({
                        name: symbol.getName(),
                        documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker))
                    });
                }
            } else if (ts.isFunctionDeclaration(node) && node.name) {
                const symbol = checker.getSymbolAtLocation(node.name);
                if (symbol) {
                    fileSymbols.functions.push({
                        name: symbol.getName(),
                        documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker))
                    });
                }
            }
        });

        if (fileSymbols.classes.length > 0 || fileSymbols.interfaces.length > 0 || fileSymbols.functions.length > 0) {
            results.push(fileSymbols);
        }
    }

    return results;
  }

  private extractMethods(classNode: ts.ClassDeclaration, checker: ts.TypeChecker): string[] {
    const methods: string[] = [];
    classNode.members.forEach(member => {
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
