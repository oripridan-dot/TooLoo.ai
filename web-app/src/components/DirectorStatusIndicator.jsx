import React from 'react';

/**
 * DirectorStatusIndicator - Shows when PromptDirector is active
 * Displays a green glowing dot with "Director: Active" status in top right corner
 */
const DirectorStatusIndicator = ({ isActive = false, activityCount = 0 }) => {
  if (!isActive) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-green-500/30">
      {/* Pulsing green dot */}
      <div className="relative">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
      </div>
      
      {/* Status text */}
      <div className="flex flex-col">
        <span className="text-green-400 text-sm font-semibold">Director: Active</span>
        {activityCount > 0 && (
          <span className="text-green-300/70 text-xs">{activityCount} operations</span>
        )}
      </div>
    </div>
  );
};

export default DirectorStatusIndicator;
