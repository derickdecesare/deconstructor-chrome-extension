import React, { useState, useEffect } from "react";

// Available models with their display names
const AVAILABLE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Default)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Faster)" },
  { id: "gpt-4.5-preview", name: "GPT-4.5 Preview" },
  // { id: "o1", name: "O1 (Reasoning)" },
  // { id: "o3-mini", name: "O3 Mini (Reasoning)" },
];

const PopupApp: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [isSaved, setIsSaved] = useState(false);
  const [enableKeyboardShortcut, setEnableKeyboardShortcut] = useState(true);
  const [enableHoverIcon, setEnableHoverIcon] = useState(true);

  useEffect(() => {
    // console.log("PopupApp: Loading settings from storage");
    // Load API key, model, and settings from storage
    chrome.storage.local.get(
      [
        "openAIKey",
        "selectedModel",
        "enableKeyboardShortcut",
        "enableHoverIcon",
      ],
      (result) => {
        // console.log("PopupApp: Settings loaded:", result);
        if (result.openAIKey) {
          setApiKey(result.openAIKey);
        }
        if (result.selectedModel) {
          setSelectedModel(result.selectedModel);
        }
        if (result.enableKeyboardShortcut !== undefined) {
          setEnableKeyboardShortcut(result.enableKeyboardShortcut);
        }
        if (result.enableHoverIcon !== undefined) {
          setEnableHoverIcon(result.enableHoverIcon);
        }
      }
    );
  }, []);

  const handleSave = () => {
    // console.log(
    //   "PopupApp: Saving settings:",
    //   apiKey ? "Non-empty key" : "Empty key"
    // );
    // Save all settings to storage
    chrome.storage.local.set(
      {
        openAIKey: apiKey,
        selectedModel: selectedModel,
        enableKeyboardShortcut: enableKeyboardShortcut,
        enableHoverIcon: enableHoverIcon,
      },
      () => {
        // console.log("PopupApp: Settings saved to storage");

        // Notify content scripts about settings update
        try {
          chrome.runtime.sendMessage(
            { action: "apiKeysUpdated" },
            (response) => {
              // console.log("PopupApp: Message sent, response:", response);
            }
          );
        } catch (error) {
          console.error("PopupApp: Error sending message:", error);
        }

        setIsSaved(true);
        setTimeout(() => {
          // console.log("PopupApp: Resetting saved state");
          setIsSaved(false);
        }, 2000);
      }
    );
  };

  return (
    <div className="w-80 p-4 bg-gray-900 text-white">
      <h1 className="text-xl font-bold mb-4">Deconstructor</h1>

      <div className="mb-4">
        <p className="text-sm mb-2">
          Highlight a word on any webpage, and select the "Deconstruct" icon to
          analyze its etymology.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
          OpenAI API Key
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Your API key is stored locally and used only for word analysis.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="modelSelect" className="block text-sm font-medium mb-1">
          AI Model
        </label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Select the model to use for word analysis. GPT-4o is recommended for
          most cases.
        </p>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">Extension Settings</h3>

        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="keyboardShortcut"
            checked={enableKeyboardShortcut}
            onChange={(e) => setEnableKeyboardShortcut(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="keyboardShortcut" className="text-sm">
            Enable keyboard shortcut (Option+D)
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="hoverIcon"
            checked={enableHoverIcon}
            onChange={(e) => setEnableHoverIcon(e.target.checked)}
            className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="hoverIcon" className="text-sm">
            Show icon when word is selected
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        {isSaved ? "Saved!" : "Save Settings"}
      </button>

      <div className="mt-4 text-xs text-gray-400 text-center">
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          Get an OpenAI API key
        </a>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center">
        This extension is based on the{" "}
        <a
          href="https://github.com/hyusap/deconstructor"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          Word Deconstructor
        </a>{" "}
        project by hyusap.
      </div>
    </div>
  );
};

export default PopupApp;
