// @version 2.2.34
import React, { useState, useEffect } from 'react';

const ControlRoom = () => {
  const [activeTab, setActiveTab] = useState('providers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [systemData, setSystemData] = useState(null);

  const fetchProviderStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/providers/status');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      const status = json.data || json;
      
      setProviderData(status);
    } catch (e) {
      console.error("Provider fetch error:", e);
      setError(e.message);
      setProviderData({ available: [], active: null });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/system/awareness');
      const data = await res.json();
      setSystemData(data.content || data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'providers') {
      fetchProviderStatus();
    } else if (activeTab === 'system') {
      fetchSystemStatus();
    }
  }, [activeTab]);

  const handleRestart = async () => {
    if (window.confirm("Are you sure you want to restart the Synapsys Core?")) {
      try {
        await fetch('/api/v1/system/restart', { method: 'POST' });
        alert("Restart command sent.");
      } catch (e) {
        alert("Failed to send restart command.");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto h-full">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-gray-900/30 sticky top-0 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-xs text-emerald-400">CONTROL ROOM // ACTIVE</span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleRestart}
            className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 rounded text-xs font-bold transition cursor-pointer"
          >
            RESTART SYSTEM
          </button>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          {['providers', 'github', 'system'].map((tab) => (
            <button
              key={tab}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition capitalize cursor-pointer ${
                activeTab === tab
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'system' ? 'System Internals' : tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {loading && <div className="text-center text-gray-500">Loading...</div>}
          {error && <div className="text-red-400">Error: {error}</div>}

          {!loading && !error && activeTab === 'providers' && providerData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(!providerData.available || providerData.available.length === 0) ? (
                 <div className="col-span-3 text-center text-gray-500 italic p-8 border border-white/5 rounded-lg">
                    No providers detected. Check system configuration.
                 </div>
              ) : (
              providerData.available.map((p) => {
                const isOperational = p.status === "Ready" || p.status === "Operational";
                const colorClass = isOperational ? "text-emerald-400" : "text-yellow-400";
                const borderColor = p.id === providerData.active ? "border-cyan-500/50" : "border-white/10";

                return (
                  <div key={p.id} className={`bg-gray-900/70 backdrop-blur border ${borderColor} p-6 rounded-lg`}>
                    <h3 className="text-lg font-bold text-white mb-4">{p.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs">Status</span>
                      <span className={`${colorClass} text-xs font-mono uppercase`}>{p.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Latency</span>
                      <span className="text-white text-xs font-mono">{providerData.latency || "--"}ms</span>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'system' && systemData && (
            <div className="bg-gray-900/70 backdrop-blur border border-white/10 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4">System Awareness</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Version</span>
                  <span className="text-cyan-400 font-mono">{systemData.version || "Unknown"}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-gray-400">Environment</span>
                  <span className="text-white font-mono">{systemData.environment || "Production"}</span>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-300 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {(systemData.capabilities || []).map((c) => (
                      <span key={c} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300 border border-white/10">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
             <div className="text-center text-gray-500 italic">GitHub integration coming soon to React Dashboard...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlRoom;
