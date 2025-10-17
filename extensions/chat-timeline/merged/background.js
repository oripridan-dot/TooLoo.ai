// Background service worker for AI Chat Timeline Navigator

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Timeline] Extension installed');
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://chat.openai.com'
    });
  } else if (details.reason === 'update') {
    console.log('[Timeline] Extension updated');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeConversation') {
    // Future: Handle AI-powered segmentation here
    sendResponse({ success: true });
  }
  return true;
});
