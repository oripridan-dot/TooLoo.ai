// @version 2.2.78
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const Layout = ({ children, setActiveComponent, activeComponent, currentSessionId, setCurrentSessionId }) => {
  return (
    <div className="flex flex-col h-screen bg-obsidian text-gray-300">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          setActiveComponent={setActiveComponent} 
          activeComponent={activeComponent}
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
        />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
};

export default Layout;
