/**
 * SunnySwap EVM SDK
 *
 * Main entry point for EVM-side atomic swap operations
 */

export { Resolver, type Immutables } from './resolver'
export { EscrowFactory, type StacksConfig } from './escrow-factory'
export * from './constants'
export * from './utils'

// Re-export ABIs
import ResolverABI from './contracts/Resolver.json'
import STXEscrowFactoryABI from './contracts/STXEscrowFactory.json'
import MockERC20ABI from './contracts/MockERC20.json'

export const ABIs = {
    Resolver: ResolverABI.abi,
    STXEscrowFactory: STXEscrowFactoryABI.abi,
    MockERC20: MockERC20ABI.abi
}
