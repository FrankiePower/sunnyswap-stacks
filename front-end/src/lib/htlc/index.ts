/**
 * HTLC (Hashed Timelock Contract) Library
 * Cross-chain atomic swaps for Stacks blockchain
 *
 * This library provides functions to interact with the stx-htlc smart contract
 * for creating and managing atomic swaps between Stacks and other chains.
 *
 * @example
 * ```typescript
 * import {
 *   generateSecret,
 *   hashSecret,
 *   buildRegisterSwapIntent,
 *   buildClaimSwap,
 *   getSwapIntent,
 *   calculateExpirationHeight,
 *   stxToMicroStx,
 * } from '@/lib/htlc';
 *
 * // Create a swap intent
 * const secret = generateSecret();
 * const hash = await hashSecret(secret);
 * const currentHeight = await getCurrentBlockHeight(network);
 * const expirationHeight = calculateExpirationHeight(24, currentHeight);
 *
 * const registerTx = buildRegisterSwapIntent({
 *   hash,
 *   expirationHeight,
 *   amount: stxToMicroStx(10),
 *   recipient: recipientAddress,
 * }, senderAddress, network);
 *
 * await openContractCall(registerTx);
 *
 * // Claim a swap (on the other side)
 * const claimTx = buildClaimSwap({
 *   sender: originalSender,
 *   preimage: secret,
 * }, network);
 *
 * await openContractCall(claimTx);
 * ```
 */

// Types
export type {
  SwapIntent,
  RegisterSwapParams,
  ClaimSwapParams,
  CancelSwapParams,
  QuerySwapParams,
} from './types';

export { HtlcErrorCode, getErrorMessage } from './types';

// Utility functions
export {
  generateSecret,
  hashSecret,
  validateHash,
  validatePreimage,
  calculateExpirationHeight,
  bytesToHex,
  hexToBytes,
  microStxToStx,
  stxToMicroStx,
  formatTimeUntilBlock,
} from './utils';

// Transaction building functions
export { buildRegisterSwapIntent } from './register-swap';

export { buildClaimSwap, buildClaimSwapWithPostCondition } from './claim-swap';

export { buildCancelSwapIntent, buildCancelSwapIntentWithPostCondition } from './cancel-swap';

// Query functions (read-only)
export {
  getSwapIntent,
  hasSwapIntent,
  isSwapExpired,
  getCurrentBlockHeight,
  getStxBalance,
} from './query-swap';

/**
 * Contract addresses by network
 * TODO: Update these when contracts are deployed
 */
export const HTLC_CONTRACTS = {
  devnet: {
    deployer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    name: 'stx-htlc',
  },
  testnet: {
    deployer: 'STXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // TODO: Deploy to testnet
    name: 'stx-htlc',
  },
  mainnet: {
    deployer: 'SPXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // TODO: Deploy to mainnet
    name: 'stx-htlc',
  },
};
