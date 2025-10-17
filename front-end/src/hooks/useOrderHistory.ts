import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useContext } from 'react';
import { HiroWalletContext } from '@/components/HiroWalletProvider';

export interface OrderHistoryItem {
  hash: string;
  from: string;
  to: string;
  fromAmount: string;
  toAmount: string;
  status: 'order_created' | 'src_escrow_deployed' | 'escrows_deployed' | 'claimed' | 'cancelled';
  statusLabel: 'pending' | 'completed' | 'failed';
  createdAt: number;
  srcEscrowAddress?: string;
  srcDeployHash?: string;
  dstEscrowTxid?: string;
}

export function useOrderHistory() {
  const { address: evmAddress } = useAccount();
  const { testnetAddress: stacksAddress } = useContext(HiroWalletContext);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!evmAddress && !stacksAddress) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch all orders from relayer
        const response = await fetch('/api/relayer/orders/all');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const allOrders = await response.json();

        // Filter orders for current user (either EVM or Stacks address)
        const userOrders = Object.entries(allOrders)
          .map(([hash, data]: [string, any]) => {
            // Handle both string and object formats
            const order = typeof data === 'string' ? JSON.parse(data) : data;

            // Check if this order belongs to the current user
            const isUserOrder =
              (evmAddress && order.order?.maker?.address?.toLowerCase() === evmAddress.toLowerCase()) ||
              (stacksAddress && order.stacksAddress === stacksAddress);

            if (!isUserOrder) return null;

            // Determine status label
            let statusLabel: 'pending' | 'completed' | 'failed' = 'pending';
            if (order.status === 'escrows_deployed' || order.status === 'claimed') {
              statusLabel = 'completed';
            } else if (order.status === 'cancelled') {
              statusLabel = 'failed';
            }

            const historyItem: OrderHistoryItem = {
              hash,
              from: order.order?.maker?.provides?.asset || 'ETH',
              to: order.order?.maker?.wants?.asset || 'STX',
              fromAmount: formatAmount(order.order?.maker?.provides?.amount, order.order?.maker?.provides?.asset),
              toAmount: formatAmount(order.order?.maker?.wants?.amount, order.order?.maker?.wants?.asset),
              status: order.status,
              statusLabel,
              createdAt: order.createdAt,
            };

            // Add optional fields if they exist
            if (order.srcEscrowAddress) historyItem.srcEscrowAddress = order.srcEscrowAddress;
            if (order.srcDeployHash) historyItem.srcDeployHash = order.srcDeployHash;
            if (order.dstEscrowTxid) historyItem.dstEscrowTxid = order.dstEscrowTxid;

            return historyItem;
          })
          .filter((order): order is OrderHistoryItem => order !== null)
          .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first

        setOrders(userOrders);
      } catch (error) {
        console.error('Error fetching order history:', error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();

    // Refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [evmAddress, stacksAddress]);

  return { orders, isLoading };
}

function formatAmount(amount: string | undefined, asset: string): string {
  if (!amount) return '0';

  const num = BigInt(amount);
  const decimals = asset === 'STX' ? 6 : 18;
  const divisor = BigInt(10 ** decimals);
  const formatted = Number(num) / Number(divisor);

  return `${formatted.toFixed(4)} ${asset}`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export { formatTimeAgo };
