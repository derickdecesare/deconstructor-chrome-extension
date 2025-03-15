import React, { useState, useEffect } from "react";

const OptionsApp: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load API key from storage
    chrome.storage.local.get(["openAIKey"], (result) => {
      if (result.openAIKey) {
        setApiKey(result.openAIKey);
      }
    });
  }, []);

  const handleSave = () => {
    // Save API key to storage
    chrome.storage.local.set({ openAIKey: apiKey }, () => {
      // Notify content scripts about key update
      chrome.runtime.sendMessage({ action: "apiKeysUpdated" });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Deconstructor Settings</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>

        <div className="mb-4">
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            OpenAI API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally and used only for word analysis.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          {isSaved ? "Saved!" : "Save API Key"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">About Deconstructor</h2>
        <p className="mb-4">
          Deconstructor is a Chrome extension that helps you understand words by
          breaking them down into their etymological components.
        </p>
        <p className="mb-4">
          To use it, simply highlight a single word on any webpage, right-click,
          and select "Deconstruct" from the context menu.
        </p>
        <p className="text-sm text-gray-500">
          This extension requires an OpenAI API key to function. Your API key is
          stored locally on your device and is never sent to our servers.
        </p>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          Get an OpenAI API key
        </a>
      </div>
    </div>
  );
};

export default OptionsApp;
