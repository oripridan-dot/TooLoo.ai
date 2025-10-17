# TooLoo Design Suite

World‑class design, on demand. This suite lets you and TooLoo co‑create brand systems and ship production‑ready design artifacts.

## Open the Suite

```bash
node servers/web-server.js
$BROWSER http://localhost:3000/design-suite
```

## What’s Inside

- Tokens: Colors, surfaces, text, accents, and semantic states
- Palettes: Harmony generator (analogous, complementary, triad, tetrad)
- Typography: Curated font pairings; live type scale
- Components: Buttons preview (auto‑styled from tokens)
- Accessibility: Contrast checker (AA threshold)
- Presets: 5 world‑class themes to jumpstart any brand
- Export: One‑click download of tokens.json, theme.css, and components.html

- Brand Board PDF: Instantly export a designer-quality brand board PDF with your colors, fonts, and component specimens (button in top right)

## Typical Workflow (10 minutes)

1. Pick a Preset → instantly apply a brand direction
2. Tweak Tokens → brand color, background, and text for contrast
3. Set Typography → choose a display and body pairing
4. Validate A11y → ensure contrast ≥ 4.5 AA
5. Export → share tokens/theme with engineering and marketing

6. Brand Board PDF → Click “Brand Board PDF” to generate a polished PDF for sharing, review, or investor decks

## Files

- `web-app/design-suite.html` — UI and live preview
- `web-app/brand-presets.json` — Curated presets
- `servers/web-server.js` — Route alias `/design-suite`

## Notes

- Everything is local; no external calls required
- Changes persist in your browser via localStorage
- You can expand presets by editing `web-app/brand-presets.json`
