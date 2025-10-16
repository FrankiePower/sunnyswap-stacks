/**
 * HTLC (Hashed Timelock Contract) TypeScript Types
 * For cross-chain atomic swaps with Stacks
 */

/**
 * Swap intent data structure stored in contract
 */
export interface SwapIntent {
  expirationHeight: bigint;
  amount: bigint;
  recipient: string;
}

/**
 * Parameters for registering a new swap intent
 */
export interface RegisterSwapParams {
  /** SHA256 hash of the secret (32 bytes) */
  hash: Uint8Array;
  /** Block height when swap expires */
  expirationHeight: number;
  /** Amount of STX to lock (in microSTX) */
  amount: bigint;
  /** Recipient address who can claim with preimage */
  recipient: string;
}

/**
 * Parameters for claiming a swap
 */
export interface ClaimSwapParams {
  /** Address of the original swap intent creator */
  sender: string;
  /** Secret preimage (32 bytes) that hashes to the swap's hash */
  preimage: Uint8Array;
}

/**
 * Parameters for canceling a swap
 */
export interface CancelSwapParams {
  /** SHA256 hash identifying the swap intent (32 bytes) */
  hash: Uint8Array;
}

/**
 * Parameters for querying swap intent
 */
export interface QuerySwapParams {
  /** SHA256 hash identifying the swap intent (32 bytes) */
  hash: Uint8Array;
  /** Address of the swap intent creator */
  sender: string;
}

/**
 * Contract error codes
 */
export enum HtlcErrorCode {
  ERR_INVALID_HASH_LENGTH = 1000,
  ERR_EXPIRY_IN_PAST = 1001,
  ERR_SWAP_INTENT_ALREADY_EXISTS = 1002,
  ERR_UNKNOWN_SWAP_INTENT = 1003,
  ERR_SWAP_INTENT_EXPIRED = 1004,
  ERR_SWAP_INTENT_NOT_EXPIRED = 1005,
  ERR_INVALID_PREIMAGE = 1006,
  ERR_UNAUTHORISED = 1007,
}

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case HtlcErrorCode.ERR_INVALID_HASH_LENGTH:
      return 'Invalid hash length. Must be 32 bytes.';
    case HtlcErrorCode.ERR_EXPIRY_IN_PAST:
      return 'Expiration height is in the past.';
    case HtlcErrorCode.ERR_SWAP_INTENT_ALREADY_EXISTS:
      return 'A swap intent with this hash already exists for this sender.';
    case HtlcErrorCode.ERR_UNKNOWN_SWAP_INTENT:
      return 'Swap intent not found. It may have been claimed or cancelled.';
    case HtlcErrorCode.ERR_SWAP_INTENT_EXPIRED:
      return 'Swap intent has expired. Cannot claim.';
    case HtlcErrorCode.ERR_SWAP_INTENT_NOT_EXPIRED:
      return 'Swap intent has not expired yet. Cannot cancel.';
    case HtlcErrorCode.ERR_INVALID_PREIMAGE:
      return 'Invalid preimage. Hash does not match.';
    case HtlcErrorCode.ERR_UNAUTHORISED:
      return 'Unauthorized. Only the designated recipient can claim.';
    default:
      return `Unknown error code: ${errorCode}`;
  }
}
