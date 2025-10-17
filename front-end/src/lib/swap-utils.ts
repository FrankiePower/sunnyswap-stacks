/**
 * Swap utility functions
 * Based on hashlocked-cli patterns
 */

import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * Generate secure random 32-byte secret and its SHA-256 hashlock
 * Pattern from: hashlocked-cli/evm/scripts/create-order-immediate.ts
 */
export function generateSecretAndHashlock() {
  const secretBytes = crypto.randomBytes(32);
  const secret = '0x' + secretBytes.toString('hex');
  const hashlock = ethers.sha256(secret); // SHA-256 for Bitcoin/Stacks compatibility

  return { secret, hashlock };
}

/**
 * Pack timelocks into single uint256
 * Pattern from: hashlocked-cli/evm/scripts/maker-escrow.ts (lines 186-189)
 *
 * Format: [timestamp(32)][reserved(160)][cancel(32)][pubWith(32)][withdraw(32)]
 */
export function packTimelocks(
  deployedAt: number,
  dstWithdrawal: number,
  dstPublicWithdrawal: number,
  dstCancellation: number
): bigint {
  return (
    (BigInt(deployedAt) << BigInt(224)) |
    (BigInt(dstCancellation) << BigInt(64)) |
    (BigInt(dstPublicWithdrawal) << BigInt(32)) |
    BigInt(dstWithdrawal)
  );
}

/**
 * Construct immutables struct for escrow creation
 * Pattern from: hashlocked-cli/evm/scripts/maker-escrow.ts (lines 192-201)
 */
export interface Immutables {
  orderHash: string;
  hashlock: string;
  maker: bigint;
  taker: bigint;
  token: bigint;
  amount: bigint;
  safetyDeposit: bigint;
  timelocks: bigint;
}

export function constructImmutables(
  orderId: string,
  hashlock: string,
  makerAddress: string,
  takerAddress: string,
  tokenAddress: string,
  amount: bigint,
  safetyDeposit: bigint,
  withdrawalPeriod: number,
  cancellationPeriod: number
): Immutables {
  const now = Math.floor(Date.now() / 1000);
  const dstPublicWithdrawal = withdrawalPeriod * 2;

  return {
    orderHash: ethers.keccak256(ethers.toUtf8Bytes(orderId)),
    hashlock,
    maker: BigInt(makerAddress),
    taker: BigInt(takerAddress),
    token: BigInt(tokenAddress),
    amount,
    safetyDeposit,
    timelocks: packTimelocks(now, withdrawalPeriod, dstPublicWithdrawal, cancellationPeriod),
  };
}

/**
 * Generate unique order ID
 * Pattern from: hashlocked-cli/evm/scripts/create-order-immediate.ts (line 84)
 */
export function generateOrderId(): string {
  return `order_${Date.now()}`;
}

/**
 * Calculate total ETH required for escrow creation
 * Pattern from: hashlocked-cli/evm/scripts/maker-escrow.ts (lines 159-162)
 */
export function calculateTotalRequired(
  escrowAmount: bigint,
  safetyDeposit: bigint,
  creationFee: bigint
): bigint {
  return escrowAmount + safetyDeposit + creationFee;
}

/**
 * Validate secret matches hashlock
 * Pattern from: hashlocked-cli/evm/scripts/taker-claim-eth.ts (lines 204-220)
 */
export function validateSecret(secret: string, expectedHashlock: string): boolean {
  const secretBuffer = Buffer.from(secret.slice(2), 'hex');
  const calculatedHashlock = '0x' + crypto.createHash('sha256').update(secretBuffer).digest('hex');
  return calculatedHashlock.toLowerCase() === expectedHashlock.toLowerCase();
}

/**
 * Format address for display (truncate middle)
 */
export function truncateAddress(address: string): string {
  if (!address || address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format amount for display
 */
export function formatAmount(amount: string | bigint, decimals: number = 18): string {
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return '0';
  }
}

/**
 * Parse amount from user input
 */
export function parseAmount(amount: string, decimals: number = 18): bigint {
  try {
    return ethers.parseUnits(amount, decimals);
  } catch {
    return BigInt(0);
  }
}
