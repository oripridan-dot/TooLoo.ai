import { promises as fs } from 'fs';
import path from 'path';

export default class CaseStudyOrchestrator {
  constructor({ workspaceRoot=process.cwd(), predictiveEngine, webPipes }={}){
    this.workspaceRoot = workspaceRoot;
    this.dir = path.join(workspaceRoot, 'data', 'case-studies');
    this.predictiveEngine = predictiveEngine;
    this.webPipes = webPipes;
  }

  async init(){ await fs.mkdir(this.dir, { recursive: true }); }

  async loadDataset(name='default'){
    const file = path.join(this.dir, `${name}.json`);
    try { return JSON.parse(await fs.readFile(file,'utf8')); }
    catch { return []; }
  }

  async saveRun(name, run){
    const file = path.join(this.dir, `run-${name}-${Date.now()}.json`);
    await fs.writeFile(file, JSON.stringify(run,null,2));
    return file;
  }

  async planMassiveRun({ name='baseline', topic='AI', feeds=[], urls=[], N=100 }){
    await this.init();
    // Use webPipes to plan content ingestion for the topic
    const plan = await this.webPipes.plan({ taskId: name, topic, feeds, urls, maxDocs: N, ttlHours: 6 });
    const dataset = { name, topic, feeds, urls, N, createdAt: new Date().toISOString(), planPath: plan.planPath };
    await fs.writeFile(path.join(this.dir, `${name}.json`), JSON.stringify(dataset,null,2));
    return { ok:true, dataset };
  }

  async runMassiveEvaluation({ name='baseline' }){
    await this.init();
    const dataset = await this.loadDataset(name);
    // Ingest
    const plan = { taskId: name, urls: dataset.urls||[], feeds: dataset.feeds||[], maxDocs: dataset.N||100 };
    const ingest = await this.webPipes.runPlan(plan);
    // List docs and create synthetic cases: predict outcomes and compare against a trivial observed signal (e.g., length or presence of keywords)
    const docs = await this.webPipes.listDocs(name, dataset.N||100);
    const cases = [];
    for (const d of docs){
      const message = { role:'user', content: (d.title||'')+': '+(d.summary?.text || (d.text||'').slice(0,500)) };
      // Make a naive prediction: whether the doc is likely "high-impact" based on keywords
      const predicted = this.predictHighImpact(message.content);
      // Actual: treat docs with > 1,000 chars and containing 2+ high-impact keywords as positive
      const actual = this.observeHighImpact(message.content);
      cases.push({ id: d.id, url: d.url, predicted, actual, correct: (predicted===actual) });
    }
    const accuracy = cases.length ? (cases.filter(c=>c.correct).length / cases.length) : 0;
    const run = { name, startedAt: new Date().toISOString(), ingest, casesCount: cases.length, accuracy, cases };
    const file = await this.saveRun(name, run);
    return { ok:true, accuracy, cases: cases.slice(0,20), runPath: file };
  }

  predictHighImpact(text=''){
    const keys = ['breakthrough','research','impact','novel','state-of-the-art','study','evidence','significant'];
    const lower = text.toLowerCase();
    const hits = keys.reduce((acc,k)=> acc + (lower.includes(k)?1:0), 0);
    return hits>=1; // lenient
  }

  observeHighImpact(text=''){
    const keys = ['breakthrough','research','impact','novel','state-of-the-art','study','evidence','significant'];
    const lower = text.toLowerCase();
    const hits = keys.reduce((acc,k)=> acc + (lower.includes(k)?1:0), 0);
    return (text.length>1000) && (hits>=2);
  }
}
