// @version 2.2.284
/**
 * @script generate-arch-graph
 * @description Generates visual architecture dependency graphs for the TooLoo.ai codebase.
 * @intent To provide developers with a visual understanding of module dependencies,
 *         helping identify coupling issues and plan refactoring efforts.
 * 
 * @usage npm run generate:arch
 * @output 
 *   - docs/architecture/dependency-graph.svg
 *   - docs/architecture/dependency-graph.json
 *   - docs/architecture/ARCHITECTURE.md (updated)
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execAsync = promisify(exec);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  srcDir: 'src',
  outputDir: 'docs/architecture',
  modules: ['core', 'cortex', 'precog', 'nexus', 'shared', 'qa'],
  excludePatterns: [
    'node_modules',
    'web-app',
    '\\.test\\.ts$',
    '\\.spec\\.ts$',
    '_cleanup',
    '_archive',
  ],
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * @function ensureOutputDir
 * @description Creates the output directory if it doesn't exist.
 * @intent Ensure we have a place to write output files.
 */
async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
}

/**
 * @function generateDependencyCruiserConfig
 * @description Creates a temporary depcruise config for the analysis.
 * @intent Configure dependency-cruiser with TooLoo-specific rules.
 */
function generateDependencyCruiserConfig(): object {
  return {
    forbidden: [
      {
        name: 'no-circular',
        severity: 'error',
        comment: 'Circular dependencies are not allowed',
        from: {},
        to: { circular: true },
      },
      {
        name: 'no-orphans',
        severity: 'warn',
        comment: 'Orphan modules should be removed or integrated',
        from: { orphan: true, pathNot: '\\.d\\.ts$' },
        to: {},
      },
    ],
    options: {
      doNotFollow: {
        path: CONFIG.excludePatterns.join('|'),
      },
      tsPreCompilationDeps: true,
      tsConfig: { fileName: 'tsconfig.json' },
      enhancedResolveOptions: {
        exportsFields: ['exports'],
        conditionNames: ['import', 'require', 'node', 'default'],
      },
      reporterOptions: {
        dot: {
          theme: {
            graph: { bgcolor: 'transparent', fontname: 'Helvetica' },
            node: { fontname: 'Helvetica', fontsize: '10' },
            edge: { fontname: 'Helvetica', fontsize: '8' },
            modules: [
              { criteria: { source: '^src/core' }, attributes: { fillcolor: '#06b6d4', fontcolor: 'white' } },
              { criteria: { source: '^src/cortex' }, attributes: { fillcolor: '#8b5cf6', fontcolor: 'white' } },
              { criteria: { source: '^src/precog' }, attributes: { fillcolor: '#f59e0b', fontcolor: 'white' } },
              { criteria: { source: '^src/nexus' }, attributes: { fillcolor: '#10b981', fontcolor: 'white' } },
              { criteria: { source: '^src/shared' }, attributes: { fillcolor: '#6b7280', fontcolor: 'white' } },
              { criteria: { source: '^src/qa' }, attributes: { fillcolor: '#ef4444', fontcolor: 'white' } },
            ],
          },
        },
      },
    },
  };
}

/**
 * @function runDependencyCruiser
 * @description Executes dependency-cruiser and generates output files.
 * @intent Generate machine-readable and visual dependency graphs.
 */
async function runDependencyCruiser(): Promise<{ json: object; violations: number }> {
  const configPath = path.join(CONFIG.outputDir, '.depcruise.temp.json');
  const config = generateDependencyCruiserConfig();
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  try {
    // Generate JSON output
    const { stdout: jsonOutput } = await execAsync(
      `npx depcruise --config ${configPath} --output-type json ${CONFIG.srcDir}`
    );
    
    const jsonResult = JSON.parse(jsonOutput);
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'dependency-graph.json'),
      JSON.stringify(jsonResult, null, 2)
    );

    // Generate DOT output for visualization
    const { stdout: dotOutput } = await execAsync(
      `npx depcruise --config ${configPath} --output-type dot ${CONFIG.srcDir}`
    );
    await fs.writeFile(path.join(CONFIG.outputDir, 'dependency-graph.dot'), dotOutput);

    // Try to convert DOT to SVG (requires graphviz)
    try {
      await execAsync(
        `dot -Tsvg ${path.join(CONFIG.outputDir, 'dependency-graph.dot')} -o ${path.join(CONFIG.outputDir, 'dependency-graph.svg')}`
      );
      console.log('✅ SVG graph generated');
    } catch {
      console.log('⚠️  Graphviz not installed, skipping SVG generation');
      console.log('   Install with: apt-get install graphviz');
    }

    return {
      json: jsonResult,
      violations: jsonResult.summary?.violations?.length || 0,
    };
  } finally {
    // Cleanup temp config
    await fs.unlink(configPath).catch(() => {});
  }
}

/**
 * @function generateModuleSummary
 * @description Analyzes the dependency graph and generates a summary.
 * @intent Provide a human-readable overview of the architecture.
 */
function generateModuleSummary(json: any): string {
  const modules = json.modules || [];
  const summary: Record<string, { files: number; dependencies: number; dependents: number }> = {};

  for (const mod of modules) {
    const moduleName = mod.source.split('/')[1] || 'root';
    if (!summary[moduleName]) {
      summary[moduleName] = { files: 0, dependencies: 0, dependents: 0 };
    }
    summary[moduleName].files++;
    summary[moduleName].dependencies += (mod.dependencies || []).length;
  }

  let markdown = '## Module Summary\n\n';
  markdown += '| Module | Files | Outgoing Dependencies |\n';
  markdown += '|--------|-------|----------------------|\n';
  
  for (const [name, stats] of Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0]))) {
    markdown += `| \`${name}\` | ${stats.files} | ${stats.dependencies} |\n`;
  }

  return markdown;
}

/**
 * @function generateArchitectureDoc
 * @description Creates/updates the ARCHITECTURE.md documentation.
 * @intent Keep architecture documentation in sync with actual code structure.
 */
async function generateArchitectureDoc(json: any, violations: number): Promise<void> {
  const moduleSummary = generateModuleSummary(json);
  const timestamp = new Date().toISOString().split('T')[0];

  const content = `# TooLoo.ai V3 Architecture

> **@intent** This document provides a visual and textual overview of the TooLoo.ai
> codebase architecture, automatically generated from the actual dependency graph.

*Last generated: ${timestamp}*

## Visual Dependency Graph

![Dependency Graph](./dependency-graph.svg)

> If the image doesn't render, install Graphviz and re-run \`npm run generate:arch\`

## Architecture Overview

\`\`\`mermaid
graph TD
    subgraph "Cognitive Layer"
        Cortex[🧠 Cortex<br/>Intent & Context]
        Precog[🔮 Precog<br/>Model Routing]
    end

    subgraph "Infrastructure Layer"
        Nexus[🌐 Nexus<br/>API & Events]
        Core[⚙️ Core<br/>Shared Utilities]
    end

    subgraph "Quality Layer"
        QA[🛡️ QA<br/>Guardian System]
    end

    subgraph "Shared"
        Shared[📦 Shared<br/>EventBus & Registry]
    end

    Cortex --> Precog
    Cortex --> Shared
    Precog --> Shared
    Nexus --> Cortex
    Nexus --> Precog
    Nexus --> Shared
    QA --> Shared
    Core --> Shared
\`\`\`

${moduleSummary}

## Module Responsibilities

| Module | Role | Key Components |
|--------|------|----------------|
| **Cortex** | The "Manager" | Intent detection, Memory, Planning, Motor control |
| **Precog** | The "Strategist" | Model routing, Training data, Synthesis |
| **Nexus** | The "Backbone" | API server, WebSocket, Routes, Versioning |
| **Core** | Shared Utilities | Config, Module Registry, Architecture Analyzer |
| **Shared** | Communication | EventBus, System Info |
| **QA** | Quality Guardian | Hygiene checks, Wiring verification |

## Dependency Rules

1. **No Circular Dependencies** - Modules must not create circular imports
2. **Shared is Leaf** - \`@shared/*\` should only be imported, never import from other modules
3. **Layered Access** - Higher layers (Cortex, Precog) can import from lower (Nexus, Core)

## Violations Report

${violations > 0 ? `⚠️ **${violations} violations detected** - See \`dependency-graph.json\` for details` : '✅ No violations detected'}

---

*Generated by \`scripts/generate-arch-graph.ts\`*
`;

  await fs.writeFile(path.join(CONFIG.outputDir, 'ARCHITECTURE.md'), content);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('🏗️  TooLoo.ai Architecture Graph Generator\n');

  try {
    console.log('📁 Ensuring output directory...');
    await ensureOutputDir();

    console.log('🔍 Analyzing dependencies...');
    const { json, violations } = await runDependencyCruiser();

    console.log('📝 Generating architecture documentation...');
    await generateArchitectureDoc(json, violations);

    console.log('\n✅ Architecture analysis complete!');
    console.log(`   Output: ${CONFIG.outputDir}/`);
    console.log(`   - ARCHITECTURE.md`);
    console.log(`   - dependency-graph.json`);
    console.log(`   - dependency-graph.dot`);
    if (violations > 0) {
      console.log(`\n⚠️  ${violations} dependency violations found. Review the JSON output.`);
    }
  } catch (error) {
    console.error('❌ Error generating architecture graph:', error);
    process.exit(1);
  }
}

main();
