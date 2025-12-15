// @version 2.0.0-alpha.0
/**
 * CortexControl - Mission Control for Synapsys
 * Real-time monitoring and control of the cognitive architecture
 * 
 * @description Unified dashboard providing:
 *   - Orchestrator status and routing decisions
 *   - Provider health and performance metrics
 *   - Skill registry visualization
 *   - Memory/Event store insights
 *   - Real-time request flow visualization
 * 
 * @intent Give architects full visibility and control over the AI system
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest, getSessionContext, ComplexityLevel } from '../utils/api.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const REFRESH_INTERVAL = 5000; // 5 seconds

const STATUS_COLORS = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
  unknown: 'bg-gray-500',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * System Status Card
 */
function StatusCard({ title, icon, status, value, details, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-gray-800 rounded-xl p-4 border border-gray-700 cursor-pointer
                  hover:border-blue-500/50 transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.unknown}`} />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {details && <p className="text-sm text-gray-400">{details}</p>}
    </motion.div>
  );
}

/**
 * Provider Health Panel
 */
function ProviderHealth({ providers }) {
  if (!providers || providers.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No providers configured
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <div
          key={provider.id}
          className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              provider.healthy ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div>
              <div className="font-medium text-white">{provider.name}</div>
              <div className="text-xs text-gray-500">{provider.model}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white">{provider.latency}ms</div>
            <div className="text-xs text-gray-500">
              {provider.requestCount} requests
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Recent Routing Decisions
 */
function RoutingDecisions({ decisions }) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No routing decisions yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {decisions.map((decision, idx) => (
        <motion.div
          key={decision.id || idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="p-3 bg-gray-900 rounded-lg"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">
              {decision.skill || 'unknown'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              decision.confidence > 0.8 
                ? 'bg-green-500/20 text-green-400'
                : decision.confidence > 0.5
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {(decision.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">
            {decision.query}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{decision.provider}</span>
            <span>•</span>
            <span>{decision.latency}ms</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Skill Registry Visualization
 */
function SkillRegistry({ skills }) {
  const [filter, setFilter] = useState('');
  
  const filteredSkills = skills?.filter(s => 
    s.name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.id?.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  return (
    <div>
      <input
        type="text"
        placeholder="Search skills..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full mb-3 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                   text-white text-sm focus:outline-none focus:border-blue-500"
      />
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredSkills.map((skill) => (
          <div
            key={skill.id}
            className="p-3 bg-gray-900 rounded-lg border border-gray-800"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-white">{skill.name}</span>
              <span className={`w-2 h-2 rounded-full ${
                skill.enabled !== false ? 'bg-green-500' : 'bg-gray-500'
              }`} />
            </div>
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">
              {skill.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {skill.triggers?.intents?.slice(0, 3).map((intent) => (
                <span
                  key={intent}
                  className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded"
                >
                  {intent}
                </span>
              ))}
            </div>
          </div>
        ))}
        
        {filteredSkills.length === 0 && (
          <div className="text-gray-500 text-center py-4">
            {filter ? 'No matching skills' : 'No skills loaded'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Session Context Monitor
 */
function SessionMonitor() {
  const session = getSessionContext();
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Session ID</span>
        <span className="text-white font-mono text-xs">{session.sessionId}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Requests</span>
        <span className="text-white">{session.requestCount}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Conversation Depth</span>
        <span className="text-white">{session.conversationDepth}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Last Complexity</span>
        <span className={`text-sm px-2 py-0.5 rounded ${
          session.lastComplexity === ComplexityLevel.CRITICAL 
            ? 'bg-red-500/20 text-red-400'
            : session.lastComplexity === ComplexityLevel.HIGH
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {session.lastComplexity}
        </span>
      </div>
      {session.preferredProvider && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Preferred Provider</span>
          <span className="text-white">{session.preferredProvider}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CortexControl() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePanel, setActivePanel] = useState('overview');
  
  // System state
  const [systemStatus, setSystemStatus] = useState(null);
  const [providers, setProviders] = useState([]);
  const [skills, setSkills] = useState([]);
  const [routingDecisions, setRoutingDecisions] = useState([]);
  
  // Fetch system data
  const fetchData = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [healthRes, skillsRes] = await Promise.all([
        apiRequest('/health', { complexity: ComplexityLevel.TRIVIAL }).catch(() => null),
        apiRequest('/skills', { complexity: ComplexityLevel.TRIVIAL }).catch(() => null),
      ]);
      
      if (healthRes?.ok) {
        setSystemStatus(healthRes.data);
        setProviders(healthRes.data?.providers || []);
      }
      
      if (skillsRes?.ok) {
        setSkills(skillsRes.data || []);
      }
      
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  // Calculate derived metrics
  const healthyProviders = providers.filter(p => p.healthy).length;
  const activeSkills = skills.filter(s => s.enabled !== false).length;
  const avgLatency = providers.length > 0
    ? Math.round(providers.reduce((sum, p) => sum + (p.latency || 0), 0) / providers.length)
    : 0;
  
  // Determine overall health
  const overallHealth = healthyProviders === providers.length && providers.length > 0
    ? 'healthy'
    : healthyProviders > 0
    ? 'degraded'
    : 'unhealthy';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Cortex Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🧠</span>
            Cortex Control
          </h1>
          <p className="text-gray-400 mt-1">Synapsys Mission Control Dashboard</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            overallHealth === 'healthy' ? 'bg-green-500/20 text-green-400' :
            overallHealth === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[overallHealth]}`} />
            <span className="text-sm font-medium capitalize">{overallHealth}</span>
          </div>
          
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 
                       hover:text-white transition-colors"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-400">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatusCard
          title="Providers"
          icon="🔌"
          status={healthyProviders === providers.length ? 'healthy' : 'degraded'}
          value={`${healthyProviders}/${providers.length}`}
          details={`${avgLatency}ms avg latency`}
          onClick={() => setActivePanel('providers')}
        />
        
        <StatusCard
          title="Skills"
          icon="🎯"
          status={activeSkills > 0 ? 'healthy' : 'unhealthy'}
          value={activeSkills}
          details={`${skills.length} total loaded`}
          onClick={() => setActivePanel('skills')}
        />
        
        <StatusCard
          title="Routing"
          icon="🔀"
          status="healthy"
          value={routingDecisions.length}
          details="Recent decisions"
          onClick={() => setActivePanel('routing')}
        />
        
        <StatusCard
          title="Memory"
          icon="💾"
          status="healthy"
          value={`${systemStatus?.memory?.percentage || 0}%`}
          details={`${systemStatus?.uptime ? Math.floor(systemStatus.uptime / 60) : 0}m uptime`}
          onClick={() => setActivePanel('session')}
        />
      </div>
      
      {/* Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {activePanel === 'providers' && <><span>🔌</span> Provider Health</>}
            {activePanel === 'skills' && <><span>🎯</span> Skill Registry</>}
            {activePanel === 'routing' && <><span>🔀</span> Routing Decisions</>}
            {activePanel === 'session' && <><span>📊</span> Session Context</>}
            {activePanel === 'overview' && <><span>📊</span> Provider Health</>}
          </h2>
          
          {(activePanel === 'providers' || activePanel === 'overview') && (
            <ProviderHealth providers={providers} />
          )}
          {activePanel === 'skills' && (
            <SkillRegistry skills={skills} />
          )}
          {activePanel === 'routing' && (
            <RoutingDecisions decisions={routingDecisions} />
          )}
          {activePanel === 'session' && (
            <SessionMonitor />
          )}
        </div>
        
        {/* Right Panel - Always show Skills */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎯</span> Active Skills
          </h2>
          <SkillRegistry skills={skills} />
        </div>
      </div>
      
      {/* Session Monitor Footer */}
      <div className="mt-6 bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400">Session Context</h3>
          <SessionMonitor />
        </div>
      </div>
    </div>
  );
}

// Export sub-components for composition
export { StatusCard, ProviderHealth, RoutingDecisions, SkillRegistry, SessionMonitor };
