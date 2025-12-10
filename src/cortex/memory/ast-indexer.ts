// @version 3.3.399
/**
 * AST Indexer for Code Understanding
 *
 * Provides structural code analysis using TypeScript's compiler API.
 * This enables TooLoo to understand code at a deeper level than just text:
 * - Function signatures and purposes
 * - Class hierarchies and relationships
 * - Import/export dependencies
 * - Variable types and usages
 *
 * Used by the memory system to create semantically meaningful code embeddings.
 *
 * @module cortex/memory/ast-indexer
 */

import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

/** Represents a code symbol extracted from AST */
export interface CodeSymbol {
  /** Symbol name */
  name: string;
  /** Kind of symbol (function, class, variable, etc.) */
  kind: SymbolKind;
  /** File path where symbol is defined */
  filePath: string;
  /** Line number where symbol starts */
  line: number;
  /** Column position */
  column: number;
  /** Symbol's documentation/JSDoc */
  documentation?: string;
  /** For functions: parameter names and types */
  parameters?: { name: string; type: string }[];
  /** Return type for functions */
  returnType?: string;
  /** Parent symbol (class for methods) */
  parent?: string;
  /** Exported? */
  isExported: boolean;
  /** Modifiers (async, static, private, etc.) */
  modifiers: string[];
  /** Brief description for embedding */
  summary: string;
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'method'
  | 'property'
  | 'enum'
  | 'namespace'
  | 'module';

/** Index of all symbols in a file */
export interface FileIndex {
  filePath: string;
  symbols: CodeSymbol[];
  imports: ImportInfo[];
  exports: string[];
  lastIndexed: number;
  /** File hash to detect changes */
  contentHash: string;
}

export interface ImportInfo {
  /** Module being imported from */
  module: string;
  /** Named imports */
  namedImports: string[];
  /** Default import name */
  defaultImport?: string;
  /** Is it a type-only import? */
  isTypeOnly: boolean;
}

// ============================================================================
// AST INDEXER
// ============================================================================

export class ASTIndexer {
  private cache: Map<string, FileIndex> = new Map();
  private program: ts.Program | null = null;

  constructor(private rootDir: string) {}

  /**
   * Index a single TypeScript/JavaScript file
   */
  async indexFile(filePath: string): Promise<FileIndex> {
    const absolutePath = path.resolve(this.rootDir, filePath);

    // Check cache
    const cached = this.cache.get(absolutePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    const contentHash = this.hashContent(content);

    if (cached && cached.contentHash === contentHash) {
      return cached;
    }

    console.log(`[ASTIndexer] Indexing ${path.basename(filePath)}...`);

    // Create source file
    const sourceFile = ts.createSourceFile(
      absolutePath,
      content,
      ts.ScriptTarget.ESNext,
      true,
      this.getScriptKind(filePath)
    );

    const symbols: CodeSymbol[] = [];
    const imports: ImportInfo[] = [];
    const exports: string[] = [];

    // Walk the AST
    const visit = (node: ts.Node) => {
      // Extract imports
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImport(node);
        if (importInfo) imports.push(importInfo);
      }

      // Extract exports
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        const exportNames = this.extractExports(node);
        exports.push(...exportNames);
      }

      // Extract symbols
      const symbol = this.extractSymbol(node, sourceFile);
      if (symbol) {
        symbols.push(symbol);
        // Check for export
        if (this.isExported(node)) {
          exports.push(symbol.name);
          symbol.isExported = true;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    const index: FileIndex = {
      filePath: absolutePath,
      symbols,
      imports,
      exports: [...new Set(exports)], // Deduplicate
      lastIndexed: Date.now(),
      contentHash,
    };

    this.cache.set(absolutePath, index);
    return index;
  }

  /**
   * Index all TypeScript/JavaScript files in a directory
   */
  async indexDirectory(
    dirPath: string,
    extensions = ['.ts', '.tsx', '.js', '.jsx']
  ): Promise<FileIndex[]> {
    const absoluteDir = path.resolve(this.rootDir, dirPath);
    const results: FileIndex[] = [];

    const walkDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and hidden directories
        if (entry.isDirectory()) {
          if (
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist'
          ) {
            await walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            try {
              const index = await this.indexFile(fullPath);
              results.push(index);
            } catch (err) {
              console.warn(`[ASTIndexer] Failed to index ${fullPath}:`, err);
            }
          }
        }
      }
    };

    await walkDir(absoluteDir);
    console.log(`[ASTIndexer] Indexed ${results.length} files from ${dirPath}`);
    return results;
  }

  /**
   * Search for symbols by name or pattern
   */
  searchSymbols(query: string, kind?: SymbolKind): CodeSymbol[] {
    const results: CodeSymbol[] = [];
    const queryLower = query.toLowerCase();

    for (const index of this.cache.values()) {
      for (const symbol of index.symbols) {
        if (kind && symbol.kind !== kind) continue;

        if (
          symbol.name.toLowerCase().includes(queryLower) ||
          symbol.summary.toLowerCase().includes(queryLower)
        ) {
          results.push(symbol);
        }
      }
    }

    return results;
  }

  /**
   * Get all symbols from a specific file
   */
  getFileSymbols(filePath: string): CodeSymbol[] {
    const absolutePath = path.resolve(this.rootDir, filePath);
    const index = this.cache.get(absolutePath);
    return index?.symbols || [];
  }

  /**
   * Generate a summary of a file's structure
   * Useful for creating embeddings with structural context
   */
  generateFileSummary(index: FileIndex): string {
    const parts: string[] = [];

    parts.push(`File: ${path.basename(index.filePath)}`);

    // Group symbols by kind
    const byKind = new Map<SymbolKind, CodeSymbol[]>();
    for (const symbol of index.symbols) {
      const existing = byKind.get(symbol.kind) || [];
      existing.push(symbol);
      byKind.set(symbol.kind, existing);
    }

    // Classes
    const classes = byKind.get('class') || [];
    if (classes.length > 0) {
      parts.push(`Classes: ${classes.map((c) => c.name).join(', ')}`);
    }

    // Functions
    const functions = byKind.get('function') || [];
    if (functions.length > 0) {
      parts.push(
        `Functions: ${functions.map((f) => `${f.name}(${f.parameters?.map((p) => p.name).join(', ') || ''})`).join(', ')}`
      );
    }

    // Interfaces/Types
    const types = [...(byKind.get('interface') || []), ...(byKind.get('type') || [])];
    if (types.length > 0) {
      parts.push(`Types: ${types.map((t) => t.name).join(', ')}`);
    }

    // Exports
    if (index.exports.length > 0) {
      parts.push(`Exports: ${index.exports.join(', ')}`);
    }

    // Imports
    if (index.imports.length > 0) {
      parts.push(`Imports from: ${index.imports.map((i) => i.module).join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get dependency graph for a file
   */
  getDependencyGraph(filePath: string): { imports: string[]; importedBy: string[] } {
    const absolutePath = path.resolve(this.rootDir, filePath);
    const index = this.cache.get(absolutePath);

    if (!index) {
      return { imports: [], importedBy: [] };
    }

    const imports = index.imports.map((i) => i.module);
    const importedBy: string[] = [];

    // Find files that import this one
    const fileName = path.basename(absolutePath, path.extname(absolutePath));
    for (const [otherPath, otherIndex] of this.cache.entries()) {
      if (otherPath === absolutePath) continue;

      for (const imp of otherIndex.imports) {
        if (imp.module.includes(fileName) || imp.module.endsWith(path.basename(absolutePath))) {
          importedBy.push(path.relative(this.rootDir, otherPath));
        }
      }
    }

    return { imports, importedBy };
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private extractSymbol(node: ts.Node, sourceFile: ts.SourceFile): CodeSymbol | null {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        kind: 'function',
        filePath: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character,
        documentation: this.getJSDoc(node),
        parameters: this.extractParameters(node),
        returnType: node.type ? node.type.getText(sourceFile) : 'void',
        isExported: this.isExported(node),
        modifiers: this.extractModifiers(node),
        summary: this.generateSymbolSummary(node, 'function', sourceFile),
      };
    }

    // Arrow functions assigned to const
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (decl && ts.isIdentifier(decl.name) && decl.initializer) {
        if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
          return {
            name: decl.name.text,
            kind: 'function',
            filePath: sourceFile.fileName,
            line: pos.line + 1,
            column: pos.character,
            documentation: this.getJSDoc(node),
            parameters: this.extractParameters(decl.initializer as ts.FunctionLikeDeclaration),
            returnType:
              (decl.initializer as ts.FunctionLikeDeclaration).type?.getText(sourceFile) ||
              'unknown',
            isExported: this.isExported(node),
            modifiers: this.extractModifiers(node),
            summary: this.generateSymbolSummary(node, 'function', sourceFile),
          };
        }
      }
    }

    // Classes
    if (ts.isClassDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        kind: 'class',
        filePath: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character,
        documentation: this.getJSDoc(node),
        isExported: this.isExported(node),
        modifiers: this.extractModifiers(node),
        summary: this.generateSymbolSummary(node, 'class', sourceFile),
      };
    }

    // Interfaces
    if (ts.isInterfaceDeclaration(node)) {
      return {
        name: node.name.text,
        kind: 'interface',
        filePath: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character,
        documentation: this.getJSDoc(node),
        isExported: this.isExported(node),
        modifiers: [],
        summary: this.generateSymbolSummary(node, 'interface', sourceFile),
      };
    }

    // Type aliases
    if (ts.isTypeAliasDeclaration(node)) {
      return {
        name: node.name.text,
        kind: 'type',
        filePath: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character,
        documentation: this.getJSDoc(node),
        isExported: this.isExported(node),
        modifiers: [],
        summary: this.generateSymbolSummary(node, 'type', sourceFile),
      };
    }

    // Enums
    if (ts.isEnumDeclaration(node)) {
      return {
        name: node.name.text,
        kind: 'enum',
        filePath: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character,
        documentation: this.getJSDoc(node),
        isExported: this.isExported(node),
        modifiers: [],
        summary: this.generateSymbolSummary(node, 'enum', sourceFile),
      };
    }

    return null;
  }

  private extractImport(node: ts.ImportDeclaration): ImportInfo | null {
    const moduleSpec = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpec)) return null;

    const info: ImportInfo = {
      module: moduleSpec.text,
      namedImports: [],
      isTypeOnly: node.importClause?.isTypeOnly || false,
    };

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        info.defaultImport = node.importClause.name.text;
      }

      // Named imports
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          info.namedImports = node.importClause.namedBindings.elements.map((e) => e.name.text);
        }
      }
    }

    return info;
  }

  private extractExports(node: ts.Node): string[] {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      return node.exportClause.elements.map((e) => e.name.text);
    }
    return [];
  }

  private extractParameters(node: ts.FunctionLikeDeclaration): { name: string; type: string }[] {
    return node.parameters.map((p) => ({
      name: ts.isIdentifier(p.name) ? p.name.text : 'param',
      type: p.type ? p.type.getText() : 'any',
    }));
  }

  private extractModifiers(node: ts.Node): string[] {
    const modifiers: string[] = [];

    if (ts.canHaveModifiers(node)) {
      const mods = ts.getModifiers(node);
      if (mods) {
        for (const mod of mods) {
          switch (mod.kind) {
            case ts.SyntaxKind.AsyncKeyword:
              modifiers.push('async');
              break;
            case ts.SyntaxKind.ExportKeyword:
              modifiers.push('export');
              break;
            case ts.SyntaxKind.DefaultKeyword:
              modifiers.push('default');
              break;
            case ts.SyntaxKind.StaticKeyword:
              modifiers.push('static');
              break;
            case ts.SyntaxKind.PrivateKeyword:
              modifiers.push('private');
              break;
            case ts.SyntaxKind.ProtectedKeyword:
              modifiers.push('protected');
              break;
            case ts.SyntaxKind.PublicKeyword:
              modifiers.push('public');
              break;
            case ts.SyntaxKind.AbstractKeyword:
              modifiers.push('abstract');
              break;
            case ts.SyntaxKind.ConstKeyword:
              modifiers.push('const');
              break;
          }
        }
      }
    }

    return modifiers;
  }

  private isExported(node: ts.Node): boolean {
    if (ts.canHaveModifiers(node)) {
      const mods = ts.getModifiers(node);
      if (mods) {
        return mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      }
    }
    return false;
  }

  private getJSDoc(node: ts.Node): string | undefined {
    const jsDocs = (node as any).jsDoc;
    if (jsDocs && Array.isArray(jsDocs) && jsDocs.length > 0) {
      const jsDoc = jsDocs[0];
      if (jsDoc.comment) {
        return typeof jsDoc.comment === 'string'
          ? jsDoc.comment
          : jsDoc.comment.map((c: any) => c.text).join('');
      }
    }
    return undefined;
  }

  private generateSymbolSummary(node: ts.Node, kind: string, sourceFile: ts.SourceFile): string {
    const name = this.getNodeName(node);
    const doc = this.getJSDoc(node);

    let summary = `${kind} ${name}`;

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      const fn = node as ts.FunctionLikeDeclaration;
      const params = fn.parameters
        .map((p) => (ts.isIdentifier(p.name) ? p.name.text : 'param'))
        .join(', ');
      summary = `${kind} ${name}(${params})`;
    }

    if (doc) {
      summary += `: ${doc.substring(0, 100)}`;
    }

    return summary;
  }

  private getNodeName(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
    if (ts.isClassDeclaration(node) && node.name) return node.name.text;
    if (ts.isInterfaceDeclaration(node)) return node.name.text;
    if (ts.isTypeAliasDeclaration(node)) return node.name.text;
    if (ts.isEnumDeclaration(node)) return node.name.text;
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (decl && ts.isIdentifier(decl.name)) return decl.name.text;
    }
    return 'unknown';
  }

  private getScriptKind(filePath: string): ts.ScriptKind {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
        return ts.ScriptKind.TS;
      case '.tsx':
        return ts.ScriptKind.TSX;
      case '.js':
        return ts.ScriptKind.JS;
      case '.jsx':
        return ts.ScriptKind.JSX;
      default:
        return ts.ScriptKind.Unknown;
    }
  }

  private hashContent(content: string): string {
    // Simple hash for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let astIndexer: ASTIndexer | null = null;

export function getASTIndexer(rootDir?: string): ASTIndexer {
  if (!astIndexer) {
    astIndexer = new ASTIndexer(rootDir || process.cwd());
  }
  return astIndexer;
}

export default ASTIndexer;
