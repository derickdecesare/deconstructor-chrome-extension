import React, { useState, useEffect } from "react";

const PopupApp: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    console.log("PopupApp: Loading API key from storage");
    // Load API key from storage
    chrome.storage.local.get(["openAIKey"], (result) => {
      console.log("PopupApp: API key loaded:", result);
      if (result.openAIKey) {
        setApiKey(result.openAIKey);
      }
    });
  }, []);

  const handleSave = () => {
    console.log(
      "PopupApp: Saving API key:",
      apiKey ? "Non-empty key" : "Empty key"
    );
    // Save API key to storage
    chrome.storage.local.set({ openAIKey: apiKey }, () => {
      console.log("PopupApp: API key saved to storage");

      // Notify content scripts about key update
      try {
        chrome.runtime.sendMessage({ action: "apiKeysUpdated" }, (response) => {
          console.log("PopupApp: Message sent, response:", response);
        });
      } catch (error) {
        console.error("PopupApp: Error sending message:", error);
      }

      setIsSaved(true);
      setTimeout(() => {
        console.log("PopupApp: Resetting saved state");
        setIsSaved(false);
      }, 2000);
    });
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

      <button
        onClick={handleSave}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        {isSaved ? "Saved!" : "Save API Key"}
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
    </div>
  );
};

export default PopupApp;
