"use strict";
/**
 * @tooloo/skills - Hot Reloader
 * Watch skill YAML files and reload them on change
 *
 * @version 2.0.0-alpha.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillHotReloader = void 0;
exports.createHotReloader = createHotReloader;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const core_1 = require("@tooloo/core");
/**
 * SkillHotReloader - Watches a directory for skill YAML files and automatically
 * reloads them when changed.
 */
class SkillHotReloader {
    registry;
    config;
    watcher = null;
    loadedSkills = new Map();
    debounceTimers = new Map();
    isRunning = false;
    constructor(registry, config) {
        this.registry = registry;
        this.config = {
            skillsDir: config.skillsDir,
            patterns: config.patterns || ['*.yaml', '*.yml'],
            debounceMs: config.debounceMs ?? 100,
            verbose: config.verbose ?? true,
        };
    }
    /**
     * Start watching for skill file changes
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        // Ensure directory exists
        if (!fs.existsSync(this.config.skillsDir)) {
            fs.mkdirSync(this.config.skillsDir, { recursive: true });
            this.log(`Created skills directory: ${this.config.skillsDir}`);
        }
        // Initial load of all skills
        await this.loadAllSkills();
        // Start watching
        this.watcher = fs.watch(this.config.skillsDir, { persistent: true }, (eventType, filename) => {
            if (filename && this.isYamlFile(filename)) {
                this.handleFileChange(eventType, filename);
            }
        });
        this.isRunning = true;
        this.log(`Hot reloader started, watching: ${this.config.skillsDir}`);
    }
    /**
     * Stop watching for changes
     */
    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        // Clear any pending debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        this.isRunning = false;
        this.log('Hot reloader stopped');
    }
    /**
     * Get list of loaded skills
     */
    getLoadedSkills() {
        return Array.from(this.loadedSkills.values());
    }
    /**
     * Force reload a specific skill file
     */
    async reloadSkill(filename) {
        const filePath = path.join(this.config.skillsDir, filename);
        if (!fs.existsSync(filePath)) {
            this.log(`Skill file not found: ${filename}`, 'warn');
            return false;
        }
        try {
            await this.loadSkillFile(filePath);
            return true;
        }
        catch (error) {
            this.log(`Failed to reload skill: ${filename} - ${error}`, 'error');
            return false;
        }
    }
    /**
     * Force reload all skills
     */
    async reloadAll() {
        return this.loadAllSkills();
    }
    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================
    async loadAllSkills() {
        const files = fs.readdirSync(this.config.skillsDir).filter(f => this.isYamlFile(f));
        let loaded = 0;
        for (const file of files) {
            const filePath = path.join(this.config.skillsDir, file);
            try {
                await this.loadSkillFile(filePath);
                loaded++;
            }
            catch (error) {
                this.log(`Failed to load skill: ${file} - ${error}`, 'error');
            }
        }
        this.log(`Loaded ${loaded} skills from ${this.config.skillsDir}`);
        return loaded;
    }
    async loadSkillFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = yaml.load(content);
        // Convert YAML to SkillDefinition
        const skill = this.yamlToSkillDefinition(data, filePath);
        // Register with registry (overwrites if exists)
        this.registry.register(skill);
        // Track loaded skill
        this.loadedSkills.set(filePath, {
            id: skill.id,
            path: filePath,
            lastModified: new Date(),
        });
        this.log(`Loaded skill: ${skill.name} (${skill.id})`);
    }
    yamlToSkillDefinition(data, filePath) {
        // Generate ID from name or filename
        const name = data['name'] || path.basename(filePath, path.extname(filePath));
        const id = data['id']
            ? (0, core_1.createSkillId)(data['id'])
            : (0, core_1.createSkillId)(name.toLowerCase().replace(/\s+/g, '-'));
        // Parse triggers
        const triggersData = data['triggers'] || {};
        const intentStrings = triggersData['intents'] || [];
        const validIntents = [
            'code',
            'design',
            'analyze',
            'research',
            'plan',
            'chat',
            'execute',
            'create',
            'fix',
            'refactor',
            'test',
            'document',
            'unknown',
        ];
        const triggers = {
            intents: intentStrings.filter(i => validIntents.includes(i)),
            keywords: triggersData['keywords'] || [],
            patterns: triggersData['patterns'] || undefined,
            minConfidence: triggersData['minConfidence'] || undefined,
        };
        // Parse context
        const contextData = data['context'] || {};
        const context = {
            maxTokens: contextData['maxTokens'] || 4096,
            ragSources: (contextData['ragSources'] || ['memory']),
            memoryScope: (contextData['memoryScope'] || 'session'),
            includeHistory: contextData['includeHistory'] ?? true,
            maxHistoryMessages: contextData['maxHistoryMessages'] || 10,
        };
        // Parse composability
        const composabilityData = data['composability'] || {};
        const composability = {
            requires: composabilityData['requires'] || [],
            enhances: composabilityData['enhances'] || [],
            conflicts: composabilityData['conflicts'] || [],
            priority: composabilityData['priority'] || 0,
        };
        // Parse model requirements
        const modelReqData = data['modelRequirements'] || {};
        const validCapabilities = ['coding', 'reasoning', 'creative', 'vision', 'analysis'];
        const capabilitiesRaw = modelReqData['capabilities'] || [];
        const capabilities = capabilitiesRaw.filter(c => validCapabilities.includes(c));
        const modelRequirements = Object.keys(modelReqData).length > 0
            ? {
                temperature: modelReqData['temperature'] || undefined,
                minContext: modelReqData['minContext'] || undefined,
                capabilities: capabilities.length > 0 ? capabilities : undefined,
                preferredProviders: modelReqData['preferredProviders'] || undefined,
            }
            : undefined;
        return {
            id,
            name,
            version: data['version'] || '1.0.0',
            description: data['description'] || `Skill loaded from ${path.basename(filePath)}`,
            instructions: data['instructions'] || '',
            tools: (data['tools'] ||
                []),
            triggers,
            context,
            composability,
            modelRequirements,
        };
    }
    handleFileChange(eventType, filename) {
        const filePath = path.join(this.config.skillsDir, filename);
        // Debounce the reload
        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        this.debounceTimers.set(filePath, setTimeout(async () => {
            this.debounceTimers.delete(filePath);
            if (eventType === 'rename') {
                // File might be deleted or renamed
                if (!fs.existsSync(filePath)) {
                    // File deleted - unregister skill
                    const loaded = this.loadedSkills.get(filePath);
                    if (loaded) {
                        this.registry.unregister(loaded.id);
                        this.loadedSkills.delete(filePath);
                        this.log(`Unregistered skill: ${loaded.id} (file deleted)`);
                    }
                    return;
                }
            }
            // Load or reload the skill
            try {
                await this.loadSkillFile(filePath);
                this.log(`Reloaded skill: ${filename}`);
            }
            catch (error) {
                this.log(`Failed to reload skill: ${filename} - ${error}`, 'error');
            }
        }, this.config.debounceMs));
    }
    isYamlFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return ext === '.yaml' || ext === '.yml';
    }
    log(message, level = 'info') {
        if (!this.config.verbose && level === 'info') {
            return;
        }
        const prefix = '[SkillHotReloader]';
        switch (level) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️  ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }
}
exports.SkillHotReloader = SkillHotReloader;
/**
 * Factory function to create a hot reloader
 */
function createHotReloader(registry, config) {
    return new SkillHotReloader(registry, config);
}
//# sourceMappingURL=hot-reloader.js.map