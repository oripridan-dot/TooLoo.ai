/**
 * @tooloo/skills - Hot Reloader
 * Watch skill YAML files and reload them on change
 *
 * @version 2.0.0-alpha.0
 */
import { SkillRegistry } from './registry.js';
import { type SkillId } from '@tooloo/core';
export interface HotReloaderConfig {
    /** Directory to watch for skill YAML files */
    skillsDir: string;
    /** File patterns to watch (default: ['*.yaml', '*.yml']) */
    patterns?: string[];
    /** Debounce delay in ms (default: 100) */
    debounceMs?: number;
    /** Whether to log changes */
    verbose?: boolean;
}
export interface LoadedSkill {
    id: SkillId;
    path: string;
    lastModified: Date;
}
/**
 * SkillHotReloader - Watches a directory for skill YAML files and automatically
 * reloads them when changed.
 */
export declare class SkillHotReloader {
    private registry;
    private config;
    private watcher;
    private loadedSkills;
    private debounceTimers;
    private isRunning;
    constructor(registry: SkillRegistry, config: HotReloaderConfig);
    /**
     * Start watching for skill file changes
     */
    start(): Promise<void>;
    /**
     * Stop watching for changes
     */
    stop(): void;
    /**
     * Get list of loaded skills
     */
    getLoadedSkills(): LoadedSkill[];
    /**
     * Force reload a specific skill file
     */
    reloadSkill(filename: string): Promise<boolean>;
    /**
     * Force reload all skills
     */
    reloadAll(): Promise<number>;
    private loadAllSkills;
    private loadSkillFile;
    private yamlToSkillDefinition;
    private handleFileChange;
    private isYamlFile;
    private log;
}
/**
 * Factory function to create a hot reloader
 */
export declare function createHotReloader(registry: SkillRegistry, config: HotReloaderConfig): SkillHotReloader;
//# sourceMappingURL=hot-reloader.d.ts.map