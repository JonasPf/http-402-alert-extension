import { EthereumWallet } from './wallet.js';
import { wrapFetchWithPayment } from 'x402-fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Initialize wallet when DOM and scripts are ready
let ethereumWallet;

// Wait for ethers.js to load
window.addEventListener('load', () => {
  try {
    ethereumWallet = new EthereumWallet();
    
    // Initialize wallet and display address
    ethereumWallet.initialize()
      .then(() => {
        const address = ethereumWallet.getAddress();
        document.getElementById('wallet-address').textContent = address;
      })
      .catch((error) => {
        console.error('Error initializing wallet:', error);
        document.getElementById('wallet-address').textContent = 'Error: ' + error.message;
      });
  } catch (error) {
    console.error('Error setting up wallet:', error);
    document.getElementById('wallet-address').textContent = 'Setup error: ' + error.message;
  }
});

// Request events from background script
chrome.runtime.sendMessage({ action: 'getEvents' }, (response) => {
  displayEvents(response.events);
  // Fetch payment details for all events
  if (response.events && response.events.length > 0) {
    response.events.forEach(event => {
      fetchPaymentDetails(event);
    });
  }
});

// Clear badge when popup opens
chrome.runtime.sendMessage({ action: 'clearBadge' });

let currentEvent = null;
const paymentDetailsCache = new Map();

async function fetchPaymentDetails(event) {
  try {
    console.log('Fetching payment details for:', event.url);
    const response = await fetch(event.url, { method: 'GET' });
    
    if (response.status === 402) {
      const paymentData = await response.json();
      console.log('Payment data for', event.url, ':', paymentData);
      
      // Cache the payment details
      paymentDetailsCache.set(event.url, paymentData);
      
      // Update the UI with payment details
      updateEventWithPaymentDetails(event.url, paymentData);
    }
  } catch (error) {
    console.error('Error fetching payment details for', event.url, ':', error);
  }
}

function updateEventWithPaymentDetails(url, paymentData) {
  const eventElements = document.querySelectorAll('.event-item');
  
  eventElements.forEach(eventEl => {
    const urlDiv = eventEl.querySelector('.event-url');
    if (urlDiv && urlDiv.textContent === url) {
      // Check if payment details already exist
      let detailsDiv = eventEl.querySelector('.payment-details-preview');
      
      if (!detailsDiv && paymentData.accepts && paymentData.accepts.length > 0) {
        const firstAccept = paymentData.accepts[0];
        
        detailsDiv = document.createElement('div');
        detailsDiv.className = 'payment-details-preview';
        detailsDiv.innerHTML = `
          <div style="font-size: 11px; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
            <div style="margin-bottom: 4px;">💰 Amount: <strong>${firstAccept.maxAmountRequired || 'N/A'}</strong></div>
            <div style="margin-bottom: 4px;">🪙 Token: <strong>${firstAccept.token || 'N/A'}</strong></div>
            <div style="margin-bottom: 4px;">🌐 Network: <strong>${firstAccept.network || 'N/A'}</strong></div>
            <div style="font-size: 10px; font-family: monospace; opacity: 0.8;">→ ${firstAccept.receiver ? firstAccept.receiver.substring(0, 20) + '...' : 'N/A'}</div>
          </div>
        `;
        
        // Insert before the pay button
        const payBtn = eventEl.querySelector('.pay-btn');
        eventEl.insertBefore(detailsDiv, payBtn);
      }
    }
  });
}

function displayEvents(events) {
  const container = document.getElementById('events-container');
  
  if (!events || events.length === 0) {
    container.innerHTML = '<p class="no-events">No 402 responses detected yet.</p>';
    return;
  }
  
  container.innerHTML = '';
  
  events.forEach((event) => {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-item';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'event-time';
    timeDiv.textContent = new Date(event.timestamp).toLocaleString();
    
    const methodDiv = document.createElement('div');
    methodDiv.className = 'event-method';
    methodDiv.textContent = event.method;
    
    const urlDiv = document.createElement('div');
    urlDiv.className = 'event-url';
    urlDiv.textContent = event.url;
    urlDiv.title = event.url;
    
    // Add pay button
    const payBtn = document.createElement('button');
    payBtn.className = 'pay-btn';
    payBtn.textContent = '💳 Pay & Access Content';
    payBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPaymentModal(event);
    });
    
    eventDiv.appendChild(timeDiv);
    eventDiv.appendChild(methodDiv);
    eventDiv.appendChild(urlDiv);
    eventDiv.appendChild(payBtn);
    
    container.appendChild(eventDiv);
  });
}

function showPaymentModal(event) {
  currentEvent = event;
  const modal = document.getElementById('payment-modal');
  const detailsDiv = document.getElementById('payment-details');
  const statusDiv = document.getElementById('payment-status');
  
  console.log('Opening payment modal for event:', event);
  
  // Clear previous status
  statusDiv.textContent = '';
  statusDiv.className = 'payment-status';
  
  // Display payment details
  let detailsHTML = `
    <strong>URL:</strong>
    <div style="word-break: break-all; margin-bottom: 12px;">${event.url}</div>
  `;
  
  // Check if we have cached payment details
  const cachedDetails = paymentDetailsCache.get(event.url);
  if (cachedDetails && cachedDetails.accepts && cachedDetails.accepts.length > 0) {
    const firstAccept = cachedDetails.accepts[0];
    detailsHTML += `
      <strong>Payment Details:</strong>
      <div style="margin-bottom: 8px;">
        <div style="font-size: 12px; margin-bottom: 4px;">💰 Amount: <strong>${firstAccept.maxAmountRequired || 'N/A'}</strong></div>
        <div style="font-size: 12px; margin-bottom: 4px;">🪙 Token: <strong>${firstAccept.token || 'N/A'}</strong></div>
        <div style="font-size: 12px; margin-bottom: 4px;">🌐 Network: <strong>${firstAccept.network || 'N/A'}</strong></div>
        <div style="font-size: 12px; margin-bottom: 4px;">→ Receiver: <strong style="font-family: monospace; font-size: 10px;">${firstAccept.receiver || 'N/A'}</strong></div>
      </div>
    `;
  } else if (event.paymentInfo) {
    detailsHTML += `
      <strong>Payment Info:</strong>
      <div style="word-break: break-all; font-size: 11px; font-family: monospace; margin-bottom: 12px;">${event.paymentInfo}</div>
    `;
  }
  
  detailsDiv.innerHTML = detailsHTML;
  modal.style.display = 'flex';
}

function hidePaymentModal() {
  const modal = document.getElementById('payment-modal');
  modal.style.display = 'none';
  currentEvent = null;
}

async function processPayment() {
  if (!currentEvent || !ethereumWallet) {
    console.error('Missing current event or wallet');
    return;
  }
  
  const statusDiv = document.getElementById('payment-status');
  const confirmBtn = document.getElementById('confirm-payment-btn');
  const detailsDiv = document.getElementById('payment-details');
  
  try {
    // Disable button and show loading
    confirmBtn.disabled = true;
    statusDiv.className = 'payment-status loading';
    statusDiv.textContent = '⏳ Preparing payment...';
    
    console.log('Starting payment process for URL:', currentEvent.url);
    
    // Check if we have cached payment details
    const cachedDetails = paymentDetailsCache.get(currentEvent.url);
    if (cachedDetails) {
      console.log('Using cached payment requirements:', cachedDetails);
    } else {
      console.log('No cached payment details, will be fetched by x402-fetch');
    }
    
    // Get the private key from wallet
    const privateKey = ethereumWallet.getPrivateKey();
    console.log('Wallet address:', ethereumWallet.getAddress());
    
    // Create viem wallet client
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      transport: http(),
      chain: baseSepolia
    });
    console.log('Created wallet client for chain:', baseSepolia.name);
    
    // Wrap fetch with payment handling
    const fetchWithPay = wrapFetchWithPayment(fetch, client);
    
    statusDiv.textContent = '💸 Sending payment and fetching content...';
    console.log('Calling fetchWithPay...');
    
    // Fetch with payment
    const response = await fetchWithPay(currentEvent.url, {
      method: 'GET'
    });
    
    console.log('Payment response status:', response.status);
    console.log('Payment response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log('Fetched content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));
    
    statusDiv.className = 'payment-status success';
    statusDiv.textContent = '✓ Payment successful! Opening content...';
    
    // Open new tab with content
    chrome.runtime.sendMessage({
      action: 'openContentTab',
      content: content
    }, (response) => {
      console.log('Tab creation response:', response);
      if (response && response.success) {
        setTimeout(() => {
          hidePaymentModal();
        }, 1000);
      }
    });
    
  } catch (error) {
    console.error('Payment error:', error);
    console.error('Error stack:', error.stack);
    statusDiv.className = 'payment-status error';
    statusDiv.textContent = `❌ Error: ${error.message}`;
    confirmBtn.disabled = false;
  }
}

// Clear button handler
document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearBadge' });
  window.close();
});

// Copy address button handler
document.getElementById('copy-address-btn').addEventListener('click', () => {
  if (!ethereumWallet) return;
  const address = ethereumWallet.getAddress();
  if (address) {
    navigator.clipboard.writeText(address).then(() => {
      const btn = document.getElementById('copy-address-btn');
      const originalText = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1000);
    });
  }
});

// Reveal private key button handler
document.getElementById('reveal-key-btn').addEventListener('click', () => {
  if (!ethereumWallet) return;
  const privateKeySection = document.getElementById('private-key-section');
  const revealBtn = document.getElementById('reveal-key-btn');
  
  if (privateKeySection.style.display === 'none') {
    const privateKey = ethereumWallet.getPrivateKey();
    document.getElementById('private-key').textContent = privateKey;
    privateKeySection.style.display = 'block';
    revealBtn.textContent = 'Hide Private Key';
  } else {
    privateKeySection.style.display = 'none';
    revealBtn.textContent = 'Reveal Private Key';
  }
});

// Copy private key button handler
document.getElementById('copy-key-btn').addEventListener('click', () => {
  if (!ethereumWallet) return;
  const privateKey = ethereumWallet.getPrivateKey();
  if (privateKey) {
    navigator.clipboard.writeText(privateKey).then(() => {
      const btn = document.getElementById('copy-key-btn');
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1000);
    });
  }
});

// Payment modal event handlers
document.getElementById('confirm-payment-btn').addEventListener('click', () => {
  processPayment();
});

document.getElementById('cancel-payment-btn').addEventListener('click', () => {
  hidePaymentModal();
});
