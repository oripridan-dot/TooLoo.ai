/**
 * SessionManager Component
 * Auto-implemented by TooLoo.ai Safe Implementation
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Session {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface SessionManagerProps {
  currentSessionId?: string;
  onSessionSwitch?: (sessionId: string) => void;
  onSessionCreate?: (session: Session) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionId,
  onSessionSwitch,
  onSessionCreate,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Load sessions from localStorage
    const saved = localStorage.getItem('tooloo-sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })));
      } catch (e) {
        console.error('Failed to load sessions', e);
      }
    }
  }, []);

  const createSession = useCallback(() => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: `Session ${sessions.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };
    const updated = [...sessions, newSession];
    setSessions(updated);
    localStorage.setItem('tooloo-sessions', JSON.stringify(updated));
    onSessionCreate?.(newSession);
  }, [sessions, onSessionCreate]);

  return (
    <div className="session-manager p-4 bg-gray-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-medium">Sessions</h3>
        <button
          onClick={createSession}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          + New
        </button>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            className={`p-3 rounded cursor-pointer transition-colors ${
              session.id === currentSessionId
                ? 'bg-blue-600/20 border border-blue-500'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
            onClick={() => onSessionSwitch?.(session.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-white font-medium">{session.name}</div>
            <div className="text-gray-400 text-xs">
              {session.messageCount} messages
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SessionManager;
