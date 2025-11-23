// @version 2.1.28
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const Layout = ({ children, setActiveComponent }) => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar setActiveComponent={setActiveComponent} />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </div>
  );
};

export default Layout;
