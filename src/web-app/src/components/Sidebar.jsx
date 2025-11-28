// @version 2.2.78
import React, { useState, useEffect } from "react";

const Sidebar = ({ setActiveComponent, activeComponent, currentSessionId, setCurrentSessionId }) => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const loadSessions = () => {
      const loadedSessions = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("tooloo_session_")) {
          try {
            loadedSessions.push(JSON.parse(localStorage.getItem(key)));
          } catch (e) {}
        }
      }
      loadedSessions.sort((a, b) => new Date(b.created) - new Date(a.created));
      setSessions(loadedSessions);
    };

    loadSessions();
    window.addEventListener('storage', loadSessions);
    window.addEventListener('tooloo-sessions-updated', loadSessions);
    
    return () => {
        window.removeEventListener('storage', loadSessions);
        window.removeEventListener('tooloo-sessions-updated', loadSessions);
    };
  }, []);

  const handleNewSession = () => {
    const name = prompt("Enter session name:", `Session ${new Date().toLocaleTimeString()}`);
    if (!name) return;
    
    const sessionId = "session-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    const newSession = {
      id: sessionId,
      name: name,
      created: new Date(),
      messages: []
    };
    
    localStorage.setItem(`tooloo_session_${sessionId}`, JSON.stringify(newSession));
    localStorage.setItem("tooloo_current_session_id", sessionId);
    
    window.dispatchEvent(new Event('tooloo-sessions-updated'));
    
    if (setCurrentSessionId) setCurrentSessionId(sessionId);
    setActiveComponent("Chat");
  };

  const handleSessionClick = (sessionId) => {
      localStorage.setItem("tooloo_current_session_id", sessionId);
      if (setCurrentSessionId) setCurrentSessionId(sessionId);
      setActiveComponent("Chat");
  };

  return (
    <aside className="bg-[#0f1117] border-r border-white/5 text-gray-400 w-64 p-4 flex flex-col h-full overflow-hidden">
      <div className="mb-8 px-2 flex-shrink-0">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
          TooLoo.ai
        </h1>
        <p className="text-xs text-gray-600 font-mono mt-1 ml-4">Synapsys v2.2</p>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-4 mb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">Core</div>
        <ul className="space-y-1 mb-6">
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Dashboard")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Dashboard" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Dashboard</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Chat")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Chat" || !activeComponent ? "bg-cyan-500/10 text-cyan-300 border-l-2 border-cyan-500" : "hover:bg-cyan-900/10 hover:text-cyan-400 border-l-2 border-transparent"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Chat Pro</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Projects")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Projects" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Projects</span>
            </a>
          </li>
        </ul>

        <div className="px-4 mb-2 text-xs font-bold text-gray-600 uppercase tracking-wider">Tools</div>
        <ul className="space-y-1 mb-6">
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Control Room")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Control Room" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Control Room</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Cortex Monitor")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Cortex Monitor" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Cortex Monitor</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Self-Improvement")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Self-Improvement" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Self-Improvement</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Activity Feed")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "Activity Feed" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Activity Feed</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("UI Customizer")}
              className={`block px-3 py-2 rounded-lg transition-all duration-200 group ${activeComponent === "UI Customizer" ? "bg-white/5 text-white" : "hover:bg-cyan-900/10 hover:text-cyan-400"}`}
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">UI Customizer</span>
            </a>
          </li>
          <li className="pt-2">
            <a
              href="#"
              onClick={() => setActiveComponent("DeSign Studio")}
              className={`block px-3 py-2 rounded-lg bg-gradient-to-r from-pink-900/20 to-rose-900/20 text-rose-400 font-medium border border-rose-500/20 hover:bg-rose-900/30 hover:border-rose-500/40 transition-all shadow-[0_0_10px_rgba(244,63,94,0.05)] ${activeComponent === "DeSign Studio" ? "border-rose-500/60" : ""}`}
            >
              <span className="mr-2">🎨</span> DeSign Studio
            </a>
          </li>
        </ul>

        {(activeComponent === "Chat" || !activeComponent) && (
          <>
            <div className="px-4 mb-2 text-xs font-bold text-gray-600 uppercase tracking-wider flex justify-between items-center">
              <span>Active Sessions</span>
              <button onClick={handleNewSession} className="text-cyan-500 hover:text-cyan-400 text-lg leading-none">+</button>
            </div>
            <div className="space-y-1 mb-6">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={`block px-3 py-2 text-xs rounded-lg cursor-pointer truncate transition-all ${currentSessionId === session.id ? "bg-white/5 text-white border-l-2 border-cyan-500" : "text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent"}`}
                >
                  {session.name}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-600 italic">No active sessions</div>
              )}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
