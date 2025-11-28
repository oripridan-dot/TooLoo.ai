// @version 2.2.72
import { useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import ControlRoom from "./components/ControlRoom";
import Projects from "./components/Projects";
import SelfImprovement from "./components/SelfImprovement";
import ActivityFeed from "./components/ActivityFeed";
import UICustomizer from "./components/UICustomizer";
import Chat from "./components/Chat";
import DeSignStudio from "./components/DeSignStudio";
import CortexMonitor from "./components/CortexMonitor";

function App() {
  // Check if we are on the visuals page
  /* eslint-disable-next-line no-undef */
  const isVisualsPage = window.location.pathname.includes("visuals.html");
  const [activeComponent, setActiveComponent] = useState(
    isVisualsPage ? "DeSign Studio" : "Dashboard",
  );
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const renderComponent = () => {
    switch (activeComponent) {
      case "Dashboard":
        return <Dashboard setActiveComponent={setActiveComponent} />;
      case "Control Room":
        return <ControlRoom />;
      case "Projects":
        return <Projects setActiveComponent={setActiveComponent} />;
      case "Self-Improvement":
        return <SelfImprovement />;
      case "Activity Feed":
        return <ActivityFeed />;
      case "UI Customizer":
        return <UICustomizer />;
      case "Visual Designer":
      case "DeSign Studio":
        return <DeSignStudio />;
      case "Cortex Monitor":
        return <CortexMonitor />;
      default:
        return (
          <Chat
            currentSessionId={currentSessionId}
            setCurrentSessionId={setCurrentSessionId}
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

export default App;
