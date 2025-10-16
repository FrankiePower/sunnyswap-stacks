# SunnySwap STX Hashed Timelock Contract (HTLC)

This project implements a Hashed Timelock Contract (HTLC) for STX tokens on the Stacks blockchain, enabling cross-chain atomic swaps between Stacks and EVM-compatible chains. The contract securely escrows STX, allowing swaps to be completed by revealing a preimage, or refunded after expiry.

## Contract Overview

The `stx-htlc.clar` contract provides:
- Registration of swap intents (escrow STX with hash, recipient, expiry)
- Claiming STX by revealing the correct preimage (atomic swap completion)
- Cancelling expired swaps and refunding STX to the sender
- Querying swap intents and their status

### Key Functions
- `register-swap-intent`: Lock STX for a swap, specifying hash, recipient, amount, and expiry
- `swap`: Claim STX by revealing the preimage (must match hash, before expiry)
- `cancel-swap-intent`: Refund STX after expiry if swap not completed
- `get-swap-intent`: View swap intent details
- `is-swap-intent-expired`: Check if a swap intent is expired

### Architecture
- Uses SHA256 hashes for cross-chain compatibility
- Emits events for swap registration, completion, and cancellation
- Designed for atomic swaps between Stacks and EVM chains

## Testing
- Manual and automated tests available in `/clarity/tests/`
- Use Clarinet console for contract interaction

## Resources
- [Clarinet Docs](https://docs.hiro.so/tools/clarinet)
- [Clarity Language](https://docs.stacks.co/clarity)

> **Note:** This contract is for demonstration and educational purposes. Not audited for production use.
