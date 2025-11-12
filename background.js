// Store detected 402 responses
let detected402Events = [];

// Listen for completed web requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode === 402) {
      console.log('402 Payment Required detected:', details.url);
      
      // Store the event
      const event = {
        url: details.url,
        timestamp: new Date().toISOString(),
        method: details.method
      };
      
      detected402Events.unshift(event);
      
      // Keep only the last 50 events
      if (detected402Events.length > 50) {
        detected402Events = detected402Events.slice(0, 50);
      }
      
      // Create a notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: '402 Payment Required Detected',
        message: `URL: ${details.url}`,
        priority: 2
      });
      
      // Open popup automatically
      chrome.action.openPopup().catch(() => {
        // Popup can only be opened in response to user action in some contexts
        console.log('Could not open popup automatically');
      });
      
      // Update badge
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    }
  },
  { urls: ["<all_urls>"] }
);

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getEvents') {
    sendResponse({ events: detected402Events });
  } else if (request.action === 'clearBadge') {
    chrome.action.setBadgeText({ text: '' });
  }
  return true;
});
