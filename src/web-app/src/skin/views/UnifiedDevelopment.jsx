// @version 3.3.589
/**
 * @file Unified Development View - Single page combining Genesis + Synapsys
 * @intent Replace separate interfaces with ONE streamlined development experience
 * @owner cortex
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import UnifiedDevelopmentMachine from '../components/UnifiedDevelopmentMachine.jsx';

const UnifiedDevelopmentView = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    genesis: 'checking',
    synapsys: 'connected',
    socket: 'connected'
  });

  // Check Genesis API availability
  useEffect(() => {
    const checkConnections = async () => {
      try {
        // Check Genesis API (tooloo-genesis)
        const genesisResponse = await fetch('http://localhost:3000/health');
        setConnectionStatus(prev => ({
          ...prev,
          genesis: genesisResponse.ok ? 'connected' : 'disconnected'
        }));
      } catch {
        setConnectionStatus(prev => ({
          ...prev,
          genesis: 'disconnected'
        }));
      }

      try {
        // Check Synapsys API (main backend)
        const synapsysResponse = await fetch('http://localhost:4000/api/v1/health');
        setConnectionStatus(prev => ({
          ...prev,
          synapsys: synapsysResponse.ok ? 'connected' : 'disconnected'
        }));
      } catch {
        setConnectionStatus(prev => ({
          ...prev,
          synapsys: 'disconnected'
        }));
      }
    };

    checkConnections();
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'disconnected': return '#ef4444';
      case 'checking': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white">
      {/* Header with connection status */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-800">
        <div>
          <h1 className="text-xl font-bold">TooLoo Unified Development</h1>
          <p className="text-sm text-gray-400">One machine for validation-first product development</p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(connectionStatus.genesis) }}
            />
            <span className="text-xs">Genesis</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(connectionStatus.synapsys) }}
            />
            <span className="text-xs">Synapsys</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor(connectionStatus.socket) }}
            />
            <span className="text-xs">Socket</span>
          </div>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="ml-4 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Connection Warning */}
      {connectionStatus.genesis === 'disconnected' && (
        <div className="bg-red-900 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-200">
                <strong>Genesis API disconnected.</strong> Run <code>cd tooloo-genesis && pnpm dev</code> to start Genesis Studio backend.
              </p>
            </div>
          </div>
        </div>
      )}

      {connectionStatus.synapsys === 'disconnected' && (
        <div className="bg-red-900 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-200">
                <strong>Synapsys API disconnected.</strong> Run <code>npm run dev</code> to start main backend.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Unified Interface */}
      <div className={isFullscreen ? 'h-screen' : 'h-full'}>
        <UnifiedDevelopmentMachine 
          genesisApiUrl="http://localhost:3000"
          synapsysApiUrl="http://localhost:4000"
          socketUrl="ws://localhost:4000"
        />
      </div>

      {/* Quick Actions Footer */}
      <div className="border-t border-gray-800 bg-gray-800 p-3">
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">
              Start New Mission
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs">
              View Learning Logs
            </button>
            <button className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs">
              System Health
            </button>
          </div>
          
          <div className="text-xs text-gray-400">
            TooLoo.ai V3.3.586 Unified Development Machine
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDevelopmentView;