/**
 * Contract exports for SunnySwap
 *
 * This file exports all contract addresses and ABIs for use in the dApp
 */

import STXEscrowFactoryABI from './abis/STXEscrowFactory.json';
import ResolverABI from './abis/Resolver.json';
import STXEscrowSrcABI from './abis/STXEscrowSrc.json';
import STXEscrowDstABI from './abis/STXEscrowDst.json';

export { CONTRACT_ADDRESSES, SEPOLIA_CHAIN_ID, getContractAddress, isChainSupported } from './addresses';

export const ABIS = {
  stxEscrowFactory: STXEscrowFactoryABI,
  resolver: ResolverABI,
  stxEscrowSrc: STXEscrowSrcABI,
  stxEscrowDst: STXEscrowDstABI,
} as const;

export type ContractName = keyof typeof ABIS;
