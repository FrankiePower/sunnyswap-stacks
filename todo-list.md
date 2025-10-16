# SunnySwap Development Todo List

**Last Updated**: 2025-10-13
**Status**: Architecture Phase Complete

---

## Phase 1: Foundation & Smart Contracts ⚡

### 1.1 Stacks Smart Contract Setup
- [x] Review existing stx-htlc.clar contract
- [x] Copy stx-htlc.clar to sunnyswap-stacks/clarity/contracts/
- [x] Analyze contract for production readiness
- [x] Update contract to use 32-byte hash (GattaiSwap compatible)
- [x] Add additional error constants if needed
- [x] Add read-only helper functions (get-balance, check-expiry, etc)
- [x] Document contract functions with detailed comments

### 1.2 Clarity Contract Testing
- [x] Create unit tests in clarity/tests/stx-htlc.test.ts
  - [x] Test: register-swap-intent (happy path)
  - [x] Test: register-swap-intent with invalid hash length
  - [x] Test: register-swap-intent with past expiration
  - [x] Test: duplicate swap intent (should fail)
  - [x] Test: swap with correct preimage using REAL SHA256
  - [x] Test: swap with wrong preimage (should fail)
  - [x] Test: swap after expiration (should fail)
  - [x] Test: cancel-swap-intent before expiration (should fail)
  - [x] Test: cancel-swap-intent after expiration (success)
  - [x] Test: full atomic swap flow (register → swap → cleanup)
  - [x] Test: allow same hash for different senders
  - [x] Test: fails when caller is not designated recipient
- [x] Run tests with Clarinet: All 33 tests passing
- [x] Verify all edge cases covered
- [x] Document test scenarios with SHA256 compatibility notes

### 1.3 Frontend HTLC Integration ✅ Frontend Already Has Stacks SDK!
**Location**: `front-end/src/lib/htlc/`

**Note**: Frontend template already includes:
- ✅ `@stacks/connect` - Wallet integration (Hiro, Leather)
- ✅ `@stacks/transactions` - Transaction building
- ✅ `@stacks/blockchain-api-client` - API queries
- ✅ `lib/contract-utils.ts` - Contract call execution
- ✅ `lib/stacks-api.ts` - API client wrapper
- ✅ `components/ConnectWallet.tsx` - Wallet UI
- ✅ Devnet support for local testing

**New HTLC Helper Functions Needed**:

- [x] Create `lib/htlc/` directory structure ✅ COMPLETE!
  ```
  lib/htlc/
  ├── index.ts              # Main exports ✅
  ├── register-swap.ts      # Register swap intent ✅
  ├── claim-swap.ts         # Claim with preimage ✅
  ├── cancel-swap.ts        # Cancel expired swap ✅
  ├── query-swap.ts         # Query swap status ✅
  ├── types.ts              # HTLC TypeScript types ✅
  ├── utils.ts              # Hash/preimage utilities ✅
  └── README.md             # Full documentation ✅
  ```

- [x] **register-swap.ts** ✅
  - [x] `buildRegisterSwapIntent()` with postConditions
  - [x] STX transfer validation
  - [x] Full JSDoc documentation

- [x] **claim-swap.ts** ✅
  - [x] `buildClaimSwap()` - Basic version
  - [x] `buildClaimSwapWithPostCondition()` - Safe version
  - [x] Preimage validation
  - [x] Full JSDoc documentation

- [x] **cancel-swap.ts** ✅
  - [x] `buildCancelSwapIntent()` - Basic version
  - [x] `buildCancelSwapIntentWithPostCondition()` - Safe version
  - [x] Full JSDoc documentation

- [x] **query-swap.ts** ✅
  - [x] `getSwapIntent()` - Read-only call
  - [x] `hasSwapIntent()` - Check existence
  - [x] `isSwapExpired()` - Check expiration
  - [x] `getCurrentBlockHeight()` - Network info
  - [x] `getStxBalance()` - Account balances
  - [x] Parse Clarity values to TypeScript

- [x] **types.ts** ✅
  - [x] All interfaces defined
  - [x] `HtlcErrorCode` enum
  - [x] `getErrorMessage()` helper

- [x] **utils.ts** ✅
  - [x] Complete utility suite
  - [x] Hash/secret generation
  - [x] Conversions (hex, STX amounts)
  - [x] Time formatting

- [x] JSDoc comments for all functions ✅
- [x] Export all from `lib/htlc/index.ts` ✅
- [x] Comprehensive README with examples ✅

### 1.4 HTLC Frontend Testing
- [ ] Test wallet connection with HTLC functions
- [ ] Test register-swap-intent on devnet
- [ ] Test claim-swap on devnet
- [ ] Test cancel-swap on devnet
- [ ] Test query functions
- [ ] Verify postConditions work correctly
- [ ] Test error handling

---

## Phase 2: EVM Integration 🔗

### 2.1 Copy EVM Contracts (using hashlocked-cli)
- [x] Create `evm-contracts/` directory in sunnyswap-stacks
- [x] Copy from hashlocked-cli (simpler than GattaiSwap):
  - [x] `contracts/BTCEscrowFactory.sol` → `STXEscrowFactory.sol`
  - [x] `contracts/BTCEscrowSrc.sol` → `STXEscrowSrc.sol`
  - [x] `contracts/BTCEscrowDst.sol` → `STXEscrowDst.sol`
  - [x] `contracts/interfaces/` (all interfaces)
  - [x] `contracts/libraries/` (TimelocksLib, ImmutablesLib, etc.)
- [x] Copy dependencies from node_modules:
  - [x] `@openzeppelin/contracts/` (already in package.json)
- [x] Rename all Bitcoin/BTC references to Stacks/STX:
  - [x] Contract file names
  - [x] Contract code (using sed batch replacement)
  - [x] Interface function names
  - [x] BitcoinConfig → StacksConfig
  - [x] BTC_ESCROW_* → STX_ESCROW_*
- [x] Set up Hardhat config (hardhat.config.ts)
  - [x] Fixed from profile-based to flat config
  - [x] Set Solidity version to 0.8.23
  - [x] Configure optimizer (runs: 1000000, viaIR: true)
- [x] Verify contracts compile: `npx hardhat compile` ✅ (5 Solidity files including MockERC20)
- [x] Create Hardhat Ignition deployment module ✅
  - [x] Created `ignition/modules/STXEscrowFactory.ts`
  - [x] Created `contracts/test/MockERC20.sol` for testing
  - [x] Updated package.json with deployment scripts
  - [x] Added comprehensive README for Ignition deployment
- [ ] Deploy to testnet (Sepolia)
- [ ] Verify contracts on Etherscan

### 2.2 Copy GattaiSwap EVM SDK
- [ ] Create `sdk/evm/` directory
- [ ] Copy from GattaiSwap:
  - [ ] `resolver.ts`
  - [ ] `escrow-factory.ts`
  - [ ] `timelocks.ts`
  - [ ] `constants.ts`
  - [ ] `wallet.ts`
  - [ ] `cross-chain-sdk-shims.ts`
  - [ ] `patch.ts`
  - [ ] `contracts/*.json` (ABIs)
- [ ] Update imports for new project structure
- [ ] Test EVM SDK independently
- [ ] Document EVM SDK usage

### 2.3 Cross-Chain Coordination
- [ ] Create `sdk/config.ts` for cross-chain settings
- [ ] Define swap order types (STX→EVM, EVM→STX)
- [ ] Timelock coordination logic
  - [ ] Calculate STX block heights from timestamps
  - [ ] Add safety buffers (24h recommended)
  - [ ] Handle network delays
- [ ] Hash function alignment (SHA256 on both chains)
- [ ] Order serialization format

---

## Phase 3: Backend Services 🖥️

### 3.1 Relayer API Setup
**Location**: `app/src/app/api/relayer/`

- [ ] Create directory structure:
  ```
  api/relayer/
  ├── orders/
  │   ├── route.ts                    # POST /api/relayer/orders
  │   └── [hash]/
  │       ├── route.ts                # GET /api/relayer/orders/[hash]
  │       ├── status/route.ts         # GET status
  │       ├── escrow/route.ts         # POST create escrow
  │       ├── secret/route.ts         # POST submit secret
  │       └── withdraw/route.ts       # POST withdraw
  ```

- [ ] **POST /api/relayer/orders** - Submit new swap order
  - [ ] Accept order parameters (from/to chain, tokens, amount)
  - [ ] Validate order data
  - [ ] Generate unique order hash
  - [ ] Store in Redis with status: 'pending'
  - [ ] Return order hash and confirmation

- [ ] **GET /api/relayer/orders/[hash]** - Get order details
  - [ ] Fetch from Redis
  - [ ] Return full order state
  - [ ] Include blockchain tx hashes

- [ ] **GET /api/relayer/orders/[hash]/status** - Check order status
  - [ ] Query both chains for current state
  - [ ] Return: pending | locked | claimed | cancelled | expired
  - [ ] Include timestamps and block heights

- [ ] **POST /api/relayer/orders/[hash]/escrow** - Create escrow
  - [ ] Verify source chain lock
  - [ ] Call resolver to create destination escrow
  - [ ] Update order status: 'escrow_created'
  - [ ] Return escrow address

- [ ] **POST /api/relayer/orders/[hash]/secret** - Submit secret
  - [ ] Validate preimage matches hash
  - [ ] Store secret
  - [ ] Trigger resolver to claim
  - [ ] Update status: 'secret_revealed'

- [ ] **POST /api/relayer/orders/[hash]/withdraw** - Execute withdrawal
  - [ ] Verify secret available
  - [ ] Execute claim transaction
  - [ ] Update status: 'completed'
  - [ ] Return tx hash

### 3.2 Redis Integration
- [ ] Set up Redis connection (`app/src/lib/redis.ts`)
- [ ] Define order data schema
- [ ] Implement order CRUD operations
- [ ] Add expiration for old orders (30 days)
- [ ] Create indexes for efficient queries

### 3.3 Blockchain Monitoring
- [ ] Create monitoring service for STX chain
  - [ ] Listen for register-swap-intent events
  - [ ] Listen for swap (claim) events
  - [ ] Listen for cancel events
- [ ] Create monitoring service for EVM chains
  - [ ] Listen for escrow creation
  - [ ] Listen for withdrawals
  - [ ] Listen for cancellations
- [ ] Event processor to update Redis state
- [ ] Webhook support for real-time updates

### 3.4 Resolver Bot
**Location**: `app/src/lib/resolver/`

- [ ] Create resolver service:
  ```
  lib/resolver/
  ├── index.ts              # Main resolver logic
  ├── stx-handler.ts        # STX chain operations
  ├── evm-handler.ts        # EVM chain operations
  └── strategy.ts           # Pricing/liquidity logic
  ```

- [ ] **Resolver Core Logic**
  - [ ] Monitor relayer for new orders
  - [ ] Validate order profitability
  - [ ] Check available liquidity
  - [ ] Execute counter-escrow creation
  - [ ] Monitor for secret reveals
  - [ ] Auto-claim when secret available
  - [ ] Handle timeouts/cancellations

- [ ] **STX Handler**
  - [ ] Connect to STX provider
  - [ ] Create swap intents
  - [ ] Monitor for secrets
  - [ ] Claim STX tokens
  - [ ] Cancel expired intents

- [ ] **EVM Handler**
  - [ ] Connect to EVM providers
  - [ ] Deploy escrows via Resolver contract
  - [ ] Monitor for secrets
  - [ ] Withdraw EVM tokens
  - [ ] Cancel expired escrows

- [ ] **Strategy/Pricing**
  - [ ] Fee calculation (e.g., 0.3%)
  - [ ] Liquidity checks
  - [ ] Risk assessment
  - [ ] Rate limiting

- [ ] Error handling and retry logic
- [ ] Logging and monitoring
- [ ] Admin dashboard for resolver status

---

## Phase 4: Frontend Development 🎨

### 4.1 Copy GattaiSwap Frontend
- [ ] Copy from `/2025-unite/app/`:
  - [ ] `src/app/page.tsx` (main swap interface)
  - [ ] `src/components/` (reusable components)
  - [ ] `public/` (assets, images)
  - [ ] `tailwind.config.ts`
  - [ ] `next.config.ts`
  - [ ] `package.json` dependencies

### 4.2 Update UI for STX
- [ ] Replace Bitcoin wallet UI with Stacks wallet
- [ ] Update chain selector (STX, Monad, Etherlink)
- [ ] Remove Bitcoin-specific terminology
- [ ] Update logos and branding to "SunnySwap"
- [ ] Adjust color scheme (Stacks orange/purple?)

### 4.3 Wallet Integration
- [ ] Install Stacks wallet libraries:
  - [ ] `@stacks/connect`
  - [ ] `@stacks/transactions`
  - [ ] `@stacks/network`
- [ ] Create `components/WalletConnect.tsx`
  - [ ] Connect to Hiro Wallet
  - [ ] Connect to Leather Wallet
  - [ ] Display connected address
  - [ ] Show STX balance
- [ ] Keep existing EVM wallet connections (WalletConnect, MetaMask)

### 4.4 Swap Interface
**Component**: `components/SwapInterface.tsx`

- [ ] Chain selector dropdown
  - [ ] From: STX, Monad, Etherlink
  - [ ] To: STX, Monad, Etherlink
  - [ ] Disable same-chain swaps
- [ ] Token input fields
  - [ ] Amount input with balance display
  - [ ] Token selector (STX, USDT, WETH, etc.)
  - [ ] USD value display
- [ ] Swap preview
  - [ ] Exchange rate
  - [ ] Fee breakdown
  - [ ] Estimated time
  - [ ] Slippage tolerance
- [ ] "Review Swap" button
  - [ ] Opens confirmation modal
  - [ ] Shows all details
  - [ ] "Confirm" triggers transaction

### 4.5 Order Flow UI
**Component**: `components/OrderFlow.tsx`

- [ ] Step-by-step progress indicator
  - [ ] Step 1: Create swap intent
  - [ ] Step 2: Wait for escrow
  - [ ] Step 3: Claim tokens
  - [ ] Step 4: Complete
- [ ] Real-time status updates
  - [ ] Poll `/api/relayer/orders/[hash]/status`
  - [ ] Show tx hashes as clickable links (block explorers)
  - [ ] Show block confirmations
- [ ] Error handling UI
  - [ ] Display error messages
  - [ ] Retry buttons
  - [ ] Cancel swap option
- [ ] Success state
  - [ ] Confetti animation? 🎉
  - [ ] Transaction summary
  - [ ] "Start New Swap" button

### 4.6 Order History
**Component**: `components/OrderHistory.tsx`

- [ ] List past orders from localStorage or backend
- [ ] Filter by status (all, completed, pending, failed)
- [ ] Sort by date
- [ ] Click to view details
- [ ] Export as CSV

### 4.7 Settings & Info
- [ ] Network selector (testnet/mainnet)
- [ ] RPC endpoint customization
- [ ] Slippage tolerance setting
- [ ] FAQ/Help section
- [ ] Link to documentation
- [ ] Contract addresses display

---

## Phase 5: Integration Testing 🧪

### 5.1 Local Development Environment
- [ ] Set up local Stacks devnet (Clarinet)
  - [ ] Configure in `Clarinet.toml`
  - [ ] Deploy stx-htlc contract
  - [ ] Create test accounts with STX
- [ ] Set up local EVM chain (Anvil/Hardhat)
  - [ ] Deploy EVM contracts
  - [ ] Mint test ERC20 tokens
  - [ ] Fund test accounts
- [ ] Run Redis locally
- [ ] Start relayer service
- [ ] Start resolver bot
- [ ] Start Next.js dev server

### 5.2 Integration Test Suite
**Location**: `tests/integration/`

- [ ] **Test: STX → EVM Swap (Happy Path)**
  - [ ] User creates STX swap intent
  - [ ] Resolver detects and creates EVM escrow
  - [ ] User reveals secret on EVM
  - [ ] Resolver claims STX
  - [ ] Verify balances updated correctly

- [ ] **Test: EVM → STX Swap (Happy Path)**
  - [ ] User creates EVM escrow
  - [ ] Resolver detects and creates STX swap intent
  - [ ] User reveals secret on STX
  - [ ] Resolver claims EVM tokens
  - [ ] Verify balances updated correctly

- [ ] **Test: User Cancellation (STX side)**
  - [ ] User creates swap intent
  - [ ] Resolver doesn't respond (simulated)
  - [ ] Wait for expiration
  - [ ] User cancels and recovers STX

- [ ] **Test: Resolver Cancellation (EVM side)**
  - [ ] Resolver creates escrow
  - [ ] User doesn't claim
  - [ ] Wait for expiration
  - [ ] Resolver cancels and recovers tokens

- [ ] **Test: Invalid Preimage**
  - [ ] User attempts to claim with wrong preimage
  - [ ] Transaction should fail
  - [ ] Funds remain locked

- [ ] **Test: Double Spend Prevention**
  - [ ] User attempts to claim same swap intent twice
  - [ ] Second attempt should fail

- [ ] **Test: Expired Swap**
  - [ ] User attempts to claim after expiration
  - [ ] Transaction should fail

- [ ] **Test: Concurrent Swaps**
  - [ ] Create multiple swaps simultaneously
  - [ ] Verify all complete independently
  - [ ] Check for race conditions

- [ ] **Test: Network Failure Recovery**
  - [ ] Simulate RPC failures
  - [ ] Verify retry logic works
  - [ ] Ensure no data loss

- [ ] **Test: Resolver Restart**
  - [ ] Start swap
  - [ ] Stop resolver mid-process
  - [ ] Restart resolver
  - [ ] Verify swap completes

### 5.3 End-to-End Testing
- [ ] Test with real wallets (testnet)
- [ ] Test on multiple browsers
- [ ] Test mobile responsiveness
- [ ] Test with slow network conditions
- [ ] Test with high gas prices
- [ ] Security audit of smart contracts
- [ ] Penetration testing of APIs

---

## Phase 6: Deployment & Documentation 🚀

### 6.1 Testnet Deployment

**Stacks Testnet:**
- [ ] Deploy stx-htlc.clar contract
  - [ ] Use Clarinet deploy
  - [ ] Verify on explorer
  - [ ] Document contract address
- [ ] Fund resolver wallet with STX
- [ ] Test contract calls on testnet

**EVM Testnets:**
- [ ] Deploy to Monad Testnet
  - [ ] Limit Order Protocol
  - [ ] Escrow Factory
  - [ ] Resolver
  - [ ] Test ERC20 tokens
  - [ ] Document addresses
- [ ] Deploy to Etherlink Testnet (same contracts)
- [ ] Verify all contracts on explorers

**Backend Services:**
- [ ] Deploy Next.js app to Vercel/Railway
- [ ] Set up production Redis (Upstash/Redis Cloud)
- [ ] Configure environment variables
- [ ] Set up resolver bot on server (AWS/DigitalOcean)
- [ ] Configure monitoring (Sentry, Datadog)
- [ ] Set up logging (CloudWatch, Papertrail)

### 6.2 Testing on Testnet
- [ ] Perform 10+ successful swaps (STX→EVM)
- [ ] Perform 10+ successful swaps (EVM→STX)
- [ ] Test cancellations and refunds
- [ ] Test with different token amounts
- [ ] Test with different users
- [ ] Monitor resolver performance
- [ ] Check for any stuck orders

### 6.3 Documentation
- [ ] **README.md**
  - [ ] Project overview
  - [ ] Quick start guide
  - [ ] Architecture diagram
  - [ ] Features list
  - [ ] Links to documentation

- [ ] **docs/USER_GUIDE.md**
  - [ ] How to connect wallets
  - [ ] How to perform a swap
  - [ ] Understanding fees
  - [ ] Troubleshooting
  - [ ] FAQ

- [ ] **docs/DEVELOPER_GUIDE.md**
  - [ ] Local setup instructions
  - [ ] Running tests
  - [ ] Contract deployment
  - [ ] API reference
  - [ ] SDK usage examples

- [ ] **docs/CONTRACTS.md**
  - [ ] Contract addresses (all networks)
  - [ ] Function documentation
  - [ ] Security considerations
  - [ ] Audit reports

- [ ] **docs/API.md**
  - [ ] Relayer API endpoints
  - [ ] Request/response formats
  - [ ] Error codes
  - [ ] Rate limits
  - [ ] Example requests

- [ ] **docs/SECURITY.md**
  - [ ] Security model
  - [ ] Known limitations
  - [ ] Best practices
  - [ ] Responsible disclosure

### 6.4 Video & Demo
- [ ] Record demo video (3-5 minutes)
  - [ ] Show wallet connection
  - [ ] Execute a swap
  - [ ] Show status tracking
  - [ ] Show completion
- [ ] Create GIF for README
- [ ] Prepare presentation slides
- [ ] Write blog post about the project

### 6.5 Open Source Preparation
- [ ] Add LICENSE file (MIT)
- [ ] Add CONTRIBUTING.md
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Set up GitHub issues templates
- [ ] Create PR template
- [ ] Add CI/CD (GitHub Actions)
  - [ ] Run tests on PR
  - [ ] Lint code
  - [ ] Deploy previews
- [ ] Add badges to README (build status, coverage, etc)

---

## Phase 7: Mainnet Preparation (Future) 🌐

### 7.1 Security Audit
- [ ] Smart contract audit (Stacks)
- [ ] Smart contract audit (EVM)
- [ ] Backend security review
- [ ] Penetration testing
- [ ] Bug bounty program

### 7.2 Mainnet Deployment
- [ ] Deploy contracts to Stacks mainnet
- [ ] Deploy contracts to EVM mainnets
- [ ] Fund resolver with production liquidity
- [ ] Set up production monitoring
- [ ] Enable mainnet in UI (behind feature flag)
- [ ] Gradual rollout to users

### 7.3 Operations
- [ ] 24/7 monitoring dashboard
- [ ] Alerting for failed swaps
- [ ] Resolver liquidity management
- [ ] Fee optimization
- [ ] Gas price optimization
- [ ] Customer support system

---

## Phase 8: Advanced Features (Future) ✨

### 8.1 Multi-Asset Support
- [ ] SIP-010 fungible token swaps
- [ ] ERC20 token support (any token)
- [ ] Token whitelist management
- [ ] Token price feeds

### 8.2 Additional Chains
- [ ] Add Arbitrum
- [ ] Add Optimism
- [ ] Add Base
- [ ] Add Polygon
- [ ] Add BSC

### 8.3 Advanced Trading
- [ ] Limit orders
- [ ] Partial fills
- [ ] Dutch auction pricing
- [ ] MEV protection
- [ ] Slippage protection

### 8.4 Decentralization
- [ ] Multiple resolver support
- [ ] Decentralized relayer network
- [ ] On-chain order book
- [ ] Governance token
- [ ] DAO for protocol upgrades

### 8.5 Chain Abstraction
- [ ] NEAR chain signatures integration (like GattaiSwap)
- [ ] Unified wallet experience
- [ ] Gas abstraction
- [ ] One-click cross-chain swaps

---

## Current Priority: Phase 1 - Foundation

**Next Immediate Tasks:**
1. ✅ Architecture documented
2. ✅ Copy stx-htlc.clar to clarity/contracts/
3. ✅ Set up Clarity testing environment
4. ✅ All tests passing (33/33) with 32-byte hash support
5. ✅ Realized frontend already has full Stacks SDK!
6. ✅ **COMPLETE: HTLC Helper Functions (Section 1.3)**
   - ✅ Created `front-end/src/lib/htlc/` directory
   - ✅ Built types.ts and utils.ts (hash/secret generation)
   - ✅ Built register-swap.ts, claim-swap.ts, cancel-swap.ts
   - ✅ Built query-swap.ts for reading contract state
   - ✅ Added comprehensive README with examples
7. 🔜 **NEXT OPTIONS:**
   - Option A: Test HTLC functions on devnet (Section 1.4)
   - Option B: Start Phase 2 - Copy GattaiSwap EVM contracts
   - Option C: Start building cross-chain relayer backend

**Blocked Items:** None currently

**Notes:**
- Focus on getting Phase 1 rock solid before moving to integration
- Write comprehensive tests - they will save time later
- Document as you go - don't leave it for the end

---

**Progress Tracking:**
- Phase 1: 🟢 Sections 1.1, 1.2 & 1.3 Complete! (75% complete)
  - ✅ Smart contract deployed and tested (1.1)
  - ✅ All 33 tests passing with 32-byte hash format (1.2)
  - ✅ HTLC library complete with full documentation (1.3)
  - 🔜 Next: Optional devnet testing (1.4) OR start Phase 2
- Phase 2: 🟡 Section 2.1 Nearly Complete! (EVM Contracts ~90% complete)
  - ✅ Copied and renamed contracts from hashlocked-cli
  - ✅ All contracts compile successfully (5 Solidity files)
  - ✅ Created Hardhat Ignition deployment module with documentation
  - ✅ Added MockERC20 for testing
  - 🔜 Deploy to testnet (ready to deploy with `npm run deploy:stx`)
- Phase 3: ⚪ Not Started
- Phase 4: ⚪ Not Started
- Phase 5: ⚪ Not Started
- Phase 6: ⚪ Not Started
- Phase 7: ⚪ Future
- Phase 8: ⚪ Future
