#!/usr/bin/env npx tsx

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Boot Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The genesis moment. Run this to bring TooLoo to life.
 *
 * Usage: npx tsx src/core/boot.ts
 * Or:    pnpm tooloo
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { startTooLoo, interaction, kernel } from './index.js';
import * as readline from 'readline';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE CONSOLE
// ═══════════════════════════════════════════════════════════════════════════════

async function runInteractiveConsole(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Listen for TooLoo's responses
  interaction.on('tooloo:response', (response) => {
    const emoji =
      {
        thought: '💭',
        question: '❓',
        progress: '⚡',
        result: '✅',
        reflection: '🪞',
        learning: '📚',
      }[response.type] || '💬';

    console.log('');
    console.log(`  ${emoji} TooLoo: ${response.content}`);
    console.log('');
  });

  const prompt = (): void => {
    const mode = interaction.getMode();
    rl.question(`  [${mode}] You: `, async (input) => {
      const trimmed = input.trim();

      // Handle special commands
      if (trimmed === '/quit' || trimmed === '/exit') {
        console.log('');
        console.log('  💤 TooLoo is going to sleep...');
        await kernel.shutdown();
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/mode') {
        console.log('');
        console.log('  Modes: direct, guide, create, observe');
        console.log('  Use: /mode <mode> to switch');
        prompt();
        return;
      }

      if (trimmed.startsWith('/mode ')) {
        const newMode = trimmed.replace('/mode ', '') as any;
        if (['direct', 'guide', 'create', 'observe'].includes(newMode)) {
          interaction.setMode(newMode);
          console.log(`  Switched to ${newMode} mode`);
        } else {
          console.log('  Unknown mode. Use: direct, guide, create, observe');
        }
        prompt();
        return;
      }

      if (trimmed === '/status') {
        const view = interaction.getEvolutionView();
        if (view) {
          console.log('');
          console.log('  ═══ TooLoo Status ═══');
          console.log(
            `  Skills: ${view.skillStats.total} (${view.skillStats.created} self-created)`
          );
          console.log(`  Lessons: ${view.evolution.lessons.length}`);
          console.log(`  Patterns: ${view.worldStats.patternsFound}`);
          if (view.currentProcess) {
            console.log(`  Current process: ${view.currentProcess.goal}`);
            console.log(
              `  Step: ${view.currentProcess.currentStepIndex + 1}/${view.currentProcess.plan.length}`
            );
          }
        }
        prompt();
        return;
      }

      if (trimmed === '/skills') {
        const skills = (await import('./skills-master.js')).skillsMaster;
        const created = skills.getCreatedSkills();
        console.log('');
        console.log('  ═══ Self-Created Skills ═══');
        if (created.length === 0) {
          console.log("  None yet - TooLoo hasn't needed to create any");
        } else {
          created.forEach((s) => {
            console.log(`  • ${s.name}: ${s.description}`);
          });
        }
        prompt();
        return;
      }

      if (trimmed === '/help') {
        console.log('');
        console.log('  ═══ Commands ═══');
        console.log('  /mode <mode>  - Switch mode (direct, guide, create, observe)');
        console.log("  /status       - See TooLoo's current state");
        console.log('  /skills       - See self-created skills');
        console.log('  /help         - Show this help');
        console.log('  /quit         - Exit');
        console.log('');
        console.log('  Just type naturally to talk to TooLoo!');
        prompt();
        return;
      }

      // Send to TooLoo
      if (trimmed) {
        await interaction.receiveMessage(trimmed);
      }

      prompt();
    });
  };

  prompt();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  try {
    // Start TooLoo
    await startTooLoo();

    // Run interactive console
    console.log('  Type /help for commands, or just talk to TooLoo!');
    console.log('');
    await runInteractiveConsole();
  } catch (error) {
    console.error('Failed to start TooLoo:', error);
    process.exit(1);
  }
}

// Run
main();
