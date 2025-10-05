export default function MarketInsights({ analysis, isLoading }) {
  if (isLoading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔍</div>
          <p className="text-lg font-semibold text-gray-700">Analyzing Market...</p>
          <p className="text-sm text-gray-500 mt-2">
            Checking Product Hunt, Reddit, and market trends
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg font-semibold">Market Insights</p>
          <p className="text-sm mt-2">
            Fill out the Idea Canvas and click "Analyze" to see market intelligence
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-success-100 border-success-300';
    if (score >= 60) return 'bg-warning-100 border-warning-300';
    return 'bg-danger-100 border-danger-300';
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Validation Score Card */}
      <div className={`card border-2 ${getScoreBg(analysis.validationScore)}`}>
        <div className="text-center">
          <div className={`text-6xl font-bold ${getScoreColor(analysis.validationScore)}`}>
            {analysis.validationScore}
            <span className="text-2xl">/100</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mt-2">
            {analysis.verdict}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Market Validation Score
          </p>
        </div>
      </div>

      {/* Competition Analysis */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">🏢</span>
          Competition Analysis
        </h3>
        
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Market Saturation</span>
            <span className={`text-sm font-semibold ${
              analysis.competition.saturation === 'low' ? 'text-success-600' :
              analysis.competition.saturation === 'medium' ? 'text-warning-600' :
              'text-danger-600'
            }`}>
              {analysis.competition.saturation.toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {analysis.competition.count} competitors found
          </div>
        </div>

        <div className="space-y-2">
          {analysis.competition.topCompetitors.map((comp, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{comp.name}</div>
                  <div className="text-xs text-gray-500">{comp.votes} votes on Product Hunt</div>
                </div>
                <div className="text-sm font-semibold text-primary-600">
                  {comp.pricing}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">📈</span>
          Market Trends
        </h3>
        
        <div className="mb-3 text-sm text-gray-600">
          {analysis.trends.discussions} relevant Reddit discussions found
        </div>

        <div className="space-y-2">
          {analysis.trends.themes.map((theme, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 capitalize">{theme.name}</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${(theme.mentions / 40) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{theme.mentions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">💡</span>
          Opportunities
        </h3>
        
        <div className="space-y-2">
          {analysis.opportunities.map((opp, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <div>
                <div className="font-medium text-gray-900 text-sm capitalize">
                  {opp.type.replace('-', ' ')}
                </div>
                <div className="text-xs text-gray-600">{opp.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="card bg-primary-50 border-primary-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">🎯</span>
          Recommended Next Steps
        </h3>
        
        <ol className="space-y-2">
          {analysis.nextSteps.map((step, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <span className="text-sm text-gray-700 mt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
