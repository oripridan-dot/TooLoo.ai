// Quick test script for Brand Board API
// Usage: node scripts/test-brandboard.js

const payload = {
  tokens: {
    brand: '#7c5cff', brandAlt: '#00e9b0', bg: '#0b0d10', surface: '#14181e',
    text: '#e6e9ee', muted: '#96a0af', accent: '#ffe770', danger: '#ff5c7c'
  },
  fonts: { display: 'Playfair Display', body: 'Inter' },
  name: 'TooLoo Brand'
};

(async () => {
  try {
    const r = await fetch('http://127.0.0.1:3000/api/v1/design/brandboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    console.log('status', r.status);
    console.log(j);
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
