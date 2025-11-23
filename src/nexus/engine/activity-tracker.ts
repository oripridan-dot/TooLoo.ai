// @version 2.1.11
import fs from 'fs';
import path from 'path';

export default class ActivityTracker {
  constructor({ storeDir='data/activity', maxItems=10 }={}){
    this.storeDir = storeDir;
    this.storeFile = path.join(storeDir, 'recent.json');
    this.maxItems = maxItems;
    try { fs.mkdirSync(storeDir, { recursive:true }); } catch {}
    if (!fs.existsSync(this.storeFile)) fs.writeFileSync(this.storeFile, JSON.stringify({ items:[] }, null, 2));
  }
  _read(){ try { return JSON.parse(fs.readFileSync(this.storeFile,'utf-8')); } catch { return { items:[] }; } }
  _write(d){ try { fs.writeFileSync(this.storeFile, JSON.stringify(d, null, 2)); } catch {} }
  add(item){
    const d=this._read();
    d.items.unshift({ ...item, ts: new Date().toISOString() });
    d.items = d.items.slice(0, this.maxItems);
    this._write(d);
    return this.getSummary();
  }
  getRecent(){ return this._read().items; }
  clear(){ this._write({ items:[] }); }
  getSummary(){
    const items=this.getRecent();
    const n=items.length||1;
    const avgLatency = items.reduce((s,x)=>s+(x.meta?.latencyMs||0),0)/n;
    const byProvider = items.reduce((m,x)=>{ const p=x.providerUsed||'unknown'; m[p]=(m[p]||0)+1; return m; },{});
    const lastCost = items.find(x=>x.costBadge)?.costBadge?.usd;
    return { count: items.length, avgLatencyMs: Math.round(avgLatency), byProvider, lastCostUsed: lastCost };
  }
}
