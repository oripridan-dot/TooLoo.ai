import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * ActivityPanel - Shows recent director actions in a collapsible side panel
 * Displays operations like prompt saturation, provider selection, response synthesis
 */
const ActivityPanel = ({ activities = [], isExpanded = false, onToggle }) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  
  const handleToggle = () => {
    const newState = !localExpanded;
    setLocalExpanded(newState);
    if (onToggle) onToggle(newState);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'saturating':
        return <Activity className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'executing':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] bg-gray-900/95 backdrop-blur-sm border-l border-green-500/20 transition-all duration-300 ease-in-out z-40 ${
      localExpanded ? 'w-80' : 'w-12'
    }`}>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="absolute left-0 top-4 -translate-x-full bg-gray-900/90 backdrop-blur-sm p-2 rounded-l-lg border border-green-500/20 border-r-0 hover:bg-gray-800 transition-colors"
        aria-label={localExpanded ? "Collapse activity panel" : "Expand activity panel"}
      >
        {localExpanded ? (
          <ChevronRight className="w-5 h-5 text-green-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-green-400" />
        )}
      </button>

      {/* Panel content */}
      {localExpanded ? (
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-500/20">
            <Activity className="w-5 h-5 text-green-400" />
            <h3 className="text-green-400 font-semibold">Director Activity</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {activities.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                No recent activity
              </div>
            ) : (
              activities.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-start gap-2">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 font-medium">
                        {activity.action}
                      </div>
                      {activity.details && (
                        <div className="text-xs text-gray-400 mt-1">
                          {activity.details}
                        </div>
                      )}
                      {activity.provider && (
                        <div className="text-xs text-green-400/70 mt-1">
                          Provider: {activity.provider}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats footer */}
          {activities.length > 0 && (
            <div className="mt-4 pt-3 border-t border-green-500/20 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Total operations:</span>
                <span className="text-green-400">{activities.length}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center pt-4 gap-2">
          <Activity className="w-5 h-5 text-green-400 animate-pulse" />
          <div className="text-green-400 text-xs font-bold [writing-mode:vertical-lr] rotate-180">
            ACTIVITY
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityPanel;
