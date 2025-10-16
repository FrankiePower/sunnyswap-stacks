/**
 * Order types for SunnySwap atomic swaps
 * Based on hashlocked-cli patterns
 */

export interface AtomicSwapOrder {
  orderId: string;
  timestamp: number;
  network: string;
  chainId: number;

  maker: {
    address: string;
    provides: {
      asset: "ETH" | "ERC20" | "STX";
      amount: string;
      token?: string;
    };
    wants: {
      asset: "ETH" | "ERC20" | "STX";
      amount: string;
      address: string;
    };
  };

  taker?: {
    address: string;
    stacksAddress?: string;
    evmAddress?: string;
  };

  secret: string;
  hashlock: string;

  timelock: {
    withdrawalPeriod: number;
    cancellationPeriod: number;
  };

  status: "CREATED" | "FILLED" | "FUNDED" | "COMPLETED" | "CANCELLED";

  contracts: {
    stxEscrowFactory: string;
    resolver?: string;
  };

  stacksHTLC?: {
    address: string;
    txHash: string;
    amount: string;
  };

  evmEscrow?: {
    address: string;
    txHash: string;
    amount: string;
    safetyDeposit: string;
    creationFee: string;
  };

  transactions?: {
    stacksHTLCFunding?: string;
    evmEscrowCreation?: string;
    stacksHTLCClaim?: string;
    evmEscrowClaim?: string;
  };
}

export interface OrderPayload {
  hashLock: {
    sha256: string;
  };
  srcChainId: number;
  dstChainId: number;
  order: AtomicSwapOrder;
  extension?: any;
  signature?: string;
  status: string;
  srcEscrowAddress?: string;
  dstEscrowAddress?: string;
  srcImmutables?: any;
  dstImmutables?: any;
  srcDeployHash?: string;
  dstDeployHash?: string;
  htlcScript?: string;
}
