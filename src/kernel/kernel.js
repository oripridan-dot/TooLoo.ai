/**
 * @file TooLoo.ai Skills OS - Kernel
 * @description The universal execution endpoint for skills
 * @version 1.4.0.0
 * @updated 2025-12-15
 *
 * The Kernel has ONE job: find a skill and execute it.
 * It doesn't know what "chat" is or what "coding" means.
 * It just loads the skill, validates input, runs execute(), and returns results.
 *
 * V1.3.0: Integrated Memory Cortex for session context, conversation history,
 * and persistent memory storage.
 *
 * V1.3.0: Integrated ToolExecutor for file, search, and terminal operations.
 *
 * V1.4.0: Integrated Native Engines - NO LEGACY DEPENDENCIES
 * - LearningEngine: Q-learning, rewards, feedback
 * - EvolutionEngine: A/B testing, prompt optimization
 * - EmergenceEngine: Pattern detection, synergies
 * - RoutingEngine: Provider selection, waterfall fallback
 */
import { EventEmitter } from 'events';
import { z } from 'zod';
import { registry } from './registry.js';
import { router } from './router.js';
import { getMemoryCortex } from '@tooloo/memory';
import { getToolExecutor, registerAllTools, 
// Native Engines
getLearningEngine, getEvolutionEngine, getEmergenceEngine, getRoutingEngine, } from '@tooloo/skills';
// =============================================================================
// KERNEL CLASS
// =============================================================================
export class Kernel extends EventEmitter {
    context;
    activeSkillId = null;
    executionHistory = [];
    memoryCortex;
    toolExecutor;
    // Native Engines - NO LEGACY DEPENDENCIES
    learningEngine;
    evolutionEngine;
    emergenceEngine;
    routingEngine;
    constructor() {
        super();
        // Initialize Memory Cortex
        this.memoryCortex = getMemoryCortex({
            maxMessagesPerSession: 100,
            maxWorkingMemorySlots: 9,
            sessionTimeoutMs: 3600000, // 1 hour
            shortTermMaxSize: 10000,
            shortTermTtlMs: 24 * 60 * 60 * 1000, // 24 hours
            embedding: {
                provider: process.env['OPENAI_API_KEY'] ? 'openai' : 'local',
                apiKey: process.env['OPENAI_API_KEY'],
            },
            autoConsolidate: true,
            consolidationIntervalMs: 60000,
            autoCleanup: true,
            cleanupIntervalMs: 300000,
        });
        // Initialize Tool Executor with all built-in tools
        this.toolExecutor = getToolExecutor({
            defaultTimeout: 30000,
            requireApproval: true,
            allowedPaths: ['/workspaces', '/tmp', process.cwd()],
            deniedPaths: ['/etc', '/var', '/usr', '/bin', '/sbin', '/root'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            auditLogging: true,
            rateLimitPerMinute: 100,
        });
        registerAllTools(this.toolExecutor);
        // Initialize Native Engines - NO LEGACY DEPENDENCIES
        const dataDir = process.env['DATA_DIR'] ?? './data/engines';
        this.learningEngine = getLearningEngine({
            persistPath: `${dataDir}/q-learning.json`,
            learningRate: 0.1,
            discountFactor: 0.95,
            epsilon: 0.1,
            epsilonDecay: 0.995,
            minEpsilon: 0.01,
        });
        this.evolutionEngine = getEvolutionEngine({
            persistPath: `${dataDir}/evolution.json`,
            populationSize: 10,
            mutationRate: 0.1,
            eliteCount: 2,
            maxGenerations: 100,
        });
        this.emergenceEngine = getEmergenceEngine({
            persistPath: `${dataDir}/emergence.json`,
            patternThreshold: 0.5,
            synergyThreshold: 0.3,
            maxPatterns: 1000,
            maxSynergies: 500,
        });
        this.routingEngine = getRoutingEngine({
            persistPath: `${dataDir}/routing.json`,
            defaultProvider: 'deepseek',
            fallbackChain: ['deepseek', 'anthropic', 'openai', 'gemini'],
            healthCheckIntervalMs: 60000,
        });
        // Initialize default context with a session
        const session = this.memoryCortex.createSession();
        this.context = this.createContext(session.sessionId);
    }
    // ---------------------------------------------------------------------------
    // Context Management
    // ---------------------------------------------------------------------------
    /**
     * Create a default kernel context
     */
    createContext(sessionId, overrides) {
        return {
            user: null,
            sessionId,
            services: {
                emit: (event, payload) => this.emit(event, payload),
                getSkill: (id) => registry.get(id),
                executeSkill: (id, input) => this.execute({ skillId: id, input }),
                memory: this.createMemoryServices(sessionId),
                llm: {
                    complete: async (prompt, options) => this.llmComplete(prompt, options),
                    stream: (prompt, options) => this.llmStream(prompt, options),
                },
                tools: this.createToolServices(sessionId),
                engines: this.createEngineServices(),
            },
            ...overrides,
        };
    }
    /**
     * Create memory services bound to a session
     */
    createMemoryServices(sessionId) {
        return {
            // Legacy key-value (working memory)
            get: async (key) => this.memoryCortex.getWorkingMemory(sessionId, key),
            set: async (key, value) => this.memoryCortex.setWorkingMemory(sessionId, key, value),
            delete: async (key) => {
                this.memoryCortex.deleteWorkingMemory(sessionId, key);
            },
            // Conversation history
            getHistory: (limit) => this.memoryCortex.getConversationHistory(sessionId, limit),
            addMessage: (message) => {
                this.memoryCortex.addMessage(sessionId, message);
            },
            // Memory storage
            store: async (entry) => {
                const memory = await this.memoryCortex.store({
                    ...entry,
                    sessionId,
                });
                return {
                    id: memory.id,
                    content: memory.content,
                    type: memory.type,
                    importance: memory.importance,
                    timestamp: memory.timestamp,
                };
            },
            retrieve: async (query) => {
                const results = await this.memoryCortex.retrieve({
                    query: query.query,
                    type: query.type,
                    limit: query.limit,
                    minImportance: query.minImportance,
                    semantic: query.semantic,
                });
                return results.map((r) => ({
                    memory: {
                        id: r.item.id,
                        content: r.item.content,
                        type: r.item.type,
                        importance: r.item.importance,
                        timestamp: r.item.timestamp,
                    },
                    score: r.score,
                }));
            },
            recall: async (id) => {
                const memory = await this.memoryCortex.recall(id);
                if (!memory)
                    return null;
                return {
                    id: memory.id,
                    content: memory.content,
                    type: memory.type,
                    importance: memory.importance,
                    timestamp: memory.timestamp,
                };
            },
            forget: async (id) => this.memoryCortex.forget(id),
            // Session context
            getSessionContext: () => {
                const session = this.memoryCortex.getSession(sessionId);
                if (!session) {
                    return {
                        sessionId,
                        messageCount: 0,
                        workingMemoryKeys: [],
                        startedAt: Date.now(),
                        lastActivityAt: Date.now(),
                    };
                }
                return {
                    sessionId: session.sessionId,
                    messageCount: session.messages.length,
                    workingMemoryKeys: session.workingMemory.map((s) => s.key),
                    activeSkillId: session.activeSkillId,
                    startedAt: session.startedAt,
                    lastActivityAt: session.lastActivityAt,
                };
            },
        };
    }
    /**
     * Create tool services bound to a session
     */
    createToolServices(sessionId) {
        const createContext = (skillId) => ({
            sessionId,
            userId: this.context.user?.id,
            skillId,
            workingDirectory: this.context.project?.path ?? process.cwd(),
            dryRun: false,
            approvalCallback: async (request) => {
                // Emit approval request event - UI can handle this
                this.emit('tool:approval:request', request);
                // For now, auto-approve low-risk operations
                return request.riskLevel === 'low' || request.riskLevel === 'medium';
            },
        });
        return {
            execute: async (toolName, params) => {
                const ctx = createContext(this.activeSkillId ?? 'unknown');
                return this.toolExecutor.execute(toolName, params, ctx);
            },
            listTools: () => this.toolExecutor.listTools(),
            hasTool: (name) => this.toolExecutor.getTool(name) !== undefined,
            // Convenience methods
            readFile: async (path, options) => {
                const ctx = createContext(this.activeSkillId ?? 'unknown');
                return this.toolExecutor.execute('file_read', { path, ...options }, ctx);
            },
            writeFile: async (path, content, options) => {
                const ctx = createContext(this.activeSkillId ?? 'unknown');
                return this.toolExecutor.execute('file_write', { path, content, ...options }, ctx);
            },
            grepSearch: async (pattern, options) => {
                const ctx = createContext(this.activeSkillId ?? 'unknown');
                return this.toolExecutor.execute('grep_search', { pattern, ...options }, ctx);
            },
            semanticSearch: async (query, options) => {
                const ctx = createContext(this.activeSkillId ?? 'unknown');
                return this.toolExecutor.execute('semantic_search', { query, ...options }, ctx);
            },
            terminal: async (command, options) => {
                const ctx = createContext(this.activeSkillId ?? 'unknown');
                return this.toolExecutor.execute('terminal_execute', { command, ...options }, ctx);
            },
        };
    }
    /**
     * Create engine services
     * Provides access to native learning, evolution, emergence, and routing engines
     * NO LEGACY DEPENDENCIES
     */
    createEngineServices() {
        return {
            learning: this.learningEngine,
            evolution: this.evolutionEngine,
            emergence: this.emergenceEngine,
            routing: this.routingEngine,
            isHealthy: () => {
                return (this.learningEngine.isHealthy() &&
                    this.evolutionEngine.isHealthy() &&
                    this.emergenceEngine.isHealthy() &&
                    this.routingEngine.isHealthy());
            },
            getMetrics: () => {
                const learningStats = this.learningEngine.getStats();
                const evolutionStats = this.evolutionEngine.getStats();
                const emergenceStats = this.emergenceEngine.getStats();
                const routingStats = this.routingEngine.getStats();
                return {
                    learning: {
                        totalStates: learningStats.totalStates ?? 0,
                        totalRewards: learningStats.totalRewards ?? 0,
                        averageQValue: learningStats.averageQValue ?? 0,
                        explorationRate: learningStats.epsilon ?? 0.1,
                    },
                    evolution: {
                        activeStrategies: evolutionStats.totalStrategies ?? 0,
                        activeTests: evolutionStats.activeTests ?? 0,
                        totalIterations: evolutionStats.totalIterations ?? 0,
                        bestPerformance: evolutionStats.bestPerformance ?? 0,
                    },
                    emergence: {
                        totalPatterns: emergenceStats.totalPatterns ?? 0,
                        totalSynergies: emergenceStats.totalSynergies ?? 0,
                        activeGoals: emergenceStats.activeGoals ?? 0,
                        signalCount: emergenceStats.signalCount ?? 0,
                    },
                    routing: {
                        totalRoutes: routingStats.totalRoutes ?? 0,
                        successRate: routingStats.successRate ?? 1.0,
                        providersOnline: routingStats.providersOnline ?? 4,
                        averageLatency: routingStats.averageLatency ?? 0,
                    },
                };
            },
        };
    }
    /**
     * Update the kernel context
     */
    setContext(updates) {
        this.context = { ...this.context, ...updates };
    }
    /**
     * Set the current user
     */
    setUser(user) {
        this.context.user = user;
    }
    /**
     * Set the current project
     */
    setProject(project) {
        this.context.project = project;
    }
    // ---------------------------------------------------------------------------
    // Skill Execution
    // ---------------------------------------------------------------------------
    /**
     * Execute a skill by ID with given input
     * This is the CORE of the Skill OS
     */
    async execute(request) {
        const { skillId, input } = request;
        const startTime = Date.now();
        // Emit loading event
        this.emitEvent({ type: 'skill:executing', skillId, input });
        try {
            // 1. Find the skill
            const skill = registry.get(skillId);
            if (!skill) {
                throw new SkillNotFoundError(skillId);
            }
            // 2. Check requirements
            this.checkRequirements(skill);
            // 3. Validate input against schema
            const validatedInput = skill.schema.parse(input);
            // 4. Execute the skill's logic
            const data = await skill.execute(validatedInput, this.context);
            // 5. Validate output if schema exists
            if (skill.outputSchema) {
                skill.outputSchema.parse(data);
            }
            // 6. Build success result
            const endTime = Date.now();
            const result = {
                skillId,
                success: true,
                data: data,
                meta: {
                    startTime,
                    endTime,
                    duration: endTime - startTime,
                },
            };
            // 7. Track and emit
            this.executionHistory.push(result);
            this.emitEvent({ type: 'skill:executed', skillId, result });
            return result;
        }
        catch (error) {
            const endTime = Date.now();
            // Build error result
            const result = {
                skillId,
                success: false,
                error: this.formatError(error),
                meta: {
                    startTime,
                    endTime,
                    duration: endTime - startTime,
                },
            };
            this.executionHistory.push(result);
            this.emitEvent({ type: 'skill:error', skillId, error: error });
            return result;
        }
    }
    /**
     * Execute skill based on natural language input
     * Uses the router to find the best skill
     */
    async executeIntent(text) {
        const routeResult = router.route(text, this.context);
        if (!routeResult.skill) {
            return {
                skillId: 'unknown',
                success: false,
                error: {
                    code: 'NO_SKILL_MATCH',
                    message: 'No skill matched the input',
                    details: { input: text, alternatives: routeResult.alternatives },
                },
                meta: {
                    startTime: Date.now(),
                    endTime: Date.now(),
                    duration: 0,
                },
            };
        }
        // Extract the query part from params or use full text
        const input = routeResult.params?.['query'] ?? text;
        return this.execute({
            skillId: routeResult.skill.id,
            input: { message: input, raw: text },
        });
    }
    /**
     * Check if skill requirements are met
     */
    checkRequirements(skill) {
        const requires = skill.intent.requires;
        if (!requires)
            return;
        if (requires.auth && !this.context.user) {
            throw new RequirementError('Authentication required');
        }
        if (requires.project && !this.context.project) {
            throw new RequirementError('Project context required');
        }
        // Could check capabilities here too
    }
    // ---------------------------------------------------------------------------
    // Skill Activation (UI State)
    // ---------------------------------------------------------------------------
    /**
     * Activate a skill (make it the current UI)
     */
    async activate(skillId) {
        const skill = registry.get(skillId);
        if (!skill) {
            throw new SkillNotFoundError(skillId);
        }
        // Deactivate current skill
        if (this.activeSkillId) {
            await this.deactivate();
        }
        // Run activation hook
        if (skill.hooks?.onActivate) {
            await skill.hooks.onActivate(this.context);
        }
        this.activeSkillId = skillId;
        this.emitEvent({ type: 'skill:activated', skillId });
    }
    /**
     * Deactivate the current skill
     */
    async deactivate() {
        if (!this.activeSkillId)
            return;
        const skill = registry.get(this.activeSkillId);
        if (skill?.hooks?.onDeactivate) {
            await skill.hooks.onDeactivate();
        }
        this.emitEvent({ type: 'skill:deactivated', skillId: this.activeSkillId });
        this.activeSkillId = null;
    }
    /**
     * Get the currently active skill
     */
    getActiveSkill() {
        return this.activeSkillId ? (registry.get(this.activeSkillId) ?? null) : null;
    }
    // ---------------------------------------------------------------------------
    // LLM Services (Provided to Skills)
    // ---------------------------------------------------------------------------
    /**
     * Simple LLM completion (skills can use this)
     * In production, this would route to actual providers
     */
    async llmComplete(prompt, options) {
        // This is a placeholder - integrate with your actual LLM providers
        // For now, emit an event that external systems can handle
        this.emit('llm:complete', { prompt, options });
        // Mock response for demo
        return `[LLM Response to: "${prompt.slice(0, 50)}..."]`;
    }
    /**
     * Streaming LLM completion
     */
    async *llmStream(prompt, options) {
        this.emit('llm:stream:start', { prompt, options });
        // Mock streaming for demo
        const words = `This is a mock streaming response to: ${prompt}`.split(' ');
        for (const word of words) {
            yield word + ' ';
            await new Promise((r) => setTimeout(r, 50));
        }
        this.emit('llm:stream:end', { prompt });
    }
    // ---------------------------------------------------------------------------
    // Memory Cortex Access (for advanced operations)
    // ---------------------------------------------------------------------------
    /**
     * Get direct access to the Memory Cortex
     * Use this for advanced operations not covered by context.services.memory
     */
    getMemoryCortex() {
        return this.memoryCortex;
    }
    /**
     * Get memory system statistics
     */
    getMemoryStats() {
        return this.memoryCortex.getStats();
    }
    /**
     * Create a new session (for new users/conversations)
     */
    createNewSession(userId) {
        const session = this.memoryCortex.createSession(userId);
        this.context = this.createContext(session.sessionId);
        return session.sessionId;
    }
    /**
     * Switch to an existing session
     */
    switchSession(sessionId) {
        const session = this.memoryCortex.getSession(sessionId);
        if (!session)
            return false;
        this.context = this.createContext(sessionId);
        return true;
    }
    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    /**
     * Initialize the kernel and all skills
     */
    async boot() {
        console.log('[Kernel] 🚀 Booting Synapsys Skill OS...');
        console.log('[Kernel] 🧠 Memory Cortex initialized');
        // Initialize Native Engines
        console.log('[Kernel] ⚙️ Initializing native engines...');
        await this.learningEngine.initialize();
        await this.evolutionEngine.initialize();
        await this.emergenceEngine.initialize();
        await this.routingEngine.initialize();
        console.log('[Kernel] ⚙️ Native engines online (learning, evolution, emergence, routing)');
        await registry.initialize();
        this.emitEvent({ type: 'kernel:ready' });
        console.log('[Kernel] ✅ Kernel ready');
    }
    /**
     * Shutdown the kernel
     */
    async shutdown() {
        console.log('[Kernel] 🛑 Shutting down...');
        if (this.activeSkillId) {
            await this.deactivate();
        }
        await registry.shutdown();
        // Shutdown Memory Cortex (performs final consolidation)
        await this.memoryCortex.shutdown();
        console.log('[Kernel] 🧠 Memory Cortex shutdown complete');
        // Shutdown Native Engines (persist state)
        await this.learningEngine.shutdown();
        await this.evolutionEngine.shutdown();
        await this.emergenceEngine.shutdown();
        await this.routingEngine.shutdown();
        console.log('[Kernel] ⚙️ Native engines shutdown complete');
        this.executionHistory = [];
        console.log('[Kernel] ✅ Shutdown complete');
    }
    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    /**
     * Emit a typed kernel event
     */
    emitEvent(event) {
        this.emit(event.type, event);
    }
    /**
     * Format an error for the response
     */
    formatError(error) {
        if (error instanceof z.ZodError) {
            return {
                code: 'VALIDATION_ERROR',
                message: 'Input validation failed',
                details: error.errors,
            };
        }
        if (error instanceof SkillNotFoundError) {
            return {
                code: 'SKILL_NOT_FOUND',
                message: error.message,
            };
        }
        if (error instanceof RequirementError) {
            return {
                code: 'REQUIREMENT_NOT_MET',
                message: error.message,
            };
        }
        if (error instanceof Error) {
            return {
                code: 'EXECUTION_ERROR',
                message: error.message,
                details: { stack: error.stack },
            };
        }
        return {
            code: 'UNKNOWN_ERROR',
            message: 'An unknown error occurred',
            details: error,
        };
    }
    /**
     * Get execution history
     */
    getHistory() {
        return [...this.executionHistory];
    }
    /**
     * Get kernel stats
     */
    getStats() {
        return {
            activeSkill: this.activeSkillId,
            executionCount: this.executionHistory.length,
            registeredSkills: registry.getStats(),
            sessionId: this.context.sessionId,
            user: this.context.user?.id ?? null,
        };
    }
}
// =============================================================================
// ERRORS
// =============================================================================
export class SkillNotFoundError extends Error {
    constructor(skillId) {
        super(`Skill not found: ${skillId}`);
        this.name = 'SkillNotFoundError';
    }
}
export class RequirementError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RequirementError';
    }
}
// =============================================================================
// SINGLETON
// =============================================================================
/** Global kernel instance */
export const kernel = new Kernel();
export default kernel;
//# sourceMappingURL=kernel.js.map