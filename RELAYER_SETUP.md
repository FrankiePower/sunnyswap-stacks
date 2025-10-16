# 🚀 SunnySwap Relayer & Resolver Setup

## Architecture Overview

SunnySwap uses a **Relayer + Resolver** architecture copied from Gattai Swap:

```
User Frontend → Relayer API → Redis → Resolver Bot
                     ↓           ↓
                Store Order  Auto-create
                             Counter-Escrow
```

### Components:

1. **Relayer API** (`/api/relayer/*`): Stores orders in Redis, triggers resolver
2. **Resolver Bot** (`/api/resolver/*`): Automated counter-party that creates matching escrows
3. **Redis**: Order queue and status tracking
4. **Frontend**: Order creation using hashlocked-cli patterns

---

## 📦 Dependencies Installed

```bash
npm install redis
```

---

## 🗂️ Files Created

### Infrastructure:
- ✅ `/src/lib/redis.ts` - Redis client setup
- ✅ `/src/types/order.ts` - Order types from hashlocked-cli

### Relayer API Routes:
- ✅ `/src/app/api/relayer/orders/route.ts` - Submit order
- ✅ `/src/app/api/relayer/orders/[hash]/route.ts` - Get order
- ✅ `/src/app/api/relayer/orders/[hash]/status/route.ts` - Get status
- ✅ `/src/app/api/relayer/orders/[hash]/escrow/route.ts` - Update escrow info

### Resolver API Routes:
- ✅ `/src/app/api/resolver/orders/[hash]/escrow/route.ts` - Create counter-escrow

---

## ⚙️ Environment Variables

### Required in `.env.local`:

```bash
# App URL for API calls
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Redis configuration
REDIS_URL=redis://localhost:6379

# Resolver bot private key (KEEP SECRET!)
RESOLVER_PRIVATE_KEY=0x...your_resolver_private_key...

# Sepolia RPC (already have this)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/xK5UUg_CThKPWlfCEDjuN_Es8wFFQ1zk
```

---

## 🔧 Setup Instructions

### 1. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Test Redis:**
```bash
redis-cli ping
# Should return: PONG
```

---

### 2. Create Resolver Wallet

The resolver needs its own wallet with ETH on Sepolia:

```bash
# Generate new private key (or use existing one)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local:
RESOLVER_PRIVATE_KEY=0x<generated_key>
```

**Fund the resolver wallet:**
1. Get address from private key
2. Get Sepolia ETH from faucet: https://sepoliafaucet.com/
3. Resolver needs at least 0.1 ETH for testing

---

### 3. Configure Environment

Create `front-end/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
RESOLVER_PRIVATE_KEY=0xYOUR_RESOLVER_PRIVATE_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/xK5UUg_CThKPWlfCEDjuN_Es8wFFQ1zk
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## 🔄 How It Works

### Order Flow:

1. **User Creates Order** (Frontend):
   ```typescript
   // Generate secret & hashlock (hashlocked-cli pattern)
   const secret = crypto.randomBytes(32);
   const hashlock = ethers.sha256("0x" + secret.toString("hex"));

   // Submit to relayer
   await fetch("/api/relayer/orders", {
     method: "POST",
     body: JSON.stringify({
       hash: orderHash,
       hashLock: { sha256: hashlock },
       srcChainId: 11155111, // Sepolia
       dstChainId: 5230, // Stacks testnet
       order: orderData
     })
   });
   ```

2. **Relayer Stores** (`/api/relayer/orders`):
   - Saves order to Redis
   - Triggers resolver: `POST /api/resolver/orders/{hash}/escrow`

3. **Resolver Creates Counter-Escrow** (`/api/resolver/orders/[hash]/escrow`):
   - Reads order from Redis
   - Creates EVM escrow using deployed contract
   - Funds it with resolver's ETH
   - Updates Redis with escrow address

4. **User Polls for Status**:
   ```typescript
   const status = await fetch(`/api/relayer/orders/${hash}/status`);
   // Returns: { status: "escrows_deployed", srcEscrowAddress: "0x..." }
   ```

5. **User Claims** (after resolver creates counter-escrow):
   - User reveals secret on Stacks
   - Resolver claims ETH using revealed secret

---

## 📝 Order Data Structure

Based on hashlocked-cli patterns:

```typescript
{
  orderId: "order_1751234567890",
  timestamp: 1751234567890,
  network: "sepolia",
  chainId: 11155111,

  maker: {
    address: "0x...",
    provides: {
      asset: "ETH",
      amount: "10000000000000000" // 0.01 ETH in wei
    },
    wants: {
      asset: "STX",
      amount: "100000000", // 100 STX in microSTX
      address: "ST..."
    }
  },

  secret: "0x...",  // 32 bytes
  hashlock: "0x...", // SHA-256 of secret

  timelock: {
    withdrawalPeriod: 0,     // Immediate
    cancellationPeriod: 3600 // 1 hour
  },

  status: "CREATED"
}
```

---

## 🧪 Testing

### 1. Start Redis:
```bash
redis-cli ping
# Should return: PONG
```

### 2. Start Next.js:
```bash
cd front-end
npm run dev
```

### 3. Test Relayer API:
```bash
# Create test order
curl -X POST http://localhost:3000/api/relayer/orders \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "test123",
    "hashLock": { "sha256": "abcd..." },
    "srcChainId": 11155111,
    "dstChainId": 5230,
    "order": {...}
  }'

# Check order status
curl http://localhost:3000/api/relayer/orders/test123/status
```

---

## 🔍 Debugging

### Check Redis:
```bash
redis-cli
> HGETALL orders
> HGET orders <order_hash>
```

### Check Logs:
```bash
# Watch Next.js logs for resolver activity
npm run dev
# Look for: "[Resolver] Processing order..."
```

### Common Issues:

**"Redis connection failed"**
- Check Redis is running: `redis-cli ping`
- Check REDIS_URL in .env.local

**"Resolver failed"**
- Check RESOLVER_PRIVATE_KEY is set
- Check resolver has ETH: `cast balance <resolver_address> --rpc-url $SEPOLIA_RPC_URL`
- Check contracts are deployed: see DEPLOYMENT.md

**"Order not found"**
- Order might be expired
- Check Redis: `redis-cli HGET orders <hash>`

---

## 📊 Status Flow

```
order_created
    ↓
escrows_deployed (resolver creates counter-escrow)
    ↓
funded (both escrows have funds)
    ↓
claimed (secret revealed, swap complete)
```

---

## 🚨 Security Notes

1. **RESOLVER_PRIVATE_KEY**: Keep secret! It has real funds
2. **Redis**: Use authentication in production
3. **Rate Limiting**: Add in production to prevent spam
4. **Gas Management**: Resolver needs ETH buffer for gas

---

## 📚 Next Steps

1. ✅ Infrastructure setup (DONE)
2. ⏳ Create order creation UI (NEXT)
3. ⏳ Implement claiming flow
4. ⏳ Add Stacks HTLC integration
5. ⏳ Test end-to-end swap

---

## 🔗 Related Files

- Contract addresses: `src/contracts/addresses.ts`
- Contract ABIs: `src/contracts/abis/`
- Contract hooks: `src/hooks/useContracts.ts`
- Deployment info: `DEPLOYMENT.md`

---

Last Updated: October 16, 2025
