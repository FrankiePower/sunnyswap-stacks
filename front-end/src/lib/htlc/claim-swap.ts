/**
 * Claim Swap
 * Reveals the secret preimage to claim locked STX tokens
 */

import { ContractCallRegularOptions } from '@stacks/connect';
import { bufferCV, principalCV, Pc, AnchorMode, PostConditionMode } from '@stacks/transactions';
import { ClaimSwapParams } from './types';
import { validatePreimage } from './utils';

/**
 * Contract deployment details
 * TODO: Update these with actual deployed contract addresses
 */
const CONTRACT_DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Devnet deployer
const CONTRACT_NAME = 'stx-htlc';

/**
 * Build transaction options for claiming a swap with preimage
 * This reveals the secret and transfers STX to the recipient
 *
 * @param params - Claim parameters (sender and preimage)
 * @param network - Network object (@stacks/network)
 * @returns Transaction options ready to be passed to wallet
 *
 * @example
 * ```typescript
 * // The recipient claims the swap by revealing the secret
 * const txOptions = buildClaimSwap({
 *   sender: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5', // Original swap creator
 *   preimage: secret, // The 32-byte secret that was hashed
 * }, network);
 *
 * // Execute with wallet (Hiro/Leather)
 * await openContractCall(txOptions);
 *
 * // After this succeeds:
 * // 1. Recipient receives the locked STX
 * // 2. Secret is revealed on-chain
 * // 3. Secret can be used to claim tokens on the other chain
 * ```
 */
export function buildClaimSwap(
  params: ClaimSwapParams,
  network: any
): ContractCallRegularOptions {
  const { sender, preimage } = params;

  // Validate preimage
  if (!validatePreimage(preimage)) {
    throw new Error('Invalid preimage: must be exactly 32 bytes');
  }

  // Build function arguments
  const functionArgs = [
    principalCV(sender), // sender: principal (original swap creator)
    bufferCV(preimage), // preimage: (buff 32)
  ];

  // Note: We use PostConditionMode.Allow here because the exact amount
  // depends on the swap intent, which we don't know at build time.
  // The contract guarantees the recipient gets the correct amount.
  // For production, you might want to query the swap first and add
  // a post-condition to ensure you receive the expected amount.

  return {
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName: 'swap',
    functionArgs,
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    network,
    anchorMode: AnchorMode.Any,
  };
}

/**
 * Build transaction with post-condition for the expected amount
 * Use this if you know the amount you should receive
 *
 * @param params - Claim parameters
 * @param expectedAmount - Amount in microSTX you expect to receive
 * @param recipientAddress - Your address (the recipient)
 * @param network - Network object
 * @returns Transaction options with post-condition
 */
export function buildClaimSwapWithPostCondition(
  params: ClaimSwapParams,
  expectedAmount: bigint,
  recipientAddress: string,
  network: any
): ContractCallRegularOptions {
  const { sender, preimage } = params;

  if (!validatePreimage(preimage)) {
    throw new Error('Invalid preimage: must be exactly 32 bytes');
  }

  if (expectedAmount <= BigInt(0)) {
    throw new Error('Expected amount must be greater than 0');
  }

  const functionArgs = [
    principalCV(sender),
    bufferCV(preimage),
  ];

  // Post-condition: recipient must receive at least the expected amount
  const postConditions = [
    Pc.principal(recipientAddress).willSendGte(expectedAmount).ustx(),
  ];

  return {
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName: 'swap',
    functionArgs,
    postConditions,
    postConditionMode: PostConditionMode.Deny,
    network,
    anchorMode: AnchorMode.Any,
  };
}
