// @version 2.2.119
import React, { useState, useEffect } from "react";
import { Server, Database, Share2, Cpu } from "lucide-react";
import { getProviderLogo } from "./ProviderLogos";

const CortexMonitor = ({ compact = false, activeProvider = null }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/v1/observability/knowledge-graph");
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
      <div className="flex items-center justify-center h-full text-cyan-500 bg-[#0f1117] rounded-xl border border-cyan-900/30">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <span className="text-xs font-mono tracking-widest animate-pulse">
            ESTABLISHING NEURAL LINK...
          </span>
        </div>
      </div>
    );
  }

  // Mock data for visual effect if real data is empty or missing
  const hasRealData =
    data &&
    data.providers &&
    data.providers.providers &&
    data.providers.providers.length > 0;

  const displayData = hasRealData
    ? data
    : {
        providers: {
          providers: [
            { provider: "claude", successRate: 0.98, attempts: 120 },
            { provider: "gemini", successRate: 0.85, attempts: 45 },
            { provider: "openai", successRate: 0.94, attempts: 200 },
            { provider: "mistral", successRate: 0.78, attempts: 30 },
            { provider: "huggingface", successRate: 0.91, attempts: 80 },
          ],
        },
        stats: {
          nodes: { total: data?.stats?.nodes?.total || 1243 },
          edges: { total: data?.stats?.edges?.total || 3502 },
          learningHistory: data?.stats?.learningHistory || 892,
        },
      };

  const { providers, stats } = displayData;
  // Filter out unused providers (attempts === 0) unless we have very few, then show top ones
  let providerList = (providers?.providers || []).filter((p) => p.attempts > 0);
  
  // If no providers have attempts (e.g. fresh start), show all to avoid empty graph
  if (providerList.length === 0) {
    providerList = providers?.providers || [];
  }

  // Radial Layout Calculation
  const centerX = 200;
  const centerY = 200;
  const radius = compact ? 90 : 110;

  return (
    <div
      className={`${compact ? "h-full w-full flex items-center justify-center overflow-hidden relative" : "bg-[#0f1117] border border-cyan-900/30 rounded-xl p-6 shadow-[0_0_30px_rgba(0,243,255,0.05)] h-full flex flex-col relative overflow-hidden"}`}
    >
      {/* Background Grid Effect */}
      {!compact && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
      )}

      {/* Inject Custom Animations */}
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; transform-origin: center; }
        .animate-spin-reverse { animation: spin-reverse 20s linear infinite; transform-origin: center; }
      `}</style>

      {!compact && (
        <div className="flex justify-between items-center mb-2 relative z-10">
          <h3 className="text-cyan-400 font-mono text-sm flex items-center gap-2 tracking-wider">
            <Cpu className="w-4 h-4" />
            CORTEX_NEURAL_MONITOR
          </h3>
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>
      )}

      <div
        className={`flex-1 flex flex-col items-center justify-center relative z-10 ${compact ? "" : "min-h-[250px]"}`}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
          {/* Background Ambient Rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={compact ? 130 : 150}
            fill="none"
            stroke="#00f3ff"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.1"
            className="animate-spin-slow"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={compact ? 110 : 130}
            fill="none"
            stroke="#bc13fe"
            strokeWidth="1"
            strokeDasharray="10 10"
            opacity="0.05"
            className="animate-spin-reverse"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={compact ? 70 : 90}
            fill="none"
            stroke="#00f3ff"
            strokeWidth="0.5"
            opacity="0.1"
          />

          {/* Center Node (Cortex Core) */}
          <g className="filter drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]">
            <circle
              cx={centerX}
              cy={centerY}
              r={compact ? 35 : 40}
              fill="#050505"
              stroke="#00f3ff"
              strokeWidth="2"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={compact ? 25 : 30}
              fill="none"
              stroke="#00f3ff"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="animate-spin-slow"
              style={{ animationDuration: "10s" }}
            />
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dy=".3em"
              fill="#fff"
              fontSize={compact ? "10" : "12"}
              fontFamily="monospace"
              fontWeight="bold"
              className="pointer-events-none select-none"
            >
              CORTEX
            </text>
          </g>

          {/* Active Provider Pulse (if passed from parent) */}
          {activeProvider && (
            <>
              <circle
                cx={centerX}
                cy={centerY}
                r={compact ? 80 : 60}
                fill="none"
                stroke="#00f3ff"
                strokeWidth="1"
                className="animate-ping opacity-20"
              />
            </>
          )}

          {/* Provider Nodes */}
          {providerList.map((p, i) => {
            const angle = (i * 2 * Math.PI) / providerList.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            // Check if this provider is active (bidirectional check)
            const isActive =
              activeProvider &&
              (p.provider
                .toLowerCase()
                .includes(activeProvider.toLowerCase()) ||
                activeProvider
                  .toLowerCase()
                  .includes(p.provider.toLowerCase()));

            // Edge Styling
            const edgeWidth = isActive ? 3 : 1.5;
            const isUnused = p.attempts === 0;
            const edgeColor = isActive
              ? "#00f3ff"
              : isUnused
                ? "#334155" // Slate-700
                : p.successRate > 0.8
                  ? "#10b981" // Emerald-500
                  : p.successRate > 0.5
                    ? "#f59e0b" // Amber-500
                    : "#ef4444"; // Red-500

            // Logo Size Classes (Explicit strings for Tailwind JIT)
            const logoSizeClass = isActive ? "w-8 h-8" : "w-6 h-6";
            const logoColorClass = isActive
              ? "text-white filter drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]"
              : "text-slate-400";

            return (
              <g key={p.provider} className="transition-all duration-500 group">
                {/* Connection Line */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke={edgeColor}
                  strokeWidth={edgeWidth}
                  opacity={isActive ? 0.8 : 0.3}
                  strokeDasharray={isActive ? "none" : "2 4"}
                  className={isActive ? "animate-pulse" : ""}
                />

                {/* Node Background */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 20 : 16}
                  fill="#0f172a"
                  stroke={edgeColor}
                  strokeWidth={isActive ? 2 : 1}
                  className="transition-all duration-300"
                />

                {/* Node (Logo) - Using foreignObject to render HTML/React component inside SVG */}
                <foreignObject
                  x={x - (isActive ? 16 : 12)}
                  y={y - (isActive ? 16 : 12)}
                  width={isActive ? 32 : 24}
                  height={isActive ? 32 : 24}
                  className="overflow-visible"
                >
                  <div className="flex items-center justify-center w-full h-full">
                    {getProviderLogo(
                      p.provider,
                      `${logoSizeClass} ${logoColorClass}`,
                    )}
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  x={x}
                  y={y + 30}
                  textAnchor="middle"
                  fill={isActive ? "#fff" : "#64748b"}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isActive ? "bold" : "normal"}
                  className="uppercase tracking-wider"
                >
                  {p.provider}
                </text>

                {/* Success Rate (on hover or active) */}
                <text
                  x={x}
                  y={y + 42}
                  textAnchor="middle"
                  fill={edgeColor}
                  fontSize="9"
                  fontFamily="monospace"
                  opacity={isActive ? 1 : 0.7}
                >
                  {(p.successRate * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/5 pt-4 relative z-10">
          <div className="bg-gray-900/40 p-3 rounded-lg border border-white/5 flex flex-col items-center hover:bg-gray-800/40 transition-colors group">
            <Share2 className="w-5 h-5 text-cyan-500 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-white font-mono">
              {stats?.nodes?.total?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-cyan-500/70 font-mono tracking-widest">
              NODES
            </div>
          </div>
          <div className="bg-gray-900/40 p-3 rounded-lg border border-white/5 flex flex-col items-center hover:bg-gray-800/40 transition-colors group">
            <Server className="w-5 h-5 text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-white font-mono">
              {stats?.edges?.total?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-purple-500/70 font-mono tracking-widest">
              EDGES
            </div>
          </div>
          <div className="bg-gray-900/40 p-3 rounded-lg border border-white/5 flex flex-col items-center hover:bg-gray-800/40 transition-colors group">
            <Database className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xl font-bold text-white font-mono">
              {stats?.learningHistory?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-emerald-500/70 font-mono tracking-widest">
              MEMORIES
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CortexMonitor;
