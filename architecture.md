# SunnySwap Architecture

## Overview

SunnySwap is a cross-chain atomic swap protocol enabling trustless swaps between **Stacks (STX)** and **EVM-compatible chains**. It adapts the GattaiSwap architecture by replacing Bitcoin HTLC scripts with Clarity smart contracts.

**Tagline**: Cross-chain swaps between Stacks and EVM chains using Hash Time-Locked Contracts (HTLCs).

---

## Core Components

### 1. Stacks Layer (Clarity Smart Contracts)

#### STX-HTLC Contract (`stx-htlc.clar`)
The foundation contract providing atomic swap primitives on Stacks.

**Key Functions:**
- `register-swap-intent(hash, expiration-height, amount, recipient)` - Locks STX tokens with hash and timelock
- `swap(sender, preimage)` - Claims locked STX by revealing preimage
- `cancel-swap-intent(hash)` - Refunds after expiration

**Storage:**
```clarity
{sender: principal, hash: (buff 32)} -> {expiration-height: uint, amount: uint, recipient: principal}
```

**Advantages over Bitcoin Scripts:**
- Direct recipient specification (no script limitation)
- Block height timelocks (simpler than BIP68/CLTV)
- Smart contract flexibility (easier upgrades/extensions)
- Clarity safety guarantees (decidable, no reentrancy)

---

### 2. EVM Layer (Solidity Smart Contracts)

Reused from GattaiSwap's battle-tested implementation:

#### Resolver Contract
- `deploySrc()` - Creates escrow on source chain
- `deployDst()` - Creates escrow on destination chain
- `withdraw(escrow, secret, immutables)` - Claims with preimage
- `cancel(escrow, immutables)` - Refunds after timeout

#### Escrow Factory
- Creates deterministic escrow addresses
- Manages safety deposits
- Handles cross-chain coordination

#### Supporting Contracts
- Limit Order Protocol (1inch)
- ERC20 token interfaces
- WETH9 for native token wrapping

**Deployed Chains:**
- Monad Testnet
- Etherlink Testnet
- (Extensible to any EVM chain)

---

### 3. SDK Layer

#### STX SDK (To Be Built)
Mirrors GattaiSwap's BTC SDK structure:

```typescript
// Core types
type StxWallet = {
  address: string
  publicKey: string
}

// Provider for Stacks blockchain
class StxProvider {
  getBalance(address: string): Promise<bigint>
  getSwapIntent(hash: Buffer, sender: string): Promise<SwapIntent>
  broadcastTx(signedTx: string): Promise<string>
  waitForTxConfirmation(txid: string): Promise<{height: number}>
}

// HTLC operations
function createSwapIntent(params): Promise<SignedTx>
function claimSwap(sender: string, preimage: Buffer): Promise<SignedTx>
function cancelSwap(hash: Buffer): Promise<SignedTx>
```

#### EVM SDK (Reused from GattaiSwap)
- Escrow factory interactions
- Resolver operations
- Cross-chain order creation
- Timelock calculations

---

### 4. Backend Services

#### Relayer
Coordinates atomic swap flow:

**Endpoints:**
- `POST /api/relayer/orders` - Submit new swap order
- `GET /api/relayer/orders/[hash]/status` - Check order status
- `POST /api/relayer/orders/[hash]/escrow` - Create escrow
- `POST /api/relayer/orders/[hash]/secret` - Submit secret for claim
- `POST /api/relayer/orders/[hash]/withdraw` - Execute withdrawal

**Responsibilities:**
- Receives swap intents from users
- Broadcasts STX transactions
- Monitors blockchain events
- Coordinates with resolver
- Manages order lifecycle

#### Resolver (Bot)
Acts as the counterparty/market maker:

**Responsibilities:**
- Monitors relayer for new orders
- Creates escrows on destination chains
- Claims tokens after secret reveal
- Handles cancellations/refunds
- Provides liquidity

---

### 5. Frontend (Next.js)

Adapted from GattaiSwap UI:

**Key Pages:**
- `/` - Swap interface (select chains, tokens, amounts)
- Order creation flow
- Status tracking with real-time updates
- Wallet connection (Stacks wallet + EVM wallets)

**Components:**
- Chain selector (STX ↔ EVM chains)
- Token input fields
- Swap preview with fees
- Transaction status tracker
- Order history

---

## Atomic Swap Flows

### Flow 1: STX → EVM (User sells STX for EVM tokens)

```
1. User (Stacks)
   ↓ Creates swap intent with hash H, locks STX
   ↓ Calls: register-swap-intent()

2. Relayer
   ↓ Detects new STX swap intent
   ↓ Notifies Resolver

3. Resolver (EVM)
   ↓ Creates escrow with same hash H
   ↓ Locks EVM tokens (USDT, ETH, etc)
   ↓ Calls: deployDst()

4. User (EVM)
   ↓ Claims EVM tokens by revealing preimage P
   ↓ Calls: escrow.withdraw(P)
   ↓ Secret P now public on-chain

5. Resolver (Stacks)
   ↓ Observes secret P from EVM chain
   ↓ Claims STX using P
   ↓ Calls: swap(user-address, P)

✅ Atomic swap complete!
```

**Failure Scenarios:**
- If User never claims: Resolver cancels EVM escrow after timeout, User cancels STX intent
- If Resolver never creates escrow: User cancels STX intent after timeout

---

### Flow 2: EVM → STX (User buys STX with EVM tokens)

```
1. User (EVM)
   ↓ Creates escrow with hash H, locks EVM tokens
   ↓ Calls: deploySrc() via UI

2. Relayer
   ↓ Detects new EVM escrow
   ↓ Notifies Resolver

3. Resolver (Stacks)
   ↓ Creates STX swap intent with same hash H
   ↓ Locks STX tokens
   ↓ Calls: register-swap-intent()

4. User (Stacks)
   ↓ Claims STX by revealing preimage P
   ↓ Calls: swap(resolver-address, P)
   ↓ Secret P now public on Stacks chain

5. Resolver (EVM)
   ↓ Observes secret P from Stacks chain
   ↓ Claims EVM tokens using P
   ↓ Calls: escrow.withdraw(P)

✅ Atomic swap complete!
```

---

## Security Considerations

### Hash Function Consistency
- **Stacks**: Uses SHA256 in Clarity (`sha256` function)
- **EVM**: Uses keccak256 by default
- **CRITICAL**: Must use SHA256 on both chains for compatibility
- GattaiSwap uses SHA256 for Bitcoin compatibility - we maintain this

### Timelock Coordination
- **Stacks**: Block height based (e.g., expires at block 1000)
- **EVM**: Timestamp based (Unix seconds)
- Must account for:
  - Different block times (Stacks ~10min, EVM ~2-12sec)
  - Network congestion
  - Clock drift
- **Recommended buffer**: EVM timelock > STX timelock + 24 hours

### Replay Attack Prevention
Stacks contract already includes sender in map key:
```clarity
{sender: principal, hash: (buff 32)} -> {...}
```
This prevents same hash from being reused by different senders.

### Recipient Enforcement
Unlike Bitcoin scripts, Clarity can enforce recipient:
```clarity
(get recipient swap-intent)
```
Only designated recipient can claim funds.

---

## Technical Architecture Decisions

### Why Reuse GattaiSwap EVM Contracts?
✅ Battle-tested in hackathon/production
✅ 1inch Fusion+ compatible architecture
✅ Deterministic escrow addresses
✅ Clean resolver pattern
✅ Already deployed on target chains

### Why Build Custom STX SDK?
✅ Stacks has different RPC interface than Bitcoin
✅ Clarity contract calls vs Bitcoin scripts
✅ Different transaction signing (Stacks vs Bitcoin)
✅ Need Stacks-specific wallet integration

### Why Keep Relayer/Resolver Pattern?
✅ Proven UX (users don't manage complex flows)
✅ Resolver provides liquidity and speed
✅ Relayer coordinates cross-chain state
✅ Matches GattaiSwap mental model

---

## Technology Stack

### Smart Contracts
- **Stacks**: Clarity 2.0
- **EVM**: Solidity 0.8.23
- **Testing**: Clarinet (Stacks), Foundry (EVM)

### Backend
- **Runtime**: Node.js / TypeScript
- **Framework**: Next.js 14 (App Router)
- **API**: RESTful endpoints
- **Storage**: Redis (order state management)
- **Blockchain RPC**:
  - Stacks: Hiro API / Local Clarinet
  - EVM: Public RPC endpoints

### Frontend
- **Framework**: Next.js 14 + React 18
- **Styling**: Tailwind CSS
- **Wallet Integration**:
  - Stacks: Hiro Wallet, Leather Wallet
  - EVM: WalletConnect, MetaMask
- **State Management**: React hooks + Context

### SDKs & Libraries
- **Stacks**: @stacks/transactions, @stacks/network
- **EVM**: viem, @1inch/cross-chain-sdk
- **Crypto**: SHA256 from @noble/hashes

---

## Project Structure

```
sunnyswap-stacks/
├── clarity/                    # Stacks smart contracts
│   ├── contracts/
│   │   └── stx-htlc.clar      # Core HTLC contract
│   ├── tests/
│   │   └── stx-htlc_test.clar # Unit tests
│   └── Clarinet.toml          # Clarinet config
│
├── contracts/evm/              # EVM smart contracts (from GattaiSwap)
│   ├── src/
│   │   ├── Resolver.sol
│   │   └── test/
│   └── script/
│       └── Deploy.s.sol
│
├── sdk/
│   ├── stx/                   # Stacks SDK (NEW)
│   │   ├── provider.ts
│   │   ├── htlc.ts
│   │   └── wallet.ts
│   └── evm/                   # EVM SDK (from GattaiSwap)
│       ├── resolver.ts
│       ├── escrow-factory.ts
│       └── contracts/
│
├── app/                        # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Main swap UI
│   │   │   └── api/
│   │   │       ├── relayer/   # Relayer endpoints
│   │   │       └── resolver/  # Resolver endpoints
│   │   ├── components/
│   │   │   ├── SwapInterface.tsx
│   │   │   ├── OrderStatus.tsx
│   │   │   └── WalletConnect.tsx
│   │   └── lib/
│   │       ├── stx-client.ts
│   │       └── evm-client.ts
│   └── public/
│
├── tests/                      # Integration tests
│   ├── stx-evm.spec.ts        # STX ↔ EVM swap tests
│   └── test-utils/
│
├── architecture.md             # This file
├── todo-list.md               # Development roadmap
└── README.md                  # Project overview
```

---

## Development Phases

### Phase 1: Foundation (Current)
- ✅ STX-HTLC contract exists
- ✅ Architecture documented
- 🔲 STX SDK development
- 🔲 Test suite for Clarity contract

### Phase 2: Integration
- 🔲 Copy GattaiSwap EVM contracts
- 🔲 Adapt relayer API for STX
- 🔲 Build STX ↔ EVM integration tests
- 🔲 Local development environment

### Phase 3: Frontend
- 🔲 Copy GattaiSwap UI
- 🔲 Replace BTC wallet with STX wallet
- 🔲 Update swap flow for STX
- 🔲 Status tracking UI

### Phase 4: Deployment
- 🔲 Deploy to Stacks testnet
- 🔲 Deploy resolver bot
- 🔲 End-to-end testing
- 🔲 Documentation & examples

---

## Key Differences from GattaiSwap

| Aspect | GattaiSwap (BTC) | SunnySwap (STX) |
|--------|------------------|-----------------|
| **Chain** | Bitcoin | Stacks |
| **Contract Language** | Bitcoin Script | Clarity |
| **HTLC Type** | Script-based | Smart contract |
| **Timelock** | BIP68 (relative/absolute) | Block height |
| **Recipient** | Not enforceable | Enforced in contract |
| **Transaction Model** | UTXO | Account-based |
| **Wallet Integration** | Bitcoin wallets | Stacks wallets |
| **Hash Function** | SHA256 | SHA256 (matching) |
| **Testing** | Manual/Script | Clarinet unit tests |

---

## Future Enhancements

### Multi-Asset Support
- SIP-010 fungible tokens (not just STX)
- NFT atomic swaps (SIP-009)
- LP token swaps

### Additional EVM Chains
- Arbitrum, Optimism, Base
- Polygon, BSC
- Mainnet deployments

### Advanced Features
- Partial fills
- Dutch auction pricing
- MEV protection
- Chain abstraction via NEAR (like GattaiSwap)

### Decentralization
- Multiple resolvers (competition)
- Decentralized relayer network
- On-chain order book

---

## Resources

### Reference Implementations
- GattaiSwap: `/Users/user/SuperFranky/2025-unite`
- STX-HTLC: `/Users/user/SuperFranky/stx-atomic-swap`

### Documentation
- [Clarinet Docs](https://docs.hiro.so/tools/clarinet)
- [Stacks.js](https://docs.hiro.so/stacks.js)
- [1inch Fusion+](https://docs.1inch.io/docs/fusion-swap/introduction)
- [Clarity Language](https://docs.stacks.co/clarity)

### Key Files from GattaiSwap
- BTC SDK: `/2025-unite/chains/sdk/btc/index.ts`
- EVM Resolver: `/2025-unite/chains/contracts/evm/src/Resolver.sol`
- Swap Tests: `/2025-unite/chains/tests/btc.spec.ts`
- Frontend: `/2025-unite/app/src/app/page.tsx`

---

**Last Updated**: 2025-10-13
**Status**: Architecture defined, starting implementation
