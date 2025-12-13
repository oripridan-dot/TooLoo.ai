/**
 * AdminDashboard.jsx
 * Admin dashboard for skill management and system monitoring
 * 
 * @version 2.0.0-alpha.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { getApiBaseUrl } from '../utils/api.js';

const API_BASE = getApiBaseUrl();

// Skill card component
function SkillCard({ skill, onToggle, isExpanded, onExpand }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-gray-800 rounded-lg border ${
        isExpanded ? 'border-blue-500' : 'border-gray-700'
      } overflow-hidden`}
    >
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={onExpand}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${skill.enabled !== false ? 'bg-green-500' : 'bg-gray-500'}`} />
          <div>
            <h3 className="font-medium text-white">{skill.name}</h3>
            <p className="text-sm text-gray-400">{skill.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
            v{skill.version}
          </span>
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                <p className="text-sm text-gray-300">{skill.description}</p>
              </div>

              {/* Triggers */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Triggers</h4>
                <div className="flex flex-wrap gap-2">
                  {skill.triggers?.intents?.map((intent) => (
                    <span
                      key={intent}
                      className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300 border border-blue-700"
                    >
                      {intent}
                    </span>
                  ))}
                  {skill.triggers?.keywords?.slice(0, 5).map((keyword) => (
                    <span
                      key={keyword}
                      className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 border border-purple-700"
                    >
                      {keyword}
                    </span>
                  ))}
                  {skill.triggers?.keywords?.length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{skill.triggers.keywords.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Context Config */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1">Max Tokens</h4>
                  <p className="text-sm text-white">{skill.context?.maxTokens || 4096}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1">Memory Scope</h4>
                  <p className="text-sm text-white">{skill.context?.memoryScope || 'session'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1">Priority</h4>
                  <p className="text-sm text-white">{skill.composability?.priority || 0}</p>
                </div>
              </div>

              {/* Model Requirements */}
              {skill.modelRequirements && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Model Requirements</h4>
                  <div className="flex flex-wrap gap-2">
                    {skill.modelRequirements.preferredProviders?.map((provider) => (
                      <span
                        key={provider}
                        className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300 border border-green-700"
                      >
                        {provider}
                      </span>
                    ))}
                    {skill.modelRequirements.temperature && (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-700">
                        temp: {skill.modelRequirements.temperature}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// System metrics component
function SystemMetrics({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400 mb-1">Uptime</div>
        <div className="text-2xl font-bold text-white">
          {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400 mb-1">Memory</div>
        <div className="text-2xl font-bold text-white">
          {metrics.memory?.used || 0} MB
        </div>
        <div className="text-xs text-gray-500">{metrics.memory?.percentage || 0}% used</div>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400 mb-1">Skills Loaded</div>
        <div className="text-2xl font-bold text-white">
          {metrics.skills?.loaded || 0}
        </div>
        <div className="text-xs text-gray-500">{metrics.skills?.enabled || 0} enabled</div>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-sm text-gray-400 mb-1">Version</div>
        <div className="text-2xl font-bold text-white">
          {metrics.version || 'N/A'}
        </div>
        <div className="text-xs text-gray-500">{metrics.environment || 'development'}</div>
      </div>
    </div>
  );
}

// Provider status component
function ProviderStatus({ providers }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">AI Providers</h2>
      <div className="space-y-3">
        {providers.length === 0 ? (
          <p className="text-gray-500 text-sm">No providers configured</p>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 bg-gray-900 rounded"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    provider.status === 'available'
                      ? 'bg-green-500'
                      : provider.status === 'degraded'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-white font-medium">{provider.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    provider.circuitState === 'closed'
                      ? 'bg-green-900/50 text-green-300'
                      : provider.circuitState === 'half-open'
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  {provider.circuitState}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main AdminDashboard component
export default function AdminDashboard() {
  const [skills, setSkills] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [providers, setProviders] = useState([]);
  const [expandedSkill, setExpandedSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch skills
  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/skills`);
      const data = await response.json();
      if (data.ok) {
        setSkills(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  }, []);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      if (data.ok && data.data) {
        setSystemMetrics({
          version: data.data.version,
          uptime: data.data.uptime,
          environment: 'development',
          memory: { used: 0, percentage: 0 },
          skills: { loaded: skills.length, enabled: skills.length },
        });
      }
    } catch (err) {
      console.error('Failed to fetch system status:', err);
    }
  }, [skills.length]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSkills(), fetchSystemStatus()]);
        setError(null);
      } catch (err) {
        setError('Failed to connect to API server');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchSkills, fetchSystemStatus]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSkills();
      fetchSystemStatus();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchSkills, fetchSystemStatus]);

  // Manual refresh
  const handleRefresh = () => {
    fetchSkills();
    fetchSystemStatus();
    setLastRefresh(new Date());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">
              TooLoo.ai V2 System Management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={systemMetrics} />

        {/* Providers */}
        <ProviderStatus providers={providers} />

        {/* Skills List */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Skills ({skills.length})
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search skills..."
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isExpanded={expandedSkill === skill.id}
                  onExpand={() =>
                    setExpandedSkill(expandedSkill === skill.id ? null : skill.id)
                  }
                />
              ))}
            </AnimatePresence>

            {skills.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No skills loaded</p>
                <p className="text-sm text-gray-600 mt-1">
                  Add YAML files to the skills/ directory
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hot Reloader Status */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-400">
              Hot reloader active - watching skills/ directory for changes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
