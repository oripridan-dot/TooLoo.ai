import { useState } from 'react';

export default function IdeaRefinery({ idea, onApplyRefinement }) {
  const [refinement, setRefinement] = useState(null);
  const [isRefining, setIsRefining] = useState(false);
  const [selectedRefinements, setSelectedRefinements] = useState({});

  const handleRefine = async () => {
    if (!idea) return;
    
    setIsRefining(true);
    
    try {
      // Determine API URL
      let apiUrl;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        apiUrl = 'http://localhost:3001/api/refine';
      } else {
        const baseUrl = window.location.origin.replace(/-\d{4}\.app\.github\.dev/, '-3001.app.github.dev');
        apiUrl = `${baseUrl}/api/refine`;
      }

      console.log('✨ Calling Refinery:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idea })
      });

      if (!response.ok) {
        throw new Error(`Refinery error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRefinement(data.refinement);
        // Auto-select all high-impact refinements
        const autoSelected = {};
        if (data.refinement.refinements.problem.impact === 'high') autoSelected.problem = true;
        if (data.refinement.refinements.solution.impact === 'high') autoSelected.solution = true;
        if (data.refinement.refinements.target.impact === 'high') autoSelected.target = true;
        setSelectedRefinements(autoSelected);
      }
    } catch (error) {
      console.error('Refinement failed:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = () => {
    const refinedIdea = { ...idea };
    
    if (selectedRefinements.problem) {
      refinedIdea.problem = refinement.refinements.problem.refined;
    }
    if (selectedRefinements.solution) {
      refinedIdea.solution = refinement.refinements.solution.refined;
    }
    if (selectedRefinements.target) {
      refinedIdea.target = refinement.refinements.target.refined;
    }
    
    onApplyRefinement(refinedIdea);
    setRefinement(null);
    setSelectedRefinements({});
  };

  const toggleRefinement = (key) => {
    setSelectedRefinements(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getImpactColor = (impact) => {
    if (impact === 'high') return 'text-green-600 bg-green-50 border-green-200';
    if (impact === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="text-2xl mr-2">✨</span>
          AI Idea Refinery
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Get AI-powered suggestions to improve your idea's market potential
        </p>
      </div>

      {!refinement ? (
        <button
          onClick={handleRefine}
          disabled={!idea || isRefining}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            idea && !isRefining
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isRefining ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI is refining your idea...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">🔮</span>
              Refine with AI
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Improvement Score */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-purple-900">Refinement Score</div>
                <div className="text-xs text-purple-700 mt-1">Potential improvement impact</div>
              </div>
              <div className="text-4xl font-bold text-purple-600">
                {refinement.score}/100
              </div>
            </div>
          </div>

          {/* Problem Refinement */}
          <div className={`rounded-lg p-4 border-2 ${selectedRefinements.problem ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRefinements.problem || false}
                  onChange={() => toggleRefinement('problem')}
                  className="w-5 h-5 text-purple-600 rounded mr-3"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    🔥 Problem Clarity
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${getImpactColor(refinement.refinements.problem.impact)}`}>
                      {refinement.refinements.problem.impact} impact
                    </span>
                  </h3>
                </div>
              </div>
            </div>
            <div className="ml-8">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Original:</strong> {refinement.original.problem}
              </div>
              <div className="text-sm text-gray-900 font-medium mb-2">
                <strong>Refined:</strong> {refinement.refinements.problem.refined}
              </div>
              <div className="text-xs text-gray-600 italic">
                💡 {refinement.refinements.problem.reason}
              </div>
            </div>
          </div>

          {/* Solution Refinement */}
          <div className={`rounded-lg p-4 border-2 ${selectedRefinements.solution ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRefinements.solution || false}
                  onChange={() => toggleRefinement('solution')}
                  className="w-5 h-5 text-purple-600 rounded mr-3"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    ✨ Solution Specificity
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${getImpactColor(refinement.refinements.solution.impact)}`}>
                      {refinement.refinements.solution.impact} impact
                    </span>
                  </h3>
                </div>
              </div>
            </div>
            <div className="ml-8">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Original:</strong> {refinement.original.solution}
              </div>
              <div className="text-sm text-gray-900 font-medium mb-2">
                <strong>Refined:</strong> {refinement.refinements.solution.refined}
              </div>
              <div className="text-xs text-gray-600 italic">
                💡 {refinement.refinements.solution.reason}
              </div>
            </div>
          </div>

          {/* Target Market Refinement */}
          <div className={`rounded-lg p-4 border-2 ${selectedRefinements.target ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRefinements.target || false}
                  onChange={() => toggleRefinement('target')}
                  className="w-5 h-5 text-purple-600 rounded mr-3"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    🎯 Target Market
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${getImpactColor(refinement.refinements.target.impact)}`}>
                      {refinement.refinements.target.impact} impact
                    </span>
                  </h3>
                </div>
              </div>
            </div>
            <div className="ml-8">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Original:</strong> {refinement.original.target}
              </div>
              <div className="text-sm text-gray-900 font-medium mb-2">
                <strong>Refined:</strong> {refinement.refinements.target.refined}
              </div>
              <div className="text-xs text-gray-600 italic">
                💡 {refinement.refinements.target.reason}
              </div>
            </div>
          </div>

          {/* Revenue Model */}
          <div className="rounded-lg p-4 border-2 border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3 className="font-semibold text-gray-900 mb-3">💰 Revenue Model</h3>
            <div className="text-sm text-gray-900 font-medium mb-2">
              {refinement.refinements.revenue.model}
            </div>
            <div className="text-xs text-gray-600 italic mb-2">
              💡 {refinement.refinements.revenue.reasoning}
            </div>
            <div className="text-sm font-semibold text-green-700">
              Potential: {refinement.refinements.revenue.potential}
            </div>
          </div>

          {/* Alternative Markets */}
          {refinement.refinements.alternativeMarkets && refinement.refinements.alternativeMarkets.length > 0 && (
            <div className="rounded-lg p-4 border-2 border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">🌍 Alternative Markets</h3>
              <div className="space-y-3">
                {refinement.refinements.alternativeMarkets.map((market, idx) => (
                  <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                    <div className="font-medium text-gray-900">{market.market}</div>
                    <div className="text-sm text-gray-600 mt-1">{market.opportunity}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Competition: <span className={`font-semibold ${
                        market.competition === 'low' ? 'text-green-600' :
                        market.competition === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>{market.competition}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleApply}
              disabled={Object.keys(selectedRefinements).length === 0}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all ${
                Object.keys(selectedRefinements).length > 0
                  ? 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Apply Selected ({Object.keys(selectedRefinements).filter(k => selectedRefinements[k]).length})
            </button>
            <button
              onClick={() => setRefinement(null)}
              className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
