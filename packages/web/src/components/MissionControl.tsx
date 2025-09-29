import React, { useState, useEffect, useRef } from 'react';
import './MissionControl.css';
import FileSystemPanel from './FileSystemPanel';

// Animation states for the UI
const AnimationState = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  ANALYZING: 'analyzing',
  RESPONDING: 'responding',
  APPROACHING: 'approaching'
} as const;

type AnimationStateType = typeof AnimationState[keyof typeof AnimationState];

interface MissionControlProps {
  isThinking?: boolean;
  message?: string;
  systemStatus?: string;
  onSendMessage: (message: string) => void;
}

const MissionControl: React.FC<MissionControlProps> = ({ 
  isThinking = false, 
  systemStatus = 'Systems normal. Awaiting your next directive.',
  onSendMessage
}) => {
  const [animationState, setAnimationState] = useState<AnimationStateType>(AnimationState.IDLE);
  const [promptText, setPromptText] = useState('');
  const [statusMessage, setStatusMessage] = useState(systemStatus);
  const [isFileSystemVisible, setIsFileSystemVisible] = useState(false);
  const assistantRef = useRef(null);
  
  // Update animation state based on thinking status
  useEffect(() => {
    if (isThinking) {
      // Sequence of animations when processing a request
      setAnimationState(AnimationState.PROCESSING);
      setStatusMessage('Assistant delivering your request...');
      
      const processingTimer = setTimeout(() => {
        setAnimationState(AnimationState.ANALYZING);
        setStatusMessage('Director analyzing request...');
        
        const analyzingTimer = setTimeout(() => {
          // Randomly decide if director should approach for important responses
          if (Math.random() > 0.7) {
            setAnimationState(AnimationState.APPROACHING);
            setStatusMessage('Director has important information!');
          } else {
            setAnimationState(AnimationState.RESPONDING);
            setStatusMessage('Preparing response...');
          }
        }, 2000);
        
        return () => clearTimeout(analyzingTimer);
      }, 1500);
      
      return () => clearTimeout(processingTimer);
    } else {
      // Reset to idle when not thinking
      setAnimationState(AnimationState.IDLE);
      setStatusMessage(systemStatus);
    }
  }, [isThinking, systemStatus]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (promptText.trim()) {
      onSendMessage(promptText);
      setPromptText('');
    }
  };

  // Helper to get animation classes based on current state
  const getAnimationClasses = () => {
    const classes = {
      assistant: 'assistant',
      director: 'director',
      screens: 'screens'
    };
    
    switch (animationState) {
      case AnimationState.PROCESSING:
        classes.assistant += ' assistant-running';
        classes.screens += ' screens-active';
        break;
      case AnimationState.ANALYZING:
        classes.director += ' director-working';
        classes.screens += ' screens-analyzing';
        break;
      case AnimationState.RESPONDING:
        classes.assistant += ' assistant-returning';
        classes.screens += ' screens-responding';
        break;
      case AnimationState.APPROACHING:
        classes.director += ' director-approaching';
        break;
      default:
        break;
    }
    
    return classes;
  };
  
  const animClasses = getAnimationClasses();

  const handleDirectorClick = () => {
    setIsFileSystemVisible(true);
    setStatusMessage('Director accessing file system...');
  };

  return (
    <div className="mission-control">
      <div className="mission-header">
        <h1>TOOLOO.AI MISSION CONTROL</h1>
        <div className="status-indicator">Mission Control Ready</div>
      </div>
      
      <div className="mission-viewport">
        {/* Main screens/monitors in the background */}
        <div className={animClasses.screens}>
          {/* Multiple monitor elements with code/data visualizations */}
          <div className="screen screen-left">
            <div className="code-visualization"></div>
            <div className="screen-label">SYSTEM</div>
          </div>
          <div className="screen screen-center">
            <div className="data-visualization"></div>
          </div>
          <div className="screen screen-right">
            <div className="metrics-visualization"></div>
            <div className="screen-label">EXECUTION</div>
          </div>
        </div>
        
        {/* Director character - clickable to access file system */}
        <div 
          className={`${animClasses.director} clickable`} 
          onClick={handleDirectorClick}
          title="Click to access Director's file system"
        >
          <div className="director-chair"></div>
          <div className="director-body"></div>
          <div className="director-head"></div>
        </div>
        
        {/* File System Panel */}
        <FileSystemPanel 
          isVisible={isFileSystemVisible} 
          onClose={() => {
            setIsFileSystemVisible(false);
            setStatusMessage('File system access closed.');
          }}
        />
        
        {/* Assistant robot */}
        <div className={animClasses.assistant} ref={assistantRef}>
          <div className="assistant-body"></div>
          <div className="assistant-head"></div>
          {animationState === AnimationState.PROCESSING && (
            <div className="message-packet"></div>
          )}
        </div>
        
        {/* Status message */}
        <div className="status-message">
          <p>{statusMessage}</p>
        </div>
        
        {/* Virtual distance marker */}
        <div className="distance-marker">20 virtual meters</div>
      </div>
      
      {/* Prompt input area */}
      <div className="mission-control-prompt">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="YOUR PROMPT HERE..."
            className="prompt-input"
          />
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default MissionControl;