#!/usr/bin/env node
/**
 * Simple slide deck generator: reads investor-deck-airbnb-outline.md and emits JSON slides.
 */
import fs from 'fs';

const src = 'investor-deck-airbnb-outline.md';
if(!fs.existsSync(src)) { console.error('Missing outline file'); process.exit(1);} 
const md = fs.readFileSync(src,'utf8');
// Split by numbered headings pattern.
const lines = md.split(/\n/).filter(l => l.trim());
const slides = [];
let current = null;
for (const raw of lines) {
  const l = raw.replace(/\s+$/,''); // trim right-side spaces only
  const heading = l.match(/^\d+\.\s+(.+)/);
  if (heading) {
    if (current) slides.push(current); // push even if no bullets yet
    current = { title: heading[1].trim(), bullets: [] };
    continue;
  }
  if (/^\s*-\s+/.test(l)) {
    if (!current) {
      current = { title: 'Misc', bullets: [] };
    }
    current.bullets.push(l.replace(/^\s*-\s+/, '').trim());
    continue;
  }
  // Fallback: treat non-empty, non-heading, non-bullet lines as a bullet (context extension)
  if (current && l.trim()) {
    current.bullets.push(l.trim());
  }
}
if (current) slides.push(current);
// Remove any slides that ended up totally empty (shouldn't normally happen)
const cleaned = slides.filter(s => s.title && (s.bullets.length || true));
fs.writeFileSync('investor-deck-airbnb-slides.json', JSON.stringify({ generated: new Date().toISOString(), slideCount: cleaned.length, slides: cleaned }, null, 2));
console.log('Slide JSON written: investor-deck-airbnb-slides.json');
