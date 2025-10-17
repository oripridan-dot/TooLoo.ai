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

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error('Missing ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  const [,, ...args] = process.argv;
  if (args.length === 0) {
    console.error('Usage: npm run speak:direct -- "Your text here" [voiceName]');
    process.exit(1);
  }
  const text = args[0];
  const voiceName = args[1] || 'rachel';
  const voiceId = VOICE_MAP[voiceName] || VOICE_MAP.rachel;

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(err);
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const outDir = path.join(__dirname, '..', 'output');
    await fs.promises.mkdir(outDir, { recursive: true });
    const fileName = `tts-${Date.now()}.mp3`;
    const outPath = path.join(outDir, fileName);
    await fs.promises.writeFile(outPath, buf);
    console.log(`✅ Saved: ${outPath} (${buf.length} bytes)`);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(2);
  }
}

main();
