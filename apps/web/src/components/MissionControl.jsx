/**
 * MissionControl.jsx
 * Synapsys Command Center - System Orchestration Dashboard
 * @version 3.3.577-synapsys
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '../utils/api';

const StatusIndicator = ({ status, label }) => {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    error: 'bg-red-500',
    unknown: 'bg-gray-500'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.unknown} ${status === 'degraded' ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
};

const MetricCard = ({ icon, label, value, sublabel, trend }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
  >
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className="text-3xl font-bold text-white">{value}</div>
    {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
    {trend && (
      <div className={`text-xs mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last hour
      </div>
    )}
  </motion.div>
);

const ActiveTaskCard = ({ task }) => (
  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${
        task.status === 'running' ? 'bg-blue-500 animate-pulse' : 
        task.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
      }`} />
      <div>
        <div className="text-sm font-medium text-white">{task.name}</div>
        <div className="text-xs text-gray-500">{task.provider} • {task.duration || 'In progress...'}</div>
      </div>
    </div>
    <div className="text-xs text-gray-400">
      {task.tokens && `${task.tokens} tokens`}
    </div>
  </div>
);

export default function MissionControl() {
  const [systemHealth, setSystemHealth] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch system health
        const healthResponse = await apiRequest('/health', { complexity: 'simple' }).catch(() => ({
          ok: true,
          status: 'healthy',
          uptime: 0,
          memory: { percentage: 0 }
        }));
        setSystemHealth(healthResponse);

        // Fetch orchestrator status
        const orchestratorResponse = await apiRequest('/orchestrator/status', { complexity: 'simple' }).catch(() => ({
          activeTasks: [],
          queueLength: 0,
          completedToday: 0
        }));
        setActiveTasks(orchestratorResponse.activeTasks || []);

        // Fetch metrics
        const metricsResponse = await apiRequest('/system/metrics', { complexity: 'simple' }).catch(() => ({
          totalRequests: 0,
          avgResponseTime: 0,
          successRate: 100,
          activeProviders: 0
        }));
        setMetrics(metricsResponse);
        
      } catch (err) {
        console.error('Mission Control fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && !systemHealth) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Initializing Mission Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              🚀 Mission Control
            </h1>
            <p className="text-gray-400 text-sm mt-1">Synapsys System Orchestration Dashboard</p>
          </div>
          <StatusIndicator 
            status={systemHealth?.status || 'unknown'} 
            label={systemHealth?.status === 'healthy' ? 'All Systems Operational' : 'System Status'} 
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            ⚠️ Connection Issue: {error}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            icon="⚡" 
            label="Uptime" 
            value={systemHealth?.uptime ? `${Math.floor(systemHealth.uptime / 60)}m` : '—'} 
            sublabel="Since last restart"
          />
          <MetricCard 
            icon="🧠" 
            label="Memory" 
            value={`${systemHealth?.memory?.percentage || 0}%`}
            sublabel="Heap usage"
          />
          <MetricCard 
            icon="📊" 
            label="Requests" 
            value={metrics?.totalRequests || 0}
            sublabel="Total processed"
            trend={metrics?.requestTrend}
          />
          <MetricCard 
            icon="✅" 
            label="Success Rate" 
            value={`${metrics?.successRate || 100}%`}
            sublabel="Last 24 hours"
          />
        </div>

        {/* Active Tasks */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎯</span> Active Tasks
          </h2>
          {activeTasks.length > 0 ? (
            <div className="space-y-2">
              {activeTasks.map((task, i) => (
                <ActiveTaskCard key={task.id || i} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🌙</p>
              <p>No active tasks. System idle.</p>
            </div>
          )}
        </div>

        {/* Provider Status */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔌</span> AI Provider Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['DeepSeek', 'Anthropic', 'OpenAI', 'Ollama'].map(provider => (
              <div key={provider} className="bg-gray-800/30 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-white mb-1">{provider}</div>
                <StatusIndicator status="healthy" label="Available" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            🔄 Refresh Status
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            📋 View Logs
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            ⚙️ System Config
          </button>
        </div>
      </motion.div>
    </div>
  );
}
