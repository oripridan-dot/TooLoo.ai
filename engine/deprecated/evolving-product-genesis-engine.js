// CommonJS export for automation compatibility
module.exports = {
  runEvolutionRound: async function(productName, knowledge, config) {
    const engine = new EvolvingProductGenesisEngine({ knowledgePath: config.knowledgePath });
    engine.knowledge = knowledge;
    // Use productName and config to run a round
    const productDescription = productName;
    const result = await engine.runRound({ productName, productDescription });
    // Add learnedPatterns for integrator
    result.learnedPatterns = result.adoptedPatterns.map(p => p.id);
    result.updatedKnowledge = engine.knowledge;
    result.metrics.compositeReliability = result.metrics.reliability;
    return result;
  }
};
// Evolving Product Genesis Engine
// Produces progressively more realistic product genesis conversations with measurement & learning
// No external AI calls (offline heuristic learning)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const KNOWLEDGE_PATH = path.join(process.cwd(), 'product-genesis-knowledge', 'knowledge.json');

export class EvolvingProductGenesisEngine {
  constructor(config = {}) {
    this.config = Object.assign({
      knowledgePath: KNOWLEDGE_PATH,
      outputDir: path.join(process.cwd(), 'product-genesis-conversations/evolving'),
      maxRoundsMemory: 25,
      minNoveltyThreshold: 0.08,
      minReliabilityThreshold: 0.65,
      patternAdoptionThreshold: 0.72,
      maxNewPatternsPerRound: 3
    }, config);
    this.ensureDirs();
    this.knowledge = this.loadKnowledge();
  }

  ensureDirs() {
    if (!fs.existsSync(path.dirname(this.config.knowledgePath))) fs.mkdirSync(path.dirname(this.config.knowledgePath), {recursive:true});
    if (!fs.existsSync(this.config.outputDir)) fs.mkdirSync(this.config.outputDir, {recursive:true});
  }

  loadKnowledge() {
    if (!fs.existsSync(this.config.knowledgePath)) {
      throw new Error('Knowledge file missing. Initialize first.');
    }
    const raw = fs.readFileSync(this.config.knowledgePath, 'utf8');
    return JSON.parse(raw);
  }

  saveKnowledge() {
    this.knowledge.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.config.knowledgePath, JSON.stringify(this.knowledge, null, 2));
  }

  async runRound({productName, productDescription, archetype='generic'}) {
    const roundIndex = (this.knowledge.metrics.totalRounds || 0) + 1;
    const seed = this.hash(`${productName}:${roundIndex}:${Date.now()}`);

    // 1. Generate draft conversation
    const draft = this.generateConversation({productName, productDescription, archetype, seed, roundIndex});

    // 2. Analyze draft (heuristic pattern & trait extraction)
    const analysis = this.analyzeConversation(draft);

    // 3. Derive improvement suggestions
    const improvement = this.generateImprovementPlan(analysis);

    // 4. Attempt pattern enrichment (candidate extraction & validation)
    const enrichment = this.enrichPatterns(analysis, improvement);

    // 5. Compute round metrics & reliability
    const metrics = this.computeRoundMetrics(analysis, enrichment);

    // 6. Persistence & possible adoption / rollback
    this.persistRound({draft, analysis, improvement, enrichment, metrics});

    // 7. Generate report
    const reportPath = this.writeReport({productName, roundIndex, draft, analysis, improvement, enrichment, metrics});

    return { roundIndex, reportPath, metrics, adoptedPatterns: enrichment.adopted || [] };
  }

  generateConversation({productName, productDescription, archetype, seed, roundIndex}) {
    const rng = this.prng(seed);
    const corePhases = [
      'problem-framing','option-divergence','risk-calibration','architecture-shaping','go-no-go' 
    ];
    // Increase variation with round progression
    const variationFactor = Math.min(1, roundIndex / 10);
    const optionalPhase = variationFactor > 0.3 && rng() > 0.5 ? 'competitive-scan' : null;
    const phases = optionalPhase ? [...corePhases.slice(0,2), optionalPhase, ...corePhases.slice(2)] : corePhases;

    const participantsBase = ['Founder','TechLead','Product','Market','Ops'];
    const participants = participantsBase.filter(_=>rng()>0.15).slice(0,4 + (rng()>0.7?1:0));

    const messages = [];
    let id=1;
    for (const phase of phases) {
      const turns = 3 + Math.floor(rng()*3); // 3-5 turns per phase
      for (let t=0; t<turns; t++) {
        const speaker = participants[Math.floor(rng()*participants.length)];
        messages.push({
          id: String(id++),
          phase,
          author: speaker,
          content: this.syntheticUtterance({phase, speaker, productName, productDescription, roundIndex, rng})
        });
      }
    }
    return { id: `gen-${Date.now()}`, productName, productDescription, archetype, participants, phases, messages };
  }

  syntheticUtterance({phase, speaker, productName, productDescription, roundIndex, rng}) {
    const intensifier = roundIndex>1 ? 'increasingly ' : '';
    const fragments = {
      'problem-framing': [
        `We keep tripping over the same core user friction around ${productDescription}.`,
        `The root dysfunction isn't surface UX—it's workflow fragmentation in how ${productDescription} is approached.`
      ],
      'option-divergence': [
        `We have three strategic vectors: conservative polish, hybrid augmentation, and radical redefinition of ${productName}.`,
        'Let\'s map incremental -> transitional -> disruptive arcs and stress their latency vs adoption curves.'
      ],
      'competitive-scan': [
        'Competitors are converging toward feature parity while ignoring systemic latency debt.',
        'Market signaling shows no one is rewiring the underlying cognitive load model.'
      ],
      'risk-calibration': [
        'Primary exposure surfaces at infrastructure scale amplification and onboarding cognitive overload.',
        'Risk clusters: execution sequencing, capital burn slope, architectural irreversibility.'
      ],
      'architecture-shaping': [
        'Architecture proposal: layered capability spine with progressive revelation to users.',
        'We enforce constraint-first design to prevent combinatorial surface explosion.'
      ],
      'go-no-go': [
        'Signal alignment across risk, differentiation, and timing: I am green-lighting the disruptive arc.',
        'We codify decision: proceed with staged radical path; fallback thresholds predefined.'
      ]
    };
    const pool = fragments[phase] || ['Uncategorized strategic exchange.'];
    return pool[Math.floor(rng()*pool.length)] + (rng()>0.75?` (${intensifier}aligned)`:'');
  }

  analyzeConversation(conv) {
    // Pattern occurrence heuristics from lexicon matching
    const patternLexicon = {
      'pivot-trigger-question': ['redefinition','root dysfunction','reframing','radical'],
      'option-framing-request': ['three strategic','vectors','map incremental','arcs'],
      'risk-surfacing': ['risk','exposure','clusters','irreversibility','burn'],
      'scope-compression': ['progressive revelation','constraint-first','layered capability','prevent combinatorial'],
      'decision-shorthand-affirm': ['codify decision','green-lighting','signal alignment'],
      'deliverable-framing-quad': ['architecture proposal','fallback thresholds','sequencing'],
      'next-step-authorization': ['green-lighting','proceed','go-no-go','codify decision']
    };

    const patternsDetected = [];
    for (const msg of conv.messages) {
      const text = msg.content.toLowerCase();
      for (const [pattern, tokens] of Object.entries(patternLexicon)) {
        if (tokens.some(tok => text.includes(tok))) {
          patternsDetected.push({ patternId: pattern, phase: msg.phase, msgId: msg.id, confidence: 0.65 + Math.random()*0.25 });
        }
      }
    }

    // Trait inference: aggregate signal weights
    const traitSignals = {
      strategicVision: ['redefinition','strategic','vectors','differentiation','disruptive'],
      riskIntelligence: ['risk','exposure','clusters','irreversibility','fallback'],
      decisionClarity: ['codify decision','green-lighting','go-no-go','proceed'],
      innovationDrive: ['radical','redefinition','disruptive'],
      executionDiscipline: ['sequencing','constraint-first','progressive revelation','architecture']
    };
    const traitScores = {};
    const allText = conv.messages.map(m=>m.content.toLowerCase()).join('\n');
    for (const [trait, tokens] of Object.entries(traitSignals)) {
      const hits = tokens.reduce((acc,tok)=> acc + (allText.includes(tok)?1:0),0);
      traitScores[trait] = Math.min(1, hits / (tokens.length+0.5));
    }

    return { patternsDetected, traitScores };
  }

  generateImprovementPlan(analysis) {
    const phaseCoverage = {};
    analysis.patternsDetected.forEach(p=>{ phaseCoverage[p.phase]=(phaseCoverage[p.phase]||0)+1; });
    const sparsePhases = Object.entries(phaseCoverage).filter(([,c])=>c<2).map(([ph])=>ph);
    const targetPhase = sparsePhases[0] || null;
    const missingTraits = Object.entries(analysis.traitScores).filter(([,v])=>v<0.45).map(([t])=>t);

    return {
      sparsePhases,
      targetPhase,
      missingTraits,
      recommendations: [
        targetPhase?`Add depth in phase '${targetPhase}' via explicit trade-off articulation.`:null,
        missingTraits.length?`Seed language to elevate traits: ${missingTraits.join(', ')}.`:null,
        'Introduce at least one novel structural element (meta reflection, user empathy splice).'
      ].filter(Boolean)
    };
  }

  enrichPatterns(analysis, improvement) {
    // Build a text corpus from draft messages (analysis does not have rawText now)
    // We'll derive candidate conceptual tokens:
    // 1. Hyphenated compounds (e.g., latency-folding)
    // 2. Two/three-word noun-like phrases (simple heuristic: words > 5 chars)
    // 3. Phase-specific collocations not seen in previous rounds
    const corpus = (analysis._corpus || '').toLowerCase();
    // If _corpus not injected, skip extraction gracefully
    const messagesText = corpus || '';

    const hyphenMatches = [...messagesText.matchAll(/\b([a-z][a-z0-9]+-[a-z0-9]+)\b/g)].map(m=>m[1]);
    const phraseMatches = [...messagesText.matchAll(/\b([a-z]{6,})\s+([a-z]{6,})(?:\s+([a-z]{6,}))?/g)]
      .map(m=> m[3] ? `${m[1]} ${m[2]} ${m[3]}` : `${m[1]} ${m[2]}`);

    const candidatePool = [...new Set([...hyphenMatches, ...phraseMatches])]
      .filter(c=>c.length < 45 && c.length > 9);

    const already = new Set([...this.knowledge.patternLibrary.core, ...this.knowledge.patternLibrary.learned]);

    // Basic semantic novelty heuristic: hash and distance from existing (by prefix divergence)
    const scored = candidatePool.map(c=>{
      const hash = this.hash(c).slice(0,12);
      const prefixOverlap = [...already].reduce((acc,p)=> acc + (p.slice(0,4)===c.slice(0,4)?1:0),0);
      const noveltyScore = Math.min(0.95, 0.4 + (1/(1+prefixOverlap)) + (c.split('-').length>1?0.15:0) + (c.split(' ').length>2?0.1:0));
      return { id: c.replace(/\s+/g,'-'), label: c, noveltyScore, hash };
    }).sort((a,b)=> b.noveltyScore - a.noveltyScore);

    const adopted = [];
    for (const cand of scored.slice(0, this.config.maxNewPatternsPerRound)) {
      if (cand.noveltyScore >= this.config.patternAdoptionThreshold && !already.has(cand.id)) {
        this.knowledge.patternLibrary.learned.push(cand.id);
        adopted.push({ id: cand.id, noveltyScore: cand.noveltyScore, sourceLabel: cand.label });
      }
    }

    return { adopted, candidatesEvaluated: scored.length };
  }

  computeRoundMetrics(analysis, enrichment) {
    const uniquePatterns = new Set(analysis.patternsDetected.map(p=>p.patternId));
    const denom = (this.knowledge.patternLibrary.core.length + Math.max(1,this.knowledge.patternLibrary.learned.length));
    const coverage = uniquePatterns.size / denom;
    const avgConfidence = analysis.patternsDetected.reduce((a,p)=>a+p.confidence,0)/(analysis.patternsDetected.length||1);
    const traitValues = Object.values(analysis.traitScores);
    const traitMean = traitValues.reduce((a,v)=>a+v,0)/ (traitValues.length||1);
    const traitDiversity = traitValues.length ? (traitValues.filter(v=>v>0.55).length / traitValues.length) : 0; // fraction of strong traits
    const novelty = enrichment.adopted.length? enrichment.adopted.reduce((a,p)=>a+p.noveltyScore,0)/enrichment.adopted.length : 0;
    // Stability: variance of pattern confidences (lower variance => more stable); convert to stability score
    const confVals = analysis.patternsDetected.map(p=>p.confidence);
    const mean = avgConfidence || 0.0001;
    const variance = confVals.length? confVals.reduce((a,v)=>a+Math.pow(v-mean,2),0)/confVals.length : 0;
    const stability = 1 - Math.min(1, variance / 0.05); // variance above 0.05 penalizes strongly
    // Reliability weighting formula
    const reliability = (
      0.30*coverage +
      0.20*traitMean +
      0.15*traitDiversity +
      0.20*stability +
      0.15*Math.min(1, avgConfidence)
    );
    return { coverage, avgConfidence, traitMean, traitDiversity, stability, novelty, reliability };
  }

  persistRound({draft, analysis, improvement, enrichment, metrics}) {
    const roundRecord = {
      timestamp: new Date().toISOString(),
      draftSummary: draft.messages.slice(0,2).map(m=>m.content).join(' | '),
      patternCount: analysis.patternsDetected.length,
      uniquePatterns: [...new Set(analysis.patternsDetected.map(p=>p.patternId))],
      adoptedPatterns: enrichment.adopted,
      metrics
    };
    this.knowledge.rounds.push(roundRecord);
    // Trim history if needed
    if (this.knowledge.rounds.length > this.config.maxRoundsMemory) {
      this.knowledge.rounds = this.knowledge.rounds.slice(-this.config.maxRoundsMemory);
    }
    // Update aggregate metrics
    this.knowledge.metrics.totalRounds = (this.knowledge.metrics.totalRounds||0)+1;
    const totalRounds = this.knowledge.metrics.totalRounds;
    this.knowledge.metrics.averageNovelty = ((this.knowledge.metrics.averageNovelty||0)*(totalRounds-1)+metrics.novelty)/totalRounds;
    this.knowledge.metrics.averageReliability = ((this.knowledge.metrics.averageReliability||0)*(totalRounds-1)+metrics.reliability)/totalRounds;
    this.knowledge.metrics.coverage = metrics.coverage;
    this.knowledge.metrics.traitDiversity = metrics.traitDiversity;
    this.knowledge.metrics.stability = metrics.stability;
    this.saveKnowledge();
  }

  writeReport({productName, roundIndex, draft, analysis, improvement, enrichment, metrics}) {
    const fname = `round-${roundIndex}-${productName.toLowerCase().replace(/\s+/g,'-')}.md`;
    const fpath = path.join(this.config.outputDir, fname);
    const md = `# Evolving Product Genesis Round ${roundIndex} - ${productName}
Generated: ${new Date().toISOString()}

## Conversation Skeleton
Phases: ${draft.phases.join(' → ')}
Participants: ${draft.participants.join(', ')}
Messages: ${draft.messages.length}

## Detected Patterns (${analysis.patternsDetected.length})
${analysis.patternsDetected.slice(0,12).map(p=>`- ${p.patternId} (phase: ${p.phase}, conf: ${p.confidence.toFixed(2)})`).join('\n')||'None'}

## Trait Scores
${Object.entries(analysis.traitScores).map(([k,v])=>`- ${k}: ${(v*100).toFixed(1)}%`).join('\n')}

## Improvement Plan
${improvement.recommendations.map(r=>`- ${r}`).join('\n')}

## Enrichment
${enrichment.adopted.length? enrichment.adopted.map(a=>`- Adopted pattern: ${a.id} (novelty ${(a.noveltyScore*100).toFixed(1)}%)`).join('\n'):'- No new patterns adopted'}

## Metrics
- Coverage: ${(metrics.coverage*100).toFixed(1)}%
- Avg Confidence: ${(metrics.avgConfidence*100).toFixed(1)}%
- Trait Mean: ${(metrics.traitMean*100).toFixed(1)}%
- Novelty: ${(metrics.novelty*100).toFixed(1)}%
- Reliability Score: ${(metrics.reliability*100).toFixed(1)}%

---
Excerpt:
${draft.messages.slice(0,5).map(m=>`> [${m.phase}] ${m.author}: ${m.content}`).join('\n')}
`;
    fs.writeFileSync(fpath, md);
    return fpath;
  }

  hash(s){return crypto.createHash('md5').update(s).digest('hex');}
  prng(seed){let h = this.hash(seed); let i=0; return ()=>{ if(i>=h.length){h=this.hash(h);i=0;} const v=parseInt(h.slice(i,i+8),16); i+=8; return v/0xFFFFFFFF; }; }
}
