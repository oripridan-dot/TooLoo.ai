#!/usr/bin/env node

/**
 * Script to open the generated audio file in VS Code for dev container playback
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const audioDir = path.join(__dirname, '..', 'audio');
const audioFile = path.join(audioDir, 'selection.mp3');

try {
  if (!fs.existsSync(audioFile)) {
    console.log('No audio file found. Generate speech first by selecting text and pressing Cmd+Shift+R');
    process.exit(1);
  }

  // Get file size for info
  const stats = fs.statSync(audioFile);
  const fileSizeKB = Math.round(stats.size / 1024);
  
  console.log(`📢 Audio generated: ${fileSizeKB}KB`);
  console.log('🎧 Opening audio file in VS Code...');
  
  // Try to open in VS Code
  try {
    execSync(`code "${audioFile}"`, { stdio: 'pipe' });
    console.log('✅ Audio file opened in VS Code. You can download and play it locally.');
  } catch (error) {
    // Fallback: show the file path
    console.log(`Audio file location: ${audioFile}`);
    console.log('📁 Right-click the file in VS Code Explorer to download and play');
  }

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}