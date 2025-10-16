# SunnySwap Backend

Next.js 15 App Router backend for cross-chain atomic swaps between EVM chains and Stacks.

## Architecture

This backend follows the **Resolver Pattern** inspired by GattaiSwap:

1. **Relayer**: Stores orders in Redis
2. **Resolver Bot**: Deploys escrows on-chain and executes swaps

## API Routes

### Relayer (Order Management)

- `POST /api/relayer/orders` - Submit a new swap order
- `GET /api/relayer/orders/[hash]` - Fetch order details
- `GET /api/relayer/orders/[hash]/status` - Check order status

### Resolver (Swap Execution)

- `POST /api/resolver/orders/[hash]/escrow` - Deploy source and destination escrows (auto-triggered)
- `POST /api/resolver/orders/[hash]/withdraw` - Withdraw funds after secret is shared

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Redis

```bash
redis-server
```

### 3. Configure Environment

Update `.env` with deployed contract addresses

### 4. Start Development Server

```bash
npm run dev
```

## Order States

1. `order_created` - Order submitted to relayer
2. `escrows_deployed` - Both escrows deployed on-chain
3. `completed` - Swap completed successfully
4. `deployment_failed` - Escrow deployment failed
5. `withdrawal_failed` - Withdrawal failed

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Redis (order queue)
- **Blockchain**: ethers.js (EVM), @stacks/transactions (Stacks)
- **Language**: TypeScript
