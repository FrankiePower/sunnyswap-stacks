# Phase 3: Stacks HTLC Integration - COMPLETE ✅

## What We Built

### 1. Stacks HTLC Contract Deployed
- **Contract**: `ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc`
- **Network**: Stacks Testnet
- **View on Explorer**: https://explorer.hiro.so/address/ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF?chain=testnet

### 2. Stacks.js Integration
Created `/front-end/src/lib/stacks-resolver.ts` with:
- `registerSwapIntent()` - Calls Stacks HTLC contract
- `calculateExpirationHeight()` - Calculates block expiry
- `getCurrentStacksBlockHeight()` - Fetches current height

### 3. Resolver Enhancement
Updated `/front-end/src/app/api/resolver/orders/[hash]/escrow/route.ts`:
- ✅ Creates EVM escrow (existing)
- ✅ **NEW**: Creates Stacks HTLC automatically
- ✅ Updates Redis with both escrow details
- ✅ Handles errors gracefully

## Complete Atomic Swap Flow

### Phase 1: Order Creation
1. User enters swap amount (e.g., 0.001 ETH → 980 microSTX)
2. Frontend generates secret + SHA-256 hashlock
3. Order submitted to `/api/relayer/orders`
4. Stored in Redis with status `order_created`

### Phase 2: EVM Escrow Creation (Resolver)
5. Resolver triggered at `/api/resolver/orders/[hash]/escrow`
6. Resolver creates EVM escrow via `factory.createSrcEscrow()`
7. Resolver funds escrow: `0.001 ETH + 0.001 safety + 0.0001 fee`
8. Transaction confirmed on Sepolia
9. Redis updated: status → `src_escrow_deployed`

### Phase 3: Stacks HTLC Creation (Resolver) ✅ NEW
10. Resolver calls Stacks contract: `register-swap-intent`
11. Parameters:
    - hash: SHA-256 hashlock
    - expiration: current_height + 144 blocks (~24 hours)
    - amount: 980 microSTX
    - recipient: Maker's Stacks address
12. Resolver transfers 980 microSTX to contract
13. Stacks transaction confirmed
14. Redis updated: status → `escrows_deployed`

### Phase 4: Maker Claims Stacks (TODO)
15. Maker sees both escrows are funded
16. Maker calls Stacks contract: `swap(sender, preimage)`
17. Reveals secret on-chain
18. Receives 980 microSTX

### Phase 5: Resolver Claims EVM (TODO)
19. Resolver monitors Stacks blockchain
20. Extracts revealed secret from Stacks transaction
21. Calls EVM escrow: `claim(secret)`
22. Receives 0.001 ETH back

## Configuration Required

### 1. Get Your Stacks Private Key
```bash
cd clarity
npm install @stacks/transactions
node get-stacks-key.js
# Edit the file first to add your mnemonic
```

### 2. Update `.env`
```bash
# Add to front-end/.env
STACKS_RESOLVER_PRIVATE_KEY=your_private_key_from_above
STACKS_HTLC_CONTRACT=ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc
STACKS_NETWORK=testnet
```

### 3. Fund Stacks Resolver Wallet
- Get testnet STX: https://explorer.hiro.so/sandbox/faucet?chain=testnet
- Your Stacks address will be shown by `get-stacks-key.js`
- Need ~10 STX for testing

## Testing the Complete Flow

### Test 1: Create New Order
```bash
# In the UI at http://localhost:3000/dapp
1. Connect both wallets (MetaMask + Hiro)
2. Enter: 0.001 ETH
3. Click "Execute Swap"
4. Watch status messages
```

### Test 2: Check Escrows
```bash
# Check EVM escrow
https://sepolia.etherscan.io/address/[escrow_address]

# Check Stacks HTLC
https://explorer.hiro.so/txid/[stacks_txid]?chain=testnet
```

### Test 3: Verify Redis
```bash
redis-cli HGET orders [order_hash]
# Should show:
# - status: "escrows_deployed"
# - srcEscrowAddress: 0x...
# - srcDeployHash: 0x...
# - dstEscrowTxid: 0x...
# - dstExpirationHeight: [number]
```

## What's Left to Build

### Phase 4: Maker Claiming (Frontend UI)
- Add "Claim STX" button for maker
- Call Stacks contract with secret
- Show transaction confirmation

### Phase 5: Resolver Auto-Claim (Backend Worker)
- Monitor Stacks blockchain for swap completion events
- Extract secret from `swap-completed` event
- Automatically claim EVM escrow
- Update order status to `completed`

## Architecture Summary

```
┌─────────────┐
│    User     │
│  (Maker)    │
└──────┬──────┘
       │ 1. Create Order (0.001 ETH → 980 STX)
       ▼
┌─────────────────────┐
│   Frontend (UI)     │
│ - Generate secret   │
│ - Create hashlock   │
└──────┬──────────────┘
       │ 2. POST /api/relayer/orders
       ▼
┌─────────────────────┐
│   Redis (Orders)    │
│ - Store order       │
│ - status: created   │
└──────┬──────────────┘
       │ 3. Trigger resolver
       ▼
┌──────────────────────────────┐
│   Resolver (Automated Bot)   │
│                              │
│ ┌──────────────────────────┐ │
│ │ 4. Create EVM Escrow     │ │
│ │ - Fund 0.001 ETH         │ │
│ │ - Sepolia testnet        │ │
│ └────────┬─────────────────┘ │
│          │                   │
│ ┌────────▼─────────────────┐ │
│ │ 5. Create Stacks HTLC    │ │
│ │ - Fund 980 microSTX      │ │
│ │ - Stacks testnet         │ │
│ └────────┬─────────────────┘ │
└──────────┼───────────────────┘
           │ 6. Update Redis
           ▼
┌─────────────────────┐
│   Redis (Updated)   │
│ - Both escrows      │
│ - status: deployed  │
└─────────────────────┘

            ⏱️  WAITING FOR MAKER TO CLAIM

┌─────────────┐
│    Maker    │ 7. Claims STX with secret
└──────┬──────┘    (reveals secret on-chain)
       │
       ▼
┌─────────────────────┐
│  Stacks Blockchain  │
│ - Secret revealed   │
│ - Maker gets STX    │
└──────┬──────────────┘
       │ 8. Resolver monitors
       ▼
┌──────────────────────┐
│   Resolver (Auto)    │
│ - Extract secret     │
│ - Claim EVM escrow   │
│ - Get ETH back       │
└──────────────────────┘
```

## Files Created/Modified

### New Files:
- `/front-end/src/lib/stacks-resolver.ts` - Stacks.js integration
- `/clarity/get-stacks-key.js` - Helper script
- `/clarity/settings/Testnet.toml` - Testnet config
- `/clarity/deployments/default.testnet-plan.yaml` - Deployment plan
- This file!

### Modified Files:
- `/front-end/src/app/api/resolver/orders/[hash]/escrow/route.ts` - Added Stacks HTLC
- `/clarity/Clarinet.toml` - Cleaned up contracts
- `/.env.example` - Added Stacks config

## Success Criteria

✅ Stacks contract deployed
✅ Stacks.js integration working
✅ Resolver creates both escrows
⏳ Maker can claim STX (TODO)
⏳ Resolver can claim EVM (TODO)

**Status**: Phases 1-3 complete! Ready for claiming implementation.
