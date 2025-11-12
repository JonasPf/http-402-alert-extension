import { EthereumWallet } from './wallet.js';

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
});

// Clear badge when popup opens
chrome.runtime.sendMessage({ action: 'clearBadge' });

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
    
    eventDiv.appendChild(timeDiv);
    eventDiv.appendChild(methodDiv);
    eventDiv.appendChild(urlDiv);
    
    container.appendChild(eventDiv);
  });
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
