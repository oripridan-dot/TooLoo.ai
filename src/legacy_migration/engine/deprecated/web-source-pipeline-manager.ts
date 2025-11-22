import { promises as fs } from 'fs';
import path from 'path';

async function md5(str){
  const { createHash } = await import('crypto');
  return createHash('md5').update(str).digest('hex');
}

function tokenize(text=''){ return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean); }
function termFreq(tokens){ const m={}; tokens.forEach(t=>m[t]=(m[t]||0)+1); const n=tokens.length||1; Object.keys(m).forEach(k=>m[k]/=n); return m; }
function cosineSimilarity(a,b){ let dot=0,na=0,nb=0; const keys=new Set([...Object.keys(a),...Object.keys(b)]); keys.forEach(k=>{ const va=a[k]||0,vb=b[k]||0; dot+=va*vb; na+=va*va; nb+=vb*vb; }); if(!na||!nb) return 0; return dot/(Math.sqrt(na)*Math.sqrt(nb)); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(base){ return base + Math.floor(Math.random()*Math.min(250, base)); }
function getDomain(u){ try{ const { hostname } = new URL(u); return hostname||'unknown'; }catch{ return 'unknown'; } }

class HttpAdapter {
  constructor({ cacheDir, ttlMs=6*60*60*1000, globalConcurrency=3, domainMinIntervalMs=500, requestTimeoutMs=8000, allowDomains=[] }={}){
    this.cacheDir=cacheDir; this.ttlMs=ttlMs;
    this.globalConcurrency=globalConcurrency; this.active=0; this.queue=[];
    this.domainMinIntervalMs = domainMinIntervalMs;
    this.domainLastFetch = new Map(); // domain -> timestamp
    this.requestTimeoutMs = requestTimeoutMs;
    this.allowDomains = Array.isArray(allowDomains)? allowDomains : [];
  }
  async _cachePath(url){ const h = await md5(url); return path.join(this.cacheDir, h+'.json'); }
  async _fromCache(url){ try{ const p=await this._cachePath(url); const st=await fs.stat(p); if (Date.now()-st.mtimeMs>this.ttlMs) return null; return JSON.parse(await fs.readFile(p,'utf8')); }catch{return null;} }
  async _saveCache(url, obj){ try{ const p=await this._cachePath(url); await fs.mkdir(this.cacheDir,{recursive:true}); await fs.writeFile(p, JSON.stringify(obj,null,2)); }catch{} }
  async _respectDomainPacing(domain){
    const last = this.domainLastFetch.get(domain)||0; const now=Date.now();
    const wait = this.domainMinIntervalMs - (now-last);
    if (wait>0) await sleep(wait);
    this.domainLastFetch.set(domain, Date.now());
  }
  async _doFetch(url){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), Math.max(1000, this.requestTimeoutMs||8000));
    const res = await fetch(url, { headers: { 'User-Agent':'TooLoo.ai/1.0 (+https://tooloo.ai)' }, signal: ctrl.signal }).catch(e=>{ throw e; }).finally(()=>clearTimeout(t));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    return { title, text };
  }
  async fetchUrl(url){
    const cached = await this._fromCache(url); if (cached) return cached;
    const domain = getDomain(url);
    // allowlist enforcement
    if (this.allowDomains && this.allowDomains.length){
      const ok = this.allowDomains.some(pat=>{
        if (!pat) return false; if (pat==='*') return true;
        try{
          if (pat.startsWith('regex:')){ const r=new RegExp(pat.slice(6)); return r.test(domain); }
          return domain===pat || domain.endsWith('.'+pat);
        }catch{ return false; }
      });
      if (!ok) throw new Error(`Domain not allowed by allowlist: ${domain}`);
    }
    const run = async ()=>{
      await this._respectDomainPacing(domain);
      const { title, text } = await this._doFetch(url);
      const doc = { source:'http', url, title, text, fetchedAt: new Date().toISOString() };
      await this._saveCache(url, doc);
      return doc;
    };
    // retry with backoff
    const attempt = async ()=>{
      let delay=200; let tries=0; const max=3;
      for(;;){ try{ return await run(); } catch(e){ tries++; if (tries>=max) throw e; await sleep(jitter(delay)); delay*=2; } }
    };
    // simple queue
    if (this.active>=this.globalConcurrency){ await new Promise(r=>this.queue.push(r)); }
    this.active++;
    try{ return await attempt(); } finally { this.active--; const n=this.queue.shift(); if (n) n(); }
  }
}

class RssAdapter {
  constructor({ cacheDir, ttlMs=60*60*1000 }={}){ this.cacheDir=cacheDir; this.ttlMs=ttlMs; }
  async fetchFeed(url){
    const res = await fetch(url, { headers: { 'User-Agent':'TooLoo.ai/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    // Support RSS and ATOM basic parsing
    const itemBlocks = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
    let items = itemBlocks.map(m=>{
      const block = m[1];
      const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'').trim();
      const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||'').trim();
      const desc = (block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||'').trim();
      return { title, link, desc };
    });
    if (items.length===0){
      // Try ATOM
      const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi));
      items = entries.map(m=>{
        const block = m[1];
        const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'').trim();
        const link = (block.match(/<link[^>]*href="([^"]+)"/i)?.[1]||'').trim();
        const desc = (block.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1]||'').trim();
        return { title, link, desc };
      });
    }
    return { source:'rss', url, items, fetchedAt: new Date().toISOString() };
  }
  discoverFeeds(docUrl, html){
    try{
      const links = Array.from(html.matchAll(/<link[^>]+>/gi)).map(m=>m[0]);
      const feeds = [];
      for(const tag of links){
        const rel = (tag.match(/rel=["']([^"']+)["']/i)?.[1]||'').toLowerCase();
        const type = (tag.match(/type=["']([^"']+)["']/i)?.[1]||'').toLowerCase();
        const href = (tag.match(/href=["']([^"']+)["']/i)?.[1]||'').trim();
        if (!href) continue;
        const isAlt = rel.includes('alternate');
        const isFeed = type.includes('rss') || type.includes('atom') || tag.toLowerCase().includes('application/rss+xml') || tag.toLowerCase().includes('application/atom+xml');
        if (isAlt && isFeed){
          const u = new URL(href, docUrl).href; feeds.push(u);
        }
      }
      return [...new Set(feeds)];
    }catch{ return []; }
  }
}

export default class WebSourcePipelineManager {
  constructor({ workspaceRoot=process.cwd(), requestTimeoutMs=8000, allowDomains=[] }={}){
    this.workspaceRoot = workspaceRoot;
    this.dataDir = path.join(workspaceRoot, 'data', 'sources');
    this.cacheDir = path.join(this.dataDir, 'cache');
    this.logPath = path.join(this.dataDir, 'ingest.log');
    this.http = new HttpAdapter({ cacheDir: this.cacheDir, requestTimeoutMs, allowDomains });
    this.rss = new RssAdapter({ cacheDir: this.cacheDir });
    this.status = { lastRun:null, lastError:null };
    this.robotsCache = new Map(); // domain -> { rules: string[], fetchedAt }
    this.allowDomains = allowDomains;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  _taskDir(taskId){ return path.join(this.dataDir, taskId || 'general'); }
  _docsPath(taskId){ return path.join(this._taskDir(taskId), 'docs.jsonl'); }
  _indexPath(taskId){ return path.join(this._taskDir(taskId), 'index.json'); }

  async log(ev){ try{ await fs.mkdir(this.dataDir,{recursive:true}); await fs.appendFile(this.logPath, JSON.stringify({ t:new Date().toISOString(), ...ev })+'\n'); }catch{} }

  async plan({ taskId='general', topic, urls=[], feeds=[], keywords=[] , maxDocs=20, ttlHours=6 }={}){
    const plan = { taskId, topic, urls, feeds, keywords, maxDocs, ttlHours, createdAt: new Date().toISOString() };
    const planPath = path.join(this._taskDir(taskId), `plan-${Date.now()}.json`);
    await fs.mkdir(this._taskDir(taskId), { recursive: true });
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
    return { plan, planPath };
  }

  async runPlan(plan){
    const { taskId, maxDocs=20 } = plan || {};
    const urls = [...(plan?.urls||[])];
    const feeds = [...(plan?.feeds||[])];
    const docs=[];
    // RSS links expand into URLs
    for (const f of feeds){
      try{ const feed = await this.rss.fetchFeed(f); for (const it of feed.items.slice(0, Math.max(0, maxDocs-urls.length))){ if (it.link) urls.push(it.link); } } catch(e){ await this.log({ type:'rss_error', feed:f, error:e.message }); }
    }
    // RSS auto-discovery for provided URLs
    for(const u of [...urls]){
      try{ const page = await this.http.fetchUrl(u); const newFeeds = this.rss.discoverFeeds(u, page.text); for(const nf of newFeeds){ feeds.push(nf); } }
      catch{ /* ignore */ }
    }
    // de-dup feeds and expand more URLs up to maxDocs
    const uniqFeeds = [...new Set(feeds)];
    for (const f of uniqFeeds){
      try{ const feed = await this.rss.fetchFeed(f); for (const it of feed.items){ if (it.link) urls.push(it.link); if (urls.length>=maxDocs) break; } }
      catch(e){ await this.log({ type:'rss_error', feed:f, error:e.message }); }
      if (urls.length>=maxDocs) break;
    }
    // Dedup URLs
    const seen = new Set();
    const unique = urls.filter(u=>{ const k=new URL(u, 'http://dummy/').href; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0,maxDocs);
    for (const u of unique){
      try {
        // Respect robots.txt rules
        if (!(await this.isAllowedByRobots(u))) { await this.log({ type:'robots_block', url:u }); continue; }
        const doc = await this.http.fetchUrl(u); const text = doc.text || ''; const tf = termFreq(tokenize(text));
        const summary = await this.summarizeSafe(text, doc.title, u);
        docs.push({ id: await md5(u), url: u, title: doc.title, text, tf, summary, fetchedAt: doc.fetchedAt });
        await this.log({ type:'fetched', url:u });
      }
      catch(e){ await this.log({ type:'http_error', url:u, error: e.message }); }
    }
    // Persist docs
    await fs.mkdir(this._taskDir(taskId), { recursive: true });
    const outPath = this._docsPath(taskId);
    try { await fs.appendFile(outPath, docs.map(d=>JSON.stringify(d)).join('\n')+'\n'); } catch {}
    // Build simple TF index (doc vectors)
    const index = { builtAt: new Date().toISOString(), count: docs.length };
    await fs.writeFile(this._indexPath(taskId), JSON.stringify(index, null, 2));
    this.status.lastRun = new Date().toISOString();
    return { ok:true, taskId, fetched: docs.length };
  }

  async listDocs(taskId='general', limit=50){
    try { const lines = (await fs.readFile(this._docsPath(taskId),'utf8')).trim().split('\n'); return lines.slice(-limit).reverse().map(l=>JSON.parse(l)); } catch { return []; }
  }

  async search(taskId='general', query='', limit=10){
    const qtf = termFreq(tokenize(query||''));
    const docs = await this.listDocs(taskId, 1000);
    const scored = docs.map(d=>({ score: cosineSimilarity(qtf, d.tf||{}), doc: { id:d.id, url:d.url, title:d.title, snippet:(d.summary?.text||(d.text||'').slice(0,240)), fetchedAt:d.fetchedAt } }));
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0,limit).filter(s=>s.score>0.02);
  }

  getStatus(){ return { ...this.status, robotsCacheSize: this.robotsCache.size, domainPacing: this.http ? { minIntervalMs: this.http.domainMinIntervalMs, trackedDomains: this.http.domainLastFetch.size } : {} }; }
  setConfig({ allowDomains, requestTimeoutMs, domainMinIntervalMs }){
    if (Array.isArray(allowDomains)) { this.allowDomains = allowDomains; this.http.allowDomains = allowDomains; }
    if (requestTimeoutMs) { this.requestTimeoutMs = requestTimeoutMs; this.http.requestTimeoutMs = requestTimeoutMs; }
    if (domainMinIntervalMs) { this.http.domainMinIntervalMs = domainMinIntervalMs; }
    return { allowDomains: this.allowDomains, requestTimeoutMs: this.requestTimeoutMs, domainMinIntervalMs: this.http.domainMinIntervalMs };
  }

  async isAllowedByRobots(url){
    try{
      const u = new URL(url);
      const domain = u.protocol+'//'+u.host;
      const entry = this.robotsCache.get(domain);
      const fresh = entry && (Date.now() - entry.fetchedAt < 6*60*60*1000);
      let rules = entry?.rules;
      if (!fresh){
        try{
          const r = await fetch(domain+'/robots.txt', { headers:{ 'User-Agent':'TooLoo.ai/1.0' } });
          if (r.ok){
            const txt = await r.text();
            rules = this.parseRobots(txt);
            this.robotsCache.set(domain, { rules, fetchedAt: Date.now() });
          } else {
            // if robots.txt not available, allow by default
            rules = [];
          }
        }catch{ rules = []; }
      }
      const pathOnly = u.pathname || '/';
      return !rules.some(rule=> this.pathMatchesRule(pathOnly, rule));
    }catch{ return true; }
  }
  parseRobots(txt=''){
    const lines = txt.split(/\r?\n/).map(l=>l.trim());
    let inStar = false; const disallow=[];
    for(const line of lines){
      if (!line || line.startsWith('#')) continue;
      const mUA = line.match(/^User-agent:\s*(.+)$/i);
      if (mUA){ inStar = mUA[1].trim()==='*'; continue; }
      if (!inStar) continue;
      const mD = line.match(/^Disallow:\s*(.*)$/i);
      if (mD){ const rule = mD[1].trim(); if (rule) disallow.push(rule); else disallow.push(''); }
      const mA = line.match(/^Allow:\s*(.*)$/i);
      if (mA){ /* ignore allow for simplicity */ }
    }
    return disallow;
  }
  pathMatchesRule(pathname, rule){
    if (!rule) return false; // empty Disallow means allow all
    // very simple prefix match, treat '*' as wildcard any sequence
    const regex = new RegExp('^'+rule.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\*/g,'.*'));
    return regex.test(pathname);
  }

  async summarizeSafe(text='', title='', url=''){
    try{ const mod = await import('./summarizer.js'); const summarizer = mod?.default ? new mod.default() : mod; return await summarizer.summarize({ text, title, url }); }
    catch{ return { text: (text||'').slice(0,240) }; }
  }
}
