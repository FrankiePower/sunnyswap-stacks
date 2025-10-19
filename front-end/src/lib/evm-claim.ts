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
            // Remove Clarity buffer encoding prefix (0x02 + 00000020 for buff 32)
            // The hex includes: 0x + 02 (type) + 00000020 (length) + actual data
            let hexData = preimageArg.hex.replace('0x', '');

            // Remove Clarity prefix: 02 (1 byte) + 00000020 (4 bytes) = 10 hex chars
            if (hexData.startsWith('02000000')) {
              hexData = hexData.slice(10); // Remove first 10 chars (02 + 00000020)
            }

            const secret = '0x' + hexData;
            console.log('[Extract Secret] Secret extracted:', secret.substring(0, 20) + '...');
            console.log('[Extract Secret] Secret length:', secret.length, 'chars (should be 66 for bytes32)');
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
  immutables: {
    orderHash: string;
    hashlock: string;
    maker: string;
    taker: string;
    token: string;
    amount: string;
    safetyDeposit: string;
    timelocks: string;
  };
  deployTxHash: string;
  resolverPrivateKey: string;
  rpcUrl: string;
}): Promise<{
  txHash: string;
  success: boolean;
}> {
  const { escrowAddress, secret, immutables, deployTxHash, resolverPrivateKey, rpcUrl } = params;

  console.log('[EVM Claim] Claiming escrow...');
  console.log('[EVM Claim] Escrow:', escrowAddress);
  console.log('[EVM Claim] Secret:', secret.substring(0, 20) + '...');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const resolver = new ethers.Wallet(resolverPrivateKey, provider);

  // Get the actual deployment block timestamp to recalculate timelocks
  console.log('[EVM Claim] Fetching deployment transaction:', deployTxHash);
  const deployReceipt = await provider.getTransactionReceipt(deployTxHash);
  if (!deployReceipt) {
    throw new Error('Deploy transaction not found');
  }

  const deployBlock = await provider.getBlock(deployReceipt.blockNumber);
  if (!deployBlock) {
    throw new Error('Deploy block not found');
  }

  const deployedAt = deployBlock.timestamp;
  console.log('[EVM Claim] Escrow deployed at block timestamp:', deployedAt);

  // Extract the timelock periods from the original timelocks
  const originalTimelocks = BigInt(immutables.timelocks);
  const dstCancellation = Number((originalTimelocks >> BigInt(64)) & BigInt(0xFFFFFFFF));
  const dstPublicWithdrawal = Number((originalTimelocks >> BigInt(32)) & BigInt(0xFFFFFFFF));
  const dstWithdrawal = Number(originalTimelocks & BigInt(0xFFFFFFFF));

  console.log('[EVM Claim] Timelock periods:', { dstCancellation, dstPublicWithdrawal, dstWithdrawal });

  // Recalculate timelocks with actual deployment timestamp
  const actualTimelocks = (BigInt(deployedAt) << BigInt(224)) |
                         (BigInt(dstCancellation) << BigInt(64)) |
                         (BigInt(dstPublicWithdrawal) << BigInt(32)) |
                         BigInt(dstWithdrawal);

  console.log('[EVM Claim] Recalculated timelocks:', actualTimelocks.toString());

  // Create corrected immutables with actual timelocks
  const correctedImmutables = {
    ...immutables,
    timelocks: actualTimelocks.toString()
  };

  // Load the escrow contract ABI
  const escrow = new ethers.Contract(
    escrowAddress,
    ABIS.stxEscrowSrc, // Use the source escrow ABI
    resolver
  );

  // Convert secret to bytes32 (remove 0x prefix if present, ensure proper format)
  const secretBytes32 = secret.startsWith('0x') ? secret : '0x' + secret;

  console.log('[EVM Claim] Calling withdraw with secret...');

  // Call the withdraw function with secret and corrected immutables
  const tx = await escrow.withdraw(secretBytes32, correctedImmutables);

  console.log('[EVM Claim] Transaction submitted:', tx.hash);

  const receipt = await tx.wait();

  console.log('[EVM Claim] Transaction confirmed in block:', receipt.blockNumber);
  console.log('✅ RESOLVER CLAIMED EVM ESCROW!');

  return {
    txHash: tx.hash,
    success: true,
  };
}
