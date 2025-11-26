// @version 2.1.309
import { useState } from "react";
import Layout from "./components/Layout";
import SelfImprovement from "./components/SelfImprovement";
import ActivityFeed from "./components/ActivityFeed";
import UICustomizer from "./components/UICustomizer";
import Chat from "./components/Chat";
import VisualDesigner from "./components/VisualDesigner";

function App() {
  // Check if we are on the visuals page
  const isVisualsPage = window.location.pathname.includes("visuals.html");
  const [activeComponent, setActiveComponent] = useState(
    isVisualsPage ? "Visual Designer" : "Chat",
  );

  const renderComponent = () => {
    switch (activeComponent) {
      case "Self-Improvement":
        return <SelfImprovement />;
      case "Activity Feed":
        return <ActivityFeed />;
      case "UI Customizer":
        return <UICustomizer />;
      case "Visual Designer":
        return <VisualDesigner />;
      default:
        return <Chat />;
    }
  };

  return (
    <Layout setActiveComponent={setActiveComponent}>{renderComponent()}</Layout>
  );
}

export default App;
