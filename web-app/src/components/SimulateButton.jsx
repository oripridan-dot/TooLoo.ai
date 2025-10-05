import React, { useState } from 'react';
import { Play, Loader2, ExternalLink } from 'lucide-react';

export default function SimulateButton({ description, onSimulationComplete }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [prototypeUrl, setPrototypeUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('tooloo-session-token')
        },
        body: JSON.stringify({ 
          description,
          inspiration: null // Auto-detected from description
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPrototypeUrl(data.prototype.url);
        
        // Open in new tab
        window.open(data.prototype.url, '_blank');
        
        // Callback to parent
        if (onSimulationComplete) {
          onSimulationComplete(data.prototype);
        }
      } else {
        setError(data.error || 'Simulation failed');
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      setError('Failed to generate prototype. Please try again.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSimulate}
        disabled={isSimulating || !description}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSimulating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Simulating prototype...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Simulate First
          </>
        )}
      </button>

      {prototypeUrl && (
        <a
          href={prototypeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
        >
          <ExternalLink className="w-3 h-3" />
          View prototype again
        </a>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
