'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectEVM: () => void;
  onConnectStacks: () => void;
  isEvmConnected: boolean;
  isStacksConnected: boolean;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  onConnectEVM,
  onConnectStacks,
  isEvmConnected,
  isStacksConnected,
}) => {
  if (!isOpen) return null;

  const connectedClasses =
    'w-full py-3 px-4 bg-white/5 border border-white/10 text-white/40 rounded-lg cursor-not-allowed flex items-center justify-center gap-2';

  const defaultClasses =
    'w-full py-3 px-4 rounded-lg transition-all cursor-pointer font-semibold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-black/90 to-black/80 border border-orange-500/20 p-8 rounded-2xl w-full max-w-md text-white space-y-6 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-orange-400 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-wider bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent uppercase" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}>
            Connect Wallet
          </h2>
          <p className="text-white/60 text-sm">
            Connect both wallets to start swapping
          </p>
        </div>

        {/* Wallet Connection Options */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">EVM Wallet</label>
            {isEvmConnected ? (
              <button className={connectedClasses} disabled>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                EVM Wallet Connected
              </button>
            ) : (
              <button
                onClick={onConnectEVM}
                className={`${defaultClasses} bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white`}
              >
                Connect EVM Wallet
              </button>
            )}
            <p className="text-xs text-white/50">Ethereum, Base, and other EVM chains</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Stacks Wallet</label>
            {isStacksConnected ? (
              <button className={connectedClasses} disabled>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Stacks Wallet Connected
              </button>
            ) : (
              <button
                onClick={onConnectStacks}
                className={`${defaultClasses} bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white`}
              >
                Connect Stacks Wallet
              </button>
            )}
            <p className="text-xs text-white/50">Hiro Wallet, Leather, and other Stacks wallets</p>
          </div>
        </div>

        {/* Info Message */}
        {(!isEvmConnected || !isStacksConnected) && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 text-sm text-orange-200">
            <p className="font-medium mb-1">⚡ Both wallets required</p>
            <p className="text-xs text-orange-300/80">
              Cross-chain atomic swaps require connections to both EVM and Stacks wallets
            </p>
          </div>
        )}

        {/* Success Message */}
        {isEvmConnected && isStacksConnected && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-sm text-green-200">
            <p className="font-medium mb-1">✓ Ready to swap!</p>
            <p className="text-xs text-green-300/80">
              Both wallets are connected. You can now create atomic swaps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
