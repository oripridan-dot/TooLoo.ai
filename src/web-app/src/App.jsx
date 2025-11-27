// @version 2.1.310
import { useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import ControlRoom from "./components/ControlRoom";
import Projects from "./components/Projects";
import SelfImprovement from "./components/SelfImprovement";
import ActivityFeed from "./components/ActivityFeed";
import UICustomizer from "./components/UICustomizer";
import Chat from "./components/Chat";
import VisualDesigner from "./components/VisualDesigner";
import CortexMonitor from "./components/CortexMonitor";

function App() {
  // Check if we are on the visuals page
  const isVisualsPage = window.location.pathname.includes("visuals.html");
  const [activeComponent, setActiveComponent] = useState(
    isVisualsPage ? "Visual Designer" : "Dashboard",
  );

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
        return <VisualDesigner />;
      case "Cortex Monitor":
        return <CortexMonitor />;
      default:
        return <Chat />;
    }
  };

  return (
    <Layout setActiveComponent={setActiveComponent}>{renderComponent()}</Layout>
  );
}

export default App;
