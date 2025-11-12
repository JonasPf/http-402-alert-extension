// Ethereum Wallet Management

class EthereumWallet {
  constructor() {
    this.wallet = null;
  }

  // Initialize or retrieve wallet
  async initialize() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['walletPrivateKey'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        if (result.walletPrivateKey) {
          // Load existing wallet
          try {
            this.wallet = new ethers.Wallet(result.walletPrivateKey);
            console.log('Loaded existing wallet');
            resolve(this.wallet);
          } catch (error) {
            console.error('Error loading wallet:', error);
            reject(error);
          }
        } else {
          // Generate new wallet
          this.wallet = ethers.Wallet.createRandom();
          console.log('Generated new wallet');
          
          // Save private key to storage
          chrome.storage.local.set(
            { walletPrivateKey: this.wallet.privateKey },
            () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(this.wallet);
              }
            }
          );
        }
      });
    });
  }

  // Get wallet address
  getAddress() {
    return this.wallet ? this.wallet.address : null;
  }

  // Get private key
  getPrivateKey() {
    return this.wallet ? this.wallet.privateKey : null;
  }

  // Format address for display (shortened)
  getShortAddress() {
    const address = this.getAddress();
    if (!address) return 'Loading...';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
