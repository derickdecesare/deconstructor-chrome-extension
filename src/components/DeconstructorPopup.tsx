import React, { useEffect, useState } from "react";
import Deconstructor from "@/components/Deconstructor";

interface DeconstructorPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  apiKey: string;
}

const DeconstructorPopup: React.FC<DeconstructorPopupProps> = ({
  word,
  position,
  onClose,
  apiKey,
}) => {
  console.log(
    "DeconstructorPopup rendering with word:",
    word,
    "position:",
    position
  );
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    // Adjust position to ensure popup is visible within viewport
    const popupWidth = 500; // estimated width
    const popupHeight = 400; // estimated height

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontally if needed
    if (x + popupWidth > viewportWidth) {
      x = Math.max(0, viewportWidth - popupWidth);
    }

    // Adjust vertically if needed
    if (y + popupHeight > viewportHeight) {
      // Show above selection instead of below if there's not enough space below
      y = position.y - popupHeight - 20; // 20px above selection

      // If still not enough space, just put it at the top
      if (y < 0) {
        y = 10;
      }
    }

    console.log("Adjusted popup position:", { x, y });
    setAdjustedPosition({ x, y });
  }, [position]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      console.log("Click detected, checking if outside popup");
      const target = event.target as HTMLElement;
      if (!target.closest("#deconstructor-popup")) {
        console.log("Click was outside popup, closing");
        onClose();
      } else {
        console.log("Click was inside popup, keeping open");
      }
    };

    console.log("Adding clickOutside listener for popup");
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      console.log("Removing clickOutside listener for popup");
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!word) {
    console.log("No word provided to popup, not rendering");
    return null;
  }

  return (
    <div
      id="deconstructor-popup"
      className="fixed z-[2147483646] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        width: "500px",
        maxHeight: "80vh",
        pointerEvents: "auto",
      }}
    >
      <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium">Deconstructor: {word}</h3>
        <button
          onClick={(e) => {
            console.log("Close button clicked");
            e.stopPropagation();
            onClose();
          }}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div
        className="p-4 overflow-auto"
        style={{ maxHeight: "calc(80vh - 55px)" }}
      >
        <Deconstructor word={word} apiKey={apiKey} />
      </div>
    </div>
  );
};

export default DeconstructorPopup;
