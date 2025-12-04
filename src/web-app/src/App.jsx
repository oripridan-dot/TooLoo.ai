// @version 2.2.529 - Liquid Synapsys V1
import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ControlRoom from './components/ControlRoom';
import Projects from './components/Projects';
import SelfImprovement from './components/SelfImprovement';
import ActivityFeed from './components/ActivityFeed';
import UICustomizer from './components/UICustomizer';
import Chat from './components/Chat';
import DeSignStudio from './components/DeSignStudio';
import CortexMonitor from './components/CortexMonitor';
import ExplorationMonitor from './components/ExplorationMonitor';
import QAGuardian from './components/QAGuardian';
import EmergenceRoom from './components/EmergenceRoom';
import LiquidSkinDemo from './components/LiquidSkinDemo';

// NEW: Import Liquid Synapsys TooLoo App
import { TooLooApp } from './skin';

// Feature flag for new Liquid Synapsys UI
// Set to true to use the new liquid skin, false for legacy UI
const USE_LIQUID_SYNAPSYS = true;

function LegacyApp() {
  // Check if we are on the visuals page
  /* eslint-disable-next-line no-undef */
  const isVisualsPage = window.location.pathname.includes('visuals.html');
  const [activeComponent, setActiveComponent] = useState(
    isVisualsPage ? 'DeSign Studio' : 'Dashboard'
  );
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const renderComponent = () => {
    switch (activeComponent) {
      case 'Dashboard':
        return <Dashboard setActiveComponent={setActiveComponent} />;
      case 'Control Room':
        return <ControlRoom />;
      case 'Projects':
        return <Projects setActiveComponent={setActiveComponent} />;
      case 'Self-Improvement':
        return <SelfImprovement />;
      case 'Activity Feed':
        return <ActivityFeed />;
      case 'UI Customizer':
        return <UICustomizer />;
      case 'Visual Designer':
      case 'DeSign Studio':
        return <DeSignStudio />;
      case 'Cortex Monitor':
        return <CortexMonitor />;
      case 'Exploration Monitor':
      case 'Learning':
        return <ExplorationMonitor />;
      case 'QA Guardian':
        return <QAGuardian />;
      case 'Emergence Room':
        return <EmergenceRoom />;
      case 'Liquid Skin':
      case 'Skin Demo':
        return <LiquidSkinDemo />;
      default:
        return (
          <Chat
            currentSessionId={currentSessionId}
            setCurrentSessionId={setCurrentSessionId}
            setActiveComponent={setActiveComponent}
          />
        );
    }
  };

  return (
    <Layout
      setActiveComponent={setActiveComponent}
      activeComponent={activeComponent}
      currentSessionId={currentSessionId}
      setCurrentSessionId={setCurrentSessionId}
    >
      {renderComponent()}
    </Layout>
  );
}

function App() {
  // Use feature flag to switch between legacy and new Liquid Synapsys UI
  // Toggle USE_LIQUID_SYNAPSYS at the top of this file
  if (USE_LIQUID_SYNAPSYS) {
    return <TooLooApp />;
  }
  return <LegacyApp />;
}

export default App;
