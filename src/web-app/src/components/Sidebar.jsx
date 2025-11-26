// @version 2.1.348
import React from "react";

const Sidebar = ({ setActiveComponent }) => {
  return (
    <aside className="bg-[#0f1117] border-r border-gray-800 text-gray-300 w-64 p-4 flex flex-col">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-white tracking-tight">
          TooLoo.ai
        </h1>
        <p className="text-xs text-gray-500">React App Context</p>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Chat")}
              className="block px-3 py-2 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
            >
              Chat
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Self-Improvement")}
              className="block px-3 py-2 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
            >
              Self-Improvement
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Activity Feed")}
              className="block px-3 py-2 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
            >
              Activity Feed
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("UI Customizer")}
              className="block px-3 py-2 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
            >
              UI Customizer
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={() => setActiveComponent("Visual Designer")}
              className="block px-3 py-2 rounded-lg bg-blue-900/20 text-blue-400 font-medium border border-blue-900/30 hover:bg-blue-900/30 transition-all"
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
