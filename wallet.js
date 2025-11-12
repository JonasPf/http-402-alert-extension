// Ethereum Wallet Management using viem
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

class EthereumWallet {
  constructor() {
    this.account = null;
    this.privateKey = null;
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
            this.privateKey = result.walletPrivateKey;
            this.account = privateKeyToAccount(this.privateKey);

            resolve(this.account);
          } catch (error) {
            console.error('Error loading wallet:', error);
            reject(error);
          }
        } else {
          // Generate new wallet
          try {
            this.privateKey = generatePrivateKey();
            this.account = privateKeyToAccount(this.privateKey);


            // Save private key to storage
            chrome.storage.local.set(
              { walletPrivateKey: this.privateKey },
              () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(this.account);
                }
              }
            );
          } catch (error) {
            console.error('Error creating wallet:', error);
            reject(error);
          }
        }
      });
    });
  }

  // Get wallet address
  getAddress() {
    return this.account ? this.account.address : null;
  }

  // Get private key
  getPrivateKey() {
    return this.privateKey;
  }


}

export { EthereumWallet };
