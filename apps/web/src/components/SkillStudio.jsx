// @version 2.0.0-alpha.0 - Skill Studio for debugging skill routing
import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/api.js';

const API_BASE = getApiBaseUrl();

/**
 * SkillStudio - Debugging UI for skill resolution
 * Shows query embedding visualization, skill matching scores, and routing history
 */
export default function SkillStudio() {
  const [skills, setSkills] = useState([]);
  const [query, setQuery] = useState('');
  const [routingResult, setRoutingResult] = useState(null);
  const [routingHistory, setRoutingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available skills on mount
  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      const data = await res.json();
      if (data.ok) {
        setSkills(data.data);
      }
    } catch (err) {
      setError('Failed to fetch skills: ' + err.message);
    }
  };

  const testRouting = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          dryRun: true, // Only route, don't execute
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        const result = {
          query,
          timestamp: new Date().toISOString(),
          selectedSkill: data.data?.skill || 'default-chat',
          confidence: data.data?.confidence || 0,
          matches: data.data?.matches || [],
        };
        
        setRoutingResult(result);
        setRoutingHistory(prev => [result, ...prev].slice(0, 20));
      } else {
        setError(data.error || 'Routing failed');
      }
    } catch (err) {
      setError('Routing test failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Calculate match percentage for visualization
  const getMatchColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-400 mb-2">
          🎯 Skill Studio
        </h1>
        <p className="text-gray-400">
          Debug and visualize skill routing in the V2 orchestrator
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Input */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-purple-300">
              Test Query
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && testRouting()}
                placeholder="Enter a query to test routing (e.g., 'Write a function to sort an array')"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={testRouting}
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Routing...' : 'Test Route'}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Routing Result */}
          {routingResult && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">
                Routing Result
              </h2>
              
              <div className="space-y-4">
                {/* Selected Skill */}
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-400">Selected Skill</div>
                    <div className="text-lg font-medium text-green-400">
                      {routingResult.selectedSkill}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Confidence</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {(routingResult.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Match Scores Visualization */}
                {routingResult.matches?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400 mb-2">All Skill Matches</div>
                    {routingResult.matches.map((match, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-32 text-sm truncate">{match.skillId}</div>
                        <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getMatchColor(match.score)} transition-all`}
                            style={{ width: `${match.score * 100}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-sm text-gray-400">
                          {(match.score * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Routing History */}
          {routingHistory.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">
                Routing History
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {routingHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg text-sm"
                  >
                    <div className="flex-1 truncate mr-4 text-gray-300">
                      {item.query}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-purple-400">{item.selectedSkill}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getMatchColor(item.confidence)} text-white`}>
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Skills Panel */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-purple-300">
              Registered Skills
            </h2>
            <div className="space-y-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-4 rounded-lg border ${
                    skill.enabled
                      ? 'bg-gray-700/50 border-gray-600'
                      : 'bg-gray-800/50 border-gray-700 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{skill.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      skill.enabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {skill.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{skill.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {skill.triggers?.intents?.map((intent) => (
                      <span
                        key={intent}
                        className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs"
                      >
                        {intent}
                      </span>
                    ))}
                    {skill.triggers?.keywords?.slice(0, 5).map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-purple-300">
              Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{skills.length}</div>
                <div className="text-sm text-gray-400">Skills</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {skills.filter(s => s.enabled).length}
                </div>
                <div className="text-sm text-gray-400">Active</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  {routingHistory.length}
                </div>
                <div className="text-sm text-gray-400">Tests</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {routingHistory.length > 0
                    ? (routingHistory.reduce((acc, r) => acc + r.confidence, 0) / routingHistory.length * 100).toFixed(0)
                    : 0}%
                </div>
                <div className="text-sm text-gray-400">Avg Conf</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
