# 🚀 SunnySwap Deployment Information

## Sepolia Testnet Deployment

**Network**: Ethereum Sepolia Testnet
**Chain ID**: 11155111
**Deployed**: October 16, 2025

---

## 📋 Deployed Contracts

### STXEscrowFactory
- **Address**: `0x506485C554E2eFe0AA8c22109aAc021A1f28888B`
- **Purpose**: Factory contract for creating source and destination escrows
- **Etherscan**: https://sepolia.etherscan.io/address/0x506485C554E2eFe0AA8c22109aAc021A1f28888B

**Configuration**:
- Rescue Delay (Src): 24 hours (86400 seconds)
- Rescue Delay (Dst): 24 hours (86400 seconds)
- Creation Fee: 0.0001 ETH
- Stacks Min Confirmations: 1
- Stacks Dust Threshold: 1 STX (1,000,000 microSTX)
- Stacks Max Amount: 1,000,000 STX (1,000,000,000,000 microSTX)

### Resolver
- **Address**: `0x70060F694e4Ba48224FcaaE7eB20e81ec4461C8D`
- **Purpose**: Automated resolver for executing atomic swaps
- **Etherscan**: https://sepolia.etherscan.io/address/0x70060F694e4Ba48224FcaaE7eB20e81ec4461C8D

### MockERC20 (Access Token)
- **Address**: `0xBF6aF2FB20924cF54912887885d896E5fCFE04e3`
- **Purpose**: Access control token for testing (not used in production)
- **Etherscan**: https://sepolia.etherscan.io/address/0xBF6aF2FB20924cF54912887885d896E5fCFE04e3

---

## 🔧 Contract Interaction

### Creating a Source Escrow (EVM → Stacks)

```typescript
import { useContracts } from '@/hooks/useContracts';
import { parseEther } from 'ethers';

const { factory } = useContracts();

// Prepare immutables
const immutables = {
  orderHash: '0x...', // bytes32
  hashlock: '0x...',  // bytes32 (SHA-256 hash of secret)
  maker: '0x...',     // address as uint256
  taker: '0x...',     // address as uint256
  token: 0n,          // 0 for ETH
  amount: parseEther('0.01'), // Amount in wei
  safetyDeposit: 0n,
  timelocks: 0n,      // Packed timelock data
};

// Create escrow
const tx = await factory.createSrcEscrow(immutables, {
  value: parseEther('0.0101'), // amount + creation fee
});

await tx.wait();
```

### Creating a Destination Escrow (Stacks → EVM)

```typescript
const { factory } = useContracts();

// Similar to source, but use createDstEscrow
const tx = await factory.createDstEscrow(immutables, {
  value: parseEther('0.0001'), // just creation fee
});

await tx.wait();
```

### Claiming from Escrow

```typescript
import { useEscrowContract } from '@/hooks/useContracts';

const escrow = useEscrowContract(escrowAddress, 'src');

// Claim with secret
const secret = '0x...'; // 32-byte secret
const tx = await escrow.claimBySecret(secret);
await tx.wait();
```

---

## 📊 Contract Functions

### STXEscrowFactory

**Main Functions**:
- `createSrcEscrow(Immutables memory immutables)`: Create source escrow
- `createDstEscrow(Immutables memory immutables)`: Create destination escrow
- `rescueFunds(address[] escrows)`: Rescue funds from timed-out escrows

**View Functions**:
- `creationFee()`: Get current creation fee
- `treasury()`: Get treasury address
- `stacksConfig()`: Get Stacks configuration

### STXEscrowSrc / STXEscrowDst

**Main Functions**:
- `claimBySecret(bytes32 secret)`: Claim funds by revealing secret
- `cancel()`: Cancel and refund after timelock expires

**View Functions**:
- `immutables()`: Get escrow configuration
- `hashlock()`: Get hashlock
- `maker()`: Get maker address
- `taker()`: Get taker address

### Resolver

**Main Functions**:
- `deployCounterEscrows(...)`: Deploy counter escrows for multiple orders
- `claim(...)`: Claim from multiple escrows
- `refund(...)`: Refund multiple timed-out escrows

---

## 🧪 Testing

### Get Sepolia Testnet ETH

1. Visit [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address
3. Receive 0.5 ETH (usually within 1-2 minutes)

### Verify Contract on Etherscan

```bash
cd evm-contracts

npx hardhat verify --network sepolia \
  0x506485C554E2eFe0AA8c22109aAc021A1f28888B \
  "0xBF6aF2FB20924cF54912887885d896E5fCFE04e3" \
  "YOUR_DEPLOYER_ADDRESS" \
  86400 \
  86400 \
  "100000000000000" \
  "YOUR_DEPLOYER_ADDRESS" \
  "[1,1000000,1000000000000]"
```

---

## 🔐 Security Considerations

### Time Locks
- Source escrows have 24-hour rescue delay
- Destination escrows have 24-hour rescue delay
- Always ensure proper timelock settings for production

### Safety Deposits
- Currently set to 0 for testing
- Should be non-zero in production to prevent griefing

### Access Control
- Only factory can create escrows
- Only designated addresses can claim
- Resolver is controlled by owner

---

## 📚 Additional Resources

- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [Contract ABIs](./front-end/src/contracts/abis/)
- [Front-end Integration](./front-end/src/hooks/useContracts.ts)
- [Deployment Scripts](./evm-contracts/ignition/modules/)

---

## 🚨 Important Notes

1. **Testnet Only**: These contracts are deployed on Sepolia testnet for testing purposes
2. **No Real Value**: Do not send mainnet ETH or tokens to these addresses
3. **Creation Fee**: 0.0001 ETH per escrow creation
4. **Gas Costs**: Expect ~300k-500k gas for escrow creation
5. **Confirmations**: Wait for at least 3 confirmations before proceeding

---

## 📝 Next Steps

1. ✅ Contracts deployed to Sepolia
2. ✅ ABIs exported to front-end
3. ✅ Contract hooks created
4. ⏳ Implement swap flow in UI
5. ⏳ Deploy Clarity contracts to Stacks testnet
6. ⏳ Test end-to-end swap

---

Last Updated: October 16, 2025
