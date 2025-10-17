#!/usr/bin/env node

// Test all VS Code tasks and commands for keyboard shortcuts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testKeybindings() {
  console.log('🧪 Testing VS Code Keybindings & Tasks...\n');
  
  // Test 1: Check if tasks.json exists and is valid
  const tasksPath = path.join(__dirname, '..', '.vscode', 'tasks.json');
  try {
    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    const tasks = JSON.parse(tasksContent);
    console.log('✅ tasks.json found and valid');
    console.log(`   Found ${tasks.tasks?.length || 0} tasks:`);
    tasks.tasks?.forEach(task => {
      console.log(`   - "${task.label}"`);
    });
  } catch (e) {
    console.log('❌ tasks.json error:', e.message);
  }
  
  // Test 2: Check keybindings.json
  const keybindingsPath = path.join(__dirname, '..', '.vscode', 'keybindings.json');
  try {
    const keybindingsContent = fs.readFileSync(keybindingsPath, 'utf8');
    const keybindings = JSON.parse(keybindingsContent);
    console.log('\n✅ keybindings.json found and valid');
    console.log(`   Found ${keybindings.length} keybindings:`);
    keybindings.forEach(kb => {
      console.log(`   ${kb.key} → ${kb.command}${kb.args ? ` (${kb.args})` : ''}`);
    });
  } catch (e) {
    console.log('\n❌ keybindings.json error:', e.message);
  }
  
  // Test 3: Check if scripts exist
  console.log('\n🔍 Checking TTS scripts:');
  const scriptsToCheck = [
    'scripts/speak-selection.js',
    'scripts/voice-picker.js',
    'scripts/speak-direct.js'
  ];
  
  for (const script of scriptsToCheck) {
    const scriptPath = path.join(__dirname, '..', script);
    if (fs.existsSync(scriptPath)) {
      console.log(`✅ ${script} exists`);
    } else {
      console.log(`❌ ${script} missing`);
    }
  }
  
  // Test 4: Test ElevenLabs API key
  console.log('\n🔐 Checking environment:');
  if (process.env.ELEVENLABS_API_KEY) {
    console.log('✅ ELEVENLABS_API_KEY found');
  } else {
    console.log('❌ ELEVENLABS_API_KEY missing in .env');
  }
  
  console.log('\n📋 Quick Test Instructions:');
  console.log('1. Select some text in VS Code');
  console.log('2. Press Cmd+Shift+R (should speak selection)');
  console.log('3. Press Cmd+Shift+Alt+R (should open voice settings)');
  console.log('4. Press Cmd+Shift+I (should open Copilot chat)');
  console.log('5. Select code and press Cmd+Shift+E (should explain code)');
}

testKeybindings();