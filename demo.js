#!/usr/bin/env node

/**
 * TooLoo.ai V2 - Market Intelligence Demo
 * 
 * Quick CLI demo to test the market intelligence system.
 * Run: node demo.js
 */

// Mock idea for testing
const sampleIdea = {
  id: 'demo-001',
  title: 'TaskFlow - AI Admin Assistant for Freelancers',
  tagline: 'Stop wasting 3 hours/day on admin tasks',
  problem: {
    description: 'Freelancers and solo entrepreneurs waste 15+ hours per week on administrative tasks like invoicing, time tracking, expense management, and client communication. This prevents them from focusing on billable work.',
    targetAudience: 'Solo freelancers, consultants, small agency owners',
    painLevel: 'severe',
    currentSolutions: [
      'Manual spreadsheets',
      'Multiple disconnected tools (QuickBooks + Toggl + Gmail)',
      'Virtual assistants (expensive)'
    ]
  },
  solution: {
    description: 'AI-powered admin assistant that automatically handles invoicing, time tracking, expense categorization, and drafts client emails. Integrates with existing tools.',
    uniqueValue: 'Single AI assistant vs. 5 separate tools. Learns your patterns over time.',
    keyFeatures: [
      'Auto-generate invoices from time logs',
      'Smart expense categorization',
      'Email template suggestions',
      'Client payment reminders',
      'Weekly admin summary'
    ]
  },
  createdAt: new Date().toISOString()
};

console.log('🧠 TooLoo.ai V2 - Market Intelligence Demo\n');
console.log('='.repeat(60));
console.log(`\n📋 Analyzing Idea: "${sampleIdea.title}"\n`);
console.log(`Problem: ${sampleIdea.problem.description}\n`);
console.log(`Solution: ${sampleIdea.solution.description}\n`);
console.log('='.repeat(60));

// Simulate market analysis (since we don't have API keys in demo)
console.log('\n🔍 Running Market Analysis...\n');

// Simulated competition analysis
const competition = {
  competitors: [
    { name: 'Bonsai', url: 'https://hellobonsai.com', pricing: '$24/mo', votes: 1250 },
    { name: 'Hectic', url: 'https://hectic.app', pricing: '$15/mo', votes: 450 },
    { name: 'HoneyBook', url: 'https://honeybook.com', pricing: '$39/mo', votes: 890 }
  ],
  competitorCount: 8,
  saturation: 'medium',
  topCompetitor: { name: 'Bonsai', votes: 1250 }
};

console.log('📊 Competition Analysis:');
console.log(`   Competitors Found: ${competition.competitorCount}`);
console.log(`   Market Saturation: ${competition.saturation.toUpperCase()}`);
console.log(`   Top Competitor: ${competition.topCompetitor.name} (${competition.topCompetitor.votes} votes)\n`);

console.log('   🏢 Key Competitors:');
competition.competitors.forEach((c, i) => {
  console.log(`      ${i + 1}. ${c.name} - ${c.pricing} - ${c.votes} votes`);
  console.log(`         ${c.url}`);
});

// Simulated trend analysis
const trends = {
  relevantDiscussions: 23,
  topDiscussions: [
    { title: 'Freelancing admin is killing my business', engagement: 156 },
    { title: 'What tools do you use for invoicing?', engagement: 89 },
    { title: 'Just hired a VA for $500/mo - worth it', engagement: 67 }
  ],
  commonThemes: [
    { theme: 'time-saving', mentions: 34 },
    { theme: 'automation', mentions: 28 },
    { theme: 'integration', mentions: 19 }
  ],
  growthIndicators: [
    'High demand for automation',
    'Strong need for time-saving solutions'
  ]
};

console.log('\n\n📈 Trend Analysis:');
console.log(`   Relevant Discussions: ${trends.relevantDiscussions}`);
console.log(`   Growth Indicators: ${trends.growthIndicators.length}\n`);

console.log('   💬 Top Reddit Discussions:');
trends.topDiscussions.forEach((d, i) => {
  console.log(`      ${i + 1}. "${d.title}" (${d.engagement} upvotes)`);
});

console.log('\n   🏷️  Common Themes:');
trends.commonThemes.forEach(t => {
  console.log(`      - ${t.theme}: ${t.mentions} mentions`);
});

// Calculate validation score
let validationScore = 50;
if (competition.saturation === 'medium') validationScore += 10;
if (trends.relevantDiscussions > 10) validationScore += 15;
if (trends.growthIndicators.length > 0) validationScore += 15;

console.log('\n\n⭐ Validation Score: ' + validationScore + '/100');

// Generate recommendation
let verdict, reasoning, nextSteps;

if (validationScore >= 70) {
  verdict = '🟢 Strong Opportunity';
  reasoning = 'Moderate competition with proven demand and positive growth signals';
  nextSteps = [
    '1. Build minimal prototype (2-3 core features)',
    '2. Validate with 10 freelancers',
    '3. Set up landing page for early access',
    '4. Research weak points of top 3 competitors'
  ];
} else if (validationScore >= 50) {
  verdict = '🟡 Moderate Opportunity';
  reasoning = 'Some competition exists, but market validation is positive';
  nextSteps = [
    '1. Deep dive into competitor weaknesses',
    '2. Define unique value proposition',
    '3. Survey 20 target users about pain points',
    '4. Consider niche angle (e.g., "for designers" or "for coaches")'
  ];
} else {
  verdict = '🔴 Proceed with Caution';
  reasoning = 'Competitive market, differentiation critical';
  nextSteps = [
    '1. Extensive competitor analysis',
    '2. Find underserved niche',
    '3. Validate demand before building',
    '4. Consider pivoting the approach'
  ];
}

console.log('\n\n' + '='.repeat(60));
console.log('\n🎯 RECOMMENDATION\n');
console.log(`   Verdict: ${verdict}`);
console.log(`   Reasoning: ${reasoning}\n`);
console.log('   📋 Next Steps:');
nextSteps.forEach(step => console.log(`      ${step}`));

console.log('\n' + '='.repeat(60));
console.log('\n💡 Market Opportunities Identified:\n');
console.log('   ✅ Weak-Competition - Few established players, room for innovation');
console.log('   ✅ Growth-Trend - Market showing positive signals (automation demand)\n');

console.log('='.repeat(60));
console.log('\n✨ This is what TooLoo.ai V2 will do automatically for EVERY idea.\n');
console.log('Next: Visual UI where you drag-drop blocks and see this analysis live.\n');
