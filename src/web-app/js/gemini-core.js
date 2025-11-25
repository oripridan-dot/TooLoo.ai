// @version 2.1.28
// Gemini 3 Pro Core Logic

function loadView(viewName, params = {}) {
  const mainContent = document.getElementById("main-content");
  const navItems = document.querySelectorAll(".nav-item");

  // Update Nav
  navItems.forEach((item) => item.classList.remove("active"));
  const activeNav = Array.from(navItems).find((item) =>
    item.innerText.toLowerCase().includes(viewName),
  );
  if (activeNav) activeNav.classList.add("active");

  // Clear Content
  mainContent.innerHTML = "";

  // Remove padding for full-screen views
  if (viewName !== "home") {
    mainContent.style.padding = "0";
    mainContent.style.overflow = "hidden"; // Prevent double scrollbars
  } else {
    mainContent.style.padding = "";
    mainContent.style.overflow = "";
  }

  if (viewName === "home") {
    // Reload initial hero state (or just reload page for simplicity in this v1)
    location.reload();
    return;
  }

  // Create Iframe Container
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  // Map views to files
  const viewMap = {
    chat: "chat-pro-v2.html",
    projects: "projects.html",
    design: "design-studio.html",
    control: "control-room-modern.html",
    traces: "trace-viewer.html",
    workbench: "/workbench",
  };

  if (viewMap[viewName]) {
    let src = viewMap[viewName];

    // Append params
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      src += (src.includes("?") ? "&" : "?") + queryString;
    }

    iframe.src = src;

    // Inject CSS once loaded to ensure consistency
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/gemini-ui.css";
        doc.head.appendChild(link);

        // Add specific overrides for legacy pages
        const style = doc.createElement("style");
        style.textContent = `
          body { background: transparent !important; }
          .header, header { display: none !important; } /* Hide internal headers */
        `;
        doc.head.appendChild(style);
      } catch (e) {
        console.log("Cross-origin restriction or error injecting CSS");
      }
    };

    mainContent.appendChild(iframe);
  }
}

// Initialize
console.log("Gemini 3 Pro Core Loaded");
