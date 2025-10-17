/**
 * ChatTimeline Background Service Worker
 */

// Install/update handler (combined with context menu creation)
chrome.runtime.onInstalled.addListener((details) => {
  try {
    if (details.reason === 'install') {
      chrome.tabs.create({ url: 'https://chattimeline.com/welcome' });
    } else if (details.reason === 'update') {
      // Silent for now to avoid tab spam; uncomment if needed
      // chrome.tabs.create({ url: 'https://chattimeline.com/changelog' });
    }
    if (chrome.contextMenus) {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'openTimeline',
          title: 'Open ChatTimeline',
          contexts: ['page'],
          documentUrlPatterns: [
            'https://chat.openai.com/*',
            'https://chatgpt.com/*',
            'https://claude.ai/*'
          ]
        });
      });
    }
  } catch (e) {
    console.warn('[Timeline][SW] onInstalled setup issue', e);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleTimeline') {
    // Forward message to content script
    chrome.tabs.sendMessage(sender.tab.id, { action: 'toggleTimeline' });
  }
  
  if (request.action === 'trackEvent') {
    // Analytics tracking (implement with your analytics service)
    console.log('Analytics event:', request.event, request.data);
  }
  
  if (request.action === 'checkPremium') {
    // Check premium status (implement with your backend)
    chrome.storage.sync.get(['isPremium'], (result) => {
      sendResponse({ isPremium: result.isPremium || false });
    });
    return true; // Keep message channel open for async response
  }
});

// Context menu click handler (guarded)
if (chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    try {
      if (info.menuItemId === 'openTimeline' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggleTimeline' });
      }
    } catch (e) { console.warn('[Timeline][SW] context menu click failed', e); }
  });
}

// Badge management
function updateBadge(tabId, conversationLength, accent) {
  try {
    if (conversationLength > 5) {
      chrome.action.setBadgeText({ text: conversationLength.toString(), tabId });
      chrome.action.setBadgeBackgroundColor({ color: accent || '#6b7280', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch (e) { console.debug('[Timeline][SW] badge update skipped', e.message); }
}

// Tab change handler - clear badges
chrome.tabs.onActivated.addListener(() => { chrome.action.setBadgeText({ text: '' }); });

// Support dynamic badge updates from content script
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request?.action === 'updateBadge' && sender?.tab?.id) {
    updateBadge(sender.tab.id, request.conversationLength || 0, request.accent);
  }
});