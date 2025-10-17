/**
 * ChatTimeline Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get current tab and check if it's a supported platform
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const url = currentTab.url;
    
    const isSupported = url.includes('chat.openai.com') || 
                       url.includes('chatgpt.com') || 
                       url.includes('claude.ai');
    
    if (!isSupported) {
      showUnsupportedState();
    }
  });
  
  // Open Timeline button
  document.getElementById('openTimeline').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleTimeline' });
      window.close();
    });
  });
  
  // Quick Help button
  document.getElementById('quickHelp').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://chattimeline.com/help'
    });
  });
  
  // Upgrade button
  document.getElementById('upgradeBtn').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://chattimeline.com/upgrade'
    });
  });
  
  // Settings button
  document.getElementById('settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

function showUnsupportedState() {
  const status = document.querySelector('.status');
  status.innerHTML = `
    <div class="status-icon">⚠️</div>
    <p class="status-text">Navigate to ChatGPT or Claude to use timeline</p>
  `;
  
  // Disable timeline button
  const timelineBtn = document.getElementById('openTimeline');
  timelineBtn.style.opacity = '0.5';
  timelineBtn.style.cursor = 'not-allowed';
  timelineBtn.onclick = null;
}