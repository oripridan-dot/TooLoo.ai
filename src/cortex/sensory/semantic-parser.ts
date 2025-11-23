// @version 2.1.59
import fs from "fs-extra";
import * as path from "path";
import { EventBus } from "../../core/event-bus.js";

export class SemanticParser {
  constructor(private bus: EventBus, private workspaceRoot: string) {}

  async analyzeProject() {
    console.log("[SemanticParser] Analyzing project structure...");
    
    const projectInfo: any = {
        dependencies: {},
        scripts: {},
        tsconfig: {}
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
    try {
        const tsconfigPath = path.join(this.workspaceRoot, "tsconfig.json");
        if (await fs.pathExists(tsconfigPath)) {
            const tsconfig = await fs.readJson(tsconfigPath);
            projectInfo.tsconfig = tsconfig.compilerOptions;
            console.log("[SemanticParser] Found tsconfig.json");
        }
    } catch (e: any) {
        console.warn(`[SemanticParser] Failed to parse tsconfig.json: ${e.message}`);
    }

    // 3. Publish findings to Memory (Hippocampus)
    this.bus.publish("cortex", "memory:store", {
        description: "Project Structure Analysis",
        content: JSON.stringify(projectInfo),
        type: "system",
        tags: ["project-analysis", "structure"]
    });

    return projectInfo;
  }
}
