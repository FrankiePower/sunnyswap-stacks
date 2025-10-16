'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { DevnetWallet } from '@/lib/devnet-wallet-context';
import { DEVNET_STACKS_BLOCKCHAIN_API_URL } from '@/constants/devnet';

interface DevnetWalletButtonProps {
  currentWallet: DevnetWallet | null;
  wallets: DevnetWallet[];
  onWalletSelect: (wallet: DevnetWallet) => void;
}

const formatStxAddress = (address: string) => {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const DevnetWalletButton = ({
  currentWallet,
  wallets,
  onWalletSelect,
}: DevnetWalletButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const explorerUrl = `https://explorer.hiro.so/address/${currentWallet?.stxAddress}?chain=testnet&api=${DEVNET_STACKS_BLOCKCHAIN_API_URL}`;

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-all group"
      >
        <span className="text-orange-400 font-medium text-sm font-mono">
          {formatStxAddress(currentWallet?.stxAddress || '')}
        </span>
        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-md border border-purple-500/30">
          devnet
        </span>
        <ExternalLink className="h-3 w-3 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-orange-500/10 rounded-lg transition-all"
        aria-label="Select wallet"
      >
        <ChevronDown className={`h-4 w-4 text-orange-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-black/95 border border-orange-500/30 rounded-xl p-2 shadow-2xl backdrop-blur-xl z-50">
          {wallets.map((wallet) => (
            <button
              key={wallet.stxAddress}
              onClick={() => {
                onWalletSelect(wallet);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-orange-500/10 rounded-lg transition-all ${
                currentWallet?.stxAddress === wallet.stxAddress ? 'bg-orange-500/20' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-medium text-sm font-mono">
                  {formatStxAddress(wallet.stxAddress)}
                </span>
                {wallet.label && (
                  <span className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded-md">
                    {wallet.label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
