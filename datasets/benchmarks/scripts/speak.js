#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [,, ...args] = process.argv;
  if (args.length === 0) {
    console.error('Usage: npm run speak -- "Your text here" [voiceName]');
    process.exit(1);
  }
  const text = args[0];
  const voiceName = args[1] || 'rachel';

  const apiUrl = process.env.TTS_API_URL || 'http://localhost:3001/api/v1/tts/speak';
  try {
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName })
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(errText);
    }
    const arrayBuffer = await r.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const outDir = path.join(__dirname, '..', 'output');
    await fs.promises.mkdir(outDir, { recursive: true });
    const fileName = `tts-${Date.now()}.mp3`;
    const outPath = path.join(outDir, fileName);
    await fs.promises.writeFile(outPath, buf);
    console.log(`✅ Saved: ${outPath} (${buf.length} bytes)`);
    console.log(`🔗 Open: http://localhost:5501/output/${fileName}`);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(2);
  }
}

main();
