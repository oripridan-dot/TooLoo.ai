// @version 2.1.379
/**
 * CapabilitiesManager - Unified capabilities registry
 * Dynamically registers and discovers visual capabilities and Designer tools
 */

export interface Capability {
  name: string;
  description: string;
  category: "visual" | "design" | "chat" | "workflow" | "integration";
  module: string; // Reference to the module/service
  methods: string[];
  status: "online" | "offline" | "degraded";
  version: string;
  requirements?: string[]; // Dependencies or requirements
  registered: Date;
  metadata?: Record<string, any>;
}

export interface CapabilityRegistry {
  capabilities: Map<string, Capability>;
  categories: Map<string, Capability[]>;
}

export default class CapabilitiesManager {
  private static instance: CapabilitiesManager;
  private registry: CapabilityRegistry;
  private config: Record<string, any>;

  private constructor(config = {}) {
    this.config = config;
    this.registry = {
      capabilities: new Map(),
      categories: new Map(),
    };
    this.initializeDefaultCapabilities();
  }

  static getInstance(): CapabilitiesManager {
    if (!CapabilitiesManager.instance) {
      CapabilitiesManager.instance = new CapabilitiesManager();
    }
    return CapabilitiesManager.instance;
  }

  async init() {
    console.log("[CapabilitiesManager] Initializing with " + this.registry.capabilities.size + " capabilities");
    return { ok: true, engine: "capabilities-manager", status: "ready", count: this.registry.capabilities.size };
  }

  /**
   * Initialize default visual and design capabilities
   */
  private initializeDefaultCapabilities() {
    // Visual Generation Capabilities
    this.registerCapability({
      name: "image.generate.dalle3",
      description: "Generate images using OpenAI DALL-E 3",
      category: "visual",
      module: "dalle3Integration",
      methods: ["generateImage", "editImage", "createVariation"],
      status: "online",
      version: "1.0.0",
      requirements: ["OPENAI_API_KEY"],
    });

    this.registerCapability({
      name: "image.generate.gemini",
      description: "Generate images using Google Gemini ImageFX",
      category: "visual",
      module: "geminiIntegration",
      methods: ["generateImage"],
      status: "online",
      version: "1.0.0",
      requirements: ["GEMINI_API_KEY"],
    });

    // NEW: Context-aware visual code generation (Nano Banana + DALL-E)
    this.registerCapability({
      name: "image.context.code-generation.gemini",
      description: "Generate functional code from visual context using Gemini 3 Pro Image Preview (Nano Banana)",
      category: "visual",
      module: "geminiContextCodeGen",
      methods: ["generateCodeFromContext", "analyzeVisualContext"],
      status: "online",
      version: "2.0.0",
      requirements: ["GEMINI_API_KEY"],
      metadata: {
        model: "gemini-3-pro-image-preview",
        codeName: "NanoBanana",
        capabilities: ["context-aware", "code-generation", "design-analysis"],
      },
    });

    this.registerCapability({
      name: "image.context.code-generation.dalle3",
      description: "Generate functional code from visual context using DALL-E 3 + GPT-4 Turbo",
      category: "visual",
      module: "dalle3ContextCodeGen",
      methods: ["generateCodeFromContext", "analyzeVisualContext", "generateImage"],
      status: "online",
      version: "2.0.0",
      requirements: ["OPENAI_API_KEY"],
      metadata: {
        model: "gpt-4-turbo",
        visionModel: "dall-e-3",
        capabilities: ["context-aware", "code-generation", "visual-analysis", "image-generation"],
      },
    });

    // Diagram Generation
    this.registerCapability({
      name: "diagram.generate.mermaid",
      description: "Generate diagrams using Mermaid.js syntax",
      category: "visual",
      module: "mermaidRenderer",
      methods: ["generateDiagram", "renderDiagram", "toPNG"],
      status: "online",
      version: "1.0.0",
    });

    // Design Capabilities
    this.registerCapability({
      name: "design.system.tokens",
      description: "Manage design system tokens and themes",
      category: "design",
      module: "designTokenSystem",
      methods: ["createToken", "updateToken", "deleteToken", "getTokens"],
      status: "online",
      version: "1.0.0",
    });

    this.registerCapability({
      name: "design.component.create",
      description: "Create and manage design components",
      category: "design",
      module: "componentEngine",
      methods: ["createComponent", "updateComponent", "deleteComponent", "listComponents"],
      status: "online",
      version: "1.0.0",
    });

    this.registerCapability({
      name: "design.export",
      description: "Export design systems to various formats (CSS, JSON, FIGMA)",
      category: "design",
      module: "designExporter",
      methods: ["exportCSS", "exportJSON", "exportFigma"],
      status: "online",
      version: "1.0.0",
    });

    // Chat Visual Capabilities
    this.registerCapability({
      name: "chat.visual.render",
      description: "Render visual elements in chat (images, diagrams, components)",
      category: "chat",
      module: "visualRenderer",
      methods: ["renderImage", "renderDiagram", "renderComponent"],
      status: "online",
      version: "1.0.0",
    });

    this.registerCapability({
      name: "chat.commands.visual",
      description: "Handle visual chat commands (/image, /diagram, /component)",
      category: "chat",
      module: "chatCommands",
      methods: ["processCommand", "suggestCommands"],
      status: "online",
      version: "1.0.0",
    });

    // Designer Integration
    this.registerCapability({
      name: "designer.sync",
      description: "Two-way synchronization between Designer and Chat",
      category: "integration",
      module: "designerSyncEngine",
      methods: ["syncComponent", "broadcastUpdate", "resolveConflict"],
      status: "online",
      version: "1.0.0",
    });

    this.registerCapability({
      name: "designer.plugin.chat",
      description: "Launch Designer as a plugin within Chat",
      category: "integration",
      module: "designerChatPlugin",
      methods: ["launch", "embedDesigner", "extractComponent"],
      status: "online",
      version: "1.0.0",
    });

    // Workflow Capabilities
    this.registerCapability({
      name: "workflow.ai.suggestions",
      description: "AI-powered suggestions for visual improvements and designs",
      category: "workflow",
      module: "aiSuggestions",
      methods: ["suggestDesign", "suggestDiagram", "suggestColor"],
      status: "online",
      version: "1.0.0",
      requirements: ["GEMINI_API_KEY", "OPENAI_API_KEY"],
    });

    console.log(`[CapabilitiesManager] Initialized ${this.registry.capabilities.size} default capabilities`);
  }

  /**
   * Register a new capability
   */
  registerCapability(capability: Omit<Capability, "registered">): { ok: boolean; capability: string } {
    const fullCapability: Capability = {
      ...capability,
      registered: new Date(),
    };

    this.registry.capabilities.set(capability.name, fullCapability);

    // Index by category
    if (!this.registry.categories.has(capability.category)) {
      this.registry.categories.set(capability.category, []);
    }
    this.registry.categories.get(capability.category)!.push(fullCapability);

    console.log(`[CapabilitiesManager] Registered capability: ${capability.name}`);
    return { ok: true, capability: capability.name };
  }

  /**
   * Get all capabilities
   */
  async getCapabilities(filter?: { category?: string; status?: string }): Promise<any> {
    let capabilities = Array.from(this.registry.capabilities.values());

    if (filter?.category) {
      capabilities = capabilities.filter((c) => c.category === filter.category);
    }

    if (filter?.status) {
      capabilities = capabilities.filter((c) => c.status === filter.status);
    }

    return {
      ok: true,
      capabilities,
      count: capabilities.length,
      total: this.registry.capabilities.size,
    };
  }

  /**
   * Get capabilities by category
   */
  getByCategory(category: string): Capability[] {
    return this.registry.categories.get(category) || [];
  }

  /**
   * Check if a capability is available
   */
  async checkCapability(name: string): Promise<any> {
    const capability = this.registry.capabilities.get(name);
    return {
      ok: true,
      capability: name,
      available: !!capability,
      status: capability?.status || "not_found",
      details: capability || null,
    };
  }

  /**
   * Check multiple capabilities
   */
  async checkCapabilities(names: string[]): Promise<any> {
    const results: Record<string, boolean> = {};
    for (const name of names) {
      const cap = this.registry.capabilities.get(name);
      results[name] = !!cap && cap.status === "online";
    }
    return { ok: true, results };
  }

  /**
   * Get capabilities for a specific task
   */
  async getCapabilitiesForTask(taskType: "visual" | "design" | "chat" | "workflow"): Promise<Capability[]> {
    return this.getByCategory(taskType);
  }

  /**
   * Get system status
   */
  getStatus(): any {
    const byCategory = Object.fromEntries(
      Array.from(this.registry.categories.entries()).map(([cat, caps]) => [
        cat,
        { total: caps.length, online: caps.filter((c) => c.status === "online").length },
      ]),
    );

    return {
      engine: "capabilities-manager",
      totalCapabilities: this.registry.capabilities.size,
      byCategory,
      capabilities: Array.from(this.registry.capabilities.keys()),
    };
  }

  /**
   * Update capability status
   */
  updateCapabilityStatus(name: string, status: "online" | "offline" | "degraded"): boolean {
    const capability = this.registry.capabilities.get(name);
    if (!capability) return false;

    capability.status = status;
    console.log(`[CapabilitiesManager] Updated ${name} status to ${status}`);
    return true;
  }

  /**
   * Get capability details
   */
  getCapabilityDetails(name: string): Capability | null {
    return this.registry.capabilities.get(name) || null;
  }

  /**
   * Get all methods available for a capability
   */
  getCapabilityMethods(name: string): string[] {
    return this.registry.capabilities.get(name)?.methods || [];
  }

  /**
   * Search capabilities by description or name
   */
  search(query: string): Capability[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.registry.capabilities.values()).filter(
      (cap) =>
        cap.name.toLowerCase().includes(lowerQuery) ||
        cap.description.toLowerCase().includes(lowerQuery),
    );
  }
}
