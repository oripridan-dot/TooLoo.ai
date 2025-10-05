import React from 'react';
import Chat from './components/Chat';
import './styles/globals.css';

function App() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <div className="flex h-screen">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Chat />
        </div>
      </div>
    </div>
  );
}

export default App;