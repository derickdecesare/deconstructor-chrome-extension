import React, { useState, useEffect, useRef } from "react";
// Use the Deconstructor component directly instead of DeconstructorPopup
import Deconstructor from "@/components/Deconstructor";
import { atom, useAtom } from "jotai";

// Need to import this to access the atom from Deconstructor component
const isLoadingAtom = atom(false);
// Create an error atom to communicate errors from Deconstructor
const errorAtom = atom<string | null>(null);

// Settings atom for extension preferences
const settingsAtom = atom({
  enableKeyboardShortcut: true,
  enableHoverIcon: true,
});

interface ApiKeys {
  openAIKey: string;
}

// CSS to inject for consistent styling across all websites
const injectGlobalStyles = () => {
  const styleId = "deconstructor-global-styles";

  // Only inject once
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    /* Only apply styles to elements within our extension containers */
    #deconstructor-root,
    #deconstructor-root * {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
      line-height: 1.5;
    }
    
    #deconstructor-popup * {
      transition: all 0.2s ease;
    }

    /* Set a smaller initial font size for better spacing */
    #deconstructor-popup .react-flow {
      font-size: 85%;
    }
    
    /* Ensure our elements are absolutely positioned and don't affect page layout */
    #deconstructor-root {
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      overflow: visible;
      pointer-events: none;
      z-index: 2147483640;
    }
    
    /* But ensure children get pointer events */
    #deconstructor-root > * {
      pointer-events: auto;
    }
  `;

  document.head.appendChild(style);
};

const ContentScriptApp: React.FC = () => {
  // Initialize component
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedWord, setSelectedWord] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading] = useAtom(isLoadingAtom); // Use the same atom as Deconstructor
  const [apiError, setApiError] = useAtom(errorAtom); // Use atom for API errors
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [settings, setSettings] = useAtom(settingsAtom); // User settings
  const popupRef = useRef<HTMLDivElement>(null);
  const selectedTextRef = useRef<DOMRect | null>(null);

  // Inject global styles once on mount
  useEffect(() => {
    injectGlobalStyles();
  }, []);

  // Cleanup function to reset all UI state
  const cleanupState = () => {
    setIsDragging(false);
    setLocalError(null);
    setApiError(null);
  };

  // Calculate a position that's always visible within the viewport
  const calculateSafePosition = (rect: DOMRect) => {
    // Store the original selection rect for later reference
    selectedTextRef.current = rect;

    // Icon dimensions
    const iconSize = 40; // 10px padding + 10px width/height + 10px padding

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Initial position calculation (next to the selection)
    // rect coordinates are already relative to the viewport, only add scrollX/Y when positioning absolute elements
    let x = rect.left - iconSize - 10; // Position to the left of selection
    let y = rect.top; // Align with top of selection

    // Ensure icon is fully visible horizontally
    if (x < 0) {
      // If not enough space on the left, try right side
      x = rect.right + 10;

      // If still not visible, place it at the start of viewport with some margin
      if (x + iconSize > viewportWidth) {
        x = 10;
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

    // For absolute positioning, add scroll offset to viewport coordinates
    const absolute = {
      x: x + window.scrollX,
      y: y + window.scrollY,
    };

    return absolute;
  };

  // Calculate a visible position for the popup
  const calculatePopupPosition = () => {
    // Popup dimensions (estimated)
    const popupWidth = 500;
    const popupHeight = 400;

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get icon position relative to viewport
    const iconViewportX = position.x - window.scrollX;
    const iconViewportY = position.y - window.scrollY;

    // Check if we're near the bottom of the viewport
    const isNearBottom = iconViewportY > viewportHeight * 0.7;

    // Default position (centered horizontally, but position based on available space)
    let x = iconViewportX - popupWidth / 2 + 20;

    // If near bottom, position above the icon, otherwise below
    let y = isNearBottom
      ? iconViewportY - popupHeight - 10 // Above icon
      : iconViewportY + 40; // Below icon

    // Ensure popup is fully visible horizontally
    if (x + popupWidth > viewportWidth) {
      x = viewportWidth - popupWidth - 10;
    }
    if (x < 0) {
      x = 10;
    }

    // Ensure popup is fully visible vertically (if possible)
    if (y < 0) {
      // Not enough space above, force show below
      y = iconViewportY + 40;

      // If still not visible, place at top of viewport
      if (y + popupHeight > viewportHeight) {
        y = 10;
      }
    } else if (y + popupHeight > viewportHeight) {
      // Not enough space below, try above
      y = iconViewportY - popupHeight - 10;

      // If still not visible, place at top of viewport
      if (y < 0) {
        y = 10;
      }
    }

    // For absolute positioning, add scroll offset
    return {
      x: x + window.scrollX,
      y: y + window.scrollY,
    };
  };

  // Process the current selection and show popup if valid
  const processSelection = () => {
    // console.log("Processing selection");
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      // console.log("No valid selection found");
      return false;
    }

    const text = selection.toString().trim();
    // console.log("Selected text:", text);

    if (!text || text.includes(" ")) {
      // console.log("Text is empty or contains spaces");
      return false;
    }

    setSelectedWord(text);
    // console.log("Selected word set:", text);

    // Get position for the popup
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate popup position
      const safePosition = calculateSafePosition(rect);
      setPosition(safePosition);

      const popupPos = calculatePopupPosition();
      // console.log("Calculated popup position:", popupPos);
      setPopupPosition(popupPos);

      // Show popup
      // console.log("Setting popup visible");
      setIsPopupVisible(true);
      return true;
    }

    // console.log("No valid range found in selection");
    return false;
  };

  // Handle clicks outside the popup
  useEffect(() => {
    if (!isPopupVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsPopupVisible(false);
        cleanupState();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopupVisible]);

  // Handle drag functionality
  useEffect(() => {
    if (!isPopupVisible || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPopupPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPopupVisible, isDragging, dragOffset]);

  // Start dragging
  const handleDragStart = (e: React.MouseEvent) => {
    if (!popupRef.current) return;

    // Only start dragging from the header area
    const target = e.target as HTMLElement;
    if (!target.closest(".popup-drag-handle")) return;

    e.preventDefault();

    const rect = popupRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    setIsDragging(true);
  };

  // Load API key
  useEffect(() => {
    chrome.storage.local.get(["openAIKey", "selectedModel"], (result) => {
      setApiKey(result.openAIKey || "");
      setSelectedModel(result.selectedModel || "gpt-4o");
    });

    // Add listener for changes to storage
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local") {
        if (changes.openAIKey) {
          setApiKey(changes.openAIKey.newValue || "");
        }
        if (changes.selectedModel) {
          setSelectedModel(changes.selectedModel.newValue || "gpt-4o");
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Validate API key
  useEffect(() => {
    if (isPopupVisible && !apiKey) {
      setLocalError(
        "API key is not set. Please set your OpenAI API key in the extension options."
      );
    } else {
      setLocalError(null);
    }
  }, [isPopupVisible, apiKey]);

  // Watch for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      try {
        // Only show icon if hover icon setting is enabled
        if (!settings.enableHoverIcon) {
          setIsIconVisible(false);
          return;
        }

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setIsIconVisible(false);
          return;
        }

        const text = selection.toString().trim();
        if (!text) {
          setIsIconVisible(false);
          return;
        }

        // Only proceed if it's a single word
        if (text.includes(" ")) {
          setIsIconVisible(false);
          return;
        }

        setSelectedWord(text);

        // Get the position for the icon
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Calculate safe position
          const safePosition = calculateSafePosition(rect);
          setPosition(safePosition);

          setIsIconVisible(true);
        }
      } catch (error) {
        console.error("Error handling selection:", error);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [settings.enableHoverIcon]);

  // Log every render
  // console.log("### RENDER:", {
  //   isIconVisible,
  //   isPopupVisible,
  //   selectedWord,
  //   position,
  //   apiKey: apiKey ? "Set" : "Not set",
  // });

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    cleanupState();
    setIsPopupVisible(true);
    setIsIconVisible(false);

    // Calculate initial popup position
    const initialPosition = calculatePopupPosition();
    setPopupPosition(initialPosition);
  };

  const handleClosePopup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsPopupVisible(false);
    cleanupState();
  };

  // Determine if there's an error to show
  const errorMessage = localError || apiError;

  // Add keyboard shortcut listener (Option + D)
  useEffect(() => {
    // console.log("Adding keyboard shortcut listener for Option+D");
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      // console.log("Removing keyboard shortcut listener");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings.enableKeyboardShortcut]);

  // Define key handler as a callback to avoid dependency issues
  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      // console.log("Key pressed:", event.key, "Alt key:", event.altKey);

      // Check if Option + D was pressed (includes the delta symbol ∂ for macOS Option+D)
      if (
        event.altKey &&
        (event.key === "d" || event.key === "D" || event.key === "∂")
      ) {
        //   console.log(
        //     "Option+D detected, keyboard shortcut enabled:",
        //     settings.enableKeyboardShortcut
        // );

        // Only proceed if keyboard shortcuts are enabled
        if (!settings.enableKeyboardShortcut) return;

        event.preventDefault();

        const selection = window.getSelection();
        // console.log("Current selection:", selection?.toString());

        const success = processSelection();
        // console.log("Process selection result:", success);

        if (success) {
          setIsIconVisible(false); // Hide the icon when opening via keyboard

          // Calculate initial popup position and set it
          const initialPosition = calculatePopupPosition();
          setPopupPosition(initialPosition);

          // console.log("Setting popup position:", initialPosition);
        }
      }
    },
    [settings.enableKeyboardShortcut, processSelection]
  );

  // Load settings
  useEffect(() => {
    // console.log("Loading settings from storage");
    chrome.storage.local.get(
      ["enableKeyboardShortcut", "enableHoverIcon"],
      (result) => {
        // console.log("Settings loaded from storage:", result);
        const newSettings = {
          enableKeyboardShortcut:
            result.enableKeyboardShortcut !== undefined
              ? result.enableKeyboardShortcut
              : true,
          enableHoverIcon:
            result.enableHoverIcon !== undefined
              ? result.enableHoverIcon
              : true,
        };

        // console.log("New settings:", newSettings);
        setSettings(newSettings);
      }
    );

    // Add listener for changes to settings
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local") {
        // console.log("Storage changes detected:", changes);
        const newSettings = { ...settings };
        let hasChanges = false;

        if (changes.enableKeyboardShortcut !== undefined) {
          newSettings.enableKeyboardShortcut =
            changes.enableKeyboardShortcut.newValue;
          hasChanges = true;
        }

        if (changes.enableHoverIcon !== undefined) {
          newSettings.enableHoverIcon = changes.enableHoverIcon.newValue;
          hasChanges = true;
        }

        if (hasChanges) {
          // console.log("Updating settings to:", newSettings);
          setSettings(newSettings);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <div id="deconstructor-root">
      {isIconVisible && (
        <button
          id="deconstructor-icon"
          className="absolute bg-gray-900 text-white rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-xl hover:bg-gray-800 transition-colors border border-gray-700"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 2147483647,
            boxShadow:
              "0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          }}
          onClick={handleIconClick}
        >
          <span className="font-bold text-lg">
            d
            <span className="text-xs align-text-top ml-0.5 text-blue-400">
              .
            </span>
          </span>
        </button>
      )}

      {isPopupVisible && (
        <div
          ref={popupRef}
          id="deconstructor-popup"
          className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-xl cursor-default"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            width: "500px",
            maxHeight: "80vh",
            zIndex: 2147483646,
            color: "white",
            overflow: "hidden",
          }}
          onMouseDown={handleDragStart}
        >
          <div className="flex justify-between items-center p-3 border-b border-gray-700 popup-drag-handle cursor-move">
            <h3 className="font-bold text-lg select-none">{selectedWord}</h3>
            <button
              className="text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md p-1 transition-colors w-8 h-8 flex items-center justify-center"
              onClick={handleClosePopup}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div
            className="overflow-auto"
            style={{
              maxHeight: "calc(80vh - 60px)",
              borderBottomLeftRadius: "0.5rem",
              borderBottomRightRadius: "0.5rem",
            }}
          >
            {errorMessage ? (
              <div className="p-6 text-center">
                <div className="text-red-500 mb-2">Error</div>
                <p className="text-gray-300">{errorMessage}</p>
                <p className="text-gray-400 mt-4">
                  Please check your API key in the extension options.
                </p>
              </div>
            ) : (
              <Deconstructor
                word={selectedWord}
                apiKey={apiKey}
                model={selectedModel}
              />
            )}

            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-300">
                  Deconstructing {selectedWord}...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentScriptApp;
