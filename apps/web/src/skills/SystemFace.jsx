/**
 * @file SystemFace - UI component for the System skill
 * @description The "Face" of the System skill - renders system info
 * @version 2.0.0
 */

import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface SystemFaceProps {
  data: {
    status?: string;
    version?: string;
    uptime?: number;
    skills?: { id: string; name: string; status: string }[];
    memory?: { used: number; total: number };
    providers?: { name: string; available: boolean }[];
  };
  emit?: (intent: string, payload?: unknown) => void;
  layout?: {
    position?: string;
    size?: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SystemFace({ data, emit, layout }: SystemFaceProps) {
  const status = data?.status ?? 'unknown';
  const isHealthy = status === 'healthy' || status === 'online';

  return (
    <div className="system-face p-6 bg-gray-900/50 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          <h2 className="text-xl font-bold text-white">System Status</h2>
        </div>
        <span className="text-sm text-gray-500">v{data?.version ?? '?.?.?'}</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Status Card */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
          <div className={`text-lg font-semibold ${isHealthy ? 'text-green-400' : 'text-yellow-400'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {/* Uptime Card */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Uptime</div>
          <div className="text-lg font-semibold text-white">
            {data?.uptime ? formatUptime(data.uptime) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Memory */}
      {data?.memory && (
        <div className="mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Memory Usage</div>
          <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
              style={{ width: `${(data.memory.used / data.memory.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatBytes(data.memory.used)}</span>
            <span>{formatBytes(data.memory.total)}</span>
          </div>
        </div>
      )}

      {/* Skills */}
      {data?.skills && data.skills.length > 0 && (
        <div className="mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Active Skills ({data.skills.length})
          </div>
          <div className="space-y-2">
            {data.skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-gray-300">{skill.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  skill.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-700 text-gray-500'
                }`}>
                  {skill.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Providers */}
      {data?.providers && data.providers.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            AI Providers
          </div>
          <div className="flex flex-wrap gap-2">
            {data.providers.map((provider) => (
              <span
                key={provider.name}
                className={`text-xs px-2 py-1 rounded-full ${
                  provider.available
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-500'
                }`}
              >
                {provider.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={() => emit?.('/system status')}
          className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          Refresh
        </button>
        <button
          onClick={() => emit?.('/system restart')}
          className="flex-1 px-4 py-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors text-sm"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
