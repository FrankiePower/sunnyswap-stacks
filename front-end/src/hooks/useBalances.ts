import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useContext } from 'react';
import { HiroWalletContext } from '@/components/HiroWalletProvider';

export interface TokenBalance {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  address: string;
  decimals: number;
}

export function useBalances() {
  const { address: evmAddress } = useAccount();
  const { testnetAddress: stacksAddress } = useContext(HiroWalletContext);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get ETH balance with refetch capability
  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address: evmAddress,
  });

  // Get STX balance
  const [stxBalance, setStxBalance] = useState<string>('0');
  const [isLoadingStx, setIsLoadingStx] = useState(false);

  const fetchStxBalance = async () => {
    if (!stacksAddress) {
      setStxBalance('0');
      return;
    }

    try {
      setIsLoadingStx(true);
      const response = await fetch(
        `https://api.testnet.hiro.so/extended/v1/address/${stacksAddress}/balances`
      );
      const data = await response.json();

      // Convert microSTX to STX (1 STX = 1,000,000 microSTX)
      const microStx = BigInt(data.stx.balance);
      const stx = Number(microStx) / 1_000_000;
      setStxBalance(stx.toFixed(2));
    } catch (error) {
      console.error('Error fetching STX balance:', error);
      setStxBalance('0');
    } finally {
      setIsLoadingStx(false);
    }
  };

  useEffect(() => {
    fetchStxBalance();
  }, [stacksAddress, refreshTrigger]);

  // Refresh function that can be called externally
  const refresh = () => {
    refetchEth();
    setRefreshTrigger(prev => prev + 1);
  };

  const tokens: TokenBalance[] = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      icon: '⟠',
      balance: ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    },
    {
      symbol: 'STX',
      name: 'Stacks',
      icon: '◈',
      balance: stxBalance,
      address: '0x0000000000000000000000000000000000000001',
      decimals: 6,
    },
  ];

  return {
    tokens,
    ethBalance: ethBalance ? parseFloat(ethBalance.formatted) : 0,
    stxBalance: parseFloat(stxBalance),
    isLoading: !ethBalance || isLoadingStx,
    refresh, // Expose refresh function
  };
}
