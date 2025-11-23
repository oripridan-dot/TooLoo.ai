// @version 2.1.28
import fs from 'fs';
import path from 'path';

export default class AlertManager {
  constructor({ logPath = path.join(process.cwd(), 'logs', 'alerts.jsonl') } = {}){
    this.logPath = logPath;
    try { fs.mkdirSync(path.dirname(this.logPath), { recursive: true }); } catch {}
  }

  alert(type, message, context = {}){
    const rec = { t: new Date().toISOString(), type, message, context };
    try { fs.appendFileSync(this.logPath, JSON.stringify(rec) + '\n'); } catch {}
    try { console.warn(`ALERT [${type}] ${message}`); } catch {}
    return rec;
  }

  getRecent(limit = 50){
    try {
      if (!fs.existsSync(this.logPath)) return [];
      const lines = fs.readFileSync(this.logPath, 'utf8').trim().split('\n');
      return lines.slice(-limit).map(l=>{ try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    } catch { return []; }
  }
}
