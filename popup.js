import { EthereumWallet } from './wallet.js';
import { createPublicClient, http } from 'viem';
import { getDisplayInfo, executePayment } from './x402.js';

import { baseSepolia } from 'viem/chains';

// State
let ethereumWallet;
let currentEvent = null;

// Initialize
window.addEventListener('load', async () => {
  setupSettingsToggle();
  setupWallet();
  checkCurrentTabStatus();
  setupEventListeners();
});

function setupSettingsToggle() {
  const settingsBtn = document.getElementById('settings-toggle-btn');
  const payView = document.getElementById('pay-view');
  const settingsView = document.getElementById('settings-view');

  settingsBtn.addEventListener('click', () => {
    const isSettingsOpen = settingsView.classList.contains('active');

    if (isSettingsOpen) {
      // Close settings -> Go back to Pay View
      settingsView.classList.remove('active');
      payView.classList.add('active');
      settingsBtn.classList.remove('active');
      settingsBtn.textContent = '⚙️'; // Gear icon
    } else {
      // Open settings
      payView.classList.remove('active');
      settingsView.classList.add('active');
      settingsBtn.classList.add('active');
      settingsBtn.textContent = '✕'; // Close icon
    }
  });
}

async function setupWallet() {
  try {
    ethereumWallet = new EthereumWallet();
    await ethereumWallet.initialize();

    const address = ethereumWallet.getAddress();
    // Display full address in the code element, CSS will handle truncation
    document.getElementById('wallet-address').textContent = address;
    document.getElementById('wallet-address').title = address; // Tooltip for full address

    updateBalance(address);

    // Setup private key display
    const privateKey = ethereumWallet.getPrivateKey();
    document.getElementById('private-key').textContent = privateKey;

  } catch (error) {
    console.error('Wallet setup error:', error);
    document.getElementById('wallet-address').textContent = 'Error loading wallet';
  }
}

async function updateBalance(address) {
  try {
    const balanceEl = document.getElementById('wallet-balance');
    const balanceLabel = document.querySelector('.balance-label');

    balanceLabel.textContent = 'Balance (on Base Sepolia)';

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    });

    // USDC Contract Address on Base Sepolia
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

    // ERC20 balanceOf ABI
    const abi = [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    }, {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint8' }]
    }];

    // Read balance
    const balance = await publicClient.readContract({
      address: usdcAddress,
      abi: abi,
      functionName: 'balanceOf',
      args: [address]
    });

    // Read decimals (usually 6 for USDC)
    const decimals = await publicClient.readContract({
      address: usdcAddress,
      abi: abi,
      functionName: 'decimals'
    });

    // Format balance
    const formatted = (Number(balance) / Math.pow(10, Number(decimals))).toFixed(2);

    balanceEl.textContent = `${formatted} USDC`;

    if (balance === 0n) {
      balanceEl.style.color = 'var(--warning)';
    } else {
      balanceEl.style.color = 'var(--success)';
    }
  } catch (e) {
    console.error('Error fetching USDC balance:', e);
    document.getElementById('wallet-balance').textContent = 'Error';
  }
}



function checkCurrentTabStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    const currentTab = tabs[0];

    // Read directly from session storage
    chrome.storage.session.get(['current402'], (result) => {
      const current = result.current402 || {};
      const event = current[currentTab.id];

      renderPaymentStatus(event);
    });
  });
}



function renderPaymentStatus(event) {
  const alertsList = document.getElementById('alerts-list');

  alertsList.innerHTML = '';

  if (!event) {
    alertsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <p>No paid content available</p>
        <small>Reload page to check again</small>
      </div>

    `;
    return;
  }

  // Render the single active event card
  const card = document.createElement('div');
  card.className = 'card';

  // Check network support and prepare button text
  let buttonText = 'Pay & Access';
  let networkWarning = '';
  let buttonDisabled = false;

  if (event.paymentInfo) {
    const info = getDisplayInfo(event.paymentInfo);

    // Check if network is supported
    if (info.network && info.network !== 'base-sepolia') {
      networkWarning = `<div style="margin-top: 12px; padding: 12px; background: rgba(255,100,100,0.1); border-radius: 6px; border-left: 3px solid #ff6464; color: #ff6464;">⚠️ Unsupported network: ${info.network}</div>`;
      buttonDisabled = true;
      buttonText = 'Unsupported Network';
    } else if (info.amount !== null) {
      // Add price to button text
      buttonText = `Pay $${info.amount} ${info.currency} & Access`;
    }
  }

  card.innerHTML = `
    <div class="card-header">
      <div class="domain-name">${getDomain(event.url)}</div>
      <div class="time-ago">Payment Required</div>
    </div>
    <div class="card-body">
      <div style="margin-bottom: 8px; word-break: break-all; font-size: 12px; opacity: 0.8;">${event.url}</div>
      ${networkWarning}
    </div>
    <div class="card-footer">
      <button class="btn primary pay-btn" style="width: 100%" ${buttonDisabled ? 'disabled' : ''}>${buttonText}</button>
    </div>
  `;

  const payBtn = card.querySelector('.pay-btn');
  if (!buttonDisabled) {
    payBtn.addEventListener('click', () => showPaymentModal(event));
  }

  alertsList.appendChild(card);
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

function showPaymentModal(event) {
  currentEvent = event;
  const modal = document.getElementById('payment-modal');

  // Update modal content
  document.getElementById('modal-site').textContent = getDomain(event.url);

  const info = event.paymentInfo ? getDisplayInfo(event.paymentInfo) : null;

  // Display amount if available
  if (info && info.amount !== null) {
    document.getElementById('modal-cost').textContent = `$${info.amount} ${info.currency}`;
  } else {
    document.getElementById('modal-cost').textContent = 'Determined during payment';
  }

  // Display payment details if available
  const detailsEl = document.getElementById('payment-details');
  if (info) {
    const detailsParts = [];

    if (info.description) {
      detailsParts.push(`<div><strong>Description:</strong> ${info.description}</div>`);
    }

    if (info.network) {
      detailsParts.push(`<div><strong>Network:</strong> ${info.network}</div>`);
    }

    if (info.payTo) {
      detailsParts.push(`<div><strong>Recipient:</strong> <code style="font-size: 10px;">${info.payTo}</code></div>`);
    }

    if (info.scheme) {
      detailsParts.push(`<div><strong>Scheme:</strong> ${info.scheme}</div>`);
    }

    if (detailsParts.length > 0) {
      detailsEl.innerHTML = `<div style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 12px; line-height: 1.8;">${detailsParts.join('')}</div>`;
    } else {
      detailsEl.innerHTML = '';
    }
  } else {
    detailsEl.innerHTML = '';
  }

  // Clear any previous status
  const statusEl = document.getElementById('payment-status');
  statusEl.textContent = '';
  statusEl.className = 'status-message';

  // Reset button
  const confirmBtn = document.getElementById('confirm-payment-btn');
  confirmBtn.disabled = false;

  // Show modal
  modal.style.display = 'flex';
}

function hidePaymentModal() {
  document.getElementById('payment-modal').style.display = 'none';
  currentEvent = null;
}

async function processPayment() {
  if (!currentEvent || !ethereumWallet) return;

  const statusEl = document.getElementById('payment-status');
  const confirmBtn = document.getElementById('confirm-payment-btn');

  try {
    confirmBtn.disabled = true;
    statusEl.textContent = 'Processing payment...';
    statusEl.className = 'status-message loading';

    const privateKey = ethereumWallet.getPrivateKey();

    const content = await executePayment(currentEvent, privateKey);

    statusEl.textContent = 'Success! Opening content...';
    statusEl.className = 'status-message success';

    // Clear badge after successful payment
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.runtime.sendMessage({ action: 'clearBadge', tabId: tabs[0].id });
      }
    });

    // Store content in session storage and open display tab
    const contentKey = `paid_content_${Date.now()}`;
    chrome.storage.session.set({ [contentKey]: content }, () => {
      chrome.tabs.create({
        url: `content-display.html?key=${contentKey}`,
        active: true
      });
    });

    setTimeout(hidePaymentModal, 1000);

  } catch (error) {
    console.log("Payment failed: ", error);
    statusEl.textContent = error.message;
    statusEl.className = 'status-message error';
    confirmBtn.disabled = false;
  }
}


function setupEventListeners() {
  // Modal
  document.querySelector('.close-modal').addEventListener('click', hidePaymentModal);
  document.getElementById('cancel-payment-btn').addEventListener('click', hidePaymentModal);
  document.getElementById('confirm-payment-btn').addEventListener('click', processPayment);

  // Settings
  document.getElementById('reveal-key-btn').addEventListener('click', () => {
    const section = document.getElementById('private-key-section');
    section.classList.toggle('open');
    const arrow = document.querySelector('.arrow');
    arrow.style.transform = section.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
  });

  // Copy Buttons
  document.getElementById('copy-address-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(ethereumWallet.getAddress());
  });

  document.getElementById('copy-key-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(ethereumWallet.getPrivateKey());
  });

  // Faucet
  document.getElementById('faucet-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(ethereumWallet.getAddress());
    chrome.tabs.create({ url: 'https://faucet.circle.com/' });
  });
}
