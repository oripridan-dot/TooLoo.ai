import { useState } from 'react';

export default function ValidationPanel({ idea, onValidationComplete }) {
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    if (!idea) return;

    setIsValidating(true);
    
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      });

      const data = await response.json();
      
      if (data.validation) {
        setValidation(data.validation);
        onValidationComplete(data);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 35) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getVerdictColor = (verdict) => {
    if (verdict === 'PROCEED') return 'bg-green-100 text-green-800 border-green-300';
    if (verdict === 'PIVOT') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="text-2xl mr-2">🎯</span>
          Honest Validation
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Get brutal, honest feedback before refining
        </p>
      </div>

      {!validation ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              <strong>⚠️ Reality Check:</strong> Most ideas have fatal flaws. 
              This validation will score honestly (10-100). Bad ideas get 10-35/100.
            </p>
          </div>

          <button
            onClick={handleValidate}
            disabled={!idea || isValidating}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              idea && !isValidating
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 hover:shadow-lg'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isValidating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running honest validation...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">🔍</span>
                Validate Idea (Be Prepared for Truth!)
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className={`border-2 rounded-lg p-6 text-center ${getScoreColor(validation.overallScore)}`}>
            <div className="text-5xl font-bold mb-2">{validation.overallScore}/100</div>
            <div className="text-sm font-semibold uppercase tracking-wide">Overall Score</div>
          </div>

          {/* Verdict */}
          <div className={`border-2 rounded-lg p-4 text-center font-bold text-lg ${getVerdictColor(validation.verdict)}`}>
            {validation.verdict === 'PROCEED' && '✅ PROCEED - Idea is viable'}
            {validation.verdict === 'PIVOT' && '⚠️ PIVOT - Needs major rework'}
            {validation.verdict === 'STOP' && '🛑 STOP - Fatal flaws detected'}
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`border rounded-lg p-3 text-center ${getScoreColor(validation.viabilityScore)}`}>
              <div className="text-2xl font-bold">{validation.viabilityScore}</div>
              <div className="text-xs">Viability</div>
            </div>
            <div className={`border rounded-lg p-3 text-center ${getScoreColor(validation.marketScore)}`}>
              <div className="text-2xl font-bold">{validation.marketScore}</div>
              <div className="text-xs">Market</div>
            </div>
            <div className={`border rounded-lg p-3 text-center ${getScoreColor(validation.competitionScore)}`}>
              <div className="text-2xl font-bold">{validation.competitionScore}</div>
              <div className="text-xs">Competition</div>
            </div>
            <div className={`border rounded-lg p-3 text-center ${getScoreColor(validation.uniquenessScore)}`}>
              <div className="text-2xl font-bold">{validation.uniquenessScore}</div>
              <div className="text-xs">Uniqueness</div>
            </div>
          </div>

          {/* Critical Feedback */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">💬 Critical Feedback</h3>
            <p className="text-sm text-gray-700">{validation.criticalFeedback}</p>
          </div>

          {/* Red Flags */}
          {validation.redFlags && validation.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">🚨 Red Flags</h3>
              <ul className="space-y-2">
                {validation.redFlags.map((flag, idx) => (
                  <li key={idx} className="text-sm text-red-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strengths */}
          {validation.strengths && validation.strengths.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ Strengths</h3>
              <ul className="space-y-2">
                {validation.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {validation.recommendations && validation.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📝 Recommendations</h3>
              <ol className="space-y-2">
                {validation.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start">
                    <span className="mr-2 font-semibold">{idx + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Source */}
          <div className="text-xs text-gray-500 text-center">
            Validated by: {validation.source === 'deepseek' ? 'DeepSeek AI' : 
                          validation.source === 'claude' ? 'Claude AI' :
                          validation.source === 'openai' ? 'OpenAI GPT' :
                          'Critical Analysis Engine'}
          </div>

          {/* Revalidate Button */}
          <button
            onClick={() => {
              setValidation(null);
              handleValidate();
            }}
            className="w-full py-2 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
          >
            Re-validate Idea
          </button>
        </div>
      )}
    </div>
  );
}
