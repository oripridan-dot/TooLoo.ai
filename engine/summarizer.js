// Robust summarizer: adaptive to text/code/JSON/HTML/logs
// Fast, offline, with chunking and caching

import { promises as fs } from 'fs';
import path from 'path';

export default class Summarizer {
  static cache = new Map(); // key -> { summary, at }

  constructor(opts={}){
    this.targetLength = opts.targetLength || 800; // chars
    this.chunkSize = opts.chunkSize || 4000; // chars
    this.cacheTtlMs = opts.cacheTtlMs || 60*60*1000; // 1h
    this.cacheDir = opts.cacheDir || null; // optional on-disk cache
  }

  // --- Utils ---
  splitSentences(text=''){
    const parts = text.replace(/\s+/g,' ').split(/(?<=[\.!?])\s+/);
    return parts.map(s=>s.trim()).filter(Boolean);
  }
  tokenize(s=''){ return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean); }
  termFreq(tokens){ const m={}; tokens.forEach(t=>m[t]=(m[t]||0)+1); const n=tokens.length||1; Object.keys(m).forEach(k=>m[k]/=n); return m; }
  cosine(a,b){ let dot=0,na=0,nb=0; const keys=new Set([...Object.keys(a),...Object.keys(b)]); keys.forEach(k=>{ const va=a[k]||0,vb=b[k]||0; dot+=va*vb; na+=va*va; nb+=vb*vb; }); if(!na||!nb) return 0; return dot/(Math.sqrt(na)*Math.sqrt(nb)); }
  compress(text=''){
    return text
      .replace(/\s+/g,' ')
      .replace(/\(.*?\)/g,'')
      .replace(/\[[^\]]*\]/g,'')
      .replace(/\s([,;:])/g,'$1')
      .trim();
  }
  chunk(text=''){
    if (!text || text.length<=this.chunkSize) return [text];
    const chunks=[]; let i=0; while(i<text.length){ chunks.push(text.slice(i, i+this.chunkSize)); i+=this.chunkSize; }
    return chunks;
  }
  cacheKey(kind, text){
    const len = Math.min(1000, text.length);
    const head = text.slice(0,len);
    let hash=0; for(let i=0;i<head.length;i++){ hash = ((hash<<5)-hash) + head.charCodeAt(i); hash|=0; }
    return `${kind}:${text.length}:${hash}`;
  }
  fromCache(key){ const e = Summarizer.cache.get(key); if (!e) return null; if (Date.now()-e.at>this.cacheTtlMs){ Summarizer.cache.delete(key); return null; } return e.summary; }
  toCache(key, summary){ Summarizer.cache.set(key, { summary, at: Date.now() }); }
  async toDisk(key, summary){ if (!this.cacheDir) return; try { await fs.mkdir(this.cacheDir, { recursive: true }); const f = path.join(this.cacheDir, encodeURIComponent(key)+'.json'); await fs.writeFile(f, JSON.stringify({ at: Date.now(), summary }, null, 0)); } catch{} }
  async fromDisk(key){ if (!this.cacheDir) return null; try { const f = path.join(this.cacheDir, encodeURIComponent(key)+'.json'); const s = await fs.readFile(f,'utf8'); const j = JSON.parse(s); if (Date.now()-j.at>this.cacheTtlMs) return null; return j.summary; } catch { return null; } }

  // --- Detectors ---
  detectKind({ text='', title='', url='', hint='' }={}){
    const lower = text.slice(0,4000).toLowerCase();
    if (hint==='text') return 'text';
    if (hint==='code') return 'code';
    if (hint==='json') return 'json';
    if (hint==='html') return 'html';
    if (hint==='log') return 'log';
    if (url.match(/\.(json)(\?|$)/i)) return 'json';
    if (url.match(/\.(html?|xml)(\?|$)/i)) return 'html';
    try { if (JSON.parse(text) && text.trim().startsWith('{')) return 'json'; } catch{}
    if (/<!doctype html|<html|<head|<body/i.test(text)) return 'html';
    if (/\b(error|warn|info)\b\s*[:\-]/i.test(lower)) return 'log';
    if (/(class\s+\w+|function\s+\w+|=>|import\s+|export\s+|#include|def\s+\w+)/.test(text)) return 'code';
    return 'text';
  }

  // --- Summaries ---
  summarizeTextBlock(text='', title=''){
    if (!text || text.length < 240){ return this.compress(text||''); }
    const sentences = this.splitSentences(text);
    const globalTf = this.termFreq(this.tokenize(text));
    const scored = sentences.map((s,idx)=>{
      const tf = this.termFreq(this.tokenize(s));
      const rel = this.cosine(tf, globalTf);
      const lenPenalty = Math.max(0.6, Math.min(1, 120/(s.length+1)));
      const capBoost = /^[A-Z]/.test(s) ? 1.05 : 1;
      return { idx, s, score: rel*capBoost*lenPenalty };
    }).sort((a,b)=>b.score-a.score);
    const out=[]; let total=0; const limit = this.targetLength;
    for (const r of scored){ if (total>=limit) break; out.push(r.s); total += r.s.length+1; }
    return this.compress(out.join(' ')).slice(0, Math.max(limit, 4000));
  }

  summarizeCode(text=''){
    const lines = text.split(/\r?\n/);
    const imports = lines.filter(l=>/^(import\s|const\s+\w+\s*=\s*require\()/.test(l.trim())).slice(0,50);
    const classes = lines.filter(l=>/\bclass\s+\w+/.test(l)).map(l=>l.trim());
    const functions = lines.filter(l=>/(^|\s)(async\s+)?function\s+\w+|\w+\s*=\s*\([^)]*\)\s*=>|^\s*\w+\([^)]*\)\s*{/.test(l)).slice(0,200).map(l=>l.trim());
    const todos = lines.filter(l=>/TODO|FIXME|HACK/i.test(l)).slice(0,50);
    const bracesDepth = (()=>{ let d=0,max=0; for(const ch of text){ if(ch==='{' ) d++; if(ch==='}') d--; if(d>max) max=d; } return max; })();
    const loc = lines.length;
    const risks = [];
    if (todos.length) risks.push('Pending TODO/FIXME items');
    if (bracesDepth>5) risks.push('High nesting complexity');
    if (/eval\s*\(/.test(text)) risks.push('Uses eval');
    const responsibilities = [];
    if (/http|fetch|axios|express/i.test(text)) responsibilities.push('Networking/API');
    if (/fs\./i.test(text)) responsibilities.push('Filesystem IO');
    if (/database|sql|sqlite|mongoose|pg\b/i.test(text)) responsibilities.push('Data persistence');
    if (/summary|summari[sz]e/i.test(text)) responsibilities.push('Summarization');
    const outline = { classes: classes.slice(0,50), functions, todos };
    const meta = { loc, classes: classes.length, functions: functions.length, imports: imports.length, maxDepth: bracesDepth, risks, responsibilities, dependencies: imports.slice(0,50) };
    const textSummary = this.summarizeTextBlock(lines.slice(0,1000).join(' '));
    const header = 'Code Summary';
    return { title: header, text: `${textSummary}`, meta, outline };
  }

  summarizeJSON(text=''){
    try{
      const obj = JSON.parse(text);
      const keys = Object.keys(obj).slice(0,50);
      const meta = { type: Array.isArray(obj)?'array':'object', topLevelKeys: keys, size: (Array.isArray(obj)? obj.length : keys.length) };
      return { title:'JSON Summary', text:`Top-level keys: ${keys.join(', ')}`, meta };
    } catch{ return { title:'JSON Summary', text: this.summarizeTextBlock(text) }; }
  }

  summarizeHTML(text=''){
    const title = (text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]||'').trim();
    const metaDesc = (text.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]||'').trim();
    const content = this.summarizeTextBlock(text.replace(/<[^>]+>/g,' ').slice(0,20000));
    return { title: title? `${title} — HTML Summary` : 'HTML Summary', text: metaDesc || content };
  }

  summarizeLog(text=''){
    const lines = text.split(/\r?\n/);
    const errors = lines.filter(l=>/error/i.test(l)).slice(0,20);
    const warns = lines.filter(l=>/warn/i.test(l)).slice(0,20);
    const info = lines.filter(l=>/info/i.test(l)).slice(0,10);
    const meta = { errors: errors.length, warns: warns.length, info: info.length };
    const body = [
      errors.length?`Errors: ${errors.length}`:'',
      warns.length?`Warnings: ${warns.length}`:'',
      info.length?`Info: ${info.length}`:''
    ].filter(Boolean).join(' | ');
    return { title:'Log Summary', text: body || this.summarizeTextBlock(text), meta };
  }

  mergeSummaries(parts=[]){
    const texts = parts.map(p=> (typeof p==='string'? p : p?.text||'')).filter(Boolean);
    const merged = this.summarizeTextBlock(texts.join(' '));
    return merged;
  }

  async summarize({ text='', title='', url='', hint='' }={}){
    const kind = this.detectKind({ text, title, url, hint });
    const key = this.cacheKey(kind, text);
  const cached = this.fromCache(key) || await this.fromDisk(key); if (cached) return cached;
    let summary;
    if (kind==='text'){
      const chunks = this.chunk(text);
      if (chunks.length===1){ summary = { title: title? `${title} — Summary` : 'Summary', url, text: this.summarizeTextBlock(text, title) }; }
      else { const parts = chunks.map(c=> this.summarizeTextBlock(c)); summary = { title: title? `${title} — Summary` : 'Summary', url, text: this.mergeSummaries(parts) }; }
    } else if (kind==='code'){
      summary = this.summarizeCode(text);
    } else if (kind==='json'){
      summary = this.summarizeJSON(text);
    } else if (kind==='html'){
      summary = this.summarizeHTML(text);
    } else if (kind==='log'){
      summary = this.summarizeLog(text);
    } else {
      summary = { title: title? `${title} — Summary` : 'Summary', url, text: this.summarizeTextBlock(text, title) };
    }
    this.toCache(key, summary); await this.toDisk(key, summary);
    return summary;
  }

  async persistSummary(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error('Failed to persist summary:', e.message);
      return false;
    }
  }
}
