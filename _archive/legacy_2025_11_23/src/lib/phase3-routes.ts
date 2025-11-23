// Route proxy configuration for new services added in Phase 3

export default function setupPhase3Proxies(app) {
  // Integrations API
  app.all(['/api/v1/integrations', '/api/v1/integrations/*'], async (req, res) => {
    try {
      const port = Number(process.env.INTEGRATIONS_PORT || 3012);
      const url = `http://127.0.0.1:${port}${req.originalUrl}`;
      const init = {
        method: req.method,
        headers: { 'content-type': req.get('content-type') || 'application/json' }
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
      }
      const r = await fetch(url, init);
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) return res.type('application/json').send(text);
      return res.send(text);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Domains API (Coding, Research, Data, Writing)
  app.all(['/api/v1/domains', '/api/v1/domains/*'], async (req, res) => {
    try {
      const port = Number(process.env.DOMAINS_PORT || 3014);
      const url = `http://127.0.0.1:${port}${req.originalUrl}`;
      const init = {
        method: req.method,
        headers: { 'content-type': req.get('content-type') || 'application/json' }
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
      }
      const r = await fetch(url, init);
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) return res.type('application/json').send(text);
      return res.send(text);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // IDE API
  app.all(['/api/v1/ide', '/api/v1/ide/*'], async (req, res) => {
    try {
      const port = Number(process.env.IDE_PORT || 3015);
      const url = `http://127.0.0.1:${port}${req.originalUrl}`;
      const init = {
        method: req.method,
        headers: { 'content-type': req.get('content-type') || 'application/json' }
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
      }
      const r = await fetch(url, init);
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('application/json')) return res.type('application/json').send(text);
      return res.send(text);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}
