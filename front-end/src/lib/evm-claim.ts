import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '@/contracts';

/**
 * Extract secret from Stacks transaction
 * Monitors the Stacks blockchain for the swap-completed event
 */
export async function extractSecretFromStacksTx(txid: string): Promise<string> {
  const network = process.env.STACKS_NETWORK || 'testnet';
  const apiUrl = network === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';

  console.log(`[Extract Secret] Fetching Stacks transaction: ${txid}`);

  // Wait for transaction to be confirmed
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${apiUrl}/extended/v1/tx/${txid}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.statusText}`);
      }

      const tx = await response.json();

      if (tx.tx_status === 'success') {
        console.log('[Extract Secret] Transaction confirmed!');

        // The preimage (secret) is in the function args
        // It's the second argument to the `swap` function
        if (tx.contract_call && tx.contract_call.function_args) {
          const args = tx.contract_call.function_args;

          // Find the preimage argument (buffer type)
          const preimageArg = args.find((arg: any) =>
            arg.name === 'preimage' || arg.type === '(buff 32)'
          );

          if (preimageArg && preimageArg.hex) {
            const secret = '0x' + preimageArg.hex.replace('0x', '');
            console.log('[Extract Secret] Secret extracted:', secret.substring(0, 20) + '...');
            return secret;
          }
        }

        // Fallback: check events
        if (tx.events) {
          for (const event of tx.events) {
            if (event.event_type === 'smart_contract_log') {
              const value = event.contract_log?.value;
              if (value && value.repr) {
                // Parse the event to find the preimage
                const match = value.repr.match(/preimage:\s*0x([a-fA-F0-9]+)/);
                if (match) {
                  const secret = '0x' + match[1];
                  console.log('[Extract Secret] Secret from event:', secret.substring(0, 20) + '...');
                  return secret;
                }
              }
            }
          }
        }

        throw new Error('Secret not found in transaction data');
      }

      if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') {
        throw new Error(`Transaction failed: ${tx.tx_status}`);
      }

      // Transaction pending, wait and retry
      console.log(`[Extract Secret] Transaction pending (${tx.tx_status}), attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      console.log(`[Extract Secret] Error, retrying... ${error}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  throw new Error('Timeout waiting for transaction confirmation');
}

/**
 * Claim EVM escrow using the revealed secret
 */
export async function claimEvmEscrow(params: {
  escrowAddress: string;
  secret: string;
  resolverPrivateKey: string;
  rpcUrl: string;
}): Promise<{
  txHash: string;
  success: boolean;
}> {
  const { escrowAddress, secret, resolverPrivateKey, rpcUrl } = params;

  console.log('[EVM Claim] Claiming escrow...');
  console.log('[EVM Claim] Escrow:', escrowAddress);
  console.log('[EVM Claim] Secret:', secret.substring(0, 20) + '...');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const resolver = new ethers.Wallet(resolverPrivateKey, provider);

  // Load the escrow contract ABI
  const escrow = new ethers.Contract(
    escrowAddress,
    ABIS.stxEscrowSrc, // Use the source escrow ABI
    resolver
  );

  console.log('[EVM Claim] Calling claim with secret...');

  // Call the claim function with the secret
  const tx = await escrow.claim(secret);

  console.log('[EVM Claim] Transaction submitted:', tx.hash);

  const receipt = await tx.wait();

  console.log('[EVM Claim] Transaction confirmed in block:', receipt.blockNumber);
  console.log('✅ RESOLVER CLAIMED EVM ESCROW!');

  return {
    txHash: tx.hash,
    success: true,
  };
}
