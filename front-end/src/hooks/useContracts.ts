import { useMemo } from 'react';
import { Contract } from 'ethers';
import { useEthersSigner } from './useEthersSigner';
import { useAccount } from 'wagmi';
import { ABIS, getContractAddress } from '@/contracts';

/**
 * Hook to get contract instances with signer
 * Returns null if wallet not connected or wrong network
 */
export function useContracts() {
  const { chainId } = useAccount();
  const signer = useEthersSigner();

  const contracts = useMemo(() => {
    if (!signer || !chainId) {
      return null;
    }

    const factoryAddress = getContractAddress(chainId, 'stxEscrowFactory');
    const resolverAddress = getContractAddress(chainId, 'resolver');

    if (!factoryAddress || !resolverAddress) {
      console.warn(`Contracts not deployed on chain ${chainId}`);
      return null;
    }

    return {
      factory: new Contract(factoryAddress, ABIS.stxEscrowFactory, signer),
      resolver: new Contract(resolverAddress, ABIS.resolver, signer),
      // Escrow contracts are created dynamically, so we provide their ABIs
      stxEscrowSrcABI: ABIS.stxEscrowSrc,
      stxEscrowDstABI: ABIS.stxEscrowDst,
    };
  }, [signer, chainId]);

  return contracts;
}

/**
 * Hook to get a specific escrow contract instance
 */
export function useEscrowContract(escrowAddress: string | null, type: 'src' | 'dst') {
  const signer = useEthersSigner();

  return useMemo(() => {
    if (!signer || !escrowAddress) {
      return null;
    }

    const abi = type === 'src' ? ABIS.stxEscrowSrc : ABIS.stxEscrowDst;
    return new Contract(escrowAddress, abi, signer);
  }, [signer, escrowAddress, type]);
}
