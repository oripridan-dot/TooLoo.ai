// @version 2.2.391
import { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  BookOpen,
  FileText,
  Target,
  Zap,
  Wrench,
  Globe,
  Search,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

function SelfImprovementDashboard() {
  const [learningReport, setLearningReport] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [decisions, setDecisions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toolStatus, setToolStatus] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoAnalyze: false,
    analyzeInterval: 3600, // 1 hour in seconds
    enableNotifications: true,
  });
  const [dataValidation, setDataValidation] = useState({
    learningReportValid: false,
    patternsValid: false,
    decisionsValid: false,
    lastRefresh: null,
  });

  // Synapsys Learner State
  const [ingestUrl, setIngestUrl] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryAnswer, setQueryAnswer] = useState(null);
  const [learnerStatus, setLearnerStatus] = useState(null);
  const [knowledgeSources, setKnowledgeSources] = useState([]);

  useEffect(() => {
    fetchAllData();
    // Refresh more frequently for real-time feel
    const interval = setInterval(fetchAllData, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    const validation = {
      learningReportValid: false,
      patternsValid: false,
      decisionsValid: false,
      lastRefresh: new Date().toISOString(),
    };

    try {
      // Fetch learning metrics
      const learningRes = await fetch('/api/v1/learning/report');
      const learningData = await learningRes.json();

      // Validate learning report data
      if (learningData.data && typeof learningData.data.totalSessions === 'number') {
        setLearningReport(learningData.data);
        validation.learningReportValid = true;
      } else {
        console.warn('[SelfImprovement] Invalid learning report data:', learningData);
        setLearningReport({
          totalSessions: 0,
          successfulGenerations: 0,
          failedGenerations: 0,
          improvements: {},
        });
      }

      // Fetch pattern catalog
      const patternsRes = await fetch('/api/v1/learning/patterns');
      const patternsData = await patternsRes.json();

      if (patternsData.data?.patterns && Array.isArray(patternsData.data.patterns)) {
        setPatterns(patternsData.data.patterns);
        validation.patternsValid = true;
      } else {
        console.warn('[SelfImprovement] Invalid patterns data:', patternsData);
        setPatterns([]);
      }

      // Fetch decisions report
      const decisionsRes = await fetch('/api/v1/learning/decisions');
      const decisionsData = await decisionsRes.json();

      if (decisionsData.data && typeof decisionsData.data.totalDecisions === 'number') {
        setDecisions(decisionsData.data);
        validation.decisionsValid = true;
      } else {
        console.warn('[SelfImprovement] Invalid decisions data:', decisionsData);
        setDecisions({ totalDecisions: 0, decisionsWithOutcomes: 0, recentDecisions: [] });
      }

      // Fetch knowledge sources
      const sourcesRes = await fetch('/api/v1/learning/sources');
      const sourcesData = await sourcesRes.json();
      if (sourcesData.success) {
        // Sources are objects with {id, url, content, timestamp, metadata}
        // Extract just the URLs for display, or keep full objects
        const sources = sourcesData.sources || [];
        setKnowledgeSources(sources);
      }

      setDataValidation(validation);
      setIsLoading(false);
    } catch (error) {
      console.error('[SelfImprovement] Failed to fetch data:', error);
      setDataValidation({ ...validation, lastRefresh: new Date().toISOString() });
      setIsLoading(false);
    }
  };

  const runTool = async (toolName) => {
    setToolStatus(`Running ${toolName}...`);
    try {
      let endpoint = '';
      if (toolName === 'Deep Analysis') endpoint = '/api/v1/learning/analyze';
      else if (toolName === 'Pattern Consolidation') endpoint = '/api/v1/learning/consolidate';
      else if (toolName === 'Memory Optimization') endpoint = '/api/v1/learning/optimize-memory';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        setToolStatus(`${toolName} completed successfully!`);
        if (data.findings) {
          setAnalysisResults(data.findings);
        }
        // Refresh data after tool completes
        setTimeout(() => {
          fetchAllData();
          setToolStatus(null);
        }, 2000);
      } else {
        setToolStatus(`Error: ${data.error}`);
        setTimeout(() => setToolStatus(null), 3000);
      }
    } catch (e) {
      setToolStatus(`Error running ${toolName}.`);
      setTimeout(() => setToolStatus(null), 3000);
    }
  };

  const handleIngest = async () => {
    if (!ingestUrl) return;
    setLearnerStatus('Ingesting...');
    try {
      const res = await fetch('/api/v1/learning/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ingestUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setLearnerStatus('Ingestion successful!');
        setIngestUrl('');
      } else {
        setLearnerStatus(`Error: ${data.error}`);
      }
    } catch (e) {
      setLearnerStatus('Network error during ingestion.');
    }
    setTimeout(() => setLearnerStatus(null), 3000);
  };

  const handleQuery = async () => {
    if (!queryText) return;
    setLearnerStatus('Thinking...');
    setQueryAnswer(null);
    try {
      const res = await fetch('/api/v1/learning/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });
      const data = await res.json();
      if (data.success) {
        setLearnerStatus(null);
        // Extract just the answer part if possible, or show full output
        const answerParts = data.answer.split('🤖 Synapsys Answer:');
        const cleanAnswer =
          answerParts.length > 1 ? answerParts[1].replace(/-+/, '').trim() : data.answer;
        setQueryAnswer(cleanAnswer);
      } else {
        setLearnerStatus(`Error: ${data.error}`);
      }
    } catch (e) {
      setLearnerStatus('Network error during query.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const improvements = learningReport?.improvements || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Self-Improvement Dashboard</h2>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              TooLoo's learning journey towards Meta-AI
              {dataValidation.lastRefresh && (
                <span className="text-xs text-gray-400">
                  • Last refresh: {new Date(dataValidation.lastRefresh).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Data Validation Indicators */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg">
            {dataValidation.learningReportValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-gray-600">Reports</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg">
            {dataValidation.patternsValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-gray-600">Patterns</span>
          </div>
          <button
            onClick={fetchAllData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh all data"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          {toolStatus && (
            <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium animate-pulse">
              {toolStatus}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Dashboard Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100">
              <div>
                <div className="text-sm font-medium text-gray-800">Auto-Analyze</div>
                <div className="text-xs text-gray-500">Automatically run analysis periodically</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoAnalyze}
                  onChange={(e) => setSettings({ ...settings, autoAnalyze: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100">
              <div>
                <div className="text-sm font-medium text-gray-800">Notifications</div>
                <div className="text-xs text-gray-500">Show notifications for completed tasks</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) =>
                    setSettings({ ...settings, enableNotifications: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 col-span-full">
              <div>
                <div className="text-sm font-medium text-gray-800">Analysis Interval</div>
                <div className="text-xs text-gray-500">
                  How often to run auto-analysis (in minutes)
                </div>
              </div>
              <select
                value={settings.analyzeInterval / 60}
                onChange={(e) =>
                  setSettings({ ...settings, analyzeInterval: parseInt(e.target.value) * 60 })
                }
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Data Quality Warning */}
      {(!dataValidation.learningReportValid ||
        !dataValidation.patternsValid ||
        !dataValidation.decisionsValid) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800">Data Quality Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Some data sources returned invalid or incomplete information. The dashboard is showing
              fallback data where necessary.
              {!dataValidation.learningReportValid && ' Learning reports may be incomplete.'}
              {!dataValidation.patternsValid && ' Pattern library may be unavailable.'}
              {!dataValidation.decisionsValid && ' Decision history may be limited.'}
            </p>
            <button
              onClick={fetchAllData}
              className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
            >
              Try refreshing the data
            </button>
          </div>
        </div>
      )}

      {/* Tools Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Wrench className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Improvement Tools</h3>
        </div>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => runTool('Deep Analysis')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            Run Deep Analysis
          </button>
          <button
            onClick={() => runTool('Pattern Consolidation')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            Consolidate Patterns
          </button>
          <button
            onClick={() => runTool('Memory Optimization')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            Optimize Memory
          </button>
        </div>

        {/* Analysis Results */}
        {analysisResults && (
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-bold text-indigo-800 mb-3 uppercase tracking-wider">
              Analysis Findings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded border border-indigo-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase">System Status</h4>
                <div className="flex items-center mt-1">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${analysisResults.qaReport?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}
                  ></div>
                  <p className="text-xl font-bold text-gray-800 capitalize">
                    {analysisResults.qaReport?.status || 'Unknown'}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {analysisResults.qaReport?.issues || 0} issues detected
                </p>
              </div>
              <div className="bg-white p-4 rounded border border-indigo-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Recommendations</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                  {analysisResults.recommendations?.length > 0 ? (
                    analysisResults.recommendations.map((rec, i) => <li key={i}>{rec}</li>)
                  ) : (
                    <li className="text-gray-400 italic">No immediate recommendations.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Semantic Learning Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Semantic Learning (Web Knowledge)
            </h3>
          </div>
          {learnerStatus && (
            <span className="text-sm text-blue-600 animate-pulse">{learnerStatus}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ingestion */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Ingest Knowledge</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={ingestUrl}
                onChange={(e) => setIngestUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleIngest}
                disabled={!ingestUrl || learnerStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                Learn
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Scrapes the URL and adds it to the vector knowledge base.
            </p>
          </div>

          {/* Query */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Query Knowledge Base</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="What did you learn about X?"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={handleQuery}
                disabled={!queryText || learnerStatus}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Answer Display */}
        {queryAnswer && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Synapsys Answer:</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{queryAnswer}</p>
          </div>
        )}

        {/* Knowledge Sources List */}
        {knowledgeSources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Ingested Knowledge Sources ({knowledgeSources.length})
            </h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto p-2">
              <ul className="space-y-1">
                {knowledgeSources.map((source, idx) => {
                  // Handle both string and object sources
                  const sourceUrl = typeof source === 'string' ? source : source?.url || 'Unknown';
                  const sourceId = typeof source === 'string' ? idx : source?.id || idx;
                  return (
                    <li key={sourceId} className="text-xs text-gray-600 flex items-center">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline truncate"
                      >
                        {sourceUrl}
                      </a>
                      {typeof source === 'object' && source?.timestamp && (
                        <span className="ml-2 text-gray-400">
                          {new Date(source.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* First-Try Success Rate */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <span
              className={`text-xs px-2 py-1 rounded ${
                improvements.firstTrySuccess?.achieved
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-white'
              }`}
            >
              {improvements.firstTrySuccess?.achieved ? 'Target Met!' : 'In Progress'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">First-Try Success</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-green-700">
              {(improvements.firstTrySuccess?.current * 100 || 0).toFixed(0)}%
            </span>
            <span className="text-sm text-gray-600">
              / {(improvements.firstTrySuccess?.target * 100).toFixed(0)}% target
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(improvements.firstTrySuccess?.current / improvements.firstTrySuccess?.target) * 100 || 0}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Baseline: {(improvements.firstTrySuccess?.baseline * 100).toFixed(0)}%
          </p>
        </div>

        {/* Repeat Problems */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span
              className={`text-xs px-2 py-1 rounded ${
                improvements.repeatProblems?.achieved
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-white'
              }`}
            >
              {improvements.repeatProblems?.achieved ? 'Target Met!' : 'In Progress'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Repeat Problems</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-blue-700">
              {improvements.repeatProblems?.current !== undefined
                ? (improvements.repeatProblems.current * 100).toFixed(0)
                : '0'}
              %
            </span>
            <span className="text-sm text-gray-600">
              /{' '}
              {improvements.repeatProblems?.target !== undefined
                ? (improvements.repeatProblems.target * 100).toFixed(0)
                : '5'}
              % target
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(0, 100 - (improvements.repeatProblems?.current / improvements.repeatProblems?.baseline) * 100 || 0)}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Baseline:{' '}
            {improvements.repeatProblems?.baseline !== undefined
              ? (improvements.repeatProblems.baseline * 100).toFixed(0)
              : '25'}
            %
          </p>
        </div>

        {/* Total Activity */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Activity</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sessions</span>
              <span className="text-lg font-bold text-purple-700">
                {learningReport?.totalSessions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Successes</span>
              <span className="text-lg font-bold text-green-600">
                {learningReport?.successfulGenerations || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Failures</span>
              <span className="text-lg font-bold text-red-600">
                {learningReport?.failedGenerations || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Patterns & Decisions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pattern Library */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">Pattern Library</h3>
          </div>
          {patterns.length === 0 ? (
            <p className="text-sm text-gray-600">
              No patterns discovered yet. As TooLoo works on projects, it will automatically extract
              reusable patterns.
            </p>
          ) : (
            <div className="space-y-2">
              {patterns.slice(0, 5).map((pattern, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-800">{pattern.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{pattern.category}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                      {pattern.usageCount || 0} uses
                    </span>
                  </div>
                </div>
              ))}
              {patterns.length > 5 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  +{patterns.length - 5} more patterns
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-800">Architecture Decisions</h3>
          </div>
          {!decisions || decisions.totalDecisions === 0 ? (
            <p className="text-sm text-gray-600">
              No architectural decisions logged yet. TooLoo will record key decisions as it builds
              features.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Total Decisions</span>
                <span className="text-lg font-bold text-gray-800">{decisions.totalDecisions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Outcomes Tracked</span>
                <span className="text-lg font-bold text-green-600">
                  {decisions.decisionsWithOutcomes || 0}
                </span>
              </div>
              {decisions.recentDecisions && decisions.recentDecisions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {decisions.recentDecisions.slice(0, 3).map((decision, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800">{decision.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {decision.context?.substring(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Common Failures Section */}
      {learningReport?.commonFailures && learningReport.commonFailures.length > 0 && (
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold text-red-800 mb-3">Areas for Improvement</h3>
          <div className="space-y-2">
            {learningReport.commonFailures.slice(0, 3).map((failure, idx) => (
              <div key={idx} className="p-3 bg-white rounded border border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-800">{failure.task}</h4>
                    <p className="text-xs text-gray-600 mt-1">{failure.error}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                    {failure.count}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelfImprovementDashboard;
