'use client';

import { useState, useContext, useEffect } from 'react';
import { ArrowUpDown, Settings, Info, ChevronDown } from 'lucide-react';
import { useDevnetWallet } from '@/lib/devnet-wallet-context';
import { isDevnetEnvironment } from '@/lib/use-network';
import { HiroWalletContext } from '@/components/HiroWalletProvider';
import { NetworkSelector } from '@/components/sunnyswap/NetworkSelector';
import { ConnectWalletButton } from '@/components/sunnyswap/ConnectWallet';
import { DevnetWalletButton } from '@/components/sunnyswap/DevnetWalletButton';
import { ConnectModal } from '@/components/sunnyswap/ConnectModal';
import { ClaimButton } from '@/components/sunnyswap/ClaimButton';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthersSigner';
import { useContracts } from '@/hooks/useContracts';
import { generateSecretAndHashlock, generateOrderId, parseAmount } from '@/lib/swap-utils';
import { ethers } from 'ethers';
import type { AtomicSwapOrder } from '@/types/order';
import { useBalances } from '@/hooks/useBalances';
import { usePriceConversion } from '@/hooks/usePriceConversion';
import { useOrderHistory, formatTimeAgo } from '@/hooks/useOrderHistory';

export default function SunnySwap() {
  const { currentWallet, wallets, setCurrentWallet } = useDevnetWallet();
  const { isWalletConnected: isStacksConnected, authenticate: connectStacks, testnetAddress } = useContext(HiroWalletContext);
  const { openConnectModal } = useConnectModal();
  const { address: evmAddress } = useAccount();
  const chainId = useChainId();
  const evmSigner = useEthersSigner();
  const contracts = useContracts();

  // Use real data hooks
  const { tokens, isLoading: isLoadingBalances } = useBalances();
  const { convert, priceData, isLoading: isLoadingPrices } = usePriceConversion();
  const { orders: orderHistory, isLoading: isLoadingHistory } = useOrderHistory();

  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [autoSlippage, setAutoSlippage] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState('');
  const [currentOrder, setCurrentOrder] = useState<AtomicSwapOrder | null>(null);
  const [txHash, setTxHash] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const isEvmConnected = !!evmSigner;

  // Update selected tokens when real balances load
  useEffect(() => {
    if (tokens.length > 0 && !fromToken) {
      setFromToken(tokens[0]);
    }
    if (tokens.length > 1 && !toToken) {
      setToToken(tokens[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]);

  // Update token balances when they change (but avoid infinite loop)
  useEffect(() => {
    if (tokens.length > 0 && fromToken && toToken) {
      // Update fromToken balance if it exists in the new tokens array
      const updatedFromToken = tokens.find(t => t.symbol === fromToken.symbol);
      if (updatedFromToken && updatedFromToken.balance !== fromToken.balance) {
        setFromToken(updatedFromToken);
      }

      // Update toToken balance if it exists in the new tokens array
      const updatedToToken = tokens.find(t => t.symbol === toToken.symbol);
      if (updatedToToken && updatedToToken.balance !== toToken.balance) {
        setToToken(updatedToToken);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.map(t => t.balance).join(',')]);

  const handleConnectEVM = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleConnectStacks = () => {
    connectStacks();
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    if (!fromAmount || !toAmount) {
      alert('Please enter valid amounts');
      return;
    }

    if (!evmAddress || !testnetAddress) {
      alert('Please connect both EVM and Stacks wallets');
      setShowConnectModal(true);
      return;
    }

    if (!contracts) {
      alert('Contracts not available. Please connect to Sepolia network.');
      return;
    }

    try {
      setIsSwapping(true);
      setSwapStatus('Generating secret...');

      // Step 1: Generate secret and hashlock (hashlocked-cli pattern)
      const { secret, hashlock } = generateSecretAndHashlock();
      const orderId = generateOrderId();

      console.log('🔐 Secret generated:', secret);
      console.log('🔒 Hashlock:', hashlock);
      console.log('📄 Order ID:', orderId);

      // Step 2: Create order data
      const order: AtomicSwapOrder = {
        orderId,
        timestamp: Date.now(),
        network: 'sepolia',
        chainId: chainId || 11155111,

        maker: {
          address: evmAddress,
          provides: {
            asset: 'ETH',
            amount: parseAmount(fromAmount).toString(),
          },
          wants: {
            asset: 'STX',
            amount: parseAmount(toAmount, 6).toString(), // STX has 6 decimals
            address: testnetAddress,
          },
        },

        secret,
        hashlock,

        timelock: {
          withdrawalPeriod: 0, // Immediate withdrawal
          cancellationPeriod: 3600, // 1 hour
        },

        status: 'CREATED',

        contracts: {
          stxEscrowFactory: contracts.factory.target as string,
          resolver: contracts.resolver.target as string,
        },
      };

      setCurrentOrder(order);
      setSwapStatus('Submitting order to relayer...');

      // Step 3: Submit order to relayer
      const orderHash = ethers.keccak256(ethers.toUtf8Bytes(orderId));

      const response = await fetch('/api/relayer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: orderHash,
          hashLock: { sha256: hashlock.slice(2) }, // Remove 0x prefix
          srcChainId: chainId || 11155111,
          dstChainId: 5230, // Stacks testnet
          order,
          stacksAddress: testnetAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit order to relayer');
      }

      console.log('✅ Order submitted to relayer');
      setSwapStatus('Waiting for resolver to create escrow...');

      // Step 4: Poll for escrow deployment
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`/api/relayer/orders/${orderHash}/status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          console.log('📊 Order status:', status);

          if (status.status === 'escrows_deployed' && status.srcEscrowAddress) {
            setTxHash(status.srcDeployHash || '');
            setSwapStatus('Escrow deployed successfully!');
            setShowSuccessModal(true);
            break;
          }
        }

        attempts++;
        setSwapStatus(`Waiting for escrow... (${attempts * 5}s)`);
      }

      if (attempts >= maxAttempts) {
        throw new Error('Timeout waiting for escrow deployment');
      }

    } catch (error) {
      console.error('❌ Swap error:', error);
      alert(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSwapStatus('');
    } finally {
      setIsSwapping(false);
    }
  };

  const TokenSelector = ({
    selectedToken,
    onSelect,
  }: {
    selectedToken: typeof tokens[0];
    onSelect: (token: typeof tokens[0]) => void;
  }) => (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl transition-all min-w-[140px] justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{selectedToken.icon}</span>
          <span className="font-semibold text-white">{selectedToken.symbol}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-orange-400" />
      </button>

      <div className="absolute top-full mt-2 right-0 w-80 bg-black/95 border border-orange-500/30 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 backdrop-blur-xl">
        <h3 className="font-semibold text-lg mb-3 text-white">Select a token</h3>
        <div className="space-y-2">
          {tokens.map(token => (
            <button
              key={token.symbol}
              className="w-full flex items-center justify-between p-3 hover:bg-orange-500/10 rounded-xl transition-all border border-transparent hover:border-orange-500/30"
              onClick={() => onSelect(token)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{token.icon}</span>
                <div className="text-left">
                  <div className="font-semibold text-white">{token.symbol}</div>
                  <div className="text-sm text-muted-foreground">{token.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-white">{token.balance}</div>
                <div className="text-sm text-muted-foreground">Balance</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background effects matching landing page */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-orange-500/20 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" className="text-xl font-black tracking-wider bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent uppercase" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}>
                SUNNYSWAP
              </a>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-6">
              <a href="/my-swaps" className="text-white/70 hover:text-orange-400 transition-colors font-medium">
                My Swaps
              </a>

              {/* Network Selector */}
              {!isDevnetEnvironment() && <NetworkSelector />}

              {/* Wallet Connections */}
              {isDevnetEnvironment() ? (
                <DevnetWalletButton
                  currentWallet={currentWallet}
                  wallets={wallets}
                  onWalletSelect={setCurrentWallet}
                />
              ) : (
                <>
                  {/* Show EVM button only when connected */}
                  {evmSigner && (
                    <ConnectButton
                      chainStatus="icon"
                      accountStatus="avatar"
                      showBalance={false}
                    />
                  )}

                  {/* Show Stacks button only when connected */}
                  {isStacksConnected && <ConnectWalletButton />}

                  {/* Show Connect button when either wallet is not connected */}
                  {(!evmSigner || !isStacksConnected) && (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all"
                    >
                      Connect
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-md relative z-10">
        {/* Main Swap Card */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Atomic Swap</h2>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-orange-500/10 rounded-lg transition-all"
              >
                <Settings className="h-5 w-5 text-orange-400" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* From Token */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>From</span>
                <span>Balance: {fromToken.balance} {fromToken.symbol}</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
                    value={fromAmount}
                    onChange={e => {
                      setFromAmount(e.target.value);
                      if (e.target.value && !isLoadingPrices) {
                        const inputAmount = parseFloat(e.target.value);
                        // Convert using real prices
                        const converted = convert(inputAmount, fromToken.symbol as 'ETH' | 'STX', toToken.symbol as 'ETH' | 'STX');
                        // Apply 2% protocol fee
                        const outputAmount = converted * 0.98;
                        setToAmount(outputAmount.toFixed(6));
                      } else {
                        setToAmount('');
                      }
                    }}
                  />
                </div>
                <TokenSelector selectedToken={fromToken} onSelect={setFromToken} />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-2">
              <button
                className="p-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl transition-all"
                onClick={handleSwapTokens}
              >
                <ArrowUpDown className="h-5 w-5 text-orange-400" />
              </button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>To</span>
                <span>Balance: {toToken.balance} {toToken.symbol}</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
                    value={toAmount}
                    readOnly
                  />
                </div>
                <TokenSelector selectedToken={toToken} onSelect={setToToken} />
              </div>
            </div>

            {/* Price Info */}
            {fromAmount && toAmount && priceData && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="text-white">
                    1 {fromToken.symbol} ≈ {convert(1, fromToken.symbol as 'ETH' | 'STX', toToken.symbol as 'ETH' | 'STX').toFixed(6)} {toToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Protocol Fee</span>
                  <span className="text-orange-400">2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className="text-green-400">{'<0.001%'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Gasless</span>
                </div>
              </div>
            )}

            {/* Status Message */}
            {swapStatus && (
              <div className="px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm flex items-center gap-2">
                <span className="inline-block h-3 w-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin"></span>
                {swapStatus}
              </div>
            )}

            {/* Swap Button */}
            <button
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg"
              onClick={handleSwap}
              disabled={!fromAmount || !toAmount || isSwapping}
            >
              {isSwapping ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating Swap...
                </span>
              ) : (
                'Execute Swap'
              )}
            </button>

            {/* Info Alert */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-blue-200">
                Trustless atomic swaps powered by HTLCs. No custody, no intermediaries!
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="p-6 pb-4">
            <h3 className="text-xl font-bold text-white">Your Swap History</h3>
          </div>
          <div className="px-6 pb-6">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-8">
                <span className="inline-block h-6 w-6 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin"></span>
              </div>
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No swaps yet. Create your first atomic swap!
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((order) => (
                  <div key={order.hash} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{order.from}</span>
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-white">{order.to}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.statusLabel === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : order.statusLabel === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}>
                          {order.status === 'order_created' && 'Creating...'}
                          {order.status === 'src_escrow_deployed' && 'Escrow Created'}
                          {order.status === 'escrows_deployed' && 'Ready to Claim'}
                          {order.status === 'claimed' && 'Completed'}
                          {order.status === 'cancelled' && 'Cancelled'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {order.hash.slice(0, 10)}...{order.hash.slice(-8)}
                      </div>
                      {order.srcDeployHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${order.srcDeployHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          View on Etherscan →
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">{order.fromAmount}</div>
                      <div className="text-xs text-muted-foreground">{formatTimeAgo(order.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-black/95 border border-orange-500/30 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-6 text-white">Transaction Settings</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-white">Auto Slippage</span>
                <button
                  className={`relative w-12 h-6 rounded-full transition-all ${autoSlippage ? 'bg-orange-500' : 'bg-white/20'}`}
                  onClick={() => setAutoSlippage(!autoSlippage)}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${autoSlippage ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {!autoSlippage && (
                <div className="space-y-3">
                  <div>
                    <label className="text-white text-sm mb-2 block">
                      Slippage Tolerance: {slippage}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={slippage}
                      onChange={e => setSlippage(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1.0].map(value => (
                      <button
                        key={value}
                        className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                          slippage === value
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        onClick={() => setSlippage(value)}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSuccessModal(false)}>
          <div className="bg-black/95 border border-green-500/30 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-2xl text-green-400 mb-4">🎉 Swap Successful!</h3>
            <p className="text-white mb-4">Your atomic swap has been executed successfully. Both escrows are now locked.</p>

            <div className="space-y-3 mb-6">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">EVM Transaction</p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {txHash || '0x0000000000000000000000000000000000000000'}
                </p>
              </div>

              {currentOrder && (
                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl">
                  <p className="text-orange-400 font-bold mb-2">🎁 Ready to Claim!</p>
                  <p className="text-sm text-white/80 mb-3">
                    Both escrows are deployed. Click below to claim your STX by revealing the secret.
                  </p>
                  <ClaimButton
                    orderSecret={currentOrder.secret}
                    resolverAddress="ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF"
                    onSuccess={(txid) => {
                      console.log('✅ Claimed! Txid:', txid);
                      alert(`🎉 SUCCESS! Secret revealed on-chain.\n\nTransaction: ${txid}\n\nThe resolver will now claim the EVM escrow automatically.`);
                    }}
                    onError={(error) => {
                      console.error('❌ Claim failed:', error);
                      alert(`Error claiming: ${error.message}`);
                    }}
                  />
                </div>
              )}
            </div>

            <button
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Connect Wallets Modal */}
      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnectEVM={handleConnectEVM}
        onConnectStacks={handleConnectStacks}
        isEvmConnected={isEvmConnected}
        isStacksConnected={isStacksConnected}
      />
    </div>
  );
}
