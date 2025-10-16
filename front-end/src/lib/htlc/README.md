# HTLC Library

Hashed Timelock Contract (HTLC) library for Stacks blockchain atomic swaps.

## Overview

This library provides functions to interact with the `stx-htlc` smart contract for creating cross-chain atomic swaps. It uses a 32-byte secret/hash format compatible with GattaiSwap's EVM and Bitcoin implementations.

## Features

- ✅ 32-byte hash format (SHA256) - cross-chain compatible
- ✅ TypeScript types for all functions
- ✅ Post-condition support for safety
- ✅ Read-only query functions
- ✅ Utility functions for hash generation and conversions
- ✅ Full JSDoc documentation

## Installation

Already included in the frontend! Just import:

```typescript
import { generateSecret, hashSecret, buildRegisterSwapIntent } from '@/lib/htlc';
```

## Quick Start

### 1. Create a Swap Intent (Lock STX)

```typescript
import {
  generateSecret,
  hashSecret,
  buildRegisterSwapIntent,
  calculateExpirationHeight,
  stxToMicroStx,
  getCurrentBlockHeight,
} from '@/lib/htlc';
import { openContractCall } from '@/lib/contract-utils';
import { StacksTestnet } from '@stacks/network';

// Generate a secret (keep this safe!)
const secret = generateSecret();
const hash = await hashSecret(secret);

// Calculate expiration (24 hours from now)
const network = new StacksTestnet();
const currentHeight = await getCurrentBlockHeight(network);
const expirationHeight = calculateExpirationHeight(24, currentHeight);

// Build transaction
const txOptions = buildRegisterSwapIntent(
  {
    hash,
    expirationHeight,
    amount: stxToMicroStx(10), // 10 STX
    recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
  },
  userAddress,
  network
);

// Execute with wallet
await openContractCall(txOptions);

// Now share the hash with the other party
// Keep the secret safe until they lock their side!
```

### 2. Claim a Swap (Reveal Secret)

```typescript
import { buildClaimSwap } from '@/lib/htlc';
import { openContractCall } from '@/lib/contract-utils';

// When the other party locked their tokens, reveal your secret to claim
const txOptions = buildClaimSwap(
  {
    sender: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5', // Original creator
    preimage: secret, // The 32-byte secret
  },
  network
);

await openContractCall(txOptions);

// After this succeeds:
// 1. You receive the locked STX
// 2. The secret is revealed on-chain
// 3. The original sender can use this secret to claim on the other chain
```

### 3. Query Swap Status

```typescript
import { getSwapIntent, hasSwapIntent, isSwapExpired } from '@/lib/htlc';

// Check if swap exists
const exists = await hasSwapIntent({ hash, sender }, network);

// Get swap details
const swapIntent = await getSwapIntent({ hash, sender }, network);
if (swapIntent) {
  console.log('Amount:', swapIntent.amount);
  console.log('Recipient:', swapIntent.recipient);
  console.log('Expiration:', swapIntent.expirationHeight);
}

// Check if expired
const expired = await isSwapExpired({ hash, sender }, network);
```

### 4. Cancel Expired Swap

```typescript
import { buildCancelSwapIntent } from '@/lib/htlc';
import { openContractCall } from '@/lib/contract-utils';

// Only works after expiration!
const txOptions = buildCancelSwapIntent({ hash }, network);

await openContractCall(txOptions);
// Your STX is refunded
```

## API Reference

### Utility Functions

#### `generateSecret(): Uint8Array`
Generates a cryptographically secure 32-byte random secret.

#### `hashSecret(secret: Uint8Array): Promise<Uint8Array>`
Computes SHA256 hash of a 32-byte secret.

#### `calculateExpirationHeight(hoursFromNow: number, currentHeight: number): number`
Calculates block height for expiration. Stacks blocks are ~10 minutes apart.

#### `stxToMicroStx(stx: number): bigint`
Converts STX to microSTX (1 STX = 1,000,000 microSTX).

#### `microStxToStx(microStx: bigint): number`
Converts microSTX to STX.

#### `bytesToHex(bytes: Uint8Array): string`
Converts byte array to hex string (without 0x prefix).

#### `hexToBytes(hex: string): Uint8Array`
Converts hex string to byte array (handles 0x prefix).

### Transaction Functions

#### `buildRegisterSwapIntent(params, senderAddress, network)`
Builds transaction to create a swap intent and lock STX.

**Parameters:**
- `params.hash` - 32-byte SHA256 hash
- `params.expirationHeight` - Block height when swap expires
- `params.amount` - Amount in microSTX
- `params.recipient` - Address that can claim with preimage
- `senderAddress` - Your address
- `network` - Network object

**Returns:** Transaction options for `openContractCall()`

#### `buildClaimSwap(params, network)`
Builds transaction to claim STX by revealing preimage.

**Parameters:**
- `params.sender` - Original swap creator address
- `params.preimage` - 32-byte secret
- `network` - Network object

**Returns:** Transaction options for `openContractCall()`

#### `buildCancelSwapIntent(params, network)`
Builds transaction to cancel expired swap and recover STX.

**Parameters:**
- `params.hash` - 32-byte hash
- `network` - Network object

**Returns:** Transaction options for `openContractCall()`

### Query Functions

#### `getSwapIntent(params, network): Promise<SwapIntent | null>`
Retrieves swap intent details from contract.

#### `hasSwapIntent(params, network): Promise<boolean>`
Checks if swap intent exists.

#### `isSwapExpired(params, network): Promise<boolean>`
Checks if swap has expired.

#### `getCurrentBlockHeight(network): Promise<number>`
Gets current blockchain height.

#### `getStxBalance(address, network): Promise<bigint>`
Gets STX balance for an address.

## Types

```typescript
interface SwapIntent {
  expirationHeight: bigint;
  amount: bigint;
  recipient: string;
}

interface RegisterSwapParams {
  hash: Uint8Array;
  expirationHeight: number;
  amount: bigint;
  recipient: string;
}

interface ClaimSwapParams {
  sender: string;
  preimage: Uint8Array;
}

interface CancelSwapParams {
  hash: Uint8Array;
}

interface QuerySwapParams {
  hash: Uint8Array;
  sender: string;
}
```

## Error Codes

| Code | Constant | Meaning |
|------|----------|---------|
| 1000 | ERR_INVALID_HASH_LENGTH | Hash must be 32 bytes |
| 1001 | ERR_EXPIRY_IN_PAST | Expiration is in past |
| 1002 | ERR_SWAP_INTENT_ALREADY_EXISTS | Swap already exists |
| 1003 | ERR_UNKNOWN_SWAP_INTENT | Swap not found |
| 1004 | ERR_SWAP_INTENT_EXPIRED | Swap has expired |
| 1005 | ERR_SWAP_INTENT_NOT_EXPIRED | Not expired yet |
| 1006 | ERR_INVALID_PREIMAGE | Wrong preimage |
| 1007 | ERR_UNAUTHORISED | Not the recipient |

Use `getErrorMessage(code)` to get user-friendly messages.

## Atomic Swap Flow

### Full Cross-Chain Swap Example

```typescript
// PARTY A (STX → EVM)
// 1. Generate secret
const secret = generateSecret();
const hash = await hashSecret(secret);

// 2. Party A locks STX with hash
await registerSwapIntent({ hash, ... }, partyAAddress, network);

// 3. Party B sees the hash and locks EVM tokens with same hash

// 4. Party A reveals secret on EVM to claim EVM tokens
// (secret is now public on EVM chain)

// 5. Party B uses the revealed secret to claim STX
await claimSwap({ sender: partyAAddress, preimage: secret }, network);
```

## Security Notes

1. **Never share your secret** until the other party has locked their tokens
2. **Always verify** the swap exists and amount is correct before claiming
3. **Set appropriate expiration times** - recommend 24-48 hours minimum
4. **Use post-conditions** in production to protect against unexpected behavior
5. **Monitor for secret reveals** on the destination chain before the swap expires

## Testing

Test with Clarinet devnet:

```bash
cd clarity
npm test
```

All 33 tests should pass, including real SHA256 atomic swap flows.

## Contract Addresses

- **Devnet**: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stx-htlc`
- **Testnet**: TBD
- **Mainnet**: TBD

## License

MIT
