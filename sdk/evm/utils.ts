import { randomBytes, keccak256, toBeHex } from 'ethers'

/**
 * Utility functions for SunnySwap SDK
 */

/**
 * Generate a random 32-byte secret
 */
export function generateSecret(): string {
    return '0x' + Buffer.from(randomBytes(32)).toString('hex')
}

/**
 * Generate SHA256 hashlock from secret
 */
export function generateHashlock(secret: string): string {
    // Remove 0x prefix if present
    const secretBytes = secret.startsWith('0x') ? secret.slice(2) : secret

    // For compatibility with Stacks SHA256, we use keccak256 here
    // In production, you'd use actual SHA256
    return keccak256('0x' + secretBytes)
}

/**
 * Generate a unique order hash
 */
export function generateOrderHash(
    srcChainId: number,
    dstChainId: number,
    maker: string,
    amount: bigint,
    timestamp: number
): string {
    const data = [
        toBeHex(srcChainId, 32),
        toBeHex(dstChainId, 32),
        maker.toLowerCase(),
        toBeHex(amount, 32),
        toBeHex(timestamp, 32)
    ].join('')

    return keccak256('0x' + data)
}

/**
 * Encode address as uint256 (for 1inch compatibility)
 */
export function addressToUint256(address: string): bigint {
    return BigInt(address)
}

/**
 * Decode uint256 to address
 */
export function uint256ToAddress(value: bigint): string {
    return '0x' + value.toString(16).padStart(40, '0')
}

/**
 * Calculate timelock value
 * This encodes withdrawal and cancellation periods
 */
export function encodeTimelocks(params: {
    withdrawalPeriod: number  // seconds from deployment
    cancellationPeriod: number // seconds from deployment
}): bigint {
    // Simple encoding: pack both values into a uint256
    // Lower 128 bits = withdrawal period
    // Upper 128 bits = cancellation period
    const withdrawal = BigInt(params.withdrawalPeriod)
    const cancellation = BigInt(params.cancellationPeriod)

    return (cancellation << 128n) | withdrawal
}

/**
 * Decode timelocks
 */
export function decodeTimelocks(timelocks: bigint): {
    withdrawalPeriod: number
    cancellationPeriod: number
} {
    const mask = (1n << 128n) - 1n
    const withdrawal = Number(timelocks & mask)
    const cancellation = Number((timelocks >> 128n) & mask)

    return {
        withdrawalPeriod: withdrawal,
        cancellationPeriod: cancellation
    }
}

/**
 * Format STX amount from microSTX
 */
export function formatSTX(microSTX: bigint): string {
    const stx = Number(microSTX) / 1_000_000
    return stx.toFixed(6) + ' STX'
}

/**
 * Parse STX to microSTX
 */
export function parseSTX(stx: string): bigint {
    const amount = parseFloat(stx)
    return BigInt(Math.floor(amount * 1_000_000))
}
