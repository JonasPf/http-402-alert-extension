import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

export function getDisplayInfo(paymentRequired) {
    if (!paymentRequired || !paymentRequired.accepts) return null;
    const req = paymentRequired.accepts.find(r => r.network === 'eip155:84532');

    if (!req) {
        throw new Error('No compatible payment requirement found (need eip155:84532 exact scheme)');
    }

    const decimals = 6;
    const amountVal = req.amount || req.maxAmountRequired;
    const amount = amountVal ? (Number(amountVal) / Math.pow(10, decimals)).toFixed(2) : null;

    return {
        amount: amount,
        currency: req.extra?.name || 'USDC',
        network: req.network === 'eip155:84532' ? 'base-sepolia' : req.network,
        description: paymentRequired.resource?.description || req.description,
        payTo: req.payTo,
        scheme: req.scheme
    };
}

export async function executePayment(event, privateKey) {
    const account = privateKeyToAccount(privateKey);
    const now = Math.floor(Date.now() / 1000);
    const nonce = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;


    const paymentRequired = event.paymentInfo;

    const requirement = paymentRequired.accepts.find(
        req => req.network === 'eip155:84532' && req.scheme === 'exact'
    );


    if (!requirement) {
        throw new Error('No compatible payment requirement found (need eip155:84532 exact scheme)');
    }

    const authorization = {
        from: account.address,
        to: requirement.payTo,
        value: requirement.amount,
        validAfter: now.toString(),
        validBefore: (now + 300).toString(), // 5 minutes
        nonce: nonce
    };

    const client = createWalletClient({
        account,
        transport: http(),
        chain: baseSepolia
    });

    const domain = {
        name: requirement.extra?.name || 'USDC',
        version: requirement.extra?.version || '2',
        chainId: 84532,
        verifyingContract: requirement.asset
    };

    const types = {
        TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' }
        ]
    };

    const signature = await client.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message: authorization
    });



    const paymentPayload = {
        x402Version: 2,
        resource: paymentRequired.resource,
        accepted: requirement,

        payload: {
            signature,
            authorization
        }
    };

    const paymentSignatureHeader = btoa(JSON.stringify(paymentPayload));

    const paymentResponse = await fetch(event.url, {
        method: 'GET',
        headers: {
            'PAYMENT-SIGNATURE': paymentSignatureHeader
        }
    });



    if (!paymentResponse.ok) {
        const paymentResponseHeader = paymentResponse.headers.get('payment-response');


        if (paymentResponseHeader) {
            const responseData = JSON.parse(atob(paymentResponseHeader));

            throw new Error(responseData.errorReason || responseData.error || 'Payment failed');
        }

        // Also try to get error from body
        const errorBody = await paymentResponse.text();
        throw new Error('Payment failed without valid x402 payment-response header: ' + errorBody);
    }

    // Success!
    const content = await paymentResponse.text();
    return content;
}
