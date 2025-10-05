#!/usr/bin/env node

/**
 * Event-Based Timeline System
 * 
 * DAW-style version control where milestones are based on
 * significant events, not arbitrary time intervals.
 * 
 * Features:
 * - Manual milestone marking (user-controlled)
 * - Smart event detection (AI suggestions)
 * - Meaningful commit messages
 * - Visual timeline navigation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

class EventTimeline {
  constructor() {
    this.timelineFile = path.join(process.cwd(), '.timeline.json');
    this.milestones = this.loadMilestones();
  }

  loadMilestones() {
    try {
      if (fs.existsSync(this.timelineFile)) {
        return JSON.parse(fs.readFileSync(this.timelineFile, 'utf-8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not load timeline, starting fresh');
    }
    return [];
  }

  saveMilestones() {
    fs.writeFileSync(this.timelineFile, JSON.stringify(this.milestones, null, 2));
  }

  async createMilestone(name, type = 'manual', context = {}) {
    const gitHash = execSync('git rev-parse HEAD').toString().trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    
    // Get file changes
    const changes = execSync('git diff --stat HEAD~1 HEAD 2>/dev/null || echo "No changes"')
      .toString()
      .trim();

    const milestone = {
      id: Date.now(),
      name,
      type, // 'manual', 'suggested', 'auto'
      timestamp: new Date().toISOString(),
      gitHash,
      gitBranch,
      context,
      changes
    };

    this.milestones.push(milestone);
    this.saveMilestones();

    // Create git commit
    const commitMessage = `🎯 Milestone: ${name}\n\nType: ${type}\nContext: ${JSON.stringify(context, null, 2)}`;
    
    try {
      execSync('git add -A');
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
      console.log(`✅ Milestone saved: "${name}"`);
      console.log(`   Git: ${gitHash.substring(0, 7)} on ${gitBranch}`);
    } catch (error) {
      console.log(`✅ Milestone recorded: "${name}" (no git changes)`);
    }

    return milestone;
  }

  listMilestones() {
    if (this.milestones.length === 0) {
      console.log('📋 No milestones yet. Create one with: npm run milestone');
      return;
    }

    console.log('\n🎯 Event-Based Timeline:\n');
    
    this.milestones.reverse().forEach((m, i) => {
      const icon = this.getIcon(m.type);
      const date = new Date(m.timestamp).toLocaleString();
      console.log(`${icon} ${m.name}`);
      console.log(`   ${date}`);
      console.log(`   Git: ${m.gitHash.substring(0, 7)} (${m.gitBranch})`);
      if (m.context && Object.keys(m.context).length > 0) {
        console.log(`   Context: ${JSON.stringify(m.context)}`);
      }
      console.log('');
    });
  }

  getIcon(type) {
    const icons = {
      manual: '🎯',
      suggested: '💡',
      auto: '🔄',
      task_complete: '✅',
      branch_decision: '🔀',
      working_version: '🎨',
      before_refactor: '🐛',
      milestone_reached: '🚀'
    };
    return icons[type] || '📌';
  }

  async detectEvent() {
    // Check for significant events
    const events = [];

    // Check git status
    try {
      const status = execSync('git status --short').toString();
      const changedFiles = status.split('\n').filter(l => l.trim()).length;
      
      if (changedFiles > 5) {
        events.push({
          type: 'suggested',
          name: 'Major changes detected',
          context: { changedFiles }
        });
      }
    } catch (error) {}

    // Check if todos were completed (look for [x] in todo list)
    try {
      const todos = fs.readFileSync('.github/copilot-instructions.md', 'utf-8');
      const completedMatches = todos.match(/\[x\]/gi);
      if (completedMatches && completedMatches.length > 0) {
        events.push({
          type: 'task_complete',
          name: 'Tasks completed',
          context: { completedTasks: completedMatches.length }
        });
      }
    } catch (error) {}

    return events;
  }

  async promptMilestone() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('🎯 Milestone name: ', (name) => {
        rl.question('📝 What was accomplished? ', (description) => {
          rl.close();
          resolve({ name, description });
        });
      });
    });
  }
}

// CLI Interface
const timeline = new EventTimeline();
const command = process.argv[2];

switch (command) {
  case 'create':
  case 'mark':
    // Manual milestone creation
    timeline.promptMilestone().then(({ name, description }) => {
      timeline.createMilestone(name, 'manual', { description });
    });
    break;

  case 'list':
  case 'show':
    // List all milestones
    timeline.listMilestones();
    break;

  case 'suggest':
    // Detect and suggest milestones
    timeline.detectEvent().then(events => {
      if (events.length === 0) {
        console.log('💡 No significant events detected');
      } else {
        console.log('💡 Suggested milestones:');
        events.forEach((e, i) => {
          console.log(`   ${i + 1}. ${e.name}`);
        });
      }
    });
    break;

  default:
    console.log(`
🎯 Event-Based Timeline System

Usage:
  npm run milestone              Create milestone (interactive)
  npm run milestone:list         Show timeline
  npm run milestone:suggest      Detect significant events

Keyboard Shortcut:
  Cmd+Shift+M                    Quick milestone (configured)

Examples:
  "Workspace cleaned"            After cleanup task
  "Budget system working"        After feature complete
  "Tried nuclear approach"       At decision point
  "UI looks good"                Before trying alternatives
    `);
}

export default EventTimeline;
