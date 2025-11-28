// @version 2.2.125
/**
 * Component Registry
 * Frontend component catalog with purpose tags, overlap detection,
 * and dependency graph visualization.
 *
 * @version 2.2.125
 * @responsibility component-registry
 * @category core-infrastructure
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { bus } from "./event-bus.js";

// Component purpose categories
export const COMPONENT_PURPOSES = [
  // Display Components
  "provider-display",       // Shows provider status/metrics
  "memory-display",         // Shows memory/context information
  "activity-log",           // Shows system activity/events
  "plan-visualization",     // Shows plans/tasks/workflows
  "chat-interface",         // Chat input/output
  "visual-output",          // Generated visuals display
  
  // Control Components
  "settings-control",       // Configuration/settings UI
  "action-trigger",         // Buttons/actions that trigger operations
  "navigation",             // Navigation/routing
  "form-input",             // Data input forms
  
  // Layout Components
  "layout-container",       // Page/section layout
  "sidebar",                // Sidebar navigation/info
  "header",                 // Page header
  "modal",                  // Modal/dialog
  
  // Utility Components
  "loading-indicator",      // Loading states
  "error-boundary",         // Error handling
  "tooltip",                // Tooltips/info popups
  "icon-display",           // Icon rendering
] as const;

export type ComponentPurpose = (typeof COMPONENT_PURPOSES)[number];

export interface ComponentRegistration {
  name: string;
  filePath: string;
  purposes: ComponentPurpose[];
  dependencies: string[];          // Other components this uses
  usedBy: string[];                // Components that use this
  props?: string[];                // Exported props
  version: string;
  annotations: ComponentAnnotation[];
  metadata?: Record<string, unknown>;
}

export interface ComponentAnnotation {
  type: "@uses" | "@purpose" | "@duplicates-intentional" | "@deprecated";
  value: string;
}

export interface ComponentOverlap {
  purpose: ComponentPurpose;
  components: string[];
  severity: "warning" | "error";
  suggestion: string;
}

export interface ComponentDependencyGraph {
  nodes: Array<{
    id: string;
    name: string;
    purposes: ComponentPurpose[];
    depth: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: "uses" | "imported-by";
  }>;
}

export interface ComponentRegistryReport {
  timestamp: Date;
  totalComponents: number;
  byPurpose: Record<ComponentPurpose, string[]>;
  overlaps: ComponentOverlap[];
  orphaned: string[];              // Components with no usedBy
  dependencyGraph: ComponentDependencyGraph;
}

/**
 * Component Registry - Tracks and validates frontend components
 */
class ComponentRegistry {
  private components: Map<string, ComponentRegistration> = new Map();
  private webAppRoot: string;
  private initialized: boolean = false;

  constructor(webAppRoot: string = "src/web-app/src") {
    this.webAppRoot = webAppRoot;
    console.log("[ComponentRegistry] Initialized");
  }

  /**
   * Register a component manually
   */
  register(component: ComponentRegistration): void {
    const existing = this.components.get(component.name);
    
    if (existing) {
      console.warn(
        `[ComponentRegistry] Updating existing component: ${component.name}`
      );
    }

    this.components.set(component.name, component);
    console.log(
      `[ComponentRegistry] ✓ Registered: ${component.name} [${component.purposes.join(", ")}]`
    );

    bus.publish("system", "registry:component_registered", {
      name: component.name,
      purposes: component.purposes,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Scan and auto-discover components from file system
   */
  async discoverComponents(projectRoot: string = process.cwd()): Promise<void> {
    const componentsPath = path.join(projectRoot, this.webAppRoot, "components");
    
    if (!fs.existsSync(componentsPath)) {
      console.warn(`[ComponentRegistry] Components path not found: ${componentsPath}`);
      return;
    }

    const files = await glob("**/*.{jsx,tsx}", {
      cwd: componentsPath,
      ignore: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"],
    });

    console.log(`[ComponentRegistry] Scanning ${files.length} component files...`);

    for (const file of files) {
      const fullPath = path.join(componentsPath, file);
      const component = await this.analyzeComponent(fullPath, file);
      if (component) {
        this.register(component);
      }
    }

    // Build dependency graph
    this.buildDependencyGraph();
    this.initialized = true;

    console.log(`[ComponentRegistry] Discovery complete. ${this.components.size} components registered.`);
  }

  /**
   * Analyze a single component file
   */
  private async analyzeComponent(
    fullPath: string,
    relativePath: string
  ): Promise<ComponentRegistration | null> {
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const name = this.extractComponentName(content, relativePath);
      
      if (!name) return null;

      return {
        name,
        filePath: relativePath,
        purposes: this.detectPurposes(content, name, relativePath),
        dependencies: this.extractDependencies(content),
        usedBy: [], // Will be populated during graph building
        props: this.extractProps(content),
        version: this.extractVersion(content),
        annotations: this.extractAnnotations(content),
      };
    } catch (error) {
      console.error(`[ComponentRegistry] Failed to analyze ${relativePath}:`, error);
      return null;
    }
  }

  /**
   * Extract component name from file content
   */
  private extractComponentName(content: string, filePath: string): string | null {
    // Try to find export default function ComponentName
    const defaultFuncMatch = content.match(
      /export\s+default\s+function\s+(\w+)/
    );
    if (defaultFuncMatch) return defaultFuncMatch[1];

    // Try to find const ComponentName = 
    const constMatch = content.match(
      /(?:export\s+)?const\s+(\w+)\s*[=:]/
    );
    if (constMatch && /^[A-Z]/.test(constMatch[1])) return constMatch[1];

    // Try to find export default ComponentName
    const exportDefaultMatch = content.match(
      /export\s+default\s+(\w+)\s*;?\s*$/m
    );
    if (exportDefaultMatch) return exportDefaultMatch[1];

    // Fall back to file name
    const baseName = path.basename(filePath, path.extname(filePath));
    if (/^[A-Z]/.test(baseName)) return baseName;

    return null;
  }

  /**
   * Detect component purposes from content and name
   */
  private detectPurposes(
    content: string,
    name: string,
    filePath: string
  ): ComponentPurpose[] {
    const purposes: ComponentPurpose[] = [];

    // Check for @purpose annotations
    const purposeAnnotations = content.match(/@purpose\s*[:\s]+([^\n\r]+)/gi);
    if (purposeAnnotations) {
      for (const annotation of purposeAnnotations) {
        const value = annotation.replace(/@purpose\s*[:\s]+/i, "").trim();
        if (COMPONENT_PURPOSES.includes(value as ComponentPurpose)) {
          purposes.push(value as ComponentPurpose);
        }
      }
    }

    // Auto-detect from component name
    const nameLower = name.toLowerCase();
    const contentLower = content.toLowerCase();

    if (nameLower.includes("provider") || contentLower.includes("providerlogo")) {
      purposes.push("provider-display");
    }
    if (nameLower.includes("memory") || nameLower.includes("hippocampus")) {
      purposes.push("memory-display");
    }
    if (nameLower.includes("activity") || nameLower.includes("log") || nameLower.includes("feed")) {
      purposes.push("activity-log");
    }
    if (nameLower.includes("plan") || nameLower.includes("task") || nameLower.includes("workflow")) {
      purposes.push("plan-visualization");
    }
    if (nameLower.includes("chat") || nameLower.includes("message")) {
      purposes.push("chat-interface");
    }
    if (nameLower.includes("visual") || nameLower.includes("image") || nameLower.includes("diagram")) {
      purposes.push("visual-output");
    }
    if (nameLower.includes("sidebar")) {
      purposes.push("sidebar");
    }
    if (nameLower.includes("header")) {
      purposes.push("header");
    }
    if (nameLower.includes("layout") || nameLower.includes("container")) {
      purposes.push("layout-container");
    }
    if (nameLower.includes("modal") || nameLower.includes("dialog")) {
      purposes.push("modal");
    }
    if (nameLower.includes("settings") || nameLower.includes("config")) {
      purposes.push("settings-control");
    }
    if (nameLower.includes("dashboard") || nameLower.includes("control")) {
      purposes.push("layout-container");
    }

    return [...new Set(purposes)];
  }

  /**
   * Extract component dependencies from imports
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Match import statements for local components
    const importRegex = /import\s+(?:\{[^}]+\}|(\w+))\s+from\s+["']\.\.?\/[^"']*["']/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importedNames = match[1] 
        ? [match[1]]
        : (match[0].match(/\{([^}]+)\}/)?.[1]?.split(",").map(s => s.trim()) || []);
      
      for (const name of importedNames) {
        // Only include PascalCase names (components)
        if (/^[A-Z]/.test(name) && !name.includes("Icon")) {
          dependencies.push(name);
        }
      }
    }

    return [...new Set(dependencies)];
  }

  /**
   * Extract component props interface
   */
  private extractProps(content: string): string[] {
    const props: string[] = [];

    // Match interface Props or type Props
    const propsMatch = content.match(
      /(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?\{([^}]+)\}/
    );
    
    if (propsMatch) {
      const propsContent = propsMatch[1];
      const propNames = propsContent.match(/(\w+)\s*[?:]?\s*:/g);
      if (propNames) {
        props.push(...propNames.map(p => p.replace(/[?:]/g, "").trim()));
      }
    }

    // Also check for destructured props in function signature
    const funcPropsMatch = content.match(
      /(?:function\s+\w+|const\s+\w+\s*[=:]\s*(?:React\.)?(?:FC|FunctionComponent)?)\s*(?:<[^>]+>)?\s*\(\s*\{\s*([^}]+)\s*\}/
    );
    
    if (funcPropsMatch) {
      const destructured = funcPropsMatch[1].split(",").map(s => s.trim().split(/[=:]/)[0].trim());
      props.push(...destructured.filter(Boolean));
    }

    return [...new Set(props)];
  }

  /**
   * Extract version from @version annotation
   */
  private extractVersion(content: string): string {
    const versionMatch = content.match(/@version\s+([^\s\n]+)/);
    return versionMatch ? versionMatch[1] : "1.0.0";
  }

  /**
   * Extract all annotations
   */
  private extractAnnotations(content: string): ComponentAnnotation[] {
    const annotations: ComponentAnnotation[] = [];
    const annotationRegex = /@(uses|purpose|duplicates-intentional|deprecated)\s*[:\s]*([^\n\r]+)?/gi;
    
    let match;
    while ((match = annotationRegex.exec(content)) !== null) {
      annotations.push({
        type: `@${match[1].toLowerCase()}` as ComponentAnnotation["type"],
        value: (match[2] || "").trim(),
      });
    }

    return annotations;
  }

  /**
   * Build the dependency graph
   */
  private buildDependencyGraph(): void {
    // Populate usedBy for each component
    for (const [name, component] of this.components) {
      for (const dep of component.dependencies) {
        const depComponent = this.components.get(dep);
        if (depComponent && !depComponent.usedBy.includes(name)) {
          depComponent.usedBy.push(name);
        }
      }
    }
  }

  /**
   * Detect overlapping purposes
   */
  detectOverlaps(): ComponentOverlap[] {
    const overlaps: ComponentOverlap[] = [];
    const purposeMap: Record<string, string[]> = {};

    for (const [name, component] of this.components) {
      for (const purpose of component.purposes) {
        if (!purposeMap[purpose]) {
          purposeMap[purpose] = [];
        }
        purposeMap[purpose].push(name);
      }
    }

    for (const [purpose, components] of Object.entries(purposeMap)) {
      if (components.length > 1) {
        // Check if any have @uses relationship
        const hasUsesRelationship = components.some((c1) =>
          components.some((c2) => {
            if (c1 === c2) return false;
            const comp1 = this.components.get(c1);
            return comp1?.dependencies.includes(c2) ||
              comp1?.annotations.some(a => a.type === "@uses" && a.value.includes(c2));
          })
        );

        overlaps.push({
          purpose: purpose as ComponentPurpose,
          components,
          severity: hasUsesRelationship ? "warning" : "error",
          suggestion: hasUsesRelationship
            ? `Components share purpose but have @uses relationship - consider consolidating shared logic`
            : `Multiple components serve '${purpose}' purpose. Consider creating a shared base component or using @uses annotation.`,
        });
      }
    }

    return overlaps;
  }

  /**
   * Get orphaned components (not used by any other component)
   */
  getOrphanedComponents(): string[] {
    const orphaned: string[] = [];
    const entryPoints = ["App", "Main", "Index", "Layout"];

    for (const [name, component] of this.components) {
      // Skip known entry points
      if (entryPoints.some(e => name.includes(e))) continue;
      
      if (component.usedBy.length === 0) {
        orphaned.push(name);
      }
    }

    return orphaned;
  }

  /**
   * Get full dependency graph
   */
  getDependencyGraph(): ComponentDependencyGraph {
    const nodes: ComponentDependencyGraph["nodes"] = [];
    const edges: ComponentDependencyGraph["edges"] = [];

    // Calculate depth for each node (distance from entry points)
    const depths = new Map<string, number>();
    const entryPoints = ["App", "Main", "Layout"];
    
    const calculateDepth = (name: string, visited = new Set<string>()): number => {
      if (visited.has(name)) return Infinity;
      if (depths.has(name)) return depths.get(name)!;
      
      visited.add(name);
      const component = this.components.get(name);
      if (!component) return 0;

      if (entryPoints.some(e => name.includes(e))) {
        depths.set(name, 0);
        return 0;
      }

      let minDepth = Infinity;
      for (const parent of component.usedBy) {
        const parentDepth = calculateDepth(parent, new Set(visited));
        minDepth = Math.min(minDepth, parentDepth + 1);
      }

      const depth = minDepth === Infinity ? 0 : minDepth;
      depths.set(name, depth);
      return depth;
    };

    for (const [name, component] of this.components) {
      const depth = calculateDepth(name);
      nodes.push({
        id: name,
        name,
        purposes: component.purposes,
        depth,
      });

      for (const dep of component.dependencies) {
        edges.push({
          from: name,
          to: dep,
          type: "uses",
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Get a component by name
   */
  get(name: string): ComponentRegistration | undefined {
    return this.components.get(name);
  }

  /**
   * Get all components
   */
  getAll(): ComponentRegistration[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by purpose
   */
  getByPurpose(purpose: ComponentPurpose): ComponentRegistration[] {
    return Array.from(this.components.values()).filter(
      c => c.purposes.includes(purpose)
    );
  }

  /**
   * Generate full report
   */
  generateReport(): ComponentRegistryReport {
    const byPurpose: Record<ComponentPurpose, string[]> = {} as Record<ComponentPurpose, string[]>;
    
    for (const purpose of COMPONENT_PURPOSES) {
      byPurpose[purpose] = this.getByPurpose(purpose).map(c => c.name);
    }

    return {
      timestamp: new Date(),
      totalComponents: this.components.size,
      byPurpose,
      overlaps: this.detectOverlaps(),
      orphaned: this.getOrphanedComponents(),
      dependencyGraph: this.getDependencyGraph(),
    };
  }

  /**
   * Format report for console output
   */
  formatReport(report: ComponentRegistryReport): string {
    const lines: string[] = [
      "╔════════════════════════════════════════════════════════════════╗",
      "║              COMPONENT REGISTRY REPORT                         ║",
      "╚════════════════════════════════════════════════════════════════╝",
      "",
      `📊 Total Components: ${report.totalComponents}`,
      `📅 Generated: ${report.timestamp.toISOString()}`,
      "",
    ];

    lines.push("📁 COMPONENTS BY PURPOSE:");
    lines.push("─".repeat(60));
    for (const [purpose, components] of Object.entries(report.byPurpose)) {
      if (components.length > 0) {
        lines.push(`  ${purpose}: ${components.join(", ")}`);
      }
    }

    if (report.overlaps.length > 0) {
      lines.push("");
      lines.push("⚠️ PURPOSE OVERLAPS:");
      lines.push("─".repeat(60));
      for (const overlap of report.overlaps) {
        const icon = overlap.severity === "error" ? "🔴" : "🟡";
        lines.push(`  ${icon} ${overlap.purpose}: ${overlap.components.join(", ")}`);
        lines.push(`     💡 ${overlap.suggestion}`);
      }
    }

    if (report.orphaned.length > 0) {
      lines.push("");
      lines.push("🔍 ORPHANED COMPONENTS (not used by others):");
      lines.push("─".repeat(60));
      for (const name of report.orphaned) {
        lines.push(`  • ${name}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Export for API endpoint
   */
  toJSON(): object {
    return {
      initialized: this.initialized,
      componentCount: this.components.size,
      components: Array.from(this.components.values()).map(c => ({
        name: c.name,
        filePath: c.filePath,
        purposes: c.purposes,
        dependencies: c.dependencies,
        usedBy: c.usedBy,
        version: c.version,
      })),
      report: this.generateReport(),
    };
  }
}

// Singleton instance
export const componentRegistry = new ComponentRegistry();

/**
 * Express router factory for component registry API
 */
export function createComponentRegistryRouter() {
  // Dynamic import to avoid issues when express isn't available
  return {
    async setupRoutes(app: { get: Function; post: Function }) {
      // GET /api/v1/system/components - Full component list
      app.get("/api/v1/system/components", (_req: unknown, res: { json: Function }) => {
        res.json({
          ok: true,
          data: componentRegistry.toJSON(),
          timestamp: new Date().toISOString(),
        });
      });

      // GET /api/v1/system/components/:name - Single component details
      app.get("/api/v1/system/components/:name", (req: { params: { name: string } }, res: { json: Function; status: Function }) => {
        const component = componentRegistry.get(req.params.name);
        if (!component) {
          return (res.status(404) as { json: Function }).json({
            ok: false,
            error: `Component not found: ${req.params.name}`,
          });
        }
        res.json({
          ok: true,
          data: component,
          timestamp: new Date().toISOString(),
        });
      });

      // GET /api/v1/system/components/purpose/:purpose - Components by purpose
      app.get("/api/v1/system/components/purpose/:purpose", (req: { params: { purpose: string } }, res: { json: Function }) => {
        const components = componentRegistry.getByPurpose(req.params.purpose as ComponentPurpose);
        res.json({
          ok: true,
          data: components.map(c => c.name),
          timestamp: new Date().toISOString(),
        });
      });

      // GET /api/v1/system/components/overlaps - Get purpose overlaps
      app.get("/api/v1/system/components/overlaps", (_req: unknown, res: { json: Function }) => {
        const overlaps = componentRegistry.detectOverlaps();
        res.json({
          ok: true,
          data: overlaps,
          hasIssues: overlaps.some(o => o.severity === "error"),
          timestamp: new Date().toISOString(),
        });
      });

      // GET /api/v1/system/components/graph - Dependency graph
      app.get("/api/v1/system/components/graph", (_req: unknown, res: { json: Function }) => {
        const graph = componentRegistry.getDependencyGraph();
        res.json({
          ok: true,
          data: graph,
          timestamp: new Date().toISOString(),
        });
      });

      // POST /api/v1/system/components/discover - Trigger discovery
      app.post("/api/v1/system/components/discover", async (_req: unknown, res: { json: Function }) => {
        await componentRegistry.discoverComponents();
        res.json({
          ok: true,
          message: "Component discovery complete",
          componentCount: componentRegistry.getAll().length,
          timestamp: new Date().toISOString(),
        });
      });
    },
  };
}

// CLI entry point
if (process.argv[1]?.includes("component-registry")) {
  (async () => {
    await componentRegistry.discoverComponents();
    const report = componentRegistry.generateReport();
    console.log(componentRegistry.formatReport(report));
  })();
}
