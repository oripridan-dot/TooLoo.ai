#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOICE_MAP = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  josh: '29vD33N1CtxCmqQRPOHJ', 
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  arnold: 'VR6AewLTigWG4xSOukaG',
  adam: 'pNInz6obpgDQGcFmaJgB',
  sam: 'yoZ06aMxZJJ28mfd3POQ'
};

async function speakSelection() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error('❌ Missing ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  // Get text from multiple sources
  let text = '';
  
  // Method 1: From command line args (most reliable)
  const args = process.argv.slice(2).join(' ').trim();
  if (args) {
    text = args;
    console.log('📝 Using text from arguments');
  }
  
  // Method 2: Try to read from VS Code selection via environment variable
  if (!text && process.env.VSCODE_SELECTED_TEXT) {
    text = process.env.VSCODE_SELECTED_TEXT.trim();
    console.log('📝 Using text from VS Code environment');
  }
  
  // Method 3: Try clipboard (cross-platform)
  if (!text) {
    try {
      const { execSync } = await import('child_process');
      // Try different clipboard commands based on platform
      let clipCmd;
      if (process.platform === 'darwin') {
        clipCmd = 'pbpaste';
      } else if (process.platform === 'win32') {
        clipCmd = 'powershell -command "Get-Clipboard"';
      } else {
        // Linux/Unix - try multiple options
        clipCmd = 'xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null || wl-paste 2>/dev/null';
      }
      
      text = execSync(clipCmd, { encoding: 'utf8', timeout: 2000 }).trim();
      console.log('📝 Using text from clipboard');
    } catch (e) {
      console.log('⚠️ Could not read clipboard:', e.message);
    }
  }

  // Method 4: Fallback test text
  if (!text) {
    text = 'Hello! This is a test of the ElevenLabs voice integration. Please select some text in VS Code and try again.';
    console.log('📝 Using fallback test text');
  }

  console.log(`🎤 Speaking: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);

  // Load voice preferences
  const prefsPath = path.join(__dirname, '..', '.vscode', 'tts-preferences.json');
  let prefs = { voice: 'rachel', speed: 1.0, stability: 0.5, similarity: 0.5, style: 0.0 };
  try {
    if (fs.existsSync(prefsPath)) {
      prefs = { ...prefs, ...JSON.parse(fs.readFileSync(prefsPath, 'utf8')) };
    }
  } catch (e) {
    // Use defaults
  }

  const voiceId = VOICE_MAP[prefs.voice] || VOICE_MAP.rachel;
  
  try {
    console.log(`🎤 Speaking with ${prefs.voice} voice...`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': key
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: prefs.stability,
          similarity_boost: prefs.similarity,
          style: prefs.style,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const audioBuffer = await response.arrayBuffer();
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    const filename = `selection-${Date.now()}.mp3`;
    const filepath = path.join(outputDir, filename);
    
    await fs.promises.writeFile(filepath, Buffer.from(audioBuffer));
    
    // Try to play the audio
    const { execSync } = await import('child_process');
    try {
      // Cross-platform audio playback
      const playCmd = process.platform === 'darwin' ? `afplay "${filepath}"` :
                     process.platform === 'win32' ? `start "" "${filepath}"` :
                     `aplay "${filepath}" || mpg123 "${filepath}" || ffplay -nodisp -autoexit "${filepath}"`;
      execSync(playCmd);
      console.log(`✅ Played: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
    } catch (playError) {
      console.log(`✅ Audio saved: ${filepath}`);
      console.log(`🔗 Play at: http://localhost:5501/output/${filename}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

speakSelection();