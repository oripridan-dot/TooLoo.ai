import React, { useState, useEffect } from 'react';
import MissionControl from './components/MissionControl';
import './App.css';
import { callApi } from './utils/apiUtils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function AppMissionControl() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Systems normal. Awaiting your next directive.');
  const [briefing, setBriefing] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await callApi<any>('/briefing');
        if (res?.success) setBriefing(res);
      } catch {}
    })();
  }, []);

  // Simulate sending a message to TooLoo.ai
  const handleSendMessage = async (messageText: string) => {
    // Add user message to the conversation
    setMessages([...messages, { role: 'user', content: messageText }]);
    
    // Set thinking state to true to trigger animations
    setIsThinking(true);
    setSystemStatus('Processing your request...');
    try {
      const payload = { prompt: messageText, context: { briefing } };
      const res = await callApi<any>('/generate', 'POST', payload);
      const content = res?.content || 'No response.';
      const response: Message = { role: 'assistant', content };
      setMessages(prev => [...prev, response]);
      setSystemStatus('Ready for your next command.');
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` }]);
      setSystemStatus('Encountered an error.');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="app">
      <MissionControl
        isThinking={isThinking}
        systemStatus={systemStatus}
        onSendMessage={handleSendMessage}
      />
      
      {/* You can add a separate messages view if needed */}
      {/* <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div> */}
    </div>
  );
}

export default AppMissionControl;