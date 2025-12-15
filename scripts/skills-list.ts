/**
 * @file Skills List Script
 * @description Lists all registered skills in Skills OS
 * @version 1.0.0
 * @skill-os true
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const SKILLS_DIR = join(process.cwd(), 'skills');

interface SkillDef {
  id: string;
  name: string;
  version: string;
  description?: string;
}

// Simple YAML parser for skill files (just extracts id, name, version)
function parseSkillYaml(content: string): SkillDef | null {
  const lines = content.split('\n');
  const skill: Partial<SkillDef> = {};
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'id') skill.id = value.trim();
      if (key === 'name') skill.name = value.trim();
      if (key === 'version') skill.version = value.trim();
      if (key === 'description') skill.description = value.trim();
    }
  }
  
  return skill.id && skill.name ? skill as SkillDef : null;
}

function listSkills(): void {
  console.log('');
  console.log('📦 TooLoo.ai Skills OS - Registered Skills');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    const files = readdirSync(SKILLS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    
    if (files.length === 0) {
      console.log('  No skills found in skills/ directory');
      return;
    }

    const skills: SkillDef[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(SKILLS_DIR, file), 'utf-8');
        const skill = parseSkillYaml(content);
        if (skill) {
          skills.push(skill);
        }
      } catch (e) {
        console.warn(`  ⚠️  Failed to parse ${file}`);
      }
    }

    // Print table
    console.log('  ID                      │ Name                    │ Version');
    console.log('  ────────────────────────┼─────────────────────────┼─────────');
    
    for (const skill of skills.sort((a, b) => a.id.localeCompare(b.id))) {
      const id = skill.id.padEnd(22);
      const name = (skill.name || '').padEnd(23);
      const version = skill.version || '1.0.0';
      console.log(`  ${id} │ ${name} │ ${version}`);
    }

    console.log('');
    console.log(`  Total: ${skills.length} skills`);
    console.log('');
  } catch (error) {
    console.error('Failed to list skills:', error);
    process.exit(1);
  }
}

listSkills();
