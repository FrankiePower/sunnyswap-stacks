# 🧪 SunnySwap Testing Guide

## Prerequisites

✅ All completed:
- [x] EVM contracts deployed to Sepolia
- [x] Redis installed and running
- [x] Relayer API routes created
- [x] Resolver API route created
- [x] Dual wallet system (EVM + Stacks)
- [x] Order creation UI implemented

---

## Environment Setup

### 1. Create `.env.local` file:

```bash
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Redis
REDIS_URL=redis://localhost:6379

# Resolver (use your deployer key or create new one)
RESOLVER_PRIVATE_KEY=0xb5bba28246a3faed68d623ba0cc5cf129b00bdbeaa5e29ed7ce6a41688cdfaa1
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/xK5UUg_CThKPWlfCEDjuN_Es8wFFQ1zk
```

---

## Starting Services

### 1. Start Redis:
```bash
redis-cli ping
# Should return: PONG

# If not running:
brew services start redis
```

### 2. Start Next.js:
```bash
cd front-end
npm run dev
```

### 3. Verify Services:
```bash
# Check Next.js
curl http://localhost:3000

# Check Redis
redis-cli KEYS "*"
```

---

## Testing Order Creation Flow

### Step 1: Connect Wallets

1. Navigate to http://localhost:3000/dapp
2. Click "Connect Wallets"
3. Connect MetaMask (or any EVM wallet)
   - Make sure you're on Sepolia network
   - Get Sepolia ETH: https://sepoliafaucet.com/
4. Connect Hiro Wallet (Stacks)
   - Switch to testnet in wallet settings

Both wallet buttons should now show your addresses!

---

### Step 2: Create Test Swap

1. **Enter amounts:**
   - From: `0.01` ETH
   - To: (auto-calculated, e.g., `0.0098` STX)

2. **Click "Execute Swap"**

3. **Watch the status messages:**
   ```
   Generating secret...
   → Submitting order to relayer...
   → Waiting for resolver to create escrow...
   → Waiting for escrow... (5s)
   → Waiting for escrow... (10s)
   ...
   → Escrow deployed successfully!
   ```

4. **Check console logs:**
   ```
   🔐 Secret generated: 0x...
   🔒 Hashlock: 0x...
   📄 Order ID: order_1751234567890
   ✅ Order submitted to relayer
   📊 Order status: {...}
   ```

---

### Step 3: Verify in Redis

```bash
redis-cli
> HGETALL orders
> HGET orders <order_hash>
> EXIT
```

You should see your order stored with:
- `status: "escrows_deployed"`
- `srcEscrowAddress: "0x..."`
- `srcDeployHash: "0x..."`

---

### Step 4: Verify on Etherscan

1. Copy the transaction hash from success modal
2. Visit: https://sepolia.etherscan.io/tx/0x...
3. Verify:
   - Contract interaction with STXEscrowFactory
   - `createSrcEscrow` method called
   - ETH sent (amount + safety deposit + creation fee)

---

## Debugging

### Common Issues:

#### **"Contracts not available"**
- Check you're connected to Sepolia (chainId: 11155111)
- Verify contracts deployed: see DEPLOYMENT.md

#### **"Failed to submit order to relayer"**
- Check Redis is running: `redis-cli ping`
- Check Next.js logs for errors
- Verify API routes exist in `/app/api/relayer/`

#### **"Timeout waiting for escrow deployment"**
- Check resolver private key has ETH
- Check resolver API logs
- Verify SEPOLIA_RPC_URL is working

#### **Resolver not creating escrow:**
```bash
# Check resolver balance
cast balance 0x<resolver_address> --rpc-url $SEPOLIA_RPC_URL

# Check resolver has at least 0.1 ETH
# Get more from faucet if needed
```

---

## Manual Testing

### Test Relayer API:

```bash
# Submit test order
curl -X POST http://localhost:3000/api/relayer/orders \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "0xtest123",
    "hashLock": { "sha256": "abcd1234..." },
    "srcChainId": 11155111,
    "dstChainId": 5230,
    "order": {
      "orderId": "test_order",
      "timestamp": 1751234567890,
      "network": "sepolia",
      "chainId": 11155111,
      "maker": {
        "address": "0x...",
        "provides": { "asset": "ETH", "amount": "10000000000000000" },
        "wants": { "asset": "STX", "amount": "100000000", "address": "ST..." }
      },
      "secret": "0x...",
      "hashlock": "0x...",
      "timelock": { "withdrawalPeriod": 0, "cancellationPeriod": 3600 },
      "status": "CREATED",
      "contracts": { "stxEscrowFactory": "0x506485C554E2eFe0AA8c22109aAc021A1f28888B" }
    },
    "stacksAddress": "ST..."
  }'

# Check status
curl http://localhost:3000/api/relayer/orders/0xtest123/status
```

---

## Expected Flow

### 1. Frontend (User):
```
User enters amounts
  ↓
Generate secret & hashlock
  ↓
Create order object
  ↓
Submit to /api/relayer/orders
  ↓
Poll /api/relayer/orders/{hash}/status
```

### 2. Backend (Relayer):
```
Receive order
  ↓
Store in Redis
  ↓
Trigger /api/resolver/orders/{hash}/escrow
  ↓
Return success
```

### 3. Backend (Resolver):
```
Fetch order from Redis
  ↓
Construct immutables
  ↓
Call factory.createSrcEscrow()
  ↓
Wait for transaction
  ↓
Update Redis with escrow address
```

### 4. Frontend (Polling):
```
Check status every 5s
  ↓
status === "escrows_deployed"
  ↓
Show success modal with tx hash
```

---

## Success Metrics

✅ **Order creation successful if:**
1. Secret & hashlock generated (logged in console)
2. Order submitted to relayer (201 response)
3. Order stored in Redis (visible with `redis-cli`)
4. Resolver creates escrow (transaction on Etherscan)
5. Status updates to "escrows_deployed"
6. Success modal shows with tx hash

---

## Next Steps (After Order Creation Works)

1. **Implement Claiming Flow:**
   - User reveals secret on Stacks
   - Extract secret from Stacks blockchain
   - Claim EVM escrow with revealed secret

2. **Add Stacks HTLC:**
   - Resolver creates Stacks HTLC as counter-escrow
   - User can claim STX with secret

3. **Complete Atomic Swap:**
   - Full bidirectional flow
   - Secret revelation and claiming
   - Both parties receive their assets

---

## Deployed Contract Addresses

```
Network: Sepolia Testnet (Chain ID: 11155111)

STXEscrowFactory: 0x506485C554E2eFe0AA8c22109aAc021A1f28888B
Resolver:         0x70060F694e4Ba48224FcaaE7eB20e81ec4461C8D
MockERC20:        0xBF6aF2FB20924cF54912887885d896E5fCFE04e3

Etherscan: https://sepolia.etherscan.io/
```

---

## Useful Commands

```bash
# Watch Redis in real-time
redis-cli MONITOR

# Check specific order
redis-cli HGET orders <order_hash>

# Clear all orders (reset)
redis-cli DEL orders

# Check resolver balance
cast balance <resolver_address> --rpc-url $SEPOLIA_RPC_URL

# Watch Next.js logs
npm run dev | grep "Resolver\|Relayer"
```

---

## Contact & Support

- Contracts: See DEPLOYMENT.md
- Architecture: See architecture.md
- Relayer Setup: See RELAYER_SETUP.md
- Dual Wallets: See DUAL_WALLET_SETUP.md

---

Last Updated: October 16, 2025
