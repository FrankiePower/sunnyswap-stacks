# SunnySwap Dual Wallet Setup Guide

This document explains how the dual wallet system (EVM + Stacks) works in SunnySwap.

## Architecture Overview

SunnySwap enables cross-chain atomic swaps between EVM chains (Ethereum, Base, etc.) and Stacks blockchain. To facilitate this, users need to connect **both** an EVM wallet and a Stacks wallet.

### Provider Chain

The app uses a nested provider architecture:

```
QueryClientProvider (shared)
  └── EvmWalletProvider (RainbowKit + wagmi)
      └── ChakraProvider
          └── DevnetWalletProvider
              └── HiroWalletProvider (Stacks)
```

## Components

### 1. **EvmWalletProvider** (`src/components/EvmWalletProvider.tsx`)
- Wraps the app with RainbowKit and wagmi
- Configured for Ethereum Sepolia and Mainnet
- Requires WalletConnect Project ID

### 2. **HiroWalletProvider** (`src/components/HiroWalletProvider.tsx`)
- Manages Stacks wallet connections
- Supports Hiro Wallet, Leather, and other Stacks wallets
- Handles testnet/mainnet switching

### 3. **ConnectModal** (`src/components/sunnyswap/ConnectModal.tsx`)
- Dual wallet connection interface
- Shows connection status for both wallets
- Guides users to connect both required wallets

### 4. **useEthersSigner** (`src/hooks/useEthersSigner.ts`)
- Converts wagmi's viem client to ethers.js signer
- Enables compatibility with existing ethers.js code
- Required for contract interactions

## Setup Instructions

### 1. Get a WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID

### 2. Configure Environment Variables

Create a `.env.local` file in the `front-end` directory:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 3. Update Chain Configuration (Optional)

Edit `src/components/EvmWalletProvider.tsx` to add more EVM chains:

```typescript
import { sepolia, mainnet, base, baseSepolia } from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'SunnySwap',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [sepolia, mainnet, base, baseSepolia], // Add your chains
  ssr: true,
});
```

## Usage in Components

### Accessing EVM Wallet

```typescript
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthersSigner';

function MyComponent() {
  const { address: evmAddress } = useAccount();
  const evmSigner = useEthersSigner();

  const isEvmConnected = !!evmSigner;

  // Use evmSigner for contract calls
  if (evmSigner) {
    // const contract = new Contract(address, abi, evmSigner);
  }
}
```

### Accessing Stacks Wallet

```typescript
import { useContext } from 'react';
import { HiroWalletContext } from '@/components/HiroWalletProvider';

function MyComponent() {
  const {
    isWalletConnected,
    testnetAddress,
    mainnetAddress,
    network,
    authenticate,
    disconnect
  } = useContext(HiroWalletContext);

  const currentAddress = network === 'mainnet' ? mainnetAddress : testnetAddress;
}
```

### Opening Connect Modal

```typescript
import { useState } from 'react';
import { ConnectModal } from '@/components/sunnyswap/ConnectModal';
import { useConnectModal } from '@rainbow-me/rainbowkit';

function MyComponent() {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const { openConnectModal } = useConnectModal();

  const handleConnectEVM = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleConnectStacks = () => {
    authenticate();
  };

  return (
    <>
      <button onClick={() => setShowConnectModal(true)}>
        Connect Wallets
      </button>

      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnectEVM={handleConnectEVM}
        onConnectStacks={handleConnectStacks}
        isEvmConnected={isEvmConnected}
        isStacksConnected={isStacksConnected}
      />
    </>
  );
}
```

## Navbar Display Logic

The dapp navbar (`src/app/dapp/page.tsx`) shows different states:

1. **Both Wallets Connected**:
   - RainbowKit ConnectButton (shows EVM wallet + chain)
   - Stacks ConnectWalletButton (shows Stacks address)

2. **One or Both Missing**:
   - "Connect Wallets" button
   - Opens ConnectModal on click

3. **Devnet Mode**:
   - DevnetWalletButton (for local testing)

## Supported Wallets

### EVM Wallets (via RainbowKit)
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow
- And many more...

### Stacks Wallets (via Hiro Connect)
- Hiro Wallet
- Leather (formerly Hiro Wallet)
- Xverse

## Testing

### Test with Sepolia (EVM) + Stacks Testnet

1. Install MetaMask and add Sepolia testnet
2. Install Hiro Wallet browser extension
3. Get test tokens:
   - Sepolia ETH: [Sepolia Faucet](https://sepoliafaucet.com/)
   - Stacks Testnet STX: [Stacks Testnet Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)
4. Navigate to `/dapp`
5. Click "Connect Wallets"
6. Connect both wallets

## Troubleshooting

### "WalletConnect Core is already initialized"
- Fixed: Only one QueryClient instance is used across all providers

### RainbowKit modal not opening
- Check that `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set in `.env.local`
- Ensure the variable starts with `NEXT_PUBLIC_` for client-side access

### Stacks wallet not connecting
- Check browser console for errors
- Ensure Hiro Wallet or Leather extension is installed
- Try switching networks in the wallet

### Build errors
- Run `npm install` to ensure all dependencies are installed:
  - `@rainbow-me/rainbowkit@2.2.8`
  - `wagmi@2.16.0`
  - `ethers@6.13.4`

## Next Steps

With dual wallet connections in place, you can now:

1. **Implement HTLC Creation**: Use both signers to create Hash Time-Locked Contracts
2. **Cross-chain Token Selection**: Allow users to select tokens from both chains
3. **Atomic Swap Flow**: Coordinate the swap between EVM and Stacks
4. **Transaction Monitoring**: Track swap progress on both chains

## Reference

- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)
- [wagmi Docs](https://wagmi.sh/)
- [Stacks Connect Docs](https://docs.hiro.so/stacks/connect/overview)
- [Gattai Swap Implementation](https://github.com/taijusanagi/2025-unite) (Reference project)
