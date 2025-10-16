/**
 * Deployed Contract Addresses
 * Network: Sepolia Testnet (Chain ID: 11155111)
 * Deployed: 2025
 */

export const SEPOLIA_CHAIN_ID = 11155111;

export const CONTRACT_ADDRESSES = {
  [SEPOLIA_CHAIN_ID]: {
    // Mock ERC20 token for access control
    mockERC20: '0xBF6aF2FB20924cF54912887885d896E5fCFE04e3',

    // Main escrow factory contract
    stxEscrowFactory: '0x506485C554E2eFe0AA8c22109aAc021A1f28888B',

    // Resolver contract (automated market maker)
    resolver: '0x70060F694e4Ba48224FcaaE7eB20e81ec4461C8D',
  },
} as const;

/**
 * Get contract address for a given chain ID
 */
export function getContractAddress(
  chainId: number,
  contractName: keyof typeof CONTRACT_ADDRESSES[typeof SEPOLIA_CHAIN_ID]
): string | undefined {
  return CONTRACT_ADDRESSES[chainId]?.[contractName];
}

/**
 * Verify if contracts are deployed on the current chain
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CONTRACT_ADDRESSES;
}
