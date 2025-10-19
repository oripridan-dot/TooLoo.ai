// System Check endpoint: runs smoke tests for key services and returns structured results
// (Moved below app initialization)
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import ReferralSystem from '../referral-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.WEB_PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Static web assets
const webDir = path.join(process.cwd(), 'web-app');
app.use(express.static(webDir));
app.use('/temp', express.static(path.join(webDir, 'temp')));

// TooLoo Hub page route
app.get(['/tooloo-hub','/tooloo-page'], async (req,res)=>{
  const f = path.join(webDir,'tooloo-hub.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('TooLoo Hub page missing'); }
});

// Root route - serve Control Room (working HTML dashboard)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-home.html'));
});

// Quiet favicon 404s in dev
app.get('/favicon.ico', (req,res)=> res.status(204).end());

// Control Room friendly aliases
// Serve the main control room Home (minimal overview)
app.get('/control-room', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-home.html'));
});

// Advanced control room (existing redesigned page)
app.get('/control-room/advanced', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-redesigned.html'));
});

// Serve the workflow control room (product development focused)
app.get('/workflow-control-room', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'workflow-control-room.html'));
});

// Segmentation Demo friendly alias
app.get(['/segmentation','/segmentation-demo'], async (req,res)=>{
  const f = path.join(webDir,'segmentation-demo.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Segmentation Demo missing'); }
});

// Intelligence Dashboard friendly alias
app.get(['/dashboard','/intelligence','/intelligence-dashboard'], async (req,res)=>{
  const f = path.join(webDir,'intelligence-dashboard.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Intelligence Dashboard missing'); }
});

// Capability Activation friendly alias
app.get(['/capabilities','/activate','/capability-activation'], async (req,res)=>{
  const f = path.join(webDir,'capability-activation.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Capability Activation missing'); }
});

// Capabilities Dashboard alias
app.get(['/capabilities-dashboard','/capabilities/overview'], async (req,res)=>{
  const f = path.join(webDir,'capabilities-dashboard.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Capabilities Dashboard missing'); }
});

// Design Demo friendly alias
app.get(['/design-demo'], async (req,res)=>{
  const f = path.join(webDir,'design-demo.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Design Demo missing'); }
});

// Design Suite alias
app.get(['/design-suite'], async (req,res)=>{
  const f = path.join(webDir,'design-suite.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Design Suite missing'); }
});

// TooLoo Chat alias
app.get(['/tooloo-chat'], async (req,res)=>{
  const f = path.join(webDir,'tooloo-chat.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('TooLoo Chat page missing'); }
});

// ASAP Mastery alias - elegant UI
app.get(['/asap', '/asap-mastery'], async (req,res)=>{
  const f = path.join(webDir,'asap-mastery.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('ASAP Mastery missing'); }
});

// Knowledge page alias
app.get(['/knowledge','/books','/bibliography'], async (req,res)=>{
  const f = path.join(webDir,'knowledge.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Knowledge page missing'); }
});

// Feedback page alias
app.get(['/feedback', '/bug-report', '/support'], async (req,res)=>{
  const f = path.join(webDir,'feedback.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Feedback page missing'); }
});

// Referral page alias
app.get(['/referral', '/referrals', '/refer'], async (req,res)=>{
  const f = path.join(webDir,'referral.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Referral page missing'); }
});

// Smart Control Room alias
app.get(['/smart-control-room', '/smart', '/simple'], async (req,res)=>{
  const f = path.join(webDir,'control-room-smart.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Smart Control Room missing'); }
});

// Showcase Demo alias
app.get(['/showcase', '/demo', '/tooloo-showcase'], async (req,res)=>{
  const f = path.join(webDir,'tooloo-showcase.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Showcase Demo missing'); }
});

// Product Page Demo alias
app.get(['/product-page', '/product', '/landing'], async (req,res)=>{
  const f = path.join(webDir,'product-page-demo.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Product Page Demo missing'); }
});

// Design: Brand Board PDF export
app.post('/api/v1/design/brandboard', async (req,res)=>{
  try{
    const { tokens = {}, fonts = {}, name = 'TooLoo Brand' } = req.body || {};
    const outDir = path.join(webDir, 'temp');
    await fs.promises.mkdir(outDir, { recursive: true });
    const ts = Date.now();
    const file = path.join(outDir, `brand-board-${ts}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(file);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).fillColor('#222').text(name, { continued:false });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text('Generated by TooLoo Design Suite');
    doc.moveDown(1);

    // Colors
    const cols = [
      { label:'Brand', v: tokens.brand || '#7C5CFF' },
      { label:'Alt', v: tokens.brandAlt || '#00E9B0' },
      { label:'Accent', v: tokens.accent || '#FFE770' },
      { label:'Danger', v: tokens.danger || '#FF5C7C' },
      { label:'Text', v: tokens.text || '#E6E9EE' },
      { label:'Muted', v: tokens.muted || '#96A0AF' },
      { label:'Surface', v: tokens.surface || '#14181E' },
      { label:'Background', v: tokens.bg || '#0B0D10' }
    ];
    doc.fontSize(14).fillColor('#111').text('Color System');
    doc.moveDown(0.5);
    const startX = doc.x, startY = doc.y;
    const box = (x,y,c,l)=>{ doc.save(); doc.roundedRect(x,y,70,40,6).fillColor(c).fill(); doc.restore(); doc.fillColor('#111').fontSize(9).text(l+"\n"+c, x+78, y+12); };
    let x = startX, y = startY;
    for (let i=0;i<cols.length;i++){
      box(x,y, cols[i].v, cols[i].label);
      x += 180; if ((i%3)===2){ x=startX; y += 60; }
    }
    doc.moveDown(1.2);

    // Typography
    doc.fontSize(14).fillColor('#111').text('Typography');
    doc.moveDown(0.5);
    const display = fonts.display || 'Playfair Display';
    const body = fonts.body || 'Inter';
    doc.fontSize(18).fillColor('#111').text(`Display: ${display}`);
    doc.fontSize(10).fillColor('#444').text('The quick brown fox jumps over the lazy dog. 1234567890');
    doc.moveDown(0.4);
    doc.fontSize(18).fillColor('#111').text(`Body: ${body}`);
    doc.fontSize(10).fillColor('#444').text('The quick brown fox jumps over the lazy dog. 1234567890');
    doc.moveDown(1);

    // Buttons
    doc.fontSize(14).fillColor('#111').text('Components');
    doc.moveDown(0.4);
    const btn = (x,y,label,fill,stroke)=>{ doc.save(); doc.roundedRect(x,y,110,28,8).lineWidth(1).fillAndStroke(fill, stroke); doc.fillColor('#111').fontSize(10).text(label, x+12, y+8); doc.restore(); };
    btn(doc.x, doc.y, 'Default', '#f2f4f8', '#cfd6e0');
    btn(doc.x+130, doc.y, 'Primary', '#d9ccff', '#b8a3ff');

    // Footer
    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#777').text('Notes: Tokens and fonts exported from TooLoo Design Suite. Expand this brand board with photography, logo marks, and layout specimens.');
    doc.end();

    stream.on('finish', ()=>{
      const url = `/temp/${path.basename(file)}`;
      return res.json({ ok:true, url, file });
    });
    stream.on('error', (e)=> res.status(500).json({ ok:false, error: e.message }));
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Temp artifacts helper: latest guiding-star product page / PDF
app.get(['/temp/latest','/api/v1/design/latest'], async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const files = await fs.promises.readdir(dir);
    const pages = files.filter(f=>/^guiding-star-product-\d+\.html$/.test(f)).sort().reverse();
    const pdfs = files.filter(f=>/^brand-board-\d+\.pdf$/.test(f)).sort().reverse();
    const latestPage = pages[0] ? `/temp/${pages[0]}` : null;
    const latestPdf = pdfs[0] ? `/temp/${pdfs[0]}` : null;
    res.json({ ok:true, latest: { pageUrl: latestPage, pdfUrl: latestPdf }, counts:{ pages: pages.length, pdfs: pdfs.length }, pages, pdfs });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/temp/latest-page', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    const files = await fs.promises.readdir(dir);
    const pages = files.filter(f=>/^guiding-star-product-\d+\.html$/.test(f)).sort().reverse();
    if (!pages[0]) return res.status(404).send('No guiding-star product page found');
    res.redirect(`/temp/${pages[0]}`);
  }catch(e){ res.status(500).send(e.message); }
});

app.get('/temp/latest-pdf', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    const files = await fs.promises.readdir(dir);
    const pdfs = files.filter(f=>/^brand-board-\d+\.pdf$/.test(f)).sort().reverse();
    if (!pdfs[0]) return res.status(404).send('No brand board PDF found');
    res.redirect(`/temp/${pdfs[0]}`);
  }catch(e){ res.status(500).send(e.message); }
});

// Simple HTML index of temp artifacts
app.get('/temp/index', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const files = await fs.promises.readdir(dir);
    const pages = files.filter(f=>/^guiding-star-product-\d+\.html$/.test(f)).sort().reverse();
    const pdfs = files.filter(f=>/^brand-board-\d+\.pdf$/.test(f)).sort().reverse();
    const chats = files.filter(f=>/^chat-[A-Za-z0-9_-]+\.jsonl$/.test(f)).sort().reverse();
    const li = arr=> arr.map(f=>`<li><a href="/temp/${f}" target="_blank">${f}</a></li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Temp Artifacts</title></head><body>
      <h1>Temp Artifacts</h1>
      <p><a href="/temp/latest-page" target="_blank">Open latest product page</a> • <a href="/temp/latest-pdf" target="_blank">Open latest PDF</a></p>
      <h2>Pages</h2><ul>${li(pages)}</ul>
      <h2>PDFs</h2><ul>${li(pdfs)}</ul>
      <h2>Chat Transcripts</h2><ul>${li(chats)}</ul>
    </body></html>`;
    res.type('html').send(html);
  }catch(e){ res.status(500).send(e.message); }
});

// Chat transcript API: append and list
app.post('/api/v1/chat/append', async (req,res)=>{
  try{
    const { sessionId = 'default', role = 'user', text = '', meta = {} } = req.body||{};
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const file = path.join(dir, `chat-${sessionId}.jsonl`);
    const rec = { t: Date.now(), role, text, meta };
    await fs.promises.appendFile(file, JSON.stringify(rec)+'\n');
    res.json({ ok:true, file });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/chat/transcripts', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const { sessionId } = req.query||{};
    if (!sessionId) {
      const files = (await fs.promises.readdir(dir)).filter(f=>/^chat-[A-Za-z0-9_-]+\.jsonl$/.test(f));
      return res.json({ ok:true, files });
    }
    const file = path.join(dir, `chat-${sessionId}.jsonl`);
    try{
      const content = await fs.promises.readFile(file, 'utf8');
      const lines = content.split('\n').filter(Boolean).map(l=>{ try{return JSON.parse(l);}catch{return null;} }).filter(Boolean);
      return res.json({ ok:true, sessionId, messages: lines });
    }catch{ return res.json({ ok:true, sessionId, messages: [] }); }
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Streaming chat endpoint (SSE)
app.get('/api/v1/chat/burst-stream', async (req,res)=>{
  try{
    const { prompt, ttlSeconds = 30 } = req.query||{};
    if (!prompt) return res.status(400).json({ ok:false, error:'prompt required' });
    // Call burst endpoint
    const budgetPort = Number(process.env.BUDGET_PORT||3003);
    const qs = new URLSearchParams({ prompt, ttlSeconds: String(ttlSeconds) });
    const r = await fetch(`http://127.0.0.1:${budgetPort}/api/v1/providers/burst?${qs.toString()}`);
    const j = await r.json();
    if (!j?.ok) return res.status(502).json({ ok:false, error: j?.error||'burst failed' });
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Split text into tokens (simple word split) and send progressively
    const text = j.text || '';
    const tokens = text.split(/(\s+)/);
    const sendEvent = (type, data)=>{ res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); };
    sendEvent('meta', { cached: !!j.cached, policy: j.policy||null, concurrency: j.concurrency||null });
    for (let i=0;i<tokens.length;i++){
      await new Promise(r=>setTimeout(r, 20)); // simulate latency
      sendEvent('token', { token: tokens[i], index: i });
    }
    sendEvent('done', { fullText: text });
    res.end();
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Feedback submission API (local, not proxied)
app.post('/api/v1/feedback/submit', async (req,res)=>{
  try{
    const feedback = req.body || {};
    const timestamp = new Date().toISOString();
    const feedbackLog = {
      ...feedback,
      submitted_at: timestamp,
      ip: req.ip || req.connection.remoteAddress
    };
    
    // Log feedback to console (visible in logs)
    console.log(`\n[FEEDBACK] ${timestamp}`);
    console.log(`  Type: ${feedback.type}`);
    console.log(`  Subject: ${feedback.subject}`);
    console.log(`  Email: ${feedback.email || '(not provided)'}`);
    console.log(`  Description: ${feedback.description.substring(0, 100)}...`);
    if(feedback.browser) console.log(`  Browser: ${feedback.browser}`);
    if(feedback.url) console.log(`  URL: ${feedback.url}`);
    
    // Store in JSON file for later review
    const feedbackDir = path.join(process.cwd(), 'feedback-logs');
    await fs.promises.mkdir(feedbackDir, { recursive: true });
    const feedbackFile = path.join(feedbackDir, `feedback-${Date.now()}.json`);
    await fs.promises.writeFile(feedbackFile, JSON.stringify(feedbackLog, null, 2));
    
    // Return success
    res.json({ ok:true, message:'Feedback received, thank you!' });
  }catch(e){
    console.error('[FEEDBACK ERROR]', e.message);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Referral System API endpoints (local, not proxied)
const referralSystem = new ReferralSystem();

// Get or create user referral code
app.post('/api/v1/referral/create', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });

    // Check if user already has a code
    let existing = await referralSystem.getUserReferral(userId);
    if (!existing) {
      existing = await referralSystem.createReferral(userId, email);
    }

    res.json({
      ok: true,
      code: existing.code,
      share_url: `${process.env.APP_URL || 'http://127.0.0.1:3000'}?ref=${existing.code}`,
      referred_count: existing.referred_count
    });
  } catch (e) {
    console.error('Referral create error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Redeem referral code
app.post('/api/v1/referral/redeem', async (req, res) => {
  try {
    const { code, newUserId } = req.body;
    if (!code || !newUserId) return res.status(400).json({ ok: false, error: 'code and newUserId required' });

    const result = await referralSystem.redeemCode(code, newUserId);
    res.json(result);
  } catch (e) {
    console.error('Referral redeem error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get leaderboard (top referrers)
app.get('/api/v1/referral/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const leaderboard = await referralSystem.getLeaderboard(limit);
    res.json({
      ok: true,
      leaderboard,
      count: leaderboard.length
    });
  } catch (e) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get referral stats
app.get('/api/v1/referral/stats', async (req, res) => {
  try {
    const stats = await referralSystem.getStats();
    res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get user's referral info
app.get('/api/v1/referral/me', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId query param required' });

    const referral = await referralSystem.getUserReferral(userId);
    res.json({
      ok: true,
      referral: referral || null
    });
  } catch (e) {
    console.error('User referral error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Simple reverse proxy for API routes (keeps UI unchanged)
const serviceConfig = [
  { name: 'training', prefixes: ['/api/v1/training/hyper-speed','/api/v1/training','/api/v1/next-domain'], port: Number(process.env.TRAINING_PORT||3001), remoteEnv: process.env.REMOTE_TRAINING_BASE },
  { name: 'meta', prefixes: ['/api/v4/meta-learning'], port: Number(process.env.META_PORT||3002), remoteEnv: process.env.REMOTE_META_BASE },
  { name: 'budget', prefixes: ['/api/v1/budget','/api/v1/providers/burst','/api/v1/providers/status','/api/v1/providers/policy'], port: Number(process.env.BUDGET_PORT||3003), remoteEnv: process.env.REMOTE_BUDGET_BASE },
  { name: 'coach', prefixes: ['/api/v1/auto-coach'], port: Number(process.env.COACH_PORT||3004), remoteEnv: process.env.REMOTE_COACH_BASE },
  { name: 'cup', prefixes: ['/api/v1/cup'], port: Number(process.env.CUP_PORT||3005), remoteEnv: process.env.REMOTE_CUP_BASE },
  { name: 'product', prefixes: ['/api/v1/workflows','/api/v1/learning','/api/v1/analysis','/api/v1/artifacts','/api/v1/showcase','/api/v1/product','/api/v1/bookworm'], port: Number(process.env.PRODUCT_PORT||3006), remoteEnv: process.env.REMOTE_PRODUCT_BASE },
  { name: 'segmentation', prefixes: ['/api/v1/segmentation'], port: Number(process.env.SEGMENTATION_PORT||3007), remoteEnv: process.env.REMOTE_SEGMENTATION_BASE },
  { name: 'reports', prefixes: ['/api/v1/reports'], port: Number(process.env.REPORTS_PORT||3008), remoteEnv: process.env.REMOTE_REPORTS_BASE },
  { name: 'capabilities', prefixes: ['/api/v1/capabilities'], port: Number(process.env.CAPABILITIES_PORT||3009), remoteEnv: process.env.REMOTE_CAPABILITIES_BASE },
  { name: 'system', prefixes: ['/api/v1/system'], port: Number(process.env.ORCH_CTRL_PORT||3123), remoteEnv: process.env.REMOTE_SYSTEM_BASE },
  // Add sources server for future use
  { name: 'sources', prefixes: ['/api/v1/sources','/api/v1/sources/github/issues/sync'], port: Number(process.env.SOURCES_PORT||3010), remoteEnv: process.env.REMOTE_SOURCES_BASE }
];

function getRouteForPrefix(url) {
  for (const svc of serviceConfig) {
    for (const prefix of svc.prefixes) {
      if (url.startsWith(prefix)) {
        if (svc.remoteEnv) return { type: 'remote', base: svc.remoteEnv, name: svc.name };
        return { type: 'local', base: `http://127.0.0.1:${svc.port}`, name: svc.name };
      }
    }
  }
  return null;
}

app.get('/api/v1/system/routes', (req, res) => {
  const routes = serviceConfig.map(svc => ({
    name: svc.name,
    prefixes: svc.prefixes,
    route: svc.remoteEnv ? { type: 'remote', base: svc.remoteEnv } : { type: 'local', base: `http://127.0.0.1:${svc.port}` }
  }));
  res.json({ ok:true, routes });
});

// Explicit proxy for capabilities (ensures correct routing for nested paths)
// Explicit proxy for capabilities (ensures correct routing for nested paths)
app.all(['/api/v1/capabilities', '/api/v1/capabilities/*'], async (req, res) => {
  try {
    const port = Number(process.env.CAPABILITIES_PORT||3009);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Explicit proxy for product development (ensure all routes work)
app.all(['/api/v1/workflows', '/api/v1/workflows/*', '/api/v1/learning', '/api/v1/learning/*', '/api/v1/analysis', '/api/v1/analysis/*', '/api/v1/artifacts', '/api/v1/artifacts/*', '/api/v1/showcase', '/api/v1/showcase/*', '/api/v1/product', '/api/v1/product/*', '/api/v1/bookworm', '/api/v1/bookworm/*'], async (req, res) => {
  try {
    const port = Number(process.env.PRODUCT_PORT||3006);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

app.all(['/api/*'], async (req, res) => {
  try {
    // Local web host health check (bypass proxy)
    if (req.originalUrl === '/api/v1/health') {
      return res.json({ ok:true, server:'web', time: new Date().toISOString() });
    }
    const route = getRouteForPrefix(req.originalUrl);
    if (!route) return res.status(502).json({ ok:false, error:'No proxy target configured' });
    const url = `${route.base}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Proxy orchestrator control endpoints for multi-instance pilot
app.post('/api/v1/system/multi-instance/start', async (req,res)=>{
  try{
    const port = Number(process.env.ORCH_CTRL_PORT||3123);
    const r = await fetch(`http://127.0.0.1:${port}/api/v1/system/multi-instance/start`, { method:'POST' });
    const j = await r.json(); res.status(r.status).json(j);
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});
app.post('/api/v1/system/multi-instance/stop', async (req,res)=>{
  try{
    const port = Number(process.env.ORCH_CTRL_PORT||3123);
    const r = await fetch(`http://127.0.0.1:${port}/api/v1/system/multi-instance/stop`, { method:'POST' });
    const j = await r.json(); res.status(r.status).json(j);
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Orchestrator control and system status
let orchestratorProc = null;

async function getOrchestratorState() {
  // Prefer probing the orchestrator's own health endpoint so we detect external instances too
  try {
    const port = Number(process.env.ORCH_CTRL_PORT||3123);
    const r = await fetch(`http://127.0.0.1:${port}/health`, { method:'GET' });
    if (r.ok) {
      const j = await r.json();
      return { running: true, pid: j.pid || j?.orchestrator?.pid || null };
    }
  } catch {}
  // Fallback to local child process handle
  return { running: !!(orchestratorProc && !orchestratorProc.killed), pid: orchestratorProc?.pid || null };
}

app.post('/system/start', async (req,res)=>{
  try{
    // If orchestrator already healthy (even if started outside this process), report alreadyRunning
    const orch = await getOrchestratorState();
    if (orch.running) {
      return res.json({ ok:true, alreadyRunning:true, pid: orch.pid });
    }
    // Spawn orchestrator; it will detect existing web-server and start remaining services
    orchestratorProc = spawn('node', ['servers/orchestrator.js'], { stdio: 'inherit' });
    orchestratorProc.on('exit', (code, signal)=>{
      orchestratorProc = null;
    });
    
    // Auto-open Control Room + Chat in Simple Browser if requested
    if (req.body?.autoOpen !== false) {
      setTimeout(() => {
        try {
          const base = `http://127.0.0.1:${PORT}`;
          // Open control-room
          spawn('bash', ['-c', `"$BROWSER" ${base}/control-room || true`], { detached: true, stdio: 'ignore' }).unref();
          // Open tooloo-chat
          setTimeout(()=>{
            spawn('bash', ['-c', `"$BROWSER" ${base}/tooloo-chat || true`], { detached: true, stdio: 'ignore' }).unref();
          }, 500);
        } catch {}
      }, 2000);
    }
    
    return res.json({ ok:true, started:true, pid: orchestratorProc.pid, autoOpen: req.body?.autoOpen !== false });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Priority modes: favor chat vs background
app.post('/api/v1/system/priority/chat', async (req,res)=>{
  try{
    // 1) Pause auto-coach to free tokens
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/stop`, { method:'POST' }).catch(()=>{});
    // 2) Set provider policy for snappy chat (higher max concurrency)
    await fetch(`http://127.0.0.1:${process.env.BUDGET_PORT||3003}/api/v1/providers/policy`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ maxConcurrency: 6, criticality: 'chat' })
    }).catch(()=>{});
    // 3) Slightly dial training to background by reducing micro-batches
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/fast-lane`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enable:false, microBatchesPerTick: 1, batchSize: 1, intervalMs: 1200 })
    }).catch(()=>{});
    res.json({ ok:true, mode:'chat-priority' });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/system/priority/background', async (req,res)=>{
  try{
    // 1) Enable fast-lane with moderate throughput
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/fast-lane`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enable:true, microBatchesPerTick: 3, batchSize: 3, intervalMs: 700 })
    }).catch(()=>{});
    // 2) Lower provider concurrency to keep costs/latency stable
    await fetch(`http://127.0.0.1:${process.env.BUDGET_PORT||3003}/api/v1/providers/policy`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ maxConcurrency: 3, criticality: 'background' })
    }).catch(()=>{});
    // 3) Optionally start coach
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/start`, { method:'POST' }).catch(()=>{});
    res.json({ ok:true, mode:'background-priority' });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

async function probe(port, path){
  try{ const r = await fetch(`http://127.0.0.1:${port}${path}`, { method:'GET' }); return r.ok; }catch{ return false; }
}

app.get('/system/status', async (req,res)=>{
  try{
    const ports = {
      web: Number(PORT),
      training: Number(process.env.TRAINING_PORT||3001),
      meta: Number(process.env.META_PORT||3002),
      budget: Number(process.env.BUDGET_PORT||3003),
      coach: Number(process.env.COACH_PORT||3004),
      cup: Number(process.env.CUP_PORT||3005),
      productDev: Number(process.env.PRODUCT_PORT||3006),
      segmentation: Number(process.env.SEGMENTATION_PORT||3007),
      reports: Number(process.env.REPORTS_PORT||3008),
      capabilities: Number(process.env.CAPABILITIES_PORT||3009)
    };
      const [trainingOk, metaOk, budgetOk, coachOk, cupOk, productDevOk, segmentationOk, reportsOk, capabilitiesOk] = await Promise.all([
      probe(ports.training,'/health'),
      probe(ports.meta,'/health'),
      probe(ports.budget,'/health'),
      probe(ports.coach,'/health'),
      probe(ports.cup,'/health'),
      probe(ports.productDev,'/health'),
      probe(ports.segmentation,'/health'),
      probe(ports.reports,'/health'),
      probe(ports.capabilities,'/health')
    ]);

    let autoCoach = { active:false };
    try{
      const r = await fetch('/api/v1/auto-coach/status');
      const j = await r.json();
      autoCoach = j?.status || autoCoach;
    }catch{}

    const orch = await getOrchestratorState();
    res.json({
      ok:true,
      time: new Date().toISOString(),
      ports,
      orchestrator: orch,
      services: {
        training: trainingOk,
        meta: metaOk,
        budget: budgetOk,
        coach: coachOk,
        cup: cupOk,
        productDev: productDevOk,
        segmentation: segmentationOk,
        reports: reportsOk,
        capabilities: capabilitiesOk
      },
      autoCoach
    });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/system/stop', async (req,res)=>{
  try{
    // Best-effort: stop auto-coach
    try{ await fetch('http://127.0.0.1:'+ (process.env.COACH_PORT||3004) +'/api/v1/auto-coach/stop', { method:'POST' }); }catch{}
    // Kill orchestrator (regardless of who started it)
    try {
      const { spawn } = await import('child_process');
      const killer = spawn('bash', ['-lc', 'pkill -f "servers/orchestrator.js" || true'], { stdio:'inherit' });
      await new Promise(r=>killer.on('exit', r));
    } catch {}
    orchestratorProc = null;
    // Ask each service to stop by killing process gracefully (but DO NOT kill this web server)
    const patterns = ['training-server.js','meta-server.js','budget-server.js','coach-server.js','cup-server.js','product-development-server.js','segmentation-server.js','reports-server.js','capabilities-server.js'];
    try{
      const { spawn } = await import('child_process');
      const killer = spawn('bash', ['-lc', `pkill -f "servers/(${patterns.join('|')})" || true`], { stdio:'inherit' });
      await new Promise(r=>killer.on('exit', r));
    }catch{}
    res.json({ ok:true, stopped:true });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Health
app.get('/health', (req,res)=> res.json({ ok:true, server:'web', time: new Date().toISOString() }));

// API-style health alias for UIs expecting /api/v1/health via the web proxy
app.get('/api/v1/health', (req,res)=> res.json({ ok:true, server:'web', time: new Date().toISOString() }));

// Serve the latest design system artifact as a live, interactive HTML page
app.get('/design-system', async (req, res) => {
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TooLoo.ai Design System - Interactive Showcase</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .hero {
            background: linear-gradient(135deg, #0077B6 0%, #00A8E1 100%);
            color: white;
            padding: 60px 40px;
            border-radius: 20px;
            margin-bottom: 40px;
            box-shadow: 0 10px 40px rgba(0,119,182,0.3);
        }
        
        .hero h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        
        .hero p {
            font-size: 20px;
            opacity: 0.95;
        }
        
        .section {
            background: white;
            padding: 40px;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .section-title {
            font-size: 32px;
            font-weight: 700;
            color: #0077B6;
            margin-bottom: 24px;
            border-bottom: 3px solid #00A8E1;
            padding-bottom: 12px;
        }
        
        .subsection-title {
            font-size: 24px;
            font-weight: 600;
            color: #666;
            margin: 32px 0 16px 0;
        }
        
        /* Color Palette */
        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            margin: 24px 0;
        }
        
        .color-swatch {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .color-swatch:hover {
            transform: translateY(-4px);
        }
        
        .color-display {
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
        }
        
        .color-info {
            padding: 16px;
            background: white;
        }
        
        .color-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .color-values {
            font-size: 14px;
            color: #666;
        }
        
        /* Typography */
        .type-sample {
            margin: 24px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .type-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .h1-sample { font-size: 36px; font-weight: 700; color: #0077B6; }
        .h2-sample { font-size: 24px; font-weight: 700; color: #00A8E1; }
        .h3-sample { font-size: 18px; font-weight: 700; color: #666; }
        .body-sample { font-size: 16px; color: #333; }
        .caption-sample { font-size: 14px; color: #666; }
        
        /* Buttons */
        .button-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin: 24px 0;
        }
        
        .btn {
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Roboto', sans-serif;
        }
        
        .btn-primary {
            background: #0077B6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #005f93;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,119,182,0.4);
        }
        
        .btn-secondary {
            background: #F2F2F2;
            color: #666666;
        }
        
        .btn-secondary:hover {
            background: #e0e0e0;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102,102,102,0.2);
        }
        
        .btn-tertiary {
            background: transparent;
            color: #0077B6;
            border: 2px solid #0077B6;
        }
        
        .btn-tertiary:hover {
            background: #0077B6;
            color: white;
            transform: translateY(-2px);
        }
        
        /* Form Elements */
        .form-grid {
            display: grid;
            gap: 20px;
            margin: 24px 0;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
        }
        
        .form-label {
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        
        .form-input {
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Roboto', sans-serif;
            transition: border-color 0.3s ease;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #0077B6;
        }
        
        .form-select {
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Roboto', sans-serif;
            background: white;
            cursor: pointer;
        }
        
        /* Cards */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin: 24px 0;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 28px rgba(0,0,0,0.15);
        }
        
        .card-image {
            height: 180px;
            background: linear-gradient(135deg, #0077B6 0%, #00A8E1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        
        .card-content {
            padding: 24px;
        }
        
        .card-title {
            font-size: 20px;
            font-weight: 600;
            color: #0077B6;
            margin-bottom: 12px;
        }
        
        .card-text {
            color: #666;
            line-height: 1.6;
        }
        
        /* Navigation */
        .nav {
            background: white;
            padding: 16px 32px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 32px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin: 24px 0;
        }
        
        .nav-logo {
            font-size: 24px;
            font-weight: 700;
            color: #0077B6;
        }
        
        .nav-links {
            display: flex;
            gap: 24px;
            flex: 1;
        }
        
        .nav-link {
            color: #666;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .nav-link:hover {
            color: #0077B6;
        }
        
        /* Modal Preview */
        .modal-preview {
            background: rgba(0,0,0,0.5);
            padding: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 24px 0;
        }
        
        .modal-content {
            background: white;
            padding: 32px;
            border-radius: 12px;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .modal-title {
            font-size: 24px;
            font-weight: 700;
            color: #0077B6;
            margin-bottom: 16px;
        }
        
        /* Notifications */
        .notification {
            padding: 16px 24px;
            border-radius: 8px;
            margin: 12px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        }
        
        .notification-success {
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        
        .notification-error {
            background: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        
        .notification-warning {
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Hero Section -->
        <div class="hero">
            <h1>TooLoo.ai Design System</h1>
            <p>A comprehensive, interactive showcase of our design language and component library</p>
        </div>
        
        <!-- Color Palette Section -->
        <div class="section">
            <h2 class="section-title">Color Palette</h2>
            <div class="color-grid">
                <div class="color-swatch">
                    <div class="color-display" style="background: #0077B6; color: white;">Primary 1</div>
                    <div class="color-info">
                        <div class="color-name">Primary Blue</div>
                        <div class="color-values">#0077B6</div>
                        <div class="color-values">RGB(0, 119, 182)</div>
                    </div>
                </div>
                <div class="color-swatch">
                    <div class="color-display" style="background: #00A8E1; color: white;">Primary 2</div>
                    <div class="color-info">
                        <div class="color-name">Light Blue</div>
                        <div class="color-values">#00A8E1</div>
                        <div class="color-values">RGB(0, 168, 225)</div>
                    </div>
                </div>
                <div class="color-swatch">
                    <div class="color-display" style="background: #F2F2F2; color: #333;">Secondary 1</div>
                    <div class="color-info">
                        <div class="color-name">Light Gray</div>
                        <div class="color-values">#F2F2F2</div>
                        <div class="color-values">RGB(242, 242, 242)</div>
                    </div>
                </div>
                <div class="color-swatch">
                    <div class="color-display" style="background: #666666; color: white;">Secondary 2</div>
                    <div class="color-info">
                        <div class="color-name">Dark Gray</div>
                        <div class="color-values">#666666</div>
                        <div class="color-values">RGB(102, 102, 102)</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Typography Section -->
        <div class="section">
            <h2 class="section-title">Typography</h2>
            <div class="type-sample">
                <div class="type-label">Heading 1 - 36px Bold</div>
                <div class="h1-sample">The quick brown fox jumps over the lazy dog</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Heading 2 - 24px Bold</div>
                <div class="h2-sample">The quick brown fox jumps over the lazy dog</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Heading 3 - 18px Bold</div>
                <div class="h3-sample">The quick brown fox jumps over the lazy dog</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Body Text - 16px Regular</div>
                <div class="body-sample">The quick brown fox jumps over the lazy dog. 1234567890</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Caption - 14px Regular</div>
                <div class="caption-sample">The quick brown fox jumps over the lazy dog. 1234567890</div>
            </div>
        </div>
        
        <!-- Buttons Section -->
        <div class="section">
            <h2 class="section-title">Buttons</h2>
            <p style="margin-bottom: 24px; color: #666;">Hover over the buttons to see interactive states</p>
            <div class="button-grid">
                <button class="btn btn-primary">Primary Button</button>
                <button class="btn btn-secondary">Secondary Button</button>
                <button class="btn btn-tertiary">Tertiary Button</button>
            </div>
        </div>
        
        <!-- Form Elements Section -->
        <div class="section">
            <h2 class="section-title">Form Elements</h2>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Text Input</label>
                    <input type="text" class="form-input" placeholder="Enter your name...">
                </div>
                <div class="form-group">
                    <label class="form-label">Email Input</label>
                    <input type="email" class="form-input" placeholder="your.email@example.com">
                </div>
                <div class="form-group">
                    <label class="form-label">Dropdown Select</label>
                    <select class="form-select">
                        <option>Choose an option...</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                        <option>Option 3</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Textarea</label>
                    <textarea class="form-input" rows="4" placeholder="Enter your message..."></textarea>
                </div>
            </div>
        </div>
        
        <!-- Navigation Section -->
        <div class="section">
            <h2 class="section-title">Navigation</h2>
            <div class="nav">
                <div class="nav-logo">TooLoo.ai</div>
                <div class="nav-links">
                    <a href="#" class="nav-link">Dashboard</a>
                    <a href="#" class="nav-link">Projects</a>
                    <a href="#" class="nav-link">Team</a>
                    <a href="#" class="nav-link">Settings</a>
                </div>
            </div>
        </div>
        
        <!-- Cards Section -->
        <div class="section">
            <h2 class="section-title">Cards</h2>
            <p style="margin-bottom: 24px; color: #666;">Hover over the cards to see the elevation effect</p>
            <div class="card-grid">
                <div class="card">
                    <div class="card-image">🚀</div>
                    <div class="card-content">
                        <div class="card-title">Standard Card</div>
                        <div class="card-text">This is a standard card component with an image, title, and descriptive text. Perfect for displaying content in a grid layout.</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-image">💡</div>
                    <div class="card-content">
                        <div class="card-title">Featured Card</div>
                        <div class="card-text">Featured cards can highlight important content or call attention to specific features within your application.</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-image">⚡</div>
                    <div class="card-content">
                        <div class="card-title">Compact Card</div>
                        <div class="card-text">Compact cards are great for displaying multiple items in a dense layout while maintaining visual hierarchy.</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Notifications Section -->
        <div class="section">
            <h2 class="section-title">Notifications</h2>
            <div class="notification notification-success">
                ✓ Success! Your changes have been saved successfully.
            </div>
            <div class="notification notification-error">
                ✗ Error! Something went wrong. Please try again.
            </div>
            <div class="notification notification-warning">
                ⚠ Warning! This action cannot be undone.
            </div>
        </div>
        
        <!-- Modal Section -->
        <div class="section">
            <h2 class="section-title">Modal</h2>
            <div class="modal-preview">
                <div class="modal-content">
                    <div class="modal-title">Confirmation Modal</div>
                    <p style="color: #666; margin-bottom: 24px;">Are you sure you want to proceed with this action? This change will affect your account settings.</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn btn-secondary">Cancel</button>
                        <button class="btn btn-primary">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Generated by TooLoo.ai Professional Design System</p>
            <p style="margin-top: 8px; opacity: 0.7;">Leveraging mastery in product design and visual communication</p>
        </div>
    </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (e) {
    res.status(500).send('Failed to load design system: ' + e.message);
  }
});
app.listen(PORT, '0.0.0.0', ()=> console.log(`web-server listening on http://127.0.0.1:${PORT} and 0.0.0.0:${PORT}`));
