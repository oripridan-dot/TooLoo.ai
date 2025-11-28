// @version 2.2.45
import React, { useState, useEffect } from 'react';
import { Activity, Brain, Database, Cpu } from 'lucide-react';

const NeuralState = ({ socket, sessionId }) => {
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [memory, setMemory] = useState({ short: '', long: '' });
  const [activeTab, setActiveTab] = useState('short');
  const [insights, setInsights] = useState({ provider: '-', quality: '-' });

  // Initial Fetch
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/v1/providers/status');
        const data = await res.json();
        if (data.ok) {
          setProviders(data.data.providers);
          // Set active provider if one is busy/processing, otherwise default
          const active = data.data.providers.find(p => p.status === 'Busy') || 
                         data.data.providers.find(p => p.id === 'gemini');
          setActiveProvider(active?.id);
        }
      } catch (e) {
        console.error("Failed to fetch provider status", e);
      }
    };

    fetchStatus();
    // Poll every 10s as backup
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleEvent = (event) => {
      // Filter by session if provided
      if (sessionId && event.payload?.sessionId && event.payload.sessionId !== sessionId) {
        return;
      }

      if (event.type === 'precog:telemetry') {
        const { provider, status, latency } = event.payload;
        
        setProviders(prev => prev.map(p => {
          if (p.id.includes(provider)) {
            return { ...p, status: status === 'success' ? 'Ready' : 'Error', latency };
          }
          return p;
        }));

        if (status === 'processing') {
          setActiveProvider(provider);
          setInsights(prev => ({ ...prev, provider: provider }));
        }
      }
    };

    socket.on('synapsys:event', handleEvent);
    return () => socket.off('synapsys:event', handleEvent);
  }, [socket, sessionId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ready': return 'bg-emerald-500';
      case 'Busy': return 'bg-cyan-500';
      case 'Error': return 'bg-red-500';
      default: return 'bg-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Ready': return 'text-emerald-500';
      case 'Busy': return 'text-cyan-400 animate-pulse';
      case 'Error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <aside className="w-72 border-l border-white/10 bg-gray-900/30 hidden xl:flex flex-col h-full">
      {/* Neural State Section */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-3 h-3" /> Neural State
        </h2>

        <div className="space-y-4">
          {providers.map(p => (
            <div key={p.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={`font-medium ${activeProvider === p.id ? 'text-white' : 'text-gray-400'}`}>
                  {p.name}
                </span>
                <span className={getStatusText(p.status)}>{p.status}</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getStatusColor(p.status)}`}
                  style={{ width: p.status === 'Busy' ? '100%' : p.status === 'Ready' ? '5%' : '0%' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Context Memory Section */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Brain className="w-3 h-3" /> Context Memory
        </h2>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('short')}
            className={`flex-1 py-1 text-xs rounded border transition-colors ${
              activeTab === 'short' 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
                : 'bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700'
            }`}
          >
            Short-Term
          </button>
          <button
            onClick={() => setActiveTab('long')}
            className={`flex-1 py-1 text-xs rounded border transition-colors ${
              activeTab === 'long' 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
                : 'bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700'
            }`}
          >
            Long-Term
          </button>
        </div>

        <textarea
          value={memory[activeTab]}
          onChange={(e) => setMemory({ ...memory, [activeTab]: e.target.value })}
          className="w-full h-32 bg-gray-950/50 border border-white/10 rounded p-2 text-xs text-gray-400 font-mono resize-none focus:outline-none focus:border-cyan-500/30 mb-2"
          placeholder={`${activeTab === 'short' ? 'Short' : 'Long'}-term context...`}
        />

        <button className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-white/10 transition flex items-center justify-center gap-2">
          <Database className="w-3 h-3" /> Save Memory
        </button>

        {/* Insights Section */}
        <div className="mt-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Cpu className="w-3 h-3" /> Insights
          </h2>
          <div className="space-y-2">
            <div className="bg-gray-900/50 border border-white/5 p-3 rounded text-xs text-gray-400">
              <span className="block text-cyan-400 mb-1 font-bold">Active Provider</span>
              <span>{insights.provider}</span>
            </div>
            <div className="bg-gray-900/50 border border-white/5 p-3 rounded text-xs text-gray-400">
              <span className="block text-cyan-400 mb-1 font-bold">Quality Score</span>
              <span>{insights.quality}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default NeuralState;
