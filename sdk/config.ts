/**
 * SunnySwap Network Configuration
 *
 * Defines supported chains and their contract addresses
 */

type ChainType = 'evm' | 'stacks'

export interface ChainConfig {
    type: ChainType
    name: string
    symbol: string
    unit: 'wei' | 'microSTX'
    wrappedNative?: string
    escrowFactory?: string
    resolver?: string
    rpc: string
    explorer: string
}

/**
 * Network configurations
 * Key = chainId
 */
export const config: Record<number, ChainConfig> = {
    // Sepolia Testnet (EVM)
    11155111: {
        type: 'evm',
        name: 'Sepolia',
        symbol: 'ETH',
        unit: 'wei',
        wrappedNative: '', // WETH on Sepolia
        escrowFactory: '', // To be deployed
        resolver: '', // To be deployed
        rpc: 'https://sepolia.drpc.org',
        explorer: 'https://sepolia.etherscan.io'
    },

    // Monad Testnet (EVM)
    10143: {
        type: 'evm',
        name: 'Monad Testnet',
        symbol: 'MON',
        unit: 'wei',
        wrappedNative: '0x760afe86e5de5fa0ee542fc7b7b713e1c5425701',
        escrowFactory: '', // To be deployed
        resolver: '', // To be deployed
        rpc: 'https://rpc.ankr.com/monad_testnet',
        explorer: 'https://testnet.monadexplorer.com'
    },

    // Etherlink Testnet (EVM)
    128123: {
        type: 'evm',
        name: 'Etherlink Testnet',
        symbol: 'XTZ',
        unit: 'wei',
        wrappedNative: '0xB1Ea698633d57705e93b0E40c1077d46CD6A51d8',
        escrowFactory: '', // To be deployed
        resolver: '', // To be deployed
        rpc: 'https://rpc.ankr.com/etherlink_testnet',
        explorer: 'https://testnet.explorer.etherlink.com'
    },

    // Stacks Testnet
    99998: {
        type: 'stacks',
        name: 'Stacks Testnet',
        symbol: 'STX',
        unit: 'microSTX',
        rpc: 'https://api.testnet.hiro.so',
        explorer: 'https://explorer.hiro.so/?chain=testnet'
    },

    // Stacks Mainnet
    1: {
        type: 'stacks',
        name: 'Stacks Mainnet',
        symbol: 'STX',
        unit: 'microSTX',
        rpc: 'https://api.hiro.so',
        explorer: 'https://explorer.hiro.so'
    }
}

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: number): ChainConfig {
    const chainConfig = config[chainId]
    if (!chainConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`)
    }
    return chainConfig
}

/**
 * Check if a chain is EVM-based
 */
export function isEVM(chainId: number): boolean {
    return getChainConfig(chainId).type === 'evm'
}

/**
 * Check if a chain is Stacks-based
 */
export function isStacks(chainId: number): boolean {
    return getChainConfig(chainId).type === 'stacks'
}

/**
 * Get all supported EVM chain IDs
 */
export function getEVMChainIds(): number[] {
    return Object.keys(config)
        .map(Number)
        .filter(chainId => config[chainId].type === 'evm')
}

/**
 * Get all supported Stacks chain IDs
 */
export function getStacksChainIds(): number[] {
    return Object.keys(config)
        .map(Number)
        .filter(chainId => config[chainId].type === 'stacks')
}
