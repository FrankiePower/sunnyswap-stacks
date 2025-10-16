import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  bufferCV,
  uintCV,
  principalCV,
  PostConditionMode,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';

const STACKS_HTLC_CONTRACT = process.env.STACKS_HTLC_CONTRACT || 'ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc';
const STACKS_NETWORK = process.env.STACKS_NETWORK || 'testnet';

export function getStacksNetwork() {
  return STACKS_NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
}

export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, name] = contractId.split('.');
  return { address, name };
}

export interface RegisterSwapParams {
  hash: string; // 0x-prefixed hex string (32 bytes)
  expirationHeight: number; // Stacks block height
  amount: number; // microSTX (1 STX = 1,000,000 microSTX)
  recipient: string; // Stacks address (maker)
  privateKey: string; // Resolver's Stacks private key
}

/**
 * Register a swap intent on Stacks HTLC contract
 * This is called by the resolver after creating the EVM escrow
 */
export async function registerSwapIntent(params: RegisterSwapParams): Promise<{
  txid: string;
  success: boolean;
}> {
  try {
    const { hash, expirationHeight, amount, recipient, privateKey } = params;

    // Convert hash from 0x-prefixed hex to Buffer (remove 0x prefix)
    const hashBuffer = Buffer.from(hash.slice(2), 'hex');

    if (hashBuffer.length !== 32) {
      throw new Error(`Invalid hash length: expected 32 bytes, got ${hashBuffer.length}`);
    }

    const network = getStacksNetwork();
    const { address: contractAddress, name: contractName } = parseContractId(STACKS_HTLC_CONTRACT);

    console.log('[Stacks Resolver] Registering swap intent:', {
      contract: STACKS_HTLC_CONTRACT,
      hash,
      expirationHeight,
      amount,
      recipient,
    });

    // Create the contract call transaction
    const txOptions = {
      contractAddress,
      contractName,
      functionName: 'register-swap-intent',
      functionArgs: [
        bufferCV(hashBuffer),
        uintCV(expirationHeight),
        uintCV(amount),
        principalCV(recipient),
      ],
      senderKey: privateKey,
      validateWithAbi: false,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);

    console.log('[Stacks Resolver] Broadcasting transaction...');
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network,
    });

    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error} - ${broadcastResponse.reason}`);
    }

    console.log('[Stacks Resolver] Transaction broadcasted:', broadcastResponse.txid);

    return {
      txid: broadcastResponse.txid,
      success: true,
    };
  } catch (error) {
    console.error('[Stacks Resolver] Error registering swap intent:', error);
    throw error;
  }
}

/**
 * Get current Stacks block height
 */
export async function getCurrentStacksBlockHeight(): Promise<number> {
  const network = getStacksNetwork();
  const response = await fetch(`${network.client.baseUrl}/v2/info`);
  const data = await response.json();
  return data.stacks_tip_height;
}

/**
 * Calculate expiration height based on timeout in seconds
 * Stacks blocks are ~10 minutes on average
 */
export async function calculateExpirationHeight(timeoutSeconds: number): Promise<number> {
  const currentHeight = await getCurrentStacksBlockHeight();
  const blocksToAdd = Math.ceil(timeoutSeconds / 600); // 600 seconds = 10 minutes
  return currentHeight + blocksToAdd;
}

/**
 * Claim STX by revealing the preimage (completes the atomic swap)
 * This is called by the maker to claim their STX
 */
export async function claimStacksSwap(params: {
  sender: string; // Resolver's Stacks address who created the HTLC
  preimage: string; // 0x-prefixed hex string (32 bytes) - THE SECRET!
  privateKey: string; // Maker's private key (recipient)
}): Promise<{
  txid: string;
  success: boolean;
}> {
  try {
    const { sender, preimage, privateKey } = params;

    // Convert preimage from 0x-prefixed hex to Buffer
    const preimageBuffer = Buffer.from(preimage.slice(2), 'hex');

    if (preimageBuffer.length !== 32) {
      throw new Error(`Invalid preimage length: expected 32 bytes, got ${preimageBuffer.length}`);
    }

    const network = getStacksNetwork();
    const { address: contractAddress, name: contractName } = parseContractId(STACKS_HTLC_CONTRACT);

    console.log('[Stacks Claim] Claiming swap:', {
      contract: STACKS_HTLC_CONTRACT,
      sender,
      preimage: preimage.substring(0, 20) + '...',
    });

    // Create the contract call transaction
    const txOptions = {
      contractAddress,
      contractName,
      functionName: 'swap',
      functionArgs: [
        principalCV(sender),
        bufferCV(preimageBuffer),
      ],
      senderKey: privateKey,
      validateWithAbi: false,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);

    console.log('[Stacks Claim] Broadcasting claim transaction...');
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network,
    });

    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error} - ${broadcastResponse.reason}`);
    }

    console.log('[Stacks Claim] Claim transaction broadcasted:', broadcastResponse.txid);
    console.log('🎉 SECRET REVEALED ON-CHAIN! Resolver can now claim EVM escrow.');

    return {
      txid: broadcastResponse.txid,
      success: true,
    };
  } catch (error) {
    console.error('[Stacks Claim] Error claiming swap:', error);
    throw error;
  }
}
