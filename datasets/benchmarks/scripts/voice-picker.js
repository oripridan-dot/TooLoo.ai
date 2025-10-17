#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOICES = {
  '1': { name: 'rachel', desc: 'Rachel - Natural, expressive female' },
  '2': { name: 'josh', desc: 'Josh - Professional, clear male' },
  '3': { name: 'bella', desc: 'Bella - Warm, friendly female' },
  '4': { name: 'antoni', desc: 'Antoni - Smooth, engaging male' },
  '5': { name: 'elli', desc: 'Elli - Young, energetic female' },
  '6': { name: 'adam', desc: 'Adam - Deep, resonant male' },
  '7': { name: 'arnold', desc: 'Arnold - Authoritative male' },
  '8': { name: 'sam', desc: 'Sam - Confident, professional male' }
};

async function voicePicker() {
  const prefsPath = path.join(__dirname, '..', '.vscode', 'tts-preferences.json');
  
  // Load current preferences
  let prefs = { voice: 'rachel', speed: 1.0, stability: 0.5, similarity: 0.5, style: 0.0 };
  try {
    if (fs.existsSync(prefsPath)) {
      prefs = { ...prefs, ...JSON.parse(fs.readFileSync(prefsPath, 'utf8')) };
    }
  } catch (e) {
    // Use defaults
  }

  console.log('\n🎭 ElevenLabs Voice & Settings Picker\n');
  console.log('Current settings:');
  console.log(`  Voice: ${prefs.voice}`);
  console.log(`  Stability: ${prefs.stability} (0.0-1.0, higher = more consistent)`);
  console.log(`  Similarity: ${prefs.similarity} (0.0-1.0, higher = more like original voice)`);
  console.log(`  Style: ${prefs.style} (0.0-1.0, higher = more expressive)`);
  console.log('');
  
  console.log('Available voices:');
  Object.entries(VOICES).forEach(([key, voice]) => {
    const current = prefs.voice === voice.name ? ' ← CURRENT' : '';
    console.log(`  ${key}: ${voice.desc}${current}`);
  });
  console.log('');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Voice selection
    const voiceChoice = await new Promise(resolve => {
      rl.question('Select voice (1-8, or press Enter to keep current): ', resolve);
    });
    
    if (voiceChoice && VOICES[voiceChoice]) {
      prefs.voice = VOICES[voiceChoice].name;
      console.log(`✅ Voice set to: ${VOICES[voiceChoice].desc}`);
    }

    // Stability setting
    const stability = await new Promise(resolve => {
      rl.question(`Stability (0.0-1.0, current: ${prefs.stability}): `, resolve);
    });
    if (stability && !isNaN(parseFloat(stability))) {
      prefs.stability = Math.max(0, Math.min(1, parseFloat(stability)));
    }

    // Similarity setting
    const similarity = await new Promise(resolve => {
      rl.question(`Similarity (0.0-1.0, current: ${prefs.similarity}): `, resolve);
    });
    if (similarity && !isNaN(parseFloat(similarity))) {
      prefs.similarity = Math.max(0, Math.min(1, parseFloat(similarity)));
    }

    // Style setting
    const style = await new Promise(resolve => {
      rl.question(`Style/Emotion (0.0-1.0, current: ${prefs.style}): `, resolve);
    });
    if (style && !isNaN(parseFloat(style))) {
      prefs.style = Math.max(0, Math.min(1, parseFloat(style)));
    }

    // Save preferences
    const vscodePath = path.join(__dirname, '..', '.vscode');
    await fs.promises.mkdir(vscodePath, { recursive: true });
    await fs.promises.writeFile(prefsPath, JSON.stringify(prefs, null, 2));
    
    console.log('\n✅ Preferences saved!');
    console.log('Use Cmd+Shift+R to speak selected text with these settings.');
    
  } finally {
    rl.close();
  }
}

voicePicker();