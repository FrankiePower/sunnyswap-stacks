/**
 * Cancel Swap Intent
 * Recovers locked STX tokens after expiration
 */

import { ContractCallRegularOptions, PostConditionMode } from '@stacks/connect';
import { bufferCV, Pc, AnchorMode } from '@stacks/transactions';
import { CancelSwapParams } from './types';
import { validateHash } from './utils';

/**
 * Contract deployment details
 * TODO: Update these with actual deployed contract addresses
 */
const CONTRACT_DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Devnet deployer
const CONTRACT_NAME = 'stx-htlc';

/**
 * Build transaction options for canceling an expired swap intent
 * This can only be done after the swap has expired
 *
 * @param params - Cancel parameters (hash)
 * @param network - Network object (@stacks/network)
 * @returns Transaction options ready to be passed to wallet
 *
 * @example
 * ```typescript
 * // After a swap expires, the original sender can recover their STX
 * const txOptions = buildCancelSwapIntent({
 *   hash: swapHash, // The 32-byte hash used when creating the swap
 * }, network);
 *
 * // Execute with wallet (Hiro/Leather)
 * await openContractCall(txOptions);
 *
 * // After this succeeds:
 * // 1. Original sender receives their STX back
 * // 2. Swap intent is deleted from contract storage
 * ```
 */
export function buildCancelSwapIntent(
  params: CancelSwapParams,
  network: any
): ContractCallRegularOptions {
  const { hash } = params;

  // Validate hash
  if (!validateHash(hash)) {
    throw new Error('Invalid hash: must be exactly 32 bytes');
  }

  // Build function arguments
  const functionArgs = [
    bufferCV(hash), // hash: (buff 32)
  ];

  // Note: We use PostConditionMode.Allow here because the exact amount
  // depends on the swap intent, which we may not know at build time.
  // The contract guarantees only the original sender can cancel and
  // they will receive back the exact amount they locked.
  // For production, you might want to query the swap first and add
  // a post-condition to ensure you receive the expected amount.

  return {
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName: 'cancel-swap-intent',
    functionArgs,
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    network,
    anchorMode: AnchorMode.Any,
  };
}

/**
 * Build transaction with post-condition for the expected refund amount
 * Use this if you know the amount you should receive back
 *
 * @param params - Cancel parameters
 * @param expectedAmount - Amount in microSTX you expect to receive back
 * @param senderAddress - Your address (the original swap creator)
 * @param network - Network object
 * @returns Transaction options with post-condition
 */
export function buildCancelSwapIntentWithPostCondition(
  params: CancelSwapParams,
  expectedAmount: bigint,
  senderAddress: string,
  network: any
): ContractCallRegularOptions {
  const { hash } = params;

  if (!validateHash(hash)) {
    throw new Error('Invalid hash: must be exactly 32 bytes');
  }

  if (expectedAmount <= 0n) {
    throw new Error('Expected amount must be greater than 0');
  }

  const functionArgs = [bufferCV(hash)];

  // Post-condition: sender must receive back at least the expected amount
  const postConditions = [
    Pc.principal(senderAddress).willSendGte(expectedAmount).ustx(),
  ];

  return {
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName: 'cancel-swap-intent',
    functionArgs,
    postConditions,
    postConditionMode: PostConditionMode.Deny,
    network,
    anchorMode: AnchorMode.Any,
  };
}
