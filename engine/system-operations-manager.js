import fs from 'fs';

export default class SystemOperationsManager {
  constructor({ baseUrl = 'http://localhost:3001' }={}){
    this.baseUrl = baseUrl;
    this.state = { armed: false, lastCheck: null, status: null };
  }
  async ping(path){
    try { const r = await fetch(`${this.baseUrl}${path}`); if (!r.ok) return { ok:false, status:r.status }; const j=await r.json().catch(()=>({})); return { ok:true, body:j }; }
    catch(e){ return { ok:false, error:e.message }; }
  }
  async writeProbe(){
    try { fs.mkdirSync('data/ops', { recursive:true }); fs.writeFileSync('data/ops/probe.json', JSON.stringify({ t: Date.now() })); return true; } catch{ return false; }
  }
  async runSmoke(){
    const checks = {};
    checks.health = await this.ping('/api/v1/health');
    checks.segStatus = await this.ping('/api/v1/segmentation/status');
    checks.alerts = await this.ping('/api/v1/alerts/recent');
    const wrote = await this.writeProbe();
    // extractor quick check
    let extractor = { ok:false };
    try{
      const r = await fetch(`${this.baseUrl}/api/v1/extract/structured`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: 'Accuracy 92%, latency 45ms, $0.25 per 1K tokens' }) });
      extractor = { ok: r.ok };
    }catch(e){ extractor = { ok:false, error:e.message }; }
    // ingestion docs list
    const webDocs = await this.ping('/api/v1/web/docs?taskId=general&limit=1');
    const ok = [checks.health, checks.segStatus, checks.alerts, extractor].every(x=>x && x.ok) && wrote;
    const status = { ok, checks: { ...checks, extractor, wroteProbe: wrote, webDocs } };
    this.state.lastCheck = new Date().toISOString();
    this.state.status = status;
    return status;
  }
  arm(){ this.state.armed = true; return { armed: true }; }
  disarm(){ this.state.armed = false; return { armed: false }; }
  getStatus(){ return { ...this.state }; }
}
