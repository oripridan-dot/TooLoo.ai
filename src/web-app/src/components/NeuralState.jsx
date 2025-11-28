// @version 2.2.121
// Refactored NeuralState Component
// Right sidebar for cortex feedback display
import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Terminal,
  Activity as ActivityIcon,
  Server,
  CheckCircle2,
} from "lucide-react";
import CortexMonitor from "./CortexMonitor";
import PlanVisualizer from "./PlanVisualizer";
import VisualRegistry from "./VisualRegistry";

const SystemLog = ({ events }) => {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="font-mono text-[10px] h-32 overflow-y-auto space-y-1 p-2 bg-black/20 rounded border border-white/5">
      {events.length === 0 && (
        <div className="text-gray-600 italic">System idle...</div>
      )}
      {events.map((ev, i) => (
        <div key={i} className="flex gap-2 animate-fade-in">
          <span className="text-gray-500">{ev.time}</span>
          <span className={`${ev.color || "text-gray-300"}`}>{ev.message}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

/**
 * ProviderFeedback Display
 * Shows only active/used providers (starting with 'non' prefix)
 */
const ProviderFeedbackDisplay = ({ providers }) => {
  if (!providers || providers.length === 0) {
    return (
      <div className="text-[10px] text-gray-500 italic p-2 rounded border border-white/5 bg-gray-900/20">
        No providers active yet...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <div
          key={provider.provider}
          className={`p-2 rounded border text-[10px] transition-all ${
            provider.isActive
              ? "bg-cyan-500/20 border-cyan-500/50"
              : provider.status === "success"
                ? "bg-green-500/10 border-green-500/30"
                : provider.status === "error"
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-gray-800/50 border-white/5"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <Server className="w-3 h-3" />
              <span className="font-mono font-bold text-white">
                {provider.name.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {provider.status === "success" && (
                <CheckCircle2 className="w-3 h-3 text-green-400" />
              )}
              {provider.isActive && (
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-gray-400">
            <span>Calls: {provider.callCount}</span>
            <span>Success: {Math.round(provider.successRate * 100)}%</span>
            <span>Latency: {provider.avgLatencyMs}ms</span>
            <span>
              Confidence: {Math.round(provider.confidenceScore * 100)}%
            </span>
          </div>

          <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${provider.successRate * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Session Highlights Display
 * Shows current session's key highlights from cortex
 */
const SessionHighlights = ({ highlights }) => {
  if (!highlights || highlights.length === 0) {
    return (
      <div className="text-[10px] text-gray-500 italic p-2 rounded border border-white/5 bg-gray-900/20">
        Session highlights will appear here...
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-32 overflow-y-auto">
      {highlights.map((highlight, idx) => (
        <div
          key={idx}
          className="p-2 rounded border border-white/5 bg-gray-900/50 text-[10px]"
        >
          <div className="flex gap-2 items-start">
            <span className="text-lg">{highlight.icon || "•"}</span>
            <div className="flex-1">
              <div className="text-gray-300 font-mono">{highlight.content}</div>
              <div className="text-gray-600 text-[8px] mt-1">
                {new Date(highlight.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const NeuralState = ({ socket, sessionId }) => {
  const [systemEvents, setSystemEvents] = useState([]);
  const [memory, setMemory] = useState({ short: "", long: "" });
  const [activeTab, setActiveTab] = useState("short");
  const [intent, setIntent] = useState(null);
  const [taskHeadline, setTaskHeadline] = useState("Awaiting instructions...");
  const [taskProgress, setTaskProgress] = useState(0);
  const [activePlan, setActivePlan] = useState(null);
  const [lastVisual, setLastVisual] = useState(null);

  // Cortex-integrated feedback
  const [providers, setProviders] = useState([]);
  const [sessionHighlights, setSessionHighlights] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);

  // Fetch cortex feedback data
  useEffect(() => {
    const fetchCortexData = async () => {
      try {
        const res = await fetch("/api/v1/cortex/feedback", {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.providers) setProviders(data.providers);
          if (data.activeProvider) setActiveProvider(data.activeProvider);
        }
      } catch (e) {
        console.error("[NeuralState] Cortex feedback fetch failed:", e);
      }
    };

    const fetchSessionContext = async () => {
      try {
        if (!sessionId) return;
        const res = await fetch(`/api/v1/cortex/session/${sessionId}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.context) {
            setSessionHighlights(data.context.highlights || []);
            setTaskHeadline(data.context.currentGoal || taskHeadline);
          }
        }
      } catch (e) {
        console.error("[NeuralState] Session context fetch failed:", e);
      }
    };

    const fetchAutoFilledMemory = async () => {
      try {
        if (!sessionId) return;
        const res = await fetch(`/api/v1/cortex/memory/${sessionId}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.memory) {
            setMemory({
              short: data.memory.shortTerm || "",
              long: data.memory.longTerm || "",
            });
          }
        }
      } catch (e) {
        console.error("[NeuralState] Auto-filled memory fetch failed:", e);
      }
    };

    // Initial fetch
    fetchCortexData();
    fetchSessionContext();
    fetchAutoFilledMemory();

    // Poll for updates
    const interval = setInterval(() => {
      fetchCortexData();
      fetchSessionContext();
      fetchAutoFilledMemory();
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  // Socket Listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const addEvent = (msg, color = "text-gray-300") => {
      setSystemEvents((prev) => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString([], {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          message: msg,
          color,
        },
      ]);
    };

    const handleEvent = (event) => {
      // Filter by session if provided
      if (
        sessionId &&
        event.payload?.sessionId &&
        event.payload.sessionId !== sessionId
      ) {
        return;
      }

      // Map events to log messages
      if (event.type === "feedback:providers_updated") {
        setProviders(event.payload.providers || []);
        if (event.payload.activeProvider) {
          setActiveProvider(event.payload.activeProvider);
        }
      } else if (event.type === "session:context_updated") {
        setSessionHighlights(event.payload.context?.highlights || []);
        if (event.payload.context?.currentGoal) {
          setTaskHeadline(event.payload.context.currentGoal);
        }
      } else if (event.type === "memory:auto_filled") {
        setMemory({
          short: event.payload.memory?.shortTerm || "",
          long: event.payload.memory?.longTerm || "",
        });
      } else if (event.type === "precog:telemetry") {
        const { provider, status, latency } = event.payload;
        if (status === "processing") {
          addEvent(`Consulting ${provider}...`, "text-cyan-400");
        } else if (status === "success") {
          addEvent(`${provider} responded (${latency}ms)`, "text-green-400");
        } else if (status === "error") {
          addEvent(`${provider} failed`, "text-red-400");
        }
      } else if (event.type === "precog:intent_prediction") {
        setIntent(event.payload);
        addEvent(`Intent: ${event.payload.type}`, "text-purple-400");
      } else if (event.type === "planning:intent") {
        setTaskHeadline(event.payload.goal || "Processing...");
        setTaskProgress(0);
        addEvent(
          `New Goal: ${event.payload.goal}`,
          "text-yellow-400 font-bold",
        );
      } else if (event.type === "nexus:orchestrator_plan_update") {
        const queue = event.payload.queue || [];
        setTaskProgress(queue.length > 0 ? 50 : 100);
        if (event.payload.plan) {
          setActivePlan(event.payload.plan);
        }
      } else if (event.type === "planning:plan:created") {
        addEvent("Plan created", "text-yellow-400");
        setTaskProgress(10);
        if (event.payload.plan) {
          setActivePlan(event.payload.plan);
        }
      } else if (event.type === "planning:plan:completed") {
        addEvent("Plan completed", "text-green-400 font-bold");
        setTaskProgress(100);
        setTimeout(() => setTaskProgress(0), 3000);
        setActivePlan((prev) =>
          prev ? { ...prev, status: "completed" } : null,
        );
      } else if (event.type === "cortex:tool:call") {
        addEvent(`Tool: ${event.payload.type}`, "text-blue-400");
      } else if (event.type === "visual:generated") {
        setLastVisual(event.payload.visual);
        setActiveTab("visuals");
      } else if (event.type === "thought") {
        addEvent(event.payload.text, "text-gray-400 italic");
      }
    };

    socket.on("synapsys:event", handleEvent);
    return () => socket.off("synapsys:event", handleEvent);
  }, [socket, sessionId]);

  return (
    <aside className="w-72 border-l border-white/10 bg-gray-900/30 hidden xl:flex flex-col h-full overflow-hidden">
      {/* Cortex Monitor Visualization */}
      <div className="h-64 border-b border-white/10 relative overflow-hidden bg-black/20">
        <div className="absolute inset-0">
          <CortexMonitor compact={true} activeProvider={activeProvider} />
        </div>
        {/* Overlay Status */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
          <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-cyan-900/50">
            SYNAPSYS_V2.2
          </div>
          {activeProvider && (
            <div className="bg-cyan-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white animate-pulse border border-cyan-500">
              {activeProvider.name?.toUpperCase() || "PROVIDER"} ACTIVE
            </div>
          )}
        </div>
      </div>

      {/* Real-time Log */}
      <div className="p-4 border-b border-white/10 flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Terminal className="w-3 h-3" /> System Activity
        </h2>

        {/* Task Progress Bar */}
        <div className="mb-3 bg-gray-900/50 p-2 rounded border border-white/5">
          <div className="text-[10px] text-cyan-300 mb-1 truncate font-mono">
            {taskHeadline}
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>

        {/* Active Plan Visualization */}
        {activePlan && (
          <div className="mb-4 animate-fade-in">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ActivityIcon className="w-3 h-3 text-blue-400" /> Active Protocol
            </div>
            <div className="bg-black/20 rounded border border-white/5 p-2 overflow-hidden">
              <div className="scale-90 origin-top-left w-[110%]">
                <PlanVisualizer plan={activePlan} />
              </div>
            </div>
          </div>
        )}

        {/* Session Highlights */}
        <div className="mb-3">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            📌 Session Highlights
          </h3>
          <SessionHighlights highlights={sessionHighlights} />
        </div>

        <SystemLog events={systemEvents} />
      </div>

      {/* Context Memory & Provider Feedback Section */}
      <div className="p-4 h-1/3 border-t border-white/10 overflow-y-auto flex flex-col">
        {activeTab === "visuals" && (
          <div className="w-full h-32 bg-gray-950/50 border border-white/10 rounded p-2 overflow-y-auto mb-3">
            {lastVisual ? (
              <div className="scale-75 origin-top-left w-[133%]">
                <VisualRegistry type={lastVisual.type} data={lastVisual.data} />
              </div>
            ) : (
              <div className="text-gray-500 text-xs italic text-center mt-10">
                No active visuals
              </div>
            )}
          </div>
        )}

        {activeTab === "providers" && (
          <div className="flex-1 overflow-y-auto mb-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Server className="w-3 h-3" /> Active Providers
            </h2>
            <ProviderFeedbackDisplay providers={providers} />
          </div>
        )}

        {activeTab !== "providers" && activeTab !== "visuals" && (
          <>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              🧠 CONTEXT MEMORY
            </h2>
            <textarea
              value={memory[activeTab]}
              onChange={(e) =>
                setMemory({ ...memory, [activeTab]: e.target.value })
              }
              className="flex-1 w-full bg-gray-950/50 border border-white/10 rounded p-2 text-xs text-gray-400 font-mono resize-none focus:outline-none focus:border-cyan-500/30 mb-3"
              placeholder={`${activeTab === "short" ? "Short" : "Long"}-term context...`}
            />
          </>
        )}

        {/* Memory Tab Buttons - NOW BELOW MEMORY BOX */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setActiveTab("short")}
            className={`flex-1 min-w-max py-1 text-xs rounded border transition-colors ${
              activeTab === "short"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700"
            }`}
          >
            Short-Term
          </button>
          <button
            onClick={() => setActiveTab("long")}
            className={`flex-1 min-w-max py-1 text-xs rounded border transition-colors ${
              activeTab === "long"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700"
            }`}
          >
            Long-Term
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={`flex-1 min-w-max py-1 text-xs rounded border transition-colors ${
              activeTab === "providers"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700"
            }`}
          >
            Providers
          </button>
          <button
            onClick={() => setActiveTab("visuals")}
            className={`py-1 px-2 text-xs rounded border transition-colors ${
              activeTab === "visuals"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700"
            }`}
            title="Visuals generated from AI responses"
          >
            🖼️
          </button>
        </div>

        {/* Real-time Intent Section */}
        {intent && activeTab !== "providers" && activeTab !== "visuals" && (
          <div className="pt-3 border-t border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-500" /> Active Intent
            </h3>
            <div className="bg-gray-900/50 border border-white/5 p-3 rounded text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span className="text-cyan-400 font-bold">Type</span>
                <span className="capitalize text-white">{intent.type}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
                <div
                  className="bg-cyan-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${intent.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default NeuralState;
