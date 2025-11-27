// @version 2.2.29
import React from "react";

const Sidebar = ({ setActiveComponent }) => {
  return (
    <aside className="bg-[#0f1117] border-r border-white/5 text-gray-400 w-64 p-4 flex flex-col">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
          TooLoo.ai
        </h1>
        <p className="text-xs text-gray-600 font-mono mt-1 ml-4">Synapsys v2.1</p>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1">
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Dashboard")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Dashboard</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Chat")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Chat</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Projects")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Projects</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Control Room")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Control Room</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Cortex Monitor")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Cortex Monitor</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Self-Improvement")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Self-Improvement</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Activity Feed")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">Activity Feed</span>
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("UI Customizer")}
              className="block px-3 py-2 rounded-lg hover:bg-cyan-900/10 hover:text-cyan-400 transition-all duration-200 group"
            >
              <span className="group-hover:translate-x-1 transition-transform inline-block">UI Customizer</span>
            </a>
          </li>
          <li className="pt-4 mt-4 border-t border-white/5">
            <a
              href="#"
              onClick={() => setActiveComponent("Visual Designer")}
              className="block px-3 py-2 rounded-lg bg-cyan-900/10 text-cyan-400 font-medium border border-cyan-500/20 hover:bg-cyan-900/20 hover:border-cyan-500/40 transition-all shadow-[0_0_10px_rgba(6,182,212,0.05)]"
            >
              <span className="mr-2">🎨</span> Visual Designer
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
