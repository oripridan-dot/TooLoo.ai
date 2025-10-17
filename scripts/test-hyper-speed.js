import HyperSpeedTrainingCamp from '../engine/hyper-speed-training-camp.js';

async function main(){
  const camp = new HyperSpeedTrainingCamp({
    turboRounds: 1,
    questionsPerRound: 6,
    parallelDomains: 2
  });

  // Stub the parallel orchestrator to avoid network calls
  camp.parallelOrchestrator = {
    async hyperParallelGenerate(){
      return { ok:true, providersUsed:['deepseek','claude'], responseTime:100 };
    },
    async turboTrainingRound(questions){
      const results = questions.map((q,idx)=>({
        success: true,
        domain: q.domain,
        data: { consensus: true, confidence: 0.92, providersUsed:['deepseek','claude'] }
      }));
      return {
        questionsProcessed: results.length,
        successful: results.length,
        results,
        speedup: { estimated: 1.7, description: '1.7x faster' }
      };
    }
  };

  const res = await camp.turboStart();
  console.log('OK:', res.ok, 'cycles:', res.cyclesCompleted);
  console.log('HyperStats roundsCompleted:', camp.hyperStats.roundsCompleted);
  console.log('LastCycle present:', Boolean(camp.hyperStats.lastCycle));
}

main().catch(e=>{ console.error('Test failed:', e); process.exit(1); });
