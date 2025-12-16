/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - The Life Loop (Fully Wired)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is where everything comes together. The entry point for TooLoo.
 *
 * Now with:
 * - Brain (LLM) for thinking
 * - Tools for real-world operations
 * - Web Research for learning from the world
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { kernel, TooLooContext, ProcessStep, ValidationResult, StepReflection } from './kernel.js';
import { processPlanner, ProcessGoal } from './process-planner.js';
import { skillsMaster } from './skills-master.js';
import { worldObserver } from './world-observer.js';
import { interaction } from './interaction.js';
import { brain } from './brain.js';
import { toolRunner } from './tool-runner.js';
import { webResearcher } from './web-researcher.js';

// ═══════════════════════════════════════════════════════════════════════════════
// WIRING - Connect all the pieces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wire the Process Planner to the Skills Master
 * When a step needs execution, Skills Master handles it
 */
function wireProcessToSkills(): void {
  processPlanner.on('step:execute-request', async ({ step, context, resolve, reject }) => {
    try {
      const result = await skillsMaster.executeStep(step, context);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Wire the Brain to Process Planner
 * Planning, validation, reflection all go through the Brain
 */
function wireBrainToPlanner(): void {
  const soul = kernel.getSoul();
  if (!soul) return;

  // Wire validation to brain
  processPlanner.on('validation:evaluate-request', async ({ step, output, context, resolve }) => {
    try {
      const result = await brain.validate(step, output, '', soul);
      resolve(result);
    } catch (error) {
      console.error('[LifeLoop] Validation failed:', error);
      resolve({
        passed: false,
        criteria_met: [],
        criteria_failed: [step.validation_criteria],
        confidence: 0,
        suggestions: [`Validation error: ${error}`],
      });
    }
  });

  // Wire reflection to brain
  processPlanner.on(
    'reflection:evaluate-request',
    async ({ step, validation, context, resolve }) => {
      try {
        const result = await brain.reflect(step, validation, '', soul);
        resolve(result);
      } catch (error) {
        console.error('[LifeLoop] Reflection failed:', error);
        resolve({
          step_id: step.id,
          what_worked: 'Unknown',
          what_didnt: String(error),
          lesson_learned: 'Error during reflection',
          should_replan: true,
        });
      }
    }
  );
}

/**
 * Wire Skills Master to Brain and Tools
 * Step execution uses brain for thinking and tools for actions
 */
function wireSkillsExecution(): void {
  const soul = kernel.getSoul();
  if (!soul) return;

  // Wire step execution
  skillsMaster.on(
    'execute:run-request',
    async ({ step, skills, strategy, context, resolve, reject }) => {
      try {
        // Build execution context
        const skillInstructions = skills
          .map((s) => `## Skill: ${s.name}\n${s.instructions}`)
          .join('\n\n');

        const executionContext = `
# Task to Execute
${step.description}

# Available Skills
${skillInstructions || 'Use general capabilities'}

# Execution Strategy
${strategy || 'Direct execution'}

# Available Tools
You can use these tools during execution:
- file_read: Read file contents
- file_write: Write to files
- list_directory: List directory contents
- grep_search: Search for text in files
- run_command: Execute shell commands

When you need to use a tool, output JSON in this format:
{"tool": "tool_name", "params": {...}}

For the final result, output JSON:
{"result": "your final output or result"}
`;

        // Get brain's execution plan
        const response = await brain.execute(step.description, executionContext, soul);

        // Check if response contains tool calls
        let result: unknown = response;

        // Try to extract and execute tool calls
        const toolMatches = response.matchAll(
          /\{"tool":\s*"([^"]+)",\s*"params":\s*(\{[^}]+\})\}/g
        );
        for (const match of toolMatches) {
          const toolName = match[1];
          const params = JSON.parse(match[2]);

          console.log(`[LifeLoop] 🔧 Executing tool: ${toolName}`);

          switch (toolName) {
            case 'file_read':
              const readResult = await toolRunner.readFile(params.path, params);
              if (readResult.success) {
                result = readResult.data;
              }
              break;
            case 'file_write':
              const writeResult = await toolRunner.writeFile(params.path, params.content, params);
              if (writeResult.success) {
                result = writeResult.data;
              }
              break;
            case 'list_directory':
              const listResult = await toolRunner.listDirectory(params.path);
              if (listResult.success) {
                result = listResult.data;
              }
              break;
            case 'grep_search':
              const searchResult = await toolRunner.grepSearch(params.pattern, params);
              if (searchResult.success) {
                result = searchResult.data;
              }
              break;
            case 'run_command':
              const cmdResult = await toolRunner.runCommand(params.command, params);
              if (cmdResult.success) {
                result = cmdResult.data;
              }
              break;
          }
        }

        // Try to extract final result
        const resultMatch = response.match(/\{"result":\s*"([^"]+)"\}/);
        if (resultMatch) {
          result = resultMatch[1];
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  );

  // Wire skill creation to brain
  skillsMaster.on(
    'create:skill-request',
    async ({ request, context, creationContext, resolve }) => {
      try {
        const skillYaml = await brain.createSkill(request.need, creationContext, soul);

        // Parse YAML and create skill object
        const lines = skillYaml.split('\n');
        const skill: any = {
          id: '',
          name: '',
          description: '',
          version: '1.0.0',
          capabilities: [],
          requirements: [],
          instructions: '',
          tools: [],
          keywords: [],
          origin: 'created',
          created_from: request.context,
          times_used: 0,
          success_rate: 0.5,
        };

        // Simple YAML parsing
        let currentKey = '';
        for (const line of lines) {
          const keyMatch = line.match(/^(\w+):\s*(.*)$/);
          if (keyMatch) {
            currentKey = keyMatch[1];
            const value = keyMatch[2].trim();

            if (value && !value.startsWith('|')) {
              if (
                currentKey === 'capabilities' ||
                currentKey === 'keywords' ||
                currentKey === 'tools'
              ) {
                skill[currentKey] = value
                  .replace(/[\[\]]/g, '')
                  .split(',')
                  .map((s: string) => s.trim());
              } else {
                skill[currentKey] = value;
              }
            }
          } else if (currentKey === 'instructions' && line.startsWith('  ')) {
            skill.instructions += line.slice(2) + '\n';
          }
        }

        resolve(skill);
      } catch (error) {
        console.error('[LifeLoop] Skill creation failed:', error);
        // Return a basic skill
        resolve({
          id: `created-${Date.now()}`,
          name: `Created for: ${request.need.slice(0, 30)}`,
          description: request.need,
          version: '1.0.0',
          capabilities: [request.need],
          requirements: [],
          instructions: `Address: ${request.need}`,
          tools: [],
          keywords: [],
          origin: 'created',
          created_from: request.context,
          times_used: 0,
          success_rate: 0.5,
        });
      }
    }
  );
}

/**
 * Wire World Observer to Web Researcher
 * Research queries go to the real web
 */
function wireWorldToWeb(): void {
  // Wire research requests to web researcher
  worldObserver.on('research:query-request', async ({ query, context, resolve }) => {
    try {
      const result = await webResearcher.research(query.question, {
        includeCode: true,
        maxResults: 10,
        languages: ['typescript', 'javascript'],
      });

      // Convert to industry patterns
      const patterns = result.results.map((r) => ({
        name: r.title,
        domain: query.domain,
        description: r.snippet,
        source: r.source === 'github' ? r.url : r.title,
        relevance: 0.7,
        applicability: `Found in ${r.source}: ${r.url}`,
      }));

      // Add code examples as patterns
      result.codeExamples.forEach((code) => {
        patterns.push({
          name: `Code: ${code.path}`,
          domain: query.domain,
          description: `Code example from ${code.repository}`,
          source: code.url,
          relevance: 0.8,
          applicability: 'Direct code reference',
        });
      });

      // Add top repos
      result.topRepos.forEach((repo) => {
        patterns.push({
          name: repo.name,
          domain: query.domain,
          description: repo.description || 'Popular repository',
          source: repo.url,
          relevance: Math.min(1, repo.stars / 10000),
          applicability: `${repo.stars} stars, ${repo.language || 'mixed'} - ${repo.topics.join(', ')}`,
        });
      });

      resolve(patterns);
    } catch (error) {
      console.error('[LifeLoop] Web research failed:', error);
      resolve([]);
    }
  });

  // Wire learning from sources
  worldObserver.on(
    'learn:source-request',
    async ({ source, context, learningContext, resolve }) => {
      try {
        let content = '';

        if (source.type === 'github' && source.url.includes('github.com')) {
          // Extract owner/repo from URL
          const match = source.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (match) {
            content = await webResearcher.fetchGitHubReadme(match[1], match[2]);
          }
        } else {
          content = await webResearcher.fetchDocumentation(source.url);
        }

        // Return wisdom from source
        const wisdom = [
          {
            source: source.url,
            domain: source.focus,
            insight: content.slice(0, 1000),
            gathered_at: new Date().toISOString(),
          },
        ];

        resolve(wisdom);
      } catch (error) {
        console.error('[LifeLoop] Learning from source failed:', error);
        resolve([]);
      }
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFE LOOP
// ═══════════════════════════════════════════════════════════════════════════════

export async function startTooLoo(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                  ║');
  console.log('║   🌱 THE EXPERIMENT BEGINS                                       ║');
  console.log('║                                                                  ║');
  console.log('║   TooLoo.ai - A Self-Evolving Digital Creature                   ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: AWAKENING
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 1: AWAKENING                                            │');
  console.log('└────────────────────────────────────────────────────────────────┘');

  // Boot the kernel (load soul)
  const context = await kernel.boot();

  // Initialize Brain (LLM providers)
  console.log('[LifeLoop] Initializing Brain...');
  await brain.initialize();

  if (brain.isReady()) {
    console.log(
      `[LifeLoop] ✅ Brain online with providers: ${brain.getAvailableProviders().join(', ')}`
    );
  } else {
    console.warn('[LifeLoop] ⚠️ Brain has no providers - set API keys for full functionality');
  }

  // Initialize Skills Master (load skills)
  await skillsMaster.initialize();

  // Set context for interaction layer
  interaction.setContext(context);

  // Wire the components together
  console.log('[LifeLoop] Wiring components...');
  wireProcessToSkills();
  wireBrainToPlanner();
  wireSkillsExecution();
  wireWorldToWeb();

  console.log('');
  console.log('  ✅ Soul loaded');
  console.log('  ✅ Brain initialized');
  console.log('  ✅ Skills initialized');
  console.log('  ✅ Tools ready');
  console.log('  ✅ Web research enabled');
  console.log('  ✅ Components wired');
  console.log('');

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: GREETING
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 2: GREETING                                             │');
  console.log('└────────────────────────────────────────────────────────────────┘');

  const greeting = await interaction.greet();
  console.log('');
  console.log('  🤖 TooLoo says:');
  console.log('');
  greeting.content.split('\n').forEach((line) => {
    console.log(`     ${line}`);
  });
  console.log('');

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: READY FOR LIFE
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 3: READY FOR LIFE                                       │');
  console.log('└────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  TooLoo is FULLY ALIVE and ready.');
  console.log('');
  console.log('  Capabilities:');
  console.log('    🧠 Brain: LLM-powered thinking');
  console.log('    🔧 Tools: File read/write, terminal, search');
  console.log('    🌍 Research: GitHub, web search, documentation');
  console.log('    🧬 Skills: 33 built-in + self-creation');
  console.log('');
  console.log('  Interaction modes:');
  console.log('    • "direct"  - Give high-level goals');
  console.log('    • "guide"   - Offer nudges');
  console.log('    • "create"  - Collaborate');
  console.log('    • "observe" - Watch');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  return;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { kernel } from './kernel.js';
export { processPlanner } from './process-planner.js';
export { skillsMaster } from './skills-master.js';
export { worldObserver } from './world-observer.js';
export { interaction } from './interaction.js';
export { brain } from './brain.js';
export { toolRunner } from './tool-runner.js';
export { webResearcher } from './web-researcher.js';

// Export types
export type {
  TooLooContext,
  ProcessState,
  ProcessStep,
  ValidationResult,
  StepReflection,
  Soul,
  Evolution,
} from './kernel.js';
export type { EvolutionView, HumanMessage, TooLooResponse } from './interaction.js';
export type { StepResult, ProcessGoal } from './process-planner.js';
export type { SkillMatch, SkillComposition, Skill } from './skills-master.js';
export type { IndustryPattern, ComparisonResult, InspirationSeed } from './world-observer.js';
export type { ThinkingRequest, ThinkingResponse, PlanningResult } from './brain.js';
export type { ToolResult, FileReadResult, SearchResult, TerminalResult } from './tool-runner.js';
export type { WebSearchResult, GitHubRepo, ResearchResult } from './web-researcher.js';
