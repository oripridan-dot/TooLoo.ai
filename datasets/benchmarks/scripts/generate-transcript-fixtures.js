/**
 * Generates plain-text transcript fixtures from synthetic JSON sessions.
 * Output directory: conversation-synthetic/fixtures/raw
 * Format: one line per message: `<author>: <content>`
 */
import fs from 'fs';
import path from 'path';

const sessionsDir = path.resolve('conversation-synthetic', 'sessions');
const outDir = path.resolve('conversation-synthetic', 'fixtures', 'raw');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
let count = 0;
for (const file of files) {
  const full = path.join(sessionsDir, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  const lines = json.messages.map(m => `${m.author}: ${m.content}`);
  const outPath = path.join(outDir, file.replace('.json', '.txt'));
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  count++;
}
console.log(`Generated ${count} raw transcript fixtures in ${outDir}`);
