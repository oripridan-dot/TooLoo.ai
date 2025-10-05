import React from 'react';

const Sidebar = ({ setActiveComponent }) => {
  return (
    <aside className="bg-gray-700 text-white w-64 p-4">
      <nav>
        <ul>
          <li className="mb-2"><a href="#" onClick={() => setActiveComponent('Chat')} className="hover:text-gray-300">Chat</a></li>
          <li className="mb-2"><a href="#" onClick={() => setActiveComponent('GitHub')} className="hover:text-gray-300">🐙 GitHub</a></li>
          <li className="mb-2"><a href="#" onClick={() => setActiveComponent('Self-Improvement')} className="hover:text-gray-300">Self-Improvement</a></li>
          <li className="mb-2"><a href="#" onClick={() => setActiveComponent('Activity Feed')} className="hover:text-gray-300">Activity Feed</a></li>
          <li className="mb-2"><a href="#" onClick={() => setActiveComponent('UI Customizer')} className="hover:text-gray-300">UI Customizer</a></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
