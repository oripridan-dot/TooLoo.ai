// @version 3.3.404
// SystemPulse - Real-time file change HUD for Project Pinocchio
// Visualizes the "Watcher" sensory events - shows the system "seeing" file changes

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// Icon components for different file change types
const icons = {
  add: '➕',
  change: '👁️',
  unlink: '🗑️',
};

// Color states for different states
const stateColors = {
  idle: 'bg-emerald-500',
  active: 'bg-amber-500',
  success: 'bg-emerald-400',
  error: 'bg-rose-500',
};

/**
 * SystemPulse - Floating HUD showing real-time file system activity
 *
 * Features:
 * - Idle: Small pulsing green dot (bottom-right)
 * - Active: Expands to show "👁️ Saw change in [filename]"
 * - Flash yellow→green on valid, yellow→red on build break
 * - Auto-hides message after 3 seconds
 */
const SystemPulse = memo(({ position = 'bottom-right', enabled = true }) => {
  const [socket, setSocket] = useState(null);
  const [pulseState, setPulseState] = useState('idle'); // idle, active, success, error
  const [recentChange, setRecentChange] = useState(null);
  const [changeHistory, setChangeHistory] = useState([]);
  const [expanded, setExpanded] = useState(false);

  // Connect to socket on mount
  useEffect(() => {
    if (!enabled) return;

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[SystemPulse] Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('[SystemPulse] Disconnected');
    });

    // Listen for system pulse events from FileWatcher
    newSocket.on('system:pulse', (data) => {
      console.log('[SystemPulse] Received pulse:', data);
      handlePulse(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [enabled]);

  // Handle incoming pulse events
  const handlePulse = useCallback((data) => {
    const { file, changeType, timestamp } = data;
    const fileName = file.split('/').pop() || file;

    const changeEntry = {
      id: `${timestamp}-${file}`,
      file: fileName,
      fullPath: file,
      changeType,
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
    };

    // Update state
    setRecentChange(changeEntry);
    setPulseState('active');
    setExpanded(true);

    // Add to history (keep last 10)
    setChangeHistory((prev) => [changeEntry, ...prev].slice(0, 10));

    // Auto-transition to success/idle after delay
    setTimeout(() => {
      setPulseState('success');
      setTimeout(() => {
        setPulseState('idle');
        setExpanded(false);
      }, 1000);
    }, 2000);
  }, []);

  // Position classes based on prop
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  if (!enabled) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <AnimatePresence mode="wait">
        {expanded && recentChange ? (
          // Expanded state - show file change info
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl
              bg-gray-900/90 backdrop-blur-xl border border-gray-700/50
              shadow-lg shadow-black/30
            `}
          >
            {/* Pulsing indicator */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`w-3 h-3 rounded-full ${stateColors[pulseState]}`}
            />

            {/* Icon for change type */}
            <span className="text-lg">{icons[recentChange.changeType] || '📁'}</span>

            {/* File info */}
            <div className="flex flex-col">
              <span className="text-sm text-gray-200 font-medium">
                {recentChange.changeType === 'add' && 'New file: '}
                {recentChange.changeType === 'change' && 'Changed: '}
                {recentChange.changeType === 'unlink' && 'Deleted: '}
                <span className="text-cyan-400">{recentChange.file}</span>
              </span>
              <span className="text-xs text-gray-500">{recentChange.time}</span>
            </div>

            {/* History count badge */}
            {changeHistory.length > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-400"
              >
                +{changeHistory.length - 1}
              </motion.div>
            )}
          </motion.div>
        ) : (
          // Idle state - small pulsing dot
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="relative group cursor-pointer"
            onClick={() => changeHistory.length > 0 && setExpanded(true)}
          >
            {/* Outer pulse ring */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute inset-0 rounded-full ${stateColors[pulseState]}`}
            />

            {/* Inner solid dot */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`relative w-4 h-4 rounded-full ${stateColors[pulseState]} shadow-lg`}
              style={{
                boxShadow: `0 0 10px ${pulseState === 'idle' ? '#10b981' : '#f59e0b'}`,
              }}
            />

            {/* Tooltip on hover */}
            <div
              className="
              absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100
              transition-opacity pointer-events-none
            "
            >
              <div className="bg-gray-900/95 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-gray-300 whitespace-nowrap">
                System Watcher{' '}
                {changeHistory.length > 0 ? `(${changeHistory.length} recent)` : '(idle)'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SystemPulse.displayName = 'SystemPulse';

export default SystemPulse;
export { SystemPulse };
