import React from "react";
import { createRoot } from "react-dom/client";
import ContentScriptApp from "./ContentScriptApp";
import "../assets/css/tailwind.css";
import "@xyflow/react/dist/style.css";

console.log("Deconstructor: content script loaded");

// Initialize the app once
(function () {
  // Check if already initialized to prevent duplicate instances
  if (document.getElementById("deconstructor-extension-root")) {
    console.log("Deconstructor: Already initialized, skipping");
    return;
  }

  console.log("Deconstructor: content script start initializing");

  const appContainer = document.createElement("div");
  appContainer.id = "deconstructor-extension-root";
  document.body.appendChild(appContainer);
  console.log("Deconstructor: container added to body");

  try {
    const root = createRoot(appContainer);
    console.log("Deconstructor: React root created");

    // Wrap render in a try-catch
    try {
      root.render(<ContentScriptApp />);
      console.log("Deconstructor: ContentScriptApp rendered successfully");
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
