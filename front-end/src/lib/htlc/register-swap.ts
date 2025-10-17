/**
 * Register Swap Intent
 * Creates a new HTLC swap intent on Stacks, locking STX tokens
 */

import { ContractCallRegularOptions } from '@stacks/connect';
import {
  bufferCV,
  uintCV,
  principalCV,
  Pc,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions';
import { RegisterSwapParams } from './types';
import { validateHash } from './utils';

/**
 * Contract deployment details
 * TODO: Update these with actual deployed contract addresses
 */
const CONTRACT_DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Devnet deployer
const CONTRACT_NAME = 'stx-htlc';

/**
 * Build transaction options for registering a swap intent
 * This locks STX tokens in the HTLC contract
 *
 * @param params - Swap registration parameters
 * @param senderAddress - Address of the user creating the swap
 * @param network - Network object (@stacks/network)
 * @returns Transaction options ready to be passed to wallet
 *
 * @example
 * ```typescript
 * const secret = generateSecret();
 * const hash = await hashSecret(secret);
 * const currentHeight = await getCurrentBlockHeight(network);
 * const expirationHeight = calculateExpirationHeight(24, currentHeight); // 24 hours
 *
 * const txOptions = buildRegisterSwapIntent({
 *   hash,
 *   expirationHeight,
 *   amount: stxToMicroStx(10), // 10 STX
 *   recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
 * }, userAddress, network);
 *
 * // Execute with wallet (Hiro/Leather)
 * await openContractCall(txOptions);
 * ```
 */
export function buildRegisterSwapIntent(
  params: RegisterSwapParams,
  senderAddress: string,
  network: any
): ContractCallRegularOptions {
  const { hash, expirationHeight, amount, recipient } = params;

  // Validate hash
  if (!validateHash(hash)) {
    throw new Error('Invalid hash: must be exactly 32 bytes');
  }

  // Validate amount
  if (amount <= BigInt(0)) {
    throw new Error('Amount must be greater than 0');
  }

  // Validate expiration
  if (expirationHeight <= 0) {
    throw new Error('Expiration height must be greater than 0');
  }

  // Build function arguments
  const functionArgs = [
    bufferCV(hash), // hash: (buff 32)
    uintCV(expirationHeight), // expiration-height: uint
    uintCV(amount), // amount: uint
    principalCV(recipient), // recipient: principal
  ];

  // Create post-condition: sender must transfer exact amount to contract
  // This protects the user from contract bugs or unexpected behavior
  const postConditions = [
    Pc.principal(senderAddress).willSendEq(amount).ustx(),
  ];

  return {
    contractAddress: CONTRACT_DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName: 'register-swap-intent',
    functionArgs,
    postConditions,
    postConditionMode: PostConditionMode.Deny, // Require post-conditions to pass
    network,
    anchorMode: AnchorMode.Any,
  };
}
