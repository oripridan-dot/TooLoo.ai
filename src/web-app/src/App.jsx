// @version 3.3.567 - UI mode selector + avoid duplicate SystemPulse
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

// V3.3.407: SystemPulse HUD - Global file watcher visualization
import { SystemPulse } from './skin/components/SystemPulse';

const UI_MODE_STORAGE_KEY = 'tooloo.uiMode';

/**
 * Resolve the UI mode.
 *
 * Priority:
 * 1) URL query: ?ui=liquid | ?ui=legacy (also persists to localStorage)
 * 2) localStorage: tooloo.uiMode
 * 3) Vite env: VITE_UI_MODE=liquid|legacy
 * 4) default: liquid
 */
function resolveUiMode() {
  /* eslint-disable-next-line no-undef */
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('ui');
  if (fromQuery === 'liquid' || fromQuery === 'legacy') {
    try {
      /* eslint-disable-next-line no-undef */
      window.localStorage.setItem(UI_MODE_STORAGE_KEY, fromQuery);
    } catch {
      // ignore storage failures (private mode, disabled storage, etc.)
    }
    return fromQuery;
  }

  try {
    /* eslint-disable-next-line no-undef */
    const fromStorage = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
    if (fromStorage === 'liquid' || fromStorage === 'legacy') return fromStorage;
  } catch {
    // ignore storage failures
  }

  // eslint-disable-next-line no-undef
  const fromEnv = import.meta?.env?.VITE_UI_MODE;
  if (fromEnv === 'liquid' || fromEnv === 'legacy') return fromEnv;

  return 'liquid';
}

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
  // UI mode can be changed without code edits:
  // - Add `?ui=legacy` or `?ui=liquid` to the URL (persists)
  // - Or set VITE_UI_MODE=legacy|liquid
  const uiMode = resolveUiMode();
  const useLiquidSynapsys = uiMode !== 'legacy';

  return (
    <>
      {/* Avoid duplicate HUD rendering: Liquid Synapsys mounts its own SystemPulse. */}
      {!useLiquidSynapsys && <SystemPulse position="bottom-right" enabled={true} />}
      {useLiquidSynapsys ? <TooLooApp /> : <LegacyApp />}
    </>
  );
}

export default App;
