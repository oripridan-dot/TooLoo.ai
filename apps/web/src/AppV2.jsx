/**
 * AppV2.jsx
 * V2 Main Application with routing
 *
 * @version 2.0.0-alpha.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, ConnectionState } from './hooks/useSocket';
import { useAuth, AuthState } from './hooks/useAuth';

// Components
import ChatV2 from './components/ChatV2';
import AdminDashboard from './components/AdminDashboard';
import SkillStudio from './components/SkillStudio';
import { AuthPage } from './components/Login';

// Navigation items
const NAV_ITEMS = [
  { id: 'chat', name: 'Chat', icon: '💬', component: ChatV2 },
  { id: 'skills', name: 'Skill Studio', icon: '🎯', component: SkillStudio },
  { id: 'admin', name: 'Admin', icon: '⚙️', component: AdminDashboard },
  { id: 'account', name: 'Account', icon: '👤', component: AuthPage },
];

// Sidebar component
function Sidebar({ activeView, onViewChange, connectionState, systemStatus, user }) {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            T
          </div>
          <div>
            <h1 className="font-bold text-white">TooLoo.ai</h1>
            <p className="text-xs text-gray-500">v2.0.0-alpha</p>
          </div>
        </div>
      </div>

      {/* User info if logged in */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === ConnectionState.CONNECTED
                ? 'bg-green-500'
                : connectionState === ConnectionState.CONNECTING
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span
            className={`text-sm ${
              connectionState === ConnectionState.CONNECTED
                ? 'text-green-400'
                : connectionState === ConnectionState.CONNECTING
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {connectionState === ConnectionState.CONNECTED
              ? 'Connected'
              : connectionState === ConnectionState.CONNECTING
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>

        {systemStatus && (
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Skills</span>
              <span className="text-gray-400">{systemStatus.skills?.loaded || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Memory</span>
              <span className="text-gray-400">{systemStatus.memory?.percentage || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime</span>
              <span className="text-gray-400">
                {Math.floor((systemStatus.uptime || 0) / 60)}m
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main V2 App
export default function AppV2() {
  const [activeView, setActiveView] = useState('chat');
  const { connectionState, systemStatus, emit } = useSocket({
    autoConnect: true,
  });
  const { user, authState, isAuthenticated } = useAuth();

  // Ping for status updates periodically
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED) {
      const interval = setInterval(() => {
        emit('system:ping');
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [connectionState, emit]);

  // Get active component
  const ActiveComponent = NAV_ITEMS.find(item => item.id === activeView)?.component || ChatV2;

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        connectionState={connectionState}
        systemStatus={systemStatus}
        user={user}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
