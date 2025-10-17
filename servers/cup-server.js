import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.CUP_PORT || 3005;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/health', (req,res)=> res.json({ ok:true, server:'cup', time:new Date().toISOString() }));

// Simple in-memory scoreboard (deterministic demo data)
function getScoreboard(){
  const overall = {
    deepseek: { rank: 1, avgScore: 86.5, totalCost: 0.42 },
    claude: { rank: 2, avgScore: 84.0, totalCost: 0.88 },
    openai: { rank: 3, avgScore: 82.3, totalCost: 1.41 },
    gemini: { rank: 4, avgScore: 78.9, totalCost: 0.65 }
  };
  return { overall, lastUpdated: new Date().toISOString() };
}

app.get('/api/v1/cup/scoreboard', (req,res)=>{
  try{ res.json({ ok:true, scoreboard: getScoreboard() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/cup/mini', async (req,res)=>{
  // Simulate a quick evaluation; return updated scoreboard and a summary
  try{
    const scoreboard = getScoreboard();
    const summary = {
      testsRun: 12,
      domains: ['DSA','OS','DB','ML'],
      winner: 'deepseek',
      avgWinnerScore: scoreboard.overall.deepseek.avgScore
    };
    res.json({ ok:true, scoreboard, summary });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.listen(PORT, ()=> console.log(`cup-server listening on http://localhost:${PORT}`));
