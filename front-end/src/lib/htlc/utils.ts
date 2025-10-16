/**
 * HTLC Utility Functions
 * Hash generation, validation, and block height calculations
 */

/**
 * Generate a random 32-byte secret for atomic swaps
 * @returns Uint8Array of 32 random bytes
 */
export function generateSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(secret);
  } else {
    // Fallback for Node.js environment
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(32);
    secret.set(bytes);
  }
  return secret;
}

/**
 * Compute SHA256 hash of a secret
 * Compatible with Clarity's (sha256 preimage) function
 * @param secret - 32-byte secret to hash
 * @returns SHA256 hash as Uint8Array (32 bytes)
 */
export async function hashSecret(secret: Uint8Array): Promise<Uint8Array> {
  if (secret.length !== 32) {
    throw new Error('Secret must be exactly 32 bytes');
  }

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment - use Web Crypto API
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', secret);
    return new Uint8Array(hashBuffer);
  } else {
    // Node.js environment
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    return new Uint8Array(hash.digest());
  }
}

/**
 * Validate that a hash is exactly 32 bytes
 * @param hash - Hash to validate
 * @returns true if valid, false otherwise
 */
export function validateHash(hash: Uint8Array): boolean {
  return hash instanceof Uint8Array && hash.length === 32;
}

/**
 * Validate that a preimage is exactly 32 bytes
 * @param preimage - Preimage to validate
 * @returns true if valid, false otherwise
 */
export function validatePreimage(preimage: Uint8Array): boolean {
  return preimage instanceof Uint8Array && preimage.length === 32;
}

/**
 * Calculate block height for expiration based on hours from now
 * Stacks blocks are approximately 10 minutes apart
 * @param hoursFromNow - Number of hours until expiration
 * @param currentBlockHeight - Current blockchain height
 * @returns Expiration block height
 */
export function calculateExpirationHeight(
  hoursFromNow: number,
  currentBlockHeight: number
): number {
  // Stacks: ~6 blocks per hour (10 min per block)
  const blocksPerHour = 6;
  const blocksToAdd = Math.floor(hoursFromNow * blocksPerHour);
  return currentBlockHeight + blocksToAdd;
}

/**
 * Convert Uint8Array to hex string
 * @param bytes - Byte array to convert
 * @returns Hex string (without 0x prefix)
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert microSTX to STX
 * @param microStx - Amount in microSTX (1 STX = 1,000,000 microSTX)
 * @returns Amount in STX
 */
export function microStxToStx(microStx: bigint): number {
  return Number(microStx) / 1_000_000;
}

/**
 * Convert STX to microSTX
 * @param stx - Amount in STX
 * @returns Amount in microSTX
 */
export function stxToMicroStx(stx: number): bigint {
  return BigInt(Math.floor(stx * 1_000_000));
}

/**
 * Format block height as approximate time from now
 * @param targetHeight - Target block height
 * @param currentHeight - Current block height
 * @returns Human-readable time estimate
 */
export function formatTimeUntilBlock(targetHeight: number, currentHeight: number): string {
  const blocksRemaining = targetHeight - currentHeight;
  if (blocksRemaining <= 0) {
    return 'Expired';
  }

  // Stacks: ~10 minutes per block
  const minutesRemaining = blocksRemaining * 10;
  const hoursRemaining = minutesRemaining / 60;

  if (hoursRemaining < 1) {
    return `~${Math.round(minutesRemaining)} minutes`;
  } else if (hoursRemaining < 24) {
    return `~${Math.round(hoursRemaining)} hours`;
  } else {
    const daysRemaining = hoursRemaining / 24;
    return `~${Math.round(daysRemaining)} days`;
  }
}
