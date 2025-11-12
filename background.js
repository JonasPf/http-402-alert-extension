// Store detected 402 responses
let detected402Events = [];

// Listen for response headers to capture 402 with headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.statusCode === 402) {
      console.log('402 Payment Required detected:', details.url);
      console.log('Full request details:', details);
      
      // Extract payment headers
      const headers = {};
      if (details.responseHeaders) {
        details.responseHeaders.forEach(header => {
          headers[header.name.toLowerCase()] = header.value;
        });
      }
      
      console.log('Response headers:', headers);
      
      // Store the event with payment info
      const event = {
        url: details.url,
        timestamp: new Date().toISOString(),
        method: details.method,
        headers: headers,
        paymentInfo: headers['www-authenticate'] || null,
        acceptsHeader: headers['accepts'] || null
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
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getEvents') {
    sendResponse({ events: detected402Events });
  } else if (request.action === 'clearBadge') {
    chrome.action.setBadgeText({ text: '' });
  } else if (request.action === 'openContentTab') {
    // Open a new tab with the fetched content
    chrome.tabs.create({
      url: 'about:blank'
    }, (tab) => {
      // Inject the content into the new tab
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (content) => {
          document.open();
          document.write(content);
          document.close();
        },
        args: [request.content]
      });
      sendResponse({ success: true, tabId: tab.id });
    });
    return true; // Keep channel open for async response
  }
  return true;
});
