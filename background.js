// Store the latest 402 event per tab
// We use session storage to persist this data while the browser is open
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.set({ current402: {} });
});

// Extract payment info from response headers (v2) or body (v1)
async function extractPaymentInfo(details) {
  // Check for x402 v2: Base64 encoded payment requirements in header
  if (details.responseHeaders) {
    // Look for payment-required header (x402 v2)
    const paymentReqHeader = details.responseHeaders.find(h =>
      h.name.toLowerCase() === 'payment-required'
    );

    if (paymentReqHeader) {
      try {

        // Decode base64 and parse JSON
        const decoded = atob(paymentReqHeader.value);
        const paymentReq = JSON.parse(decoded);

        return paymentReq;
      } catch (error) {
        throw new Error('Error parsing v2 payment requirements header:', error);
      }
    }
  }

  throw new Error('No payment-required header found');
}

// Helper to extract domain
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

// Listen for response headers to capture 402 with headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.statusCode === 402 && details.tabId !== -1) {


      // Extract payment info (v2 from headers, or v1 from body)
      extractPaymentInfo(details).then(paymentInfo => {
        // Create event object with payment info
        const event = {
          url: details.url,
          paymentInfo: paymentInfo,
          tabId: details.tabId
        };

        // Store as the current 402 for this tab
        chrome.storage.session.get(['current402'], (result) => {
          const current = result.current402 || {};
          current[details.tabId] = event;
          chrome.storage.session.set({ current402: current });
        });

        // Update badge
        chrome.action.setBadgeText({ tabId: details.tabId, text: '!' });
        chrome.action.setBadgeBackgroundColor({ tabId: details.tabId, color: '#FF4757' });
      }).catch(error => {
        // This is not necessarily an error, the 402 code can be sent without payment requirements
        console.log('Cannot extract payment details:', error);
      });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clearBadge') {
    if (sender.tab) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: '' });
    } else if (request.tabId) {
      chrome.action.setBadgeText({ tabId: request.tabId, text: '' });
    }
  } else if (request.action === 'openContentTab') {


    // Store content in session storage (content is temporary)
    chrome.storage.session.set({ fetchedContent: request.content }, () => {


      // Open the content display page
      chrome.tabs.create({
        url: chrome.runtime.getURL('content-display.html')
      }, (tab) => {

        sendResponse({ success: true, tabId: tab.id });
      });
    });

    return true; // Keep channel open for async response
  }
  return true;
});
