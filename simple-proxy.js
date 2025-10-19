// Simple HTTP proxy - no auth required
import http from 'http';
import { request } from 'http';

const TARGET_PORT = 3000;
const PROXY_PORT = 9000;

const server = http.createServer((req, res) => {
  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`✅ Proxy listening on port ${PROXY_PORT}`);
  console.log(`Forward requests to http://localhost:${PROXY_PORT}`);
});
