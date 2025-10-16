# Hardhat Ignition Deployment

This directory contains Hardhat Ignition modules for deploying the STX Escrow Factory and related contracts.

## Modules

### STXEscrowFactory

Deploys the complete STX escrow system:
- **MockERC20**: Test token used as ACCESS_TOKEN
- **STXEscrowFactory**: Main factory contract that creates escrow instances

## Configuration

Default parameters in `modules/STXEscrowFactory.ts`:

```typescript
rescueDelaySrc: 86400 seconds (24 hours)
rescueDelayDst: 86400 seconds (24 hours)
creationFee: 0.0001 ETH
stacksConfig: {
  minConfirmations: 1
  dustThreshold: 1000000 (1 STX in microSTX)
  maxAmount: 1000000000000 (1 million STX)
}
```

## Deployment

### Local Network

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network (in another terminal)
npm run deploy:stx:local
```

### Sepolia Testnet

```bash
# Deploy to Sepolia
npm run deploy:stx

# Deploy and verify on Etherscan
npm run deploy:stx:verify
```

### Environment Variables

Create `.env` file in the `evm-contracts/` directory:

```bash
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.drpc.org
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Accessing Deployed Contracts

After deployment, Ignition saves deployment artifacts to `ignition/deployments/`.

You can access deployed contracts in your code:

```typescript
import { ignition } from "hardhat";
import STXEscrowFactoryModule from "./ignition/modules/STXEscrowFactory";

// Get deployed contracts
const { factory, accessToken } = await ignition.deploy(STXEscrowFactoryModule);

console.log("Factory deployed at:", factory.address);
console.log("Access Token at:", accessToken.address);
```

## Contract Addresses

Deployed contract addresses are stored in:
```
ignition/deployments/chain-<chainId>/deployed_addresses.json
```

Example:
```json
{
  "STXEscrowFactoryModule#MockERC20": "0x...",
  "STXEscrowFactoryModule#STXEscrowFactory": "0x..."
}
```

## Customizing Deployment

To modify deployment parameters, edit `modules/STXEscrowFactory.ts`:

```typescript
// Change creation fee
const creationFee = parseEther("0.001"); // 0.001 ETH

// Change Stacks configuration
const stacksConfig = {
  minConfirmations: 3n,
  dustThreshold: 5000000n,  // 5 STX
  maxAmount: 5000000000000n // 5 million STX
};
```

## Verification

After deployment, verify contracts on Etherscan:

```bash
npm run deploy:stx:verify
```

Or manually:
```bash
npx hardhat verify --network sepolia <FACTORY_ADDRESS> \
  <ACCESS_TOKEN_ADDRESS> \
  <OWNER_ADDRESS> \
  86400 \
  86400 \
  100000000000000 \
  <TREASURY_ADDRESS> \
  '(1,1000000,1000000000000)'
```

## Testing Deployment

After deployment, test the factory:

```typescript
// Create a source escrow (EVM → STX)
const immutables = {
  orderHash: "0x...",
  hashlock: "0x...",
  maker: "0x...",
  taker: "0x...",
  token: "0x0000000000000000000000000000000000000000", // ETH
  amount: parseEther("0.1"),
  safetyDeposit: parseEther("0.01"),
  timelocks: /* encoded timelocks */
};

await factory.createSrcEscrow(immutables, {
  value: immutables.amount + immutables.safetyDeposit + creationFee
});
```

## Architecture

```
STXEscrowFactory
├── Creates STXEscrowSrc (for EVM → STX swaps)
├── Creates STXEscrowDst (for STX → EVM swaps)
└── Manages configuration and fees
```

Each escrow is deployed as a minimal proxy (EIP-1167) to save gas.

## Next Steps

1. Deploy to Sepolia testnet
2. Verify contracts on Etherscan
3. Test escrow creation
4. Integrate with frontend
5. Set up relayer backend
6. Test full atomic swap flow
