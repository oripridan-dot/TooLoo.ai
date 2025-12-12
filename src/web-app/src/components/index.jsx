// @version 3.3.556
/**
 * @description Legacy component stubs for backwards compatibility
 * @intent These are placeholder components that allow the app to build
 *         while USE_LIQUID_SYNAPSYS is true. When switching back to legacy UI,
 *         these should be properly implemented.
 * V3.3.550: Added BillingDashboard export
 */
import React from 'react';
import CognitiveDashboard from './CognitiveDashboard.jsx';
import BillingDashboard from './BillingDashboard.jsx';

// Reusable placeholder component
const PlaceholderComponent = ({ name }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-gray-800/50 rounded-lg border border-gray-700">
    <div className="text-center">
      <div className="text-4xl mb-4">🚧</div>
      <h2 className="text-xl font-semibold text-gray-300 mb-2">{name}</h2>
      <p className="text-gray-500">Component under development</p>
    </div>
  </div>
);

// Layout Component
export const Layout = ({ children, setActiveComponent, activeComponent }) => {
  const navItems = [
    'Dashboard',
    'Control Room',
    'Projects',
    'Self-Improvement',
    'Activity Feed',
    'Cortex Monitor',
    'QA Guardian',
    'Emergence Room',
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="font-bold text-lg text-blue-400 whitespace-nowrap">TooLoo.ai</span>
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveComponent?.(item)}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                activeComponent === item
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
};

// Dashboard Component
export const Dashboard = ({ setActiveComponent }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-2">System Status</h3>
      <p className="text-green-400">● Active</p>
    </div>
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-2">Active Sessions</h3>
      <p className="text-2xl font-bold">0</p>
    </div>
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
      <button
        onClick={() => setActiveComponent?.('Control Room')}
        className="text-blue-400 hover:underline"
      >
        Open Control Room →
      </button>
    </div>
  </div>
);

// Control Room Component
export const ControlRoom = () => <PlaceholderComponent name="Control Room" />;

// Projects Component
export const Projects = ({ setActiveComponent }) => <PlaceholderComponent name="Projects" />;

// Self Improvement Component
export const SelfImprovement = () => <PlaceholderComponent name="Self Improvement" />;

// Activity Feed Component
export const ActivityFeed = () => <PlaceholderComponent name="Activity Feed" />;

// UI Customizer Component
export const UICustomizer = () => <PlaceholderComponent name="UI Customizer" />;

// Chat Component
export const Chat = ({ currentSessionId, setCurrentSessionId, setActiveComponent }) => (
  <div className="max-w-3xl mx-auto">
    <div className="bg-gray-800 rounded-lg border border-gray-700 min-h-[500px] flex flex-col">
      <div className="border-b border-gray-700 p-4">
        <h2 className="text-lg font-semibold">Chat</h2>
        <p className="text-sm text-gray-400">Session: {currentSessionId || 'New Session'}</p>
      </div>
      <div className="flex-1 p-4 flex items-center justify-center text-gray-500">
        Chat interface coming soon...
      </div>
      <div className="border-t border-gray-700 p-4">
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          disabled
        />
      </div>
    </div>
  </div>
);

// DeSign Studio Component
export const DeSignStudio = () => <PlaceholderComponent name="DeSign Studio" />;

// Cortex Monitor Component
export const CortexMonitor = () => <PlaceholderComponent name="Cortex Monitor" />;

// Exploration Monitor Component
export const ExplorationMonitor = () => <PlaceholderComponent name="Exploration Monitor" />;

// QA Guardian Component
export const QAGuardian = () => <PlaceholderComponent name="QA Guardian" />;

// Emergence Room Component
export const EmergenceRoom = () => <PlaceholderComponent name="Emergence Room" />;

// Liquid Skin Demo Component
export const LiquidSkinDemo = () => <PlaceholderComponent name="Liquid Skin Demo" />;

// Cognitive Dashboard Component (Meta-Learning, Collaboration, Quality)
export { CognitiveDashboard };
