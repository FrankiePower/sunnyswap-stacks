# GattaiSwap Complete Architecture Analysis

**Date**: 2025-10-15
**Purpose**: Understanding GattaiSwap to build SunnySwap (BTC→STX atomic swaps)

---

## 🏗️ Complete System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      GattaiSwap System                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │   Frontend  │   │   Backend    │   │  Blockchain  │         │
│  │   (Next.js) │◄─►│   (API)      │◄─►│  Contracts   │         │
│  └─────────────┘   └──────────────┘   └──────────────┘         │
│        │                  │                    │                 │
│        │                  │                    │                 │
│   User Actions      Orchestration        Smart Contracts        │
│   - Create Order    - Order Tracking     - Escrow Factory       │
│   - Sign Tx         - Status Updates     - Resolver.sol         │
│   - Monitor         - Redis Storage      - Limit Order Protocol │
│                     - Resolver Bot                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Smart Contract Layer

### 1. **Resolver.sol** (THE KEY CONTRACT!)

**Location**: `/chains/contracts/evm/src/Resolver.sol`

**Purpose**: Acts as the automated "solver" that creates counter-escrows

**Key Functions**:
```solidity
// Deploy source escrow (e.g., EVM side when user initiates EVM→BTC)
function deploySrc(
    IBaseEscrow.Immutables calldata immutables,
    IOrderMixin.Order calldata order,
    bytes32 r,
    bytes32 vs,
    uint256 amount,
    TakerTraits takerTraits,
    bytes calldata args
) external payable onlyOwner

// Deploy destination escrow (e.g., BTC side responding to EVM→BTC)
function deployDst(
    IBaseEscrow.Immutables calldata dstImmutables,
    uint256 srcCancellationTimestamp
) external onlyOwner payable

// Withdraw from escrow (claim with secret)
function withdraw(
    IEscrow escrow,
    bytes32 secret,
    IBaseEscrow.Immutables calldata immutables
) external

// Cancel escrow (refund after timeout)
function cancel(
    IEscrow escrow,
    IBaseEscrow.Immutables calldata immutables
) external
```

**What it does**:
- Owned by the resolver bot (backend service)
- Deploys escrows on behalf of the resolver
- Sends safety deposits
- Claims tokens when secret is revealed
- Refunds when swaps expire

**Critical Insight**:
- ✅ The Resolver.sol is the "wallet" of the resolver bot
- ✅ It holds liquidity and executes trades
- ✅ It's controlled by the backend (onlyOwner)

---

### 2. **EscrowFactory** (from 1inch cross-chain-swap)

**Purpose**: Factory pattern for creating escrow instances

**Key Functions**:
```solidity
function createSrcEscrow(Immutables memory immutables)
    external payable returns (address)

function createDstEscrow(Immutables memory immutables)
    external payable returns (address)
```

**What it does**:
- Creates minimal proxy clones (EIP-1167) of escrow implementations
- Saves gas by reusing implementation contracts
- Used by Resolver.sol to deploy escrows

---

### 3. **Limit Order Protocol** (1inch)

**Purpose**: Handles the EVM-side order matching

**What it does**:
- Manages limit orders on EVM chains
- Called by Resolver.sol's deploySrc function
- Fills orders atomically

---

## 🖥️ Backend Architecture

### API Structure

```
app/src/app/api/
├── relayer/orders/              # User-facing endpoints
│   ├── route.ts                 # POST - Create new order
│   └── [hash]/
│       ├── route.ts             # GET - Get order details
│       ├── status/route.ts      # GET - Check order status
│       ├── escrow/route.ts      # POST - Update escrow info
│       ├── secret/route.ts      # POST - Reveal secret
│       └── withdraw/route.ts    # POST - Trigger withdraw
│
└── resolver/orders/             # Resolver bot endpoints
    └── [hash]/
        ├── escrow/route.ts      # POST - Resolver creates escrow
        └── withdraw/route.ts    # POST - Resolver withdraws
```

---

### The Two-Layer System

#### **Layer 1: Relayer** (Public API)
- Accepts orders from users
- Stores in Redis
- Returns status updates
- **DOES NOT** execute blockchain transactions

#### **Layer 2: Resolver Bot** (Internal Service)
- Monitors Redis for new orders
- **Executes blockchain transactions via Resolver.sol**
- Creates counter-escrows
- Claims tokens
- Handles refunds

---

## 🔄 Complete Swap Flow (EVM → BTC Example)

### Step 1: User Creates Order

**Frontend** (`page.tsx`):
```typescript
// User selects: Send 0.01 ETH → Receive 0.001 BTC
// Frontend creates 1inch CrossChainOrder
const order = Sdk.CrossChainOrder.new({
  maker: userAddress,
  receiver: userBtcAddress,
  makerAsset: ETH,
  takerAsset: BTC,
  makingAmount: 0.01 ETH,
  takingAmount: 0.001 BTC,
  // ... extensions with hashLock, timelocks, etc
});

// User signs the order
const signature = await signer.signTypedData(...);

// Submit to relayer
await fetch('/api/relayer/orders', {
  method: 'POST',
  body: JSON.stringify({
    hash: orderHash,
    hashLock,
    srcChainId: 10143, // Monad
    dstChainId: 99999, // Bitcoin
    order,
    extension,
    signature
  })
});
```

---

### Step 2: Relayer Stores Order

**Backend** (`/api/relayer/orders/route.ts`):
```typescript
export async function POST(req: Request) {
  const payload = {
    hashLock,
    srcChainId,
    dstChainId,
    order,
    extension,
    signature,
    status: "order_created"
  };

  // Store in Redis
  await redis.hSet("orders", hash, JSON.stringify(payload));

  // Trigger resolver bot
  fetch(`/api/resolver/orders/${hash}/escrow`, { method: 'POST' });

  return NextResponse.json({ success: true });
}
```

---

### Step 3: Resolver Bot Creates Escrows

**Backend** (`/api/resolver/orders/[hash]/escrow/route.ts`):

```typescript
export async function POST() {
  // 1. Fetch order from Redis
  const order = await redis.hGet("orders", hash);

  // 2. Create SOURCE escrow (EVM side)
  const srcProvider = new JsonRpcProvider(config[srcChainId].rpc);
  const srcResolverWallet = new Wallet(ethPrivateKey, srcProvider);

  // Use Resolver.sol contract to deploy escrow
  const evmResolverContract = new Resolver(
    config[srcChainId].resolver,  // Resolver on source chain
    config[dstChainId].resolver   // Resolver on dest chain
  );

  // Deploy source escrow via Resolver.sol
  const { txHash: srcDeployHash } = await srcResolverWallet.send(
    evmResolverContract.deploySrc(
      srcChainId,
      config[srcChainId].limitOrderProtocol,
      order,
      signature,
      takerTraits,
      fillAmount
    )
  );

  // 3. Create DESTINATION escrow (Bitcoin HTLC)
  const btcResolver = walletFromWIF(btcPrivateKey, bitcoin.networks.testnet);

  // Create Bitcoin HTLC script
  const htlcScript = createDstHtlcScript(
    hash,
    Buffer.from(hashLock.sha256, "hex"),
    withdrawalTimestamp,
    cancellationTimestamp,
    Buffer.from(userBtcPublicKey, "hex"),
    btcResolver.publicKey
  );

  // Create P2SH address
  const p2sh = bitcoin.payments.p2sh({
    redeem: { output: htlcScript },
    network: bitcoin.networks.testnet
  });

  // Resolver funds the Bitcoin HTLC
  const psbt = new bitcoin.Psbt({ network });
  // ... add inputs, outputs
  psbt.signAllInputs(btcResolver.keyPair);
  const txHex = psbt.extractTransaction().toHex();
  const btcTxHash = await btcProvider.broadcastTx(txHex);

  // 4. Update order in Redis
  await redis.hSet("orders", hash, JSON.stringify({
    ...order,
    status: "escrow_created",
    srcEscrowAddress,
    dstEscrowAddress: p2sh.address,
    srcDeployHash,
    dstDeployHash: btcTxHash,
    htlcScript
  }));
}
```

---

### Step 4: User Claims BTC (Reveals Secret)

**Frontend**:
```typescript
// User calls Bitcoin HTLC to claim BTC
// This reveals the secret on Bitcoin blockchain

// Submit secret to relayer
await fetch(`/api/relayer/orders/${hash}/secret`, {
  method: 'POST',
  body: JSON.stringify({ secret: preimage })
});
```

---

### Step 5: Resolver Claims ETH

**Backend** (`/api/resolver/orders/[hash]/withdraw/route.ts`):
```typescript
export async function POST() {
  // 1. Fetch order and secret from Redis
  const order = await redis.hGet("orders", hash);
  const { secret, srcEscrowAddress } = JSON.parse(order);

  // 2. Use Resolver.sol to claim from source escrow
  const evmResolverContract = new Resolver(...);

  const { txHash } = await resolverWallet.send(
    evmResolverContract.withdraw(
      'src',                    // source escrow
      secret,                   // revealed preimage
      srcImmutables            // escrow details
    )
  );

  // 3. Update status
  await redis.hSet("orders", hash, JSON.stringify({
    ...order,
    status: "completed"
  }));
}
```

---

## 🔑 Key Insights for SunnySwap

### 1. **Resolver.sol is ESSENTIAL**
- ❌ hashlocked-cli doesn't have it (manual CLI approach)
- ✅ GattaiSwap has it (automated dapp approach)
- ✅ SunnySwap NEEDS it for automation

### 2. **Two Separate Components**
- **Resolver.sol** = Smart contract owned by backend
- **Resolver Bot** = Backend service (Next.js API routes)

### 3. **Resolver.sol Responsibilities**
- Holds resolver's liquidity
- Deploys counter-escrows
- Claims tokens when secret revealed
- Refunds on timeout

### 4. **Resolver Bot Responsibilities**
- Monitors Redis for new orders
- Calls Resolver.sol functions
- Broadcasts Bitcoin transactions
- Updates order status

### 5. **Why Need Both?**
- **Resolver.sol**: On-chain automation and liquidity management
- **Resolver Bot**: Off-chain orchestration and blockchain monitoring

---

## 📋 What SunnySwap Needs to Copy

### From Smart Contracts:
1. ✅ **Resolver.sol** - Adapt for STX instead of BTC
2. ✅ **EscrowFactory** - Already have (STXEscrowFactory)
3. ❌ **Limit Order Protocol** - Not needed (Stacks doesn't use 1inch LOP)

### From SDK:
1. ✅ **resolver.ts** - TypeScript wrapper for Resolver.sol
2. ✅ **escrow-factory.ts** - Factory helpers
3. ✅ **timelocks.ts** - Timelock encoding
4. ✅ **constants.ts** - Network configs
5. ✅ **wallet.ts** - Wallet utilities
6. ✅ **cross-chain-sdk-shims.ts** - 1inch SDK adapters

### From Backend:
1. ✅ **Relayer API** - `/api/relayer/orders/*`
2. ✅ **Resolver Bot** - `/api/resolver/orders/*`
3. ✅ **Redis Integration** - Order tracking
4. ✅ **Status Monitoring** - Real-time updates

### From Frontend:
1. ✅ **Swap UI** - Order creation interface
2. ✅ **Status Modal** - Progress tracking
3. ✅ **Wallet Connection** - Multi-wallet support

---

## 🔄 Adaptation for SunnySwap (STX)

### Key Differences:

| Component | GattaiSwap (BTC) | SunnySwap (STX) |
|-----------|------------------|-----------------|
| **Blockchain** | Bitcoin Script HTLCs | Stacks Clarity contracts |
| **Escrow Type** | P2SH script addresses | Smart contract (stx-htlc.clar) |
| **Secret Reveal** | Bitcoin transaction | Contract call (swap) |
| **Timelocks** | Block height | Block height |
| **Addresses** | P2SH/P2WPKH | Stacks addresses (SP...) |
| **SDK** | bitcoinjs-lib | @stacks/transactions |

### What Stays the Same:
- ✅ Resolver.sol pattern (for EVM side)
- ✅ Backend API structure
- ✅ Frontend flow
- ✅ Redis order tracking
- ✅ HTLC atomic swap guarantees

---

## 🎯 Next Steps for SunnySwap

### Phase 1: Copy & Adapt Resolver.sol
1. Copy Resolver.sol to sunnyswap-stacks
2. Keep it unchanged (it's EVM-side only)
3. Deploy alongside STXEscrowFactory

### Phase 2: Copy SDK
1. Copy resolver.ts, escrow-factory.ts, etc.
2. Rename BTC → STX where needed
3. Replace bitcoinjs-lib with @stacks/transactions

### Phase 3: Build Backend
1. Copy relayer API routes
2. Copy resolver bot routes
3. Replace Bitcoin HTLC logic with Stacks contract calls
4. Set up Redis

### Phase 4: Build Frontend
1. Copy swap UI components
2. Adapt for Stacks wallet (Hiro/Leather)
3. Update status monitoring

---

## 🚀 Conclusion

**GattaiSwap Architecture = Perfect Blueprint for SunnySwap!**

The system is:
- ✅ **Automated** (Resolver.sol + Resolver Bot)
- ✅ **Scalable** (Factory pattern, minimal proxies)
- ✅ **User-friendly** (Web UI, status tracking)
- ✅ **Battle-tested** (Built on 1inch contracts)

**SunnySwap just needs to**:
1. Keep the EVM side (Resolver.sol, EscrowFactory)
2. Replace Bitcoin logic with Stacks logic
3. Use existing frontend patterns
4. Build the resolver bot

**No need to reinvent the wheel!** 🎉
