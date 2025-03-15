// Background script for Deconstructor extension

// Create context menu item that appears when text is selected
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "deconstructWord",
    title: 'Deconstruct "%s"',
    contexts: ["selection"],
  });
});

// Handle context menu item click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "deconstructWord" && tab?.id) {
    // Check if selection is a single word
    const selection = info.selectionText || "";
    const isSingleWord = selection.trim().split(/\s+/).length === 1;

    if (isSingleWord) {
      // Send message to content script with the selected word
      chrome.tabs.sendMessage(tab.id, {
        action: "deconstruct",
        word: selection.trim(),
      });
    } else {
      // Notify that only single words can be deconstructed
      chrome.tabs.sendMessage(tab.id, {
        action: "showNotification",
        message: "Only single words can be deconstructed.",
      });
    }
  }
});

// Listen for API key updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "apiKeysUpdated") {
    // Broadcast to all tabs that keys were updated
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: "apiKeysUpdated" });
        }
      });
    });
    sendResponse({ success: true });
  }

  return true; // Keep the message channel open for async response
});
