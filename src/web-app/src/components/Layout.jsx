// @version 2.2.26
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const Layout = ({ children, setActiveComponent }) => {
  return (
    <div className="flex flex-col h-screen bg-obsidian text-gray-300">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar setActiveComponent={setActiveComponent} />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
};

export default Layout;
