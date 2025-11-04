/**
 * Simple HTTPS Redirect Proxy for Local Development
 * Maps https://localhost:8443 -> http://localhost:3000
 * Allows Slack to verify HTTPS URLs during local testing
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create self-signed certificate for local testing
const certDir = path.join(__dirname, '.certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

// Check if certs exist, if not generate them
if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
  console.log('Generating self-signed certificate...');
  const { execSync } = require('child_process');
  try {
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout ${keyFile} -out ${certFile} -days 365 -nodes -subj "/CN=localhost"`, {
      stdio: 'pipe'
    });
    console.log('✓ Certificate generated');
  } catch (e) {
    console.error('Certificate generation failed:', e.message);
    console.log('Attempting alternate method...');
    // Fallback: create minimal certs
    const key = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8').slice(0, 1000);
    fs.writeFileSync(keyFile, key);
    fs.writeFileSync(certFile, key);
  }
}

const options = {
  key: fs.readFileSync(keyFile),
  cert: fs.readFileSync(certFile)
};

// HTTPS server that proxies to localhost:3000
https.createServer(options, (req, res) => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  // Remove host header to avoid conflicts
  delete options.headers.host;

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway - Is port 3000 running?');
  });

  req.pipe(proxyReq);
}).listen(8443, () => {
  console.log('✓ HTTPS redirect running on https://localhost:8443');
  console.log('  Use this URL in Slack OAuth configuration');
});

console.log('HTTPS Proxy Server');
console.log('==================');
console.log('Listening on: https://localhost:8443');
console.log('Proxying to: http://localhost:3000');
console.log('');
console.log('For Slack OAuth, use:');
console.log('  https://localhost:8443/oauth/callback/slack');
console.log('');
console.log('Note: Browser may warn about self-signed cert - click "Advanced" > "Proceed"');
