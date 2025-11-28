// @version 2.2.92
import React, { useState, useEffect, useRef } from "react";
import { Activity, Brain, Database, Cpu, Zap, Terminal } from "lucide-react";
import CortexMonitor from "./CortexMonitor";

const SystemLog = ({ events }) => {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="font-mono text-[10px] h-32 overflow-y-auto space-y-1 p-2 bg-black/20 rounded border border-white/5">
      {events.length === 0 && <div className="text-gray-600 italic">System idle...</div>}
      {events.map((ev, i) => (
        <div key={i} className="flex gap-2 animate-fade-in">
          <span className="text-gray-500">{ev.time}</span>
          <span className={`${ev.color || 'text-gray-300'}`}>{ev.message}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

const NeuralState = ({ socket, sessionId }) => {
  const [activeProvider, setActiveProvider] = useState(null);
  const [systemEvents, setSystemEvents] = useState([]);
  const [memory, setMemory] = useState({ short: "", long: "" });
  const [activeTab, setActiveTab] = useState("short");
  const [intent, setIntent] = useState(null);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const addEvent = (msg, color = "text-gray-300") => {
      setSystemEvents(prev => [...prev.slice(-19), {
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
        message: msg,
        color
      }]);
    };

    const handleEvent = (event) => {
      // Filter by session if provided
      if (sessionId && event.payload?.sessionId && event.payload.sessionId !== sessionId) {
        return;
      }

      // Map events to log messages
      if (event.type === "precog:telemetry") {
        const { provider, status, latency } = event.payload;
        if (status === "processing") {
          setActiveProvider(provider);
          addEvent(`Consulting ${provider}...`, "text-cyan-400");
        } else if (status === "success") {
          setActiveProvider(null);
          addEvent(`${provider} responded (${latency}ms)`, "text-green-400");
        } else if (status === "error") {
          setActiveProvider(null);
          addEvent(`${provider} failed`, "text-red-400");
        }
      } 
      else if (event.type === "precog:intent_prediction") {
        setIntent(event.payload);
        addEvent(`Intent: ${event.payload.type}`, "text-purple-400");
      }
      else if (event.type === "planning:plan:created") {
        addEvent("Plan created", "text-yellow-400");
      }
      else if (event.type === "cortex:tool:call") {
        addEvent(`Tool: ${event.payload.type}`, "text-blue-400");
      }
      else if (event.type === "thought") {
         addEvent(event.payload.text, "text-gray-400 italic");
      }
    };

    socket.on("synapsys:event", handleEvent);
    return () => socket.off("synapsys:event", handleEvent);
  }, [socket, sessionId]);

  return (
    <aside className="w-72 border-l border-white/10 bg-gray-900/30 hidden xl:flex flex-col h-full">
      {/* Cortex Monitor Visualization */}
      <div className="h-64 border-b border-white/10 relative overflow-hidden bg-black/20">
         <div className="absolute inset-0 flex items-center justify-center scale-75 origin-top">
            <CortexMonitor />
         </div>
         {/* Overlay Status */}
         <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
            <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-cyan-900/50">
               SYNAPSYS_V2.2
            </div>
            {activeProvider && (
                <div className="bg-cyan-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white animate-pulse border border-cyan-500">
                    {activeProvider.toUpperCase()} ACTIVE
                </div>
            )}
         </div>
      </div>

      {/* Real-time Log */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Terminal className="w-3 h-3" /> System Activity
        </h2>
        <SystemLog events={systemEvents} />
      </div>

      {/* Context Memory Section */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Brain className="w-3 h-3" /> Context Memory
        </h2>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab("short")}
            className={`flex-1 py-1 text-xs rounded border transition-colors ${
              activeTab === "short"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700"
            }`}
          >
            Short-Term
          </button>
          <button
            onClick={() => setActiveTab("long")}
            className={`flex-1 py-1 text-xs rounded border transition-colors ${
              activeTab === "long"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border-white/5 hover:bg-gray-700"
            }`}
          >
            Long-Term
          </button>
        </div>

        <textarea
          value={memory[activeTab]}
          onChange={(e) =>
            setMemory({ ...memory, [activeTab]: e.target.value })
          }
          className="w-full h-32 bg-gray-950/50 border border-white/10 rounded p-2 text-xs text-gray-400 font-mono resize-none focus:outline-none focus:border-cyan-500/30 mb-2"
          placeholder={`${activeTab === "short" ? "Short" : "Long"}-term context...`}
        />

        {/* Real-time Intent Section */}
        {intent && (
          <div className="mt-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-500" /> Active Intent
            </h2>
            <div className="bg-gray-900/50 border border-white/5 p-3 rounded text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span className="text-cyan-400 font-bold">Type</span>
                <span className="capitalize text-white">{intent.type}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
                  <div
                    className="bg-cyan-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${intent.confidence * 100}%` }}
                  ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default NeuralState;
