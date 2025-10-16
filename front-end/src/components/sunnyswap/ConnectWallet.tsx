'use client';
import { useContext, useState } from 'react';
import { HiroWalletContext } from '../HiroWalletProvider';
import { Copy, X } from 'lucide-react';

interface ConnectWalletButtonProps {
  children?: React.ReactNode;
}

export const ConnectWalletButton = ({ children }: ConnectWalletButtonProps) => {
  const [didCopyAddress, setDidCopyAddress] = useState(false);
  const { authenticate, isWalletConnected, mainnetAddress, testnetAddress, network, disconnect } =
    useContext(HiroWalletContext);

  const currentAddress = network === 'mainnet' ? mainnetAddress : testnetAddress;

  const copyAddress = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress);
      setDidCopyAddress(true);
      setTimeout(() => {
        setDidCopyAddress(false);
      }, 1000);
    }
  };

  const truncateMiddle = (str: string | null) => {
    if (!str) return '';
    if (str.length <= 12) return str;
    return `${str.slice(0, 6)}...${str.slice(-4)}`;
  };

  return isWalletConnected ? (
    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
      <span className="text-orange-400 font-medium text-sm font-mono">
        {truncateMiddle(currentAddress)}
      </span>
      <button
        onClick={copyAddress}
        className="p-1.5 hover:bg-orange-500/20 rounded transition-all relative group"
        aria-label="Copy address"
      >
        <Copy className="h-4 w-4 text-orange-400" />
        {didCopyAddress && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-orange-500/30 rounded text-xs text-orange-400 whitespace-nowrap">
            Copied!
          </span>
        )}
      </button>
      <button
        onClick={disconnect}
        className="p-1.5 hover:bg-orange-500/20 rounded transition-all"
        aria-label="Disconnect wallet"
        data-testid="disconnect-wallet-address-button"
      >
        <X className="h-4 w-4 text-orange-400" />
      </button>
    </div>
  ) : (
    <button
      onClick={authenticate}
      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all"
      data-testid="wallet-connect-button"
    >
      {children || 'Connect Wallet'}
    </button>
  );
};
