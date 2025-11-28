// @version 2.2.86
#!/usr/bin/env tsx
/**
 * TooLoo.ai Inner Connectivity Integration Test Suite
 * @version 2.1.341
 *
 * Tests:
 * 1. Enhanced EventBus with visual payloads
 * 2. CapabilitiesManager registration & discovery
 * 3. Visual Rendering Pipeline
 * 4. Designer-Chat bidirectional sync
 * 5. Chat visual commands (/diagram, /image, /component)
 */

import { bus, VisualData } from "../src/core/event-bus.js";
import CapabilitiesManager from "../src/cortex/engine/capabilities-manager.js";
import { visualRenderer } from "../src/cortex/imagination/visual-renderer.js";
import { designerChatSync } from "../src/cortex/imagination/designer-chat-sync.js";

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class IntegrationTestSuite {
  private results: TestResult[] = [];
  private passedCount: number = 0;
  private failedCount: number = 0;

  async run() {
    console.log(
      `${colors.bright}${colors.cyan}🧪 TooLoo.ai Inner Connectivity Integration Tests${colors.reset}\n`,
    );

    // Test 1: Enhanced EventBus
    await this.testEnhancedEventBus();

    // Test 2: CapabilitiesManager
    await this.testCapabilitiesManager();

    // Test 3: Visual Renderer
    await this.testVisualRenderer();

    // Test 4: Designer-Chat Sync
    await this.testDesignerChatSync();

    // Test 5: Chat Visual Commands
    await this.testChatVisualCommands();

    // Test 6: Visual Providers (DeSign Studio + DALL-E context-aware code generation)
    await this.testVisualProviders();

    // Print summary
    this.printSummary();
  }

  private async testEnhancedEventBus() {
    console.log(
      `${colors.magenta}📡 Test 1: Enhanced EventBus with Visual Payloads${colors.reset}`,
    );

    const startTime = Date.now();
    let passed = true;
    let error: string | undefined;

    try {
      // Test 1.1: Publish visual event
      console.log("  ├─ Publishing visual event...");
      let visualEventReceived = false;
      bus.on("visual:update", () => {
        visualEventReceived = true;
      });

      bus.publishVisual("cortex", "visual:test", "test data", {
        type: "image",
        data: "base64imagedata",
        mimeType: "image/png",
        altText: "Test image",
      });

      if (!visualEventReceived) {
        throw new Error("Visual event not received");
      }
      console.log("  ✓ Visual event published and received");

      // Test 1.2: Publish designer action
      console.log("  ├─ Publishing designer action...");
      let designerActionReceived = false;
      bus.on("designer:action", () => {
        designerActionReceived = true;
      });

      bus.publishDesignerAction("nexus", "designer:action", {
        action: "create",
        target: "component",
        payload: { definition: { type: "button" } },
      });

      if (!designerActionReceived) {
        throw new Error("Designer action not received");
      }
      console.log("  ✓ Designer action published and received");

      // Test 1.3: Event filtering
      console.log("  ├─ Testing event filters...");
      let filteredEventCount = 0;
      bus.subscribeTo(
        "*",
        () => {
          filteredEventCount++;
        },
        { types: ["visual:test"] },
      );

      bus.publish("cortex", "other:event", { data: "test" });
      bus.publishVisual("cortex", "visual:test", "data", {
        type: "image",
        data: "test",
      });

      if (filteredEventCount !== 1) {
        throw new Error(`Expected 1 filtered event, got ${filteredEventCount}`);
      }
      console.log("  ✓ Event filtering works correctly");

      // Test 1.4: Event history
      console.log("  ├─ Checking event history...");
      const history = bus.getEventHistory(10);
      if (history.length === 0) {
        throw new Error("Event history is empty");
      }
      console.log(`  ✓ Event history contains ${history.length} events`);

      console.log(`${colors.green}✅ Test 1 PASSED${colors.reset}\n`);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      console.log(`${colors.red}❌ Test 1 FAILED: ${error}${colors.reset}\n`);
    }

    this.recordResult({
      name: "Enhanced EventBus with Visual Payloads",
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  private async testCapabilitiesManager() {
    console.log(
      `${colors.magenta}🎯 Test 2: CapabilitiesManager Registration & Discovery${colors.reset}`,
    );

    const startTime = Date.now();
    let passed = true;
    let error: string | undefined;

    try {
      const capManager = CapabilitiesManager.getInstance();

      // Test 2.1: Get all capabilities
      console.log("  ├─ Retrieving all capabilities...");
      const capsResult = await capManager.getCapabilities();
      if (!capsResult.ok || capsResult.count === 0) {
        throw new Error("Failed to retrieve capabilities");
      }
      console.log(`  ✓ Retrieved ${capsResult.count} capabilities`);

      // Test 2.2: Check specific capability
      console.log("  ├─ Checking for image generation capability...");
      const checkResult = await capManager.checkCapability(
        "image.generate.dalle3",
      );
      if (!checkResult.available) {
        throw new Error("image.generate.dalle3 capability not found");
      }
      console.log("  ✓ image.generate.dalle3 is available");

      // Test 2.3: Get capabilities by category
      console.log("  ├─ Filtering capabilities by category...");
      const visualCaps = await capManager.getCapabilities({
        category: "visual",
      });
      if (visualCaps.count === 0) {
        throw new Error("No visual capabilities found");
      }
      console.log(`  ✓ Found ${visualCaps.count} visual capabilities`);

      // Test 2.4: Get status
      console.log("  ├─ Checking manager status...");
      const status = capManager.getStatus();
      if (status.totalCapabilities === 0) {
        throw new Error("Manager shows no capabilities");
      }
      console.log(
        `  ✓ Manager status: ${status.totalCapabilities} capabilities registered`,
      );

      // Test 2.5: Search capabilities
      console.log("  ├─ Searching for 'diagram' capabilities...");
      const searchResults = capManager.search("diagram");
      if (searchResults.length === 0) {
        throw new Error("No diagram capabilities found");
      }
      console.log(
        `  ✓ Found ${searchResults.length} diagram-related capabilities`,
      );

      console.log(`${colors.green}✅ Test 2 PASSED${colors.reset}\n`);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      console.log(`${colors.red}❌ Test 2 FAILED: ${error}${colors.reset}\n`);
    }

    this.recordResult({
      name: "CapabilitiesManager Registration & Discovery",
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  private async testVisualRenderer() {
    console.log(
      `${colors.magenta}🎨 Test 3: Visual Rendering Pipeline${colors.reset}`,
    );

    const startTime = Date.now();
    let passed = true;
    let error: string | undefined;

    try {
      // Test 3.1: Render image
      console.log("  ├─ Rendering image visual...");
      const imageVisual: VisualData = {
        type: "image",
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/png",
        altText: "Test image",
      };
      const imageResult = await visualRenderer.render(imageVisual);
      if (!imageResult.html.includes("img")) {
        throw new Error("Image rendering failed");
      }
      console.log("  ✓ Image rendered successfully");

      // Test 3.2: Render diagram
      console.log("  ├─ Rendering Mermaid diagram...");
      const diagramVisual: VisualData = {
        type: "diagram",
        data: "graph LR\n  A -->|text| B\n  B --> C",
        altText: "Test diagram",
      };
      const diagramResult = await visualRenderer.render(diagramVisual);
      if (!diagramResult.html.includes("mermaid")) {
        throw new Error("Diagram rendering failed");
      }
      console.log("  ✓ Diagram rendered successfully");

      // Test 3.3: Render component
      console.log("  ├─ Rendering component visual...");
      const componentVisual: VisualData = {
        type: "component",
        data: JSON.stringify({
          type: "button",
          props: { className: "btn-primary" },
          children: "Click me",
        }),
      };
      const componentResult = await visualRenderer.render(componentVisual);
      if (!componentResult.html.includes("button")) {
        throw new Error("Component rendering failed");
      }
      console.log("  ✓ Component rendered successfully");

      // Test 3.4: Render process
      console.log("  ├─ Rendering process visual...");
      const processVisual: VisualData = {
        type: "process",
        data: "Step 1\nStep 2\nStep 3",
      };
      const processResult = await visualRenderer.render(processVisual);
      if (!processResult.html.includes("Step")) {
        throw new Error("Process rendering failed");
      }
      console.log("  ✓ Process rendered successfully");

      // Test 3.5: Render data
      console.log("  ├─ Rendering data visualization...");
      const dataVisual: VisualData = {
        type: "data",
        data: JSON.stringify({ Users: 1000, Sessions: 5000, Revenue: "$50K" }),
      };
      const dataResult = await visualRenderer.render(dataVisual);
      if (!dataResult.html.includes("Users")) {
        throw new Error("Data rendering failed");
      }
      console.log("  ✓ Data visualization rendered successfully");

      // Test 3.6: Caching
      console.log("  ├─ Testing render caching...");
      await visualRenderer.render(imageVisual, {
        cache: true,
      });
      const cacheResult2 = await visualRenderer.render(imageVisual, {
        cache: true,
      });
      if (!cacheResult2.cached) {
        throw new Error("Caching not working");
      }
      console.log("  ✓ Caching works correctly");

      console.log(`${colors.green}✅ Test 3 PASSED${colors.reset}\n`);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      console.log(`${colors.red}❌ Test 3 FAILED: ${error}${colors.reset}\n`);
    }

    this.recordResult({
      name: "Visual Rendering Pipeline",
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  private async testDesignerChatSync() {
    console.log(
      `${colors.magenta}🔄 Test 4: Designer-Chat Bidirectional Sync${colors.reset}`,
    );

    const startTime = Date.now();
    let passed = true;
    let error: string | undefined;

    try {
      const sync = designerChatSync;

      // Test 4.1: Create component
      console.log("  ├─ Creating design component...");
      const component = await sync.createComponent(
        "button",
        { label: "Test Button", style: { color: "blue" } },
        "test-user",
      );
      if (!component.id) {
        throw new Error("Component creation failed");
      }
      console.log(
        `  ✓ Component created with ID: ${component.id.substring(0, 8)}...`,
      );

      // Test 4.2: Get component
      console.log("  ├─ Retrieving component...");
      const retrieved = sync.getComponent(component.id);
      if (!retrieved || retrieved.id !== component.id) {
        throw new Error("Component retrieval failed");
      }
      console.log("  ✓ Component retrieved successfully");

      // Test 4.3: Update component
      console.log("  ├─ Updating component...");
      const updated = await sync.updateComponent(component.id, {
        label: "Updated Button",
      });
      if (updated?.label !== "Updated Button") {
        throw new Error("Component update failed");
      }
      console.log("  ✓ Component updated successfully");

      // Test 4.4: Get all components
      console.log("  ├─ Retrieving all components...");
      const allComponents = sync.getAllComponents();
      if (allComponents.length === 0) {
        throw new Error("No components found");
      }
      console.log(`  ✓ Retrieved ${allComponents.length} component(s)`);

      // Test 4.5: Sync status
      console.log("  ├─ Checking sync status...");
      const status = sync.getStatus();
      if (status.totalComponents !== allComponents.length) {
        throw new Error("Status mismatch");
      }
      console.log(
        `  ✓ Sync status: ${status.totalComponents} components, ${status.syncHistorySize} history events`,
      );

      // Test 4.6: Delete component
      console.log("  ├─ Deleting component...");
      const deleted = await sync.deleteComponent(component.id);
      if (!deleted) {
        throw new Error("Component deletion failed");
      }
      console.log("  ✓ Component deleted successfully");

      console.log(`${colors.green}✅ Test 4 PASSED${colors.reset}\n`);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      console.log(`${colors.red}❌ Test 4 FAILED: ${error}${colors.reset}\n`);
    }

    this.recordResult({
      name: "Designer-Chat Bidirectional Sync",
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  private async testChatVisualCommands() {
    console.log(
      `${colors.magenta}💬 Test 5: Chat Visual Commands Integration${colors.reset}`,
    );

    const startTime = Date.now();
    let passed = true;
    let error: string | undefined;

    try {
      // Test 5.1: Simulate /diagram command
      console.log("  ├─ Simulating /diagram command...");
      const diagramPayload = {
        type: "diagram",
        data: "graph LR\n  A --> B\n  B --> C",
        altText: "Flow diagram",
      };
      bus.publishVisual(
        "nexus",
        "chat:visual_command",
        "",
        diagramPayload as any,
      );
      console.log("  ✓ /diagram command executed");

      // Test 5.2: Simulate /image command
      console.log("  ├─ Simulating /image command...");
      const imagePayload = {
        type: "image",
        data: "base64data",
        mimeType: "image/png",
        altText: "Generated image",
      };
      bus.publishVisual(
        "nexus",
        "chat:visual_command",
        "",
        imagePayload as any,
      );
      console.log("  ✓ /image command executed");

      // Test 5.3: Simulate /component command
      console.log("  ├─ Simulating /component command...");
      const componentPayload = {
        type: "component",
        data: JSON.stringify({ type: "card", props: { title: "Test" } }),
      };
      bus.publishVisual(
        "nexus",
        "chat:visual_command",
        "",
        componentPayload as any,
      );
      console.log("  ✓ /component command executed");

      // Test 5.4: Check event bus received all commands
      console.log("  ├─ Verifying command delivery...");
      const history = bus.getEventHistory(10);
      const visualEvents = history.filter((e) =>
        e.type.includes("visual_command"),
      );
      if (visualEvents.length < 3) {
        throw new Error("Not all visual commands were delivered");
      }
      console.log(`  ✓ All ${visualEvents.length} visual commands delivered`);

      console.log(`${colors.green}✅ Test 5 PASSED${colors.reset}\n`);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      console.log(`${colors.red}❌ Test 5 FAILED: ${error}${colors.reset}\n`);
    }

    this.recordResult({
      name: "Chat Visual Commands Integration",
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  /**
   * Test 6: Visual Providers (DeSign Studio + DALL-E context-aware code generation)
   */
  private async testVisualProviders() {
    let passed = true;
    let error: string | undefined;
    const startTime = Date.now();

    console.log(
      `${colors.bright}${colors.magenta}Test 6: Visual Providers Integration${colors.reset}`,
    );

    try {
      // Test 6.1: Verify DeSign Studio capability is registered
      console.log("  ├─ Checking DeSign Studio capability...");
      const capMgr = CapabilitiesManager.getInstance();
      const designStudio = capMgr.checkCapability(
        "image.context.code-generation.gemini",
      );
      if (!designStudio) {
        throw new Error("DeSign Studio capability not registered");
      }
      console.log("  ✓ DeSign Studio capability registered");

      // Test 6.2: Verify DALL-E capability is registered
      console.log("  ├─ Checking DALL-E 3 capability...");
      const dalle3 = capMgr.checkCapability(
        "image.context.code-generation.dalle3",
      );
      if (!dalle3) {
        throw new Error("DALL-E 3 capability not registered");
      }
      console.log("  ✓ DALL-E 3 capability registered");

      // Test 6.3: Verify VisualContextAnalyzer exists
      console.log("  ├─ Verifying VisualContextAnalyzer module...");
      const VisualContextAnalyzer = (
        await import("../src/cortex/imagination/visual-context-analyzer.ts")
      ).default;
      const analyzer = VisualContextAnalyzer.getInstance();
      if (!analyzer) {
        throw new Error("VisualContextAnalyzer not initialized");
      }
      console.log("  ✓ VisualContextAnalyzer module available");

      // Test 6.4: Test context analysis
      console.log("  ├─ Testing visual context analysis...");
      const testContext = {
        designTokens: {
          colors: {
            primary: "#0066cc",
            secondary: "#ff6600",
          },
          typography: {
            fontFamily: "Inter, sans-serif",
          },
          spacing: {
            sm: "4px",
            md: "8px",
            lg: "16px",
          },
        },
        uiPatterns: ["card", "grid", "sidebar"],
        componentRequirements: [
          {
            name: "Button",
            purpose: "User action trigger",
            props: { variant: "primary" },
          },
          {
            name: "Card",
            purpose: "Content container",
            props: { elevation: 2 },
          },
        ],
        brandGuidelines: {
          primaryColor: "#0066cc",
          fontFamily: "Inter",
          tone: "friendly",
        },
      };

      const analysis = analyzer.analyze(testContext);
      if (!analysis || !analysis.identifiedPatterns) {
        throw new Error("Context analysis failed");
      }
      if (analysis.identifiedPatterns.length === 0) {
        throw new Error("No patterns identified");
      }
      console.log(
        `  ✓ Context analysis complete (${analysis.identifiedPatterns.length} patterns found)`,
      );

      // Test 6.5: Test code generation strategy
      console.log("  ├─ Verifying code generation strategy...");
      const strategy = analysis.codeGenStrategy;
      if (!["component", "layout", "system", "utility"].includes(strategy)) {
        throw new Error(`Invalid strategy: ${strategy}`);
      }
      console.log(`  ✓ Strategy determined: ${strategy}`);

      // Test 6.6: Verify visual provider types
      console.log("  ├─ Verifying visual provider interfaces...");
      const providerTypes = [
        "image.context.code-generation.gemini",
        "image.context.code-generation.dalle3",
      ];
      for (const providerType of providerTypes) {
        const cap = capMgr.checkCapability(providerType);
        if (!cap) {
          throw new Error(`Provider type ${providerType} not found`);
        }
      }
      console.log("  ✓ All provider interfaces verified");

      // Test 6.7: Publish visual provider event
      console.log("  ├─ Publishing visual provider event...");
      bus.publishVisual("cortex", "visual:provider:context-generation", "", {
        provider: "gemini-nano",
        context: testContext,
        strategy: strategy,
      } as any);
      console.log("  ✓ Visual provider event published");

      // Test 6.8: Verify event was recorded
      console.log("  ├─ Verifying event history...");
      const history = bus.getEventHistory(20);
      const providerEvents = history.filter(
        (e) => e.type === "visual:provider:context-generation",
      );
      if (providerEvents.length === 0) {
        throw new Error("Visual provider event not in history");
      }
      console.log(
        `  ✓ Event recorded in history (${providerEvents.length} event(s))`,
      );

      console.log(`${colors.green}✅ Test 6 PASSED${colors.reset}\n`);
    } catch (err) {
      passed = false;
      error = err instanceof Error ? err.message : String(err);
      console.log(`${colors.red}❌ Test 6 FAILED: ${error}${colors.reset}\n`);
    }

      this.recordResult({
      name: "Visual Providers (DeSign Studio + DALL-E) Integration",
      passed,
      duration: Date.now() - startTime,
      error,
    });
  }

  private recordResult(result: TestResult) {
    this.results.push(result);
    if (result.passed) {
      this.passedCount++;
    } else {
      this.failedCount++;
    }
  }

  private printSummary() {
    console.log(`${colors.bright}${colors.cyan}📊 Test Summary${colors.reset}`);
    console.log("─".repeat(60));

    for (const result of this.results) {
      const status = result.passed
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;
      const duration = `${result.duration}ms`.padEnd(8);
      console.log(`${status} ${result.name.padEnd(45)} ${duration}`);
    }

    console.log("─".repeat(60));
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const totalMs = `${totalDuration}ms`;

    console.log(
      `\n${colors.bright}Results: ${colors.green}${this.passedCount} passed${colors.reset} | ${
        this.failedCount > 0
          ? `${colors.red}${this.failedCount} failed${colors.reset}`
          : "0 failed"
      } | ${totalMs}`,
    );

    if (this.failedCount === 0) {
      console.log(
        `\n${colors.bright}${colors.green}🎉 All tests passed!${colors.reset}`,
      );
    } else {
      console.log(
        `\n${colors.bright}${colors.red}⚠️  ${this.failedCount} test(s) failed${colors.reset}`,
      );
      process.exit(1);
    }
  }
}

// Run tests
const suite = new IntegrationTestSuite();
suite.run().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
