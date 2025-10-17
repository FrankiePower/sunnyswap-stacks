import { isDevnetEnvironment, isTestnetEnvironment } from '@/lib/use-network';
import { Network } from '@/lib/network';

// SunnySwap HTLC Contract for atomic swaps
export const getHtlcContractAddress = (network: Network) => {
  if (isDevnetEnvironment()) {
    return (
      process.env.NEXT_PUBLIC_DEPLOYER_ACCOUNT_ADDRESS ||
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
    );
  }
  if (isTestnetEnvironment(network)) {
    return 'ST2CEP848SACBBX7KHVC4TBZXBV0JH6SC0WF439NF';
  }
  // Mainnet address
  return 'SP30VANCWST2Y0RY3EYGJ4ZK6D22GJQRR7H5YD8J8';
};

export const getHtlcContract = (network: Network) => {
  return {
    contractAddress: getHtlcContractAddress(network),
    contractName: 'stx-htlc',
  } as const;
};
