// @version 2.2.18
import React, { useEffect, useState } from 'react';

const CortexMonitor = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/observability/knowledge-graph');
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="text-cyan-500 animate-pulse">Initializing Cortex Link...</div>;

  const { providers } = data;
  const providerList = providers.providers || [];
  
  // Radial Layout Calculation
  const centerX = 200;
  const centerY = 200;
  const radius = 120;
  
  return (
    <div className="bg-obsidian-light border border-cyan-900/30 rounded-xl p-6 shadow-[0_0_30px_rgba(0,243,255,0.05)]">
      <h3 className="text-cyan-400 font-mono text-sm mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
        CORTEX_ACTIVITY_MONITOR
      </h3>
      
      <div className="flex justify-center">
        <svg width="400" height="400" className="overflow-visible">
          {/* Center Node (Cortex) */}
          <circle cx={centerX} cy={centerY} r="30" fill="#050505" stroke="#00f3ff" strokeWidth="2" className="filter drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]" />
          <text x={centerX} y={centerY} textAnchor="middle" dy=".3em" fill="#fff" fontSize="10" fontFamily="monospace">CORTEX</text>
          
          {/* Provider Nodes */}
          {providerList.map((p, i) => {
            const angle = (i * 2 * Math.PI) / providerList.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            // Edge
            const edgeWidth = Math.max(1, p.successRate * 5);
            const edgeColor = p.successRate > 0.8 ? '#0aff0a' : p.successRate > 0.5 ? '#ffaa00' : '#ff003c';
            
            return (
              <g key={p.provider}>
                {/* Connection Line */}
                <line 
                  x1={centerX} y1={centerY} 
                  x2={x} y2={y} 
                  stroke={edgeColor} 
                  strokeWidth={edgeWidth} 
                  opacity="0.4"
                />
                
                {/* Node */}
                <circle 
                  cx={x} cy={y} 
                  r={15 + (p.attempts * 0.5)} 
                  fill="#0a0a0a" 
                  stroke={edgeColor} 
                  strokeWidth="2"
                />
                <text x={x} y={y + 30} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
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
             <text x={centerX} y={centerY + 60} textAnchor="middle" fill="#64748b" fontSize="12">
               No active provider data
             </text>
          )}
        </svg>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono text-gray-500">
        <div className="text-center">
          <div className="text-cyan-400 text-lg">{data.stats.nodes.total}</div>
          <div>NODES</div>
        </div>
        <div className="text-center">
          <div className="text-purple-400 text-lg">{data.stats.edges.total}</div>
          <div>EDGES</div>
        </div>
        <div className="text-center">
          <div className="text-green-400 text-lg">{data.stats.learningHistory}</div>
          <div>MEMORIES</div>
        </div>
      </div>
    </div>
  );
};

export default CortexMonitor;
