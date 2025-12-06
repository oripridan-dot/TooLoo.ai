// @version 1.0.0
import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Zap,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Lightbulb,
  Shield,
  Target,
  Sparkles,
  RefreshCw,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';

/**
 * CognitiveDashboard - Visualizes TooLoo's cognitive systems
 *
 * Displays:
 * - Meta-learning velocity and trends
 * - Agent collaboration metrics
 * - Cognitive quality assessments
 * - Emergence patterns
 * - Real-time insights
 */
function CognitiveDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cognitive/dashboard');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
      setLastRefresh(new Date());
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'accelerating':
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'decelerating':
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'accelerating':
      case 'improving':
        return 'text-green-400';
      case 'decelerating':
      case 'declining':
        return 'text-red-400';
      case 'stalled':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="ml-3 text-gray-300">Loading cognitive systems...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
          <span className="text-red-300">Error loading cognitive data: {error}</span>
        </div>
      </div>
    );
  }

  const { meta, collaboration, quality, recentInsights } = dashboardData || {};

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Brain className="w-8 h-8 text-purple-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-white">Cognitive Intelligence</h1>
            <p className="text-gray-400 text-sm">
              Meta-learning, collaboration, and quality systems
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh?.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-700 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'meta', label: 'Meta-Learning', icon: Brain },
          { id: 'collaboration', label: 'Collaboration', icon: Users },
          { id: 'quality', label: 'Quality', icon: Shield },
          { id: 'insights', label: 'Insights', icon: Lightbulb },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedTab(id)}
            className={`flex items-center px-4 py-2 rounded-t-lg transition-colors ${
              selectedTab === id
                ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Learning Velocity Card */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-purple-300">Learning Velocity</h3>
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">
                {formatPercent(meta?.velocity?.current || 0)}
              </span>
              <div className={`flex items-center ${getTrendColor(meta?.velocity?.trend)}`}>
                {getTrendIcon(meta?.velocity?.trend)}
                <span className="text-xs ml-1 capitalize">{meta?.velocity?.trend || 'stable'}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Acceleration: {(meta?.velocity?.acceleration || 0).toFixed(3)}
            </div>
          </div>

          {/* Collaboration Score Card */}
          <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-cyan-300">Collaboration</h3>
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">
                {formatPercent(collaboration?.metrics?.collaborationScore || 0)}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {collaboration?.agentCount || 0} agents • {collaboration?.metrics?.totalMessages || 0}{' '}
              messages
            </div>
          </div>

          {/* Quality Pass Rate Card */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-green-300">Quality Pass Rate</h3>
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">
                {formatPercent(quality?.passRate || 0)}
              </span>
              <div className={`flex items-center ${getTrendColor(quality?.trends?.hour?.trend)}`}>
                {getTrendIcon(quality?.trends?.hour?.trend)}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Threshold: {formatPercent(quality?.config?.defaultThreshold || 0.7)}
            </div>
          </div>

          {/* Self-Improvement Cycles Card */}
          <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-amber-300">Improvement Cycles</h3>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">
                {meta?.selfImprovementCycles || 0}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {meta?.emergencePatterns?.length || 0} emergence patterns detected
            </div>
          </div>
        </div>
      )}

      {/* Meta-Learning Tab */}
      {selectedTab === 'meta' && meta && (
        <div className="space-y-6">
          {/* Velocity Details */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-purple-400" />
              Learning Velocity Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Current</div>
                <div className="text-2xl font-bold text-white">
                  {formatPercent(meta.velocity.current)}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Trend</div>
                <div
                  className={`text-2xl font-bold capitalize ${getTrendColor(meta.velocity.trend)}`}
                >
                  {meta.velocity.trend}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Acceleration</div>
                <div className="text-2xl font-bold text-white">
                  {meta.velocity.acceleration.toFixed(4)}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Projected Plateau</div>
                <div className="text-lg font-bold text-white">
                  {meta.velocity.projectedPlateau
                    ? new Date(meta.velocity.projectedPlateau).toLocaleDateString()
                    : 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Cognitive Load */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-400" />
              Cognitive Load Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(meta.cognitiveLoad.loadDistribution).map(([system, load]) => (
                <div key={system} className="flex items-center">
                  <span className="w-24 text-sm text-gray-400 capitalize">{system}</span>
                  <div className="flex-1 mx-4 h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        load > 0.8 ? 'bg-red-500' : load > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${load * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-gray-300 text-right">
                    {formatPercent(load)}
                  </span>
                </div>
              ))}
            </div>
            {meta.cognitiveLoad.bottlenecks.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <div className="flex items-center text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Bottlenecks detected: {meta.cognitiveLoad.bottlenecks.join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Emergence Patterns */}
          {meta.emergencePatterns.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-amber-400" />
                Emergence Patterns
              </h3>
              <div className="space-y-3">
                {meta.emergencePatterns.map((pattern, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          pattern.type === 'breakthrough'
                            ? 'bg-purple-900 text-purple-300'
                            : pattern.type === 'insight'
                              ? 'bg-cyan-900 text-cyan-300'
                              : pattern.type === 'connection'
                                ? 'bg-blue-900 text-blue-300'
                                : 'bg-green-900 text-green-300'
                        }`}
                      >
                        {pattern.type}
                      </span>
                      <span
                        className={`text-xs ${
                          pattern.potentialImpact === 'transformative'
                            ? 'text-purple-400'
                            : pattern.potentialImpact === 'high'
                              ? 'text-red-400'
                              : pattern.potentialImpact === 'medium'
                                ? 'text-yellow-400'
                                : 'text-gray-400'
                        }`}
                      >
                        {pattern.potentialImpact} impact
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{pattern.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Confidence: {formatPercent(pattern.confidence)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collaboration Tab */}
      {selectedTab === 'collaboration' && collaboration && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Total Messages</div>
              <div className="text-2xl font-bold text-white">
                {collaboration.metrics.totalMessages}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Successful Collabs</div>
              <div className="text-2xl font-bold text-green-400">
                {collaboration.metrics.successfulCollaborations}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Knowledge Shares</div>
              <div className="text-2xl font-bold text-cyan-400">
                {collaboration.metrics.knowledgeShares}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Response Time</div>
              <div className="text-2xl font-bold text-white">
                {(collaboration.metrics.avgResponseTime / 1000).toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Top Contributors */}
          {collaboration.metrics.topContributors?.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-cyan-400" />
                Top Contributors
              </h3>
              <div className="space-y-2">
                {collaboration.metrics.topContributors.map((contributor, idx) => (
                  <div
                    key={contributor.agentId}
                    className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3"
                  >
                    <div className="flex items-center">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                          idx === 0
                            ? 'bg-yellow-600 text-white'
                            : idx === 1
                              ? 'bg-gray-400 text-white'
                              : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-gray-200">{contributor.agentId}</span>
                    </div>
                    <span className="text-cyan-400 font-medium">
                      {contributor.contributions} contributions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quality Tab */}
      {selectedTab === 'quality' && quality && (
        <div className="space-y-6">
          {/* Quality Trends */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Quality Trends
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(quality.trends).map(([period, trend]) => (
                <div key={period} className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 capitalize">{period}</span>
                    {getTrendIcon(trend.trend)}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatPercent(trend.avgScore)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={getTrendColor(trend.trend)}>
                      {trend.changePercent > 0 ? '+' : ''}
                      {trend.changePercent.toFixed(1)}%
                    </span>
                    <span>{trend.sampleCount} samples</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Configuration */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-400" />
              Quality Thresholds
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-400 mb-2">Lenient</div>
                <div className="text-xl font-bold text-yellow-400">
                  {formatPercent(quality.config.lenientThreshold)}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 text-center border border-green-700">
                <div className="text-sm text-gray-400 mb-2">Default</div>
                <div className="text-xl font-bold text-green-400">
                  {formatPercent(quality.config.defaultThreshold)}
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-400 mb-2">Strict</div>
                <div className="text-xl font-bold text-red-400">
                  {formatPercent(quality.config.strictThreshold)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {selectedTab === 'insights' && (
        <div className="space-y-4">
          {recentInsights?.length > 0 ? (
            recentInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`border rounded-xl p-5 ${
                  insight.type === 'warning'
                    ? 'bg-yellow-900/20 border-yellow-700'
                    : insight.type === 'achievement'
                      ? 'bg-green-900/20 border-green-700'
                      : insight.type === 'opportunity'
                        ? 'bg-cyan-900/20 border-cyan-700'
                        : 'bg-purple-900/20 border-purple-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    {insight.type === 'warning' && (
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3" />
                    )}
                    {insight.type === 'achievement' && (
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    )}
                    {insight.type === 'opportunity' && (
                      <Lightbulb className="w-5 h-5 text-cyan-400 mr-3" />
                    )}
                    {insight.type === 'optimization' && (
                      <Zap className="w-5 h-5 text-purple-400 mr-3" />
                    )}
                    <div>
                      <h4 className="text-white font-medium">{insight.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{insight.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatPercent(insight.confidence)} confidence
                  </span>
                </div>
                {insight.recommendation && (
                  <div className="mt-3 pl-8 text-sm text-gray-300 italic">
                    💡 {insight.recommendation}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent insights available</p>
              <p className="text-sm mt-2">Insights will appear as the system learns and adapts</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CognitiveDashboard;
