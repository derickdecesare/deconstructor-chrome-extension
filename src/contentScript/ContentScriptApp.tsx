import React, { useState, useEffect } from "react";
// Use the Deconstructor component directly instead of DeconstructorPopup
import Deconstructor from "@/components/Deconstructor";

interface ApiKeys {
  openAIKey: string;
}

const ContentScriptApp: React.FC = () => {
  console.log("### INIT: Content script initializing");
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedWord, setSelectedWord] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Load API key
  useEffect(() => {
    chrome.storage.local.get(["openAIKey"], (result) => {
      console.log("### API: Key loaded:", result);
      setApiKey(result.openAIKey || "");
    });

    // Add listener for changes to storage
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local" && changes.openAIKey) {
        console.log("### API: Key updated:", changes.openAIKey.newValue);
        setApiKey(changes.openAIKey.newValue || "");
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Calculate a position that's always visible within the viewport
  const calculateSafePosition = (rect: DOMRect) => {
    // Icon dimensions
    const iconSize = 40; // 10px padding + 10px width/height + 10px padding

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Initial position calculation (next to the selection)
    // rect coordinates are already relative to the viewport, only add scrollX/Y when positioning fixed elements
    let x = rect.right + 10; // Position to the right of selection
    let y = rect.top; // Align with top of selection

    // Ensure icon is fully visible horizontally
    if (x + iconSize > viewportWidth) {
      // If not enough space on the right, try left side
      x = rect.left - iconSize;

      // If still not visible, place it at the end of viewport with some margin
      if (x < 0) {
        x = viewportWidth - iconSize - 10;
      }
    }

    // Ensure icon is fully visible vertically
    if (y < 0) {
      // If above viewport, place below selection
      y = rect.bottom + 10;
    } else if (y + iconSize > viewportHeight) {
      // If below viewport, place it at the top of viewport with some margin
      y = viewportHeight - iconSize - 10;
    }

    console.log("### POSITION: Viewport:", {
      width: viewportWidth,
      height: viewportHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
    console.log("### POSITION: Original rect:", {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    });
    console.log("### POSITION: Adjusted position:", { x, y });

    // For fixed positioning with position:fixed, we actually DO NOT need to add scroll offsets
    // since fixed positioning is relative to the viewport
    return { x, y };
  };

  // Watch for selection changes
  useEffect(() => {
    console.log("### SELECTION: Setting up listener");

    const handleSelectionChange = () => {
      try {
        const selection = window.getSelection();
        if (!selection) return;

        const text = selection.toString().trim();
        if (!text) {
          console.log("### SELECTION: Empty, hiding icon");
          setIsIconVisible(false);
          return;
        }

        // Only proceed if it's a single word
        if (text.includes(" ")) {
          console.log("### SELECTION: Multiple words, hiding icon");
          setIsIconVisible(false);
          return;
        }

        console.log("### SELECTION: Single word detected:", text);
        setSelectedWord(text);

        // Get the position for the icon
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Calculate safe position
          const safePosition = calculateSafePosition(rect);
          setPosition(safePosition);

          setIsIconVisible(true);
          console.log("### ICON: Should be visible now");
        }
      } catch (error) {
        console.error("### ERROR:", error);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // Calculate a visible position for the popup
  const getPopupPosition = () => {
    // Popup dimensions (estimated)
    const popupWidth = 300;
    const popupHeight = 200;

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // For fixed positioning, position is already viewport-relative
    // No need to subtract scroll position
    const iconViewportX = position.x;
    const iconViewportY = position.y;

    // Default position (centered below the icon)
    let x = iconViewportX - popupWidth / 2 + 20; // Center it with 20px offset for icon
    let y = iconViewportY + 40; // Below the icon

    // Ensure popup is fully visible horizontally
    if (x + popupWidth > viewportWidth) {
      x = viewportWidth - popupWidth - 10;
    }
    if (x < 0) {
      x = 10;
    }

    // Ensure popup is fully visible vertically
    if (y + popupHeight > viewportHeight) {
      // If not enough space below, try above
      y = iconViewportY - popupHeight - 10;

      // If still not visible, place at bottom of viewport
      if (y < 0) {
        y = viewportHeight - popupHeight - 10;
      }
    }

    // For fixed positioning, return viewport coordinates directly
    return { x, y };
  };

  // Log every render
  console.log("### RENDER:", {
    isIconVisible,
    isPopupVisible,
    selectedWord,
    position,
    apiKey: apiKey ? "Set" : "Not set",
  });

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("### CLICK: Icon clicked");
    setIsPopupVisible(true);
    setIsIconVisible(false);
  };

  const handleClosePopup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("### POPUP: Closing");
    setIsPopupVisible(false);
  };

  // Get safe popup position
  const popupPosition = getPopupPosition();

  return (
    <div id="deconstructor-root">
      {isIconVisible && (
        <button
          id="deconstructor-icon"
          className="fixed bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 2147483647,
          }}
          onClick={handleIconClick}
        >
          🔍
        </button>
      )}

      {isPopupVisible && (
        <div
          id="deconstructor-popup"
          className="fixed bg-white border border-gray-300 rounded shadow-lg p-4"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            width: "500px", // Increased width for the graph
            maxHeight: "80vh",
            zIndex: 2147483646,
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Word: {selectedWord}</h3>
            <button
              className="text-gray-500 hover:text-gray-800"
              onClick={handleClosePopup}
            >
              ✕
            </button>
          </div>

          <div
            className="overflow-auto"
            style={{ maxHeight: "calc(80vh - 60px)" }}
          >
            {/* Use Deconstructor component directly with the required props */}
            <Deconstructor word={selectedWord} apiKey={apiKey} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentScriptApp;
