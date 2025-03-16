import React from "react";
import { createRoot } from "react-dom/client";
import ContentScriptApp from "./ContentScriptApp";
import "../assets/css/tailwind.css";
import "@xyflow/react/dist/style.css";

// Initialize the app once
(function () {
  // Check if already initialized to prevent duplicate instances
  if (document.getElementById("deconstructor-extension-root")) {
    return;
  }

  const appContainer = document.createElement("div");
  appContainer.id = "deconstructor-extension-root";
  document.body.appendChild(appContainer);

  try {
    const root = createRoot(appContainer);

    // Wrap render in a try-catch
    try {
      root.render(<ContentScriptApp />);
    } catch (renderError) {
      console.error(
        "Deconstructor: Error rendering React component:",
        renderError
      );
    }
  } catch (error) {
    console.error("Deconstructor: Error creating React root:", error);
  }
})();
