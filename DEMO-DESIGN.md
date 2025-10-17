# Studio‑Grade Design Demo (TooLoo.ai)

This demo showcases TooLoo’s target quality bar for visual design: refined typography, balanced composition, subtle motion, and accessibility.

## How to Run

1. Start the web server (serves Control Room and demos):

```bash
node servers/web-server.js
```

1. Open the demo in your browser:

```bash
$BROWSER http://localhost:3000/design-demo
```

## What You’ll See

- Elegant typography pairing (Playfair Display + Inter)
- Studio‑quality layout with depth, glow, and restrained contrast
- Motion preview with reduced‑motion support
- Interactive controls (Toggle Glow) and responsive elements

## Notes

- The demo is a static HTML page at `web-app/design-demo.html`
- Route alias `/design-demo` is exposed by `servers/web-server.js`
- Control Room remains available at `/control-room`
