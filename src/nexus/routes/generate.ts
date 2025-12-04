// @version 2.2.433
// Generative UI Component Generation Route
// Leverages Synapsys LLM providers to generate React components on demand

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { precog } from '../../precog/index.js';

const router = Router();

// Component generation prompt template
const COMPONENT_GENERATION_PROMPT = `You are TooLoo's UI Generator. Generate a single React component based on the user's description.

CRITICAL RULES:
1. Return ONLY valid JSX code - no markdown, no explanations, no imports
2. Use inline Tailwind CSS classes exclusively
3. Component must be a single function that returns JSX
4. Use the TooLoo color palette:
   - Background: bg-[#0a0b0f] (obsidian), bg-[#0f1117] (charcoal)
   - Primary: text-cyan-400, bg-cyan-500/10, border-cyan-500/30
   - Secondary: text-purple-400, bg-purple-500/10, border-purple-500/30
   - Accent: text-rose-400, bg-rose-500/10, border-rose-500/30
   - Text: text-gray-300, text-gray-400, text-white
5. Use these utility patterns:
   - Cards: rounded-xl bg-white/5 border border-white/10 p-4
   - Buttons: px-4 py-2 rounded-lg font-medium transition-all
   - Glows: shadow-[0_0_20px_rgba(6,182,212,0.3)]
6. Support dark mode by default
7. Make it responsive with Tailwind breakpoints
8. Include hover states for interactive elements
9. Use modern React patterns (hooks if needed)

Available props the component should accept:
- title?: string
- data?: any
- onAction?: (action: string) => void
- className?: string

Example format:
function GeneratedComponent({ title = "Default", data, onAction, className = "" }) {
  return (
    <div className={\`rounded-xl bg-white/5 border border-white/10 p-4 \${className}\`}>
      {/* Your component JSX here */}
    </div>
  );
}`;

// Registry path for storing generated components
const GENERATED_COMPONENTS_PATH = path.join(process.cwd(), 'data', 'generated-components.json');

// Initialize registry if missing
async function ensureRegistry() {
  await fs.ensureDir(path.dirname(GENERATED_COMPONENTS_PATH));
  if (!(await fs.pathExists(GENERATED_COMPONENTS_PATH))) {
    await fs.writeJson(
      GENERATED_COMPONENTS_PATH,
      {
        components: [],
        stats: {
          totalGenerated: 0,
          lastGenerated: null,
        },
      },
      { spaces: 2 }
    );
  }
}

// POST /api/v1/generate/component
// Generate a new component from natural language description
router.post('/component', async (req, res) => {
  try {
    const { description, name, category = 'generated' } = req.body;

    if (!description) {
      return res.status(400).json({
        ok: false,
        error: 'Component description is required',
      });
    }

    console.log(`[Generate] Creating component from: "${description.substring(0, 50)}..."`);

    // Build the prompt
    const prompt = `${COMPONENT_GENERATION_PROMPT}

USER REQUEST: ${description}
${name ? `COMPONENT NAME: ${name}` : ''}

Generate the component now. Return ONLY the JSX code:`;

    // Call the LLM via precog
    const response = await precog.providers.generate({
      prompt,
      system: 'You are TooLoo UI Generator. Return ONLY valid JSX code.',
      taskType: 'generation',
    });

    if (!response.content) {
      throw new Error('Failed to generate component');
    }

    // Clean up the response - extract just the JSX
    let code = response.content.trim();

    // Remove markdown code blocks if present
    code = code.replace(/^```(?:jsx|javascript|tsx|react)?\n?/i, '');
    code = code.replace(/\n?```$/i, '');
    code = code.trim();

    // Validate it looks like a component
    if (!code.includes('function') && !code.includes('=>')) {
      throw new Error('Generated code does not appear to be a valid component');
    }

    // Generate component ID
    const componentId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Save to registry
    await ensureRegistry();
    const registry = await fs.readJson(GENERATED_COMPONENTS_PATH);

    const componentEntry = {
      id: componentId,
      name: name || `GeneratedComponent_${Date.now()}`,
      description,
      category,
      code,
      created: new Date().toISOString(),
      provider: response.provider,
      model: response.model,
      cost: response.cost_usd,
    };

    registry.components.unshift(componentEntry); // Add to front
    registry.stats.totalGenerated++;
    registry.stats.lastGenerated = new Date().toISOString();

    // Keep only last 100 generated components
    if (registry.components.length > 100) {
      registry.components = registry.components.slice(0, 100);
    }

    await fs.writeJson(GENERATED_COMPONENTS_PATH, registry, { spaces: 2 });

    console.log(`[Generate] Created component: ${componentEntry.name} (${componentId})`);

    res.json({
      ok: true,
      component: {
        id: componentId,
        name: componentEntry.name,
        code,
        description,
        category,
      },
      meta: {
        provider: response.provider,
        model: response.model,
        cost: response.cost_usd,
      },
    });
  } catch (error: any) {
    console.error(`[Generate] Error: ${error.message}`);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// GET /api/v1/generate/components
// List all generated components
router.get('/components', async (req, res) => {
  try {
    await ensureRegistry();
    const registry = await fs.readJson(GENERATED_COMPONENTS_PATH);

    res.json({
      ok: true,
      components: registry.components,
      stats: registry.stats,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/generate/component/:id
// Get a specific generated component
router.get('/component/:id', async (req, res) => {
  try {
    await ensureRegistry();
    const registry = await fs.readJson(GENERATED_COMPONENTS_PATH);
    const component = registry.components.find((c: any) => c.id === req.params.id);

    if (!component) {
      return res.status(404).json({ ok: false, error: 'Component not found' });
    }

    res.json({ ok: true, component });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/v1/generate/component/:id
// Delete a generated component
router.delete('/component/:id', async (req, res) => {
  try {
    await ensureRegistry();
    const registry = await fs.readJson(GENERATED_COMPONENTS_PATH);
    const index = registry.components.findIndex((c: any) => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ ok: false, error: 'Component not found' });
    }

    registry.components.splice(index, 1);
    await fs.writeJson(GENERATED_COMPONENTS_PATH, registry, { spaces: 2 });

    res.json({ ok: true, deleted: req.params.id });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/v1/generate/improve
// Improve an existing component with AI
router.post('/improve', async (req, res) => {
  try {
    const { componentId, instructions } = req.body;

    if (!componentId || !instructions) {
      return res.status(400).json({
        ok: false,
        error: 'componentId and instructions are required',
      });
    }

    await ensureRegistry();
    const registry = await fs.readJson(GENERATED_COMPONENTS_PATH);
    const component = registry.components.find((c: any) => c.id === componentId);

    if (!component) {
      return res.status(404).json({ ok: false, error: 'Component not found' });
    }

    const prompt = `${COMPONENT_GENERATION_PROMPT}

EXISTING COMPONENT:
${component.code}

IMPROVEMENT REQUEST: ${instructions}

Generate the improved component now. Return ONLY the JSX code:`;

    const response = await precog.providers.generate({
      prompt,
      system: 'You are TooLoo UI Generator. Improve the component as requested.',
      taskType: 'generation',
    });

    if (!response.content) {
      throw new Error('Failed to improve component');
    }

    let code = response.content.trim();
    code = code.replace(/^```(?:jsx|javascript|tsx|react)?\n?/i, '');
    code = code.replace(/\n?```$/i, '');
    code = code.trim();

    // Update the component
    component.code = code;
    component.lastImproved = new Date().toISOString();
    component.improvementHistory = component.improvementHistory || [];
    component.improvementHistory.push({
      instructions,
      timestamp: new Date().toISOString(),
    });

    await fs.writeJson(GENERATED_COMPONENTS_PATH, registry, { spaces: 2 });

    res.json({
      ok: true,
      component: {
        id: component.id,
        name: component.name,
        code,
      },
      meta: {
        provider: response.provider,
        model: response.model,
        cost: response.cost_usd,
      },
    });
  } catch (error: any) {
    console.error(`[Generate] Improve error: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/v1/generate/variant
// Create a variant of an existing component
router.post('/variant', async (req, res) => {
  try {
    const { componentId, variantDescription } = req.body;

    if (!componentId || !variantDescription) {
      return res.status(400).json({
        ok: false,
        error: 'componentId and variantDescription are required',
      });
    }

    await ensureRegistry();
    const registry = await fs.readJson(GENERATED_COMPONENTS_PATH);
    const component = registry.components.find((c: any) => c.id === componentId);

    if (!component) {
      return res.status(404).json({ ok: false, error: 'Component not found' });
    }

    const prompt = `${COMPONENT_GENERATION_PROMPT}

BASE COMPONENT:
${component.code}

CREATE A VARIANT: ${variantDescription}
Keep the same general structure but modify according to the variant description.

Generate the variant component now. Return ONLY the JSX code:`;

    const response = await precog.providers.generate({
      prompt,
      system: 'You are TooLoo UI Generator. Create a variant as described.',
      taskType: 'generation',
    });

    if (!response.content) {
      throw new Error('Failed to create variant');
    }

    let code = response.content.trim();
    code = code.replace(/^```(?:jsx|javascript|tsx|react)?\n?/i, '');
    code = code.replace(/\n?```$/i, '');
    code = code.trim();

    // Create new component entry for the variant
    const variantId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const variantEntry = {
      id: variantId,
      name: `${component.name}_Variant`,
      description: `Variant of ${component.name}: ${variantDescription}`,
      category: component.category,
      code,
      created: new Date().toISOString(),
      parentId: component.id,
      provider: response.provider,
      model: response.model,
    };

    registry.components.unshift(variantEntry);
    registry.stats.totalGenerated++;
    registry.stats.lastGenerated = new Date().toISOString();

    await fs.writeJson(GENERATED_COMPONENTS_PATH, registry, { spaces: 2 });

    res.json({
      ok: true,
      component: {
        id: variantId,
        name: variantEntry.name,
        code,
        parentId: component.id,
      },
      meta: {
        provider: response.provider,
        model: response.model,
        cost: response.cost_usd,
      },
    });
  } catch (error: any) {
    console.error(`[Generate] Variant error: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/generate/primitives
// Get list of available skin primitives for reference
router.get('/primitives', async (req, res) => {
  try {
    const registryPath = path.join(process.cwd(), 'src', 'web-app', 'src', 'skin', 'registry.json');

    if (await fs.pathExists(registryPath)) {
      const registry = await fs.readJson(registryPath);
      res.json({ ok: true, primitives: registry.components || [] });
    } else {
      res.json({ ok: true, primitives: [] });
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export const generateRoutes = router;
