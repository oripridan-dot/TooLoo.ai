// @version 2.2.40
import React, { useEffect, useState } from 'react';
import { Activity, Server, Database, Share2 } from 'lucide-react';

const CortexMonitor = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/observability/knowledge-graph');
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-cyan-500">
        <Activity className="animate-spin mr-2" /> Initializing Cortex Link...
      </div>
    );
  }

  if (!data) return <div className="text-red-500">Failed to load Cortex data.</div>;

  const { providers, stats } = data;
  const providerList = providers?.providers || [];
  
  // Radial Layout Calculation
  const centerX = 200;
  const centerY = 200;
  const radius = 120;
  
  return (
    <div className="bg-[#0f1117] border border-cyan-900/30 rounded-xl p-6 shadow-[0_0_30px_rgba(0,243,255,0.05)] h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-cyan-400 font-mono text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          CORTEX_ACTIVITY_MONITOR
        </h3>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          LIVE
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <svg width="400" height="400" className="overflow-visible">
          {/* Center Node (Cortex) */}
          <circle cx={centerX} cy={centerY} r="40" fill="#050505" stroke="#00f3ff" strokeWidth="2" className="filter drop-shadow-[0_0_15px_rgba(0,243,255,0.6)]" />
          <text x={centerX} y={centerY} textAnchor="middle" dy=".3em" fill="#fff" fontSize="12" fontFamily="monospace" fontWeight="bold">CORTEX</text>
          
          {/* Provider Nodes */}
          {providerList.map((p, i) => {
            const angle = (i * 2 * Math.PI) / providerList.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            // Edge
            const edgeWidth = Math.max(1, p.successRate * 3);
            const edgeColor = p.successRate > 0.8 ? '#0aff0a' : p.successRate > 0.5 ? '#ffaa00' : '#ff003c';
            
            return (
              <g key={p.provider} className="transition-all duration-500">
                {/* Connection Line */}
                <line 
                  x1={centerX} y1={centerY} 
                  x2={x} y2={y} 
                  stroke={edgeColor} 
                  strokeWidth={edgeWidth} 
                  opacity="0.3"
                  strokeDasharray="4 2"
                />
                
                {/* Node */}
                <circle 
                  cx={x} cy={y} 
                  r={20} 
                  fill="#0a0a0a" 
                  stroke={edgeColor} 
                  strokeWidth="2"
                  className="hover:fill-gray-900 cursor-pointer transition-colors"
                />
                <text x={x} y={y + 35} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
                  {p.provider}
                </text>
                <text x={x} y={y} textAnchor="middle" dy=".3em" fill="#fff" fontSize="10" fontWeight="bold">
                  {Math.round(p.successRate * 100)}%
                </text>
              </g>
            );
          })}
          
          {/* Empty State */}
          {providerList.length === 0 && (
             <text x={centerX} y={centerY + 80} textAnchor="middle" fill="#64748b" fontSize="12">
               No active provider data
             </text>
          )}
        </svg>
      </div>
      
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
        <div className="bg-gray-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center">
          <Share2 className="w-5 h-5 text-cyan-400 mb-1" />
          <div className="text-2xl font-bold text-white">{stats?.nodes?.total || 0}</div>
          <div className="text-xs text-gray-500 font-mono">NODES</div>
        </div>
        <div className="bg-gray-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center">
          <Server className="w-5 h-5 text-purple-400 mb-1" />
          <div className="text-2xl font-bold text-white">{stats?.edges?.total || 0}</div>
          <div className="text-xs text-gray-500 font-mono">EDGES</div>
        </div>
        <div className="bg-gray-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center">
          <Database className="w-5 h-5 text-green-400 mb-1" />
          <div className="text-2xl font-bold text-white">{stats?.learningHistory || 0}</div>
          <div className="text-xs text-gray-500 font-mono">MEMORIES</div>
        </div>
      </div>
    </div>
  );
};

export default CortexMonitor;
