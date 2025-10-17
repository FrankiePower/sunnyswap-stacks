import { useState, useEffect } from 'react';

interface PriceData {
  eth_usd: number;
  stx_usd: number;
  eth_stx: number;
  stx_eth: number;
  lastUpdated: number;
}

const CACHE_KEY = 'price_data';
const CACHE_DURATION = 60 * 1000; // 1 minute

export function usePriceConversion() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.lastUpdated < CACHE_DURATION) {
          setPriceData(parsed);
          setIsLoading(false);
          return;
        }
      }

      try {
        // Fetch real prices from CoinGecko (free tier)
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,blockstack&vs_currencies=usd'
        );
        const data = await response.json();

        const eth_usd = data.ethereum?.usd || 2000; // Fallback if API fails
        const stx_usd = data.blockstack?.usd || 0.5; // Fallback if API fails
        const eth_stx = eth_usd / stx_usd;
        const stx_eth = stx_usd / eth_usd;

        const newPriceData: PriceData = {
          eth_usd,
          stx_usd,
          eth_stx,
          stx_eth,
          lastUpdated: Date.now(),
        };

        setPriceData(newPriceData);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newPriceData));
      } catch (error) {
        console.error('Error fetching prices:', error);
        // Use fallback prices
        const fallbackData: PriceData = {
          eth_usd: 2000,
          stx_usd: 0.5,
          eth_stx: 4000,
          stx_eth: 0.00025,
          lastUpdated: Date.now(),
        };
        setPriceData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrices();
    // Refresh prices every minute
    const interval = setInterval(fetchPrices, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const convert = (amount: number, from: 'ETH' | 'STX', to: 'ETH' | 'STX'): number => {
    if (!priceData || from === to) return amount;

    if (from === 'ETH' && to === 'STX') {
      return amount * priceData.eth_stx;
    } else {
      return amount * priceData.stx_eth;
    }
  };

  return {
    priceData,
    isLoading,
    convert,
  };
}
