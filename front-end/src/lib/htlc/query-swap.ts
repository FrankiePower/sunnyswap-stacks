/**
 * HTLC Query Functions
 * Read-only contract calls to query swap intent state
 */

import {
  cvToValue,
  bufferCV,
  principalCV,
  serializeCV,
  deserializeCV,
  ClarityValue,
  ClarityType,
} from '@stacks/transactions';
import { getApi } from '../stacks-api';
import { Network } from '../network';
import { QuerySwapParams, SwapIntent } from './types';

/**
 * Contract deployment details
 * TODO: Update these with actual deployed contract addresses
 */
const CONTRACT_DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Devnet deployer
const CONTRACT_NAME = 'stx-htlc';

/**
 * Helper to parse read-only function response
 */
interface ReadOnlyResponse {
  okay: boolean;
  result?: string;
}

const parseReadOnlyResponse = ({ result }: ReadOnlyResponse): ClarityValue | undefined => {
  if (result === undefined) return undefined;
  const hex = result.slice(2);
  const bufferCv = Buffer.from(hex, 'hex');
  const clarityValue = deserializeCV(bufferCv);
  return clarityValue;
};

/**
 * Get swap intent details from contract
 * @param params - Query parameters (hash and sender)
 * @param network - Network configuration
 * @returns SwapIntent if found, null otherwise
 */
export async function getSwapIntent(
  params: QuerySwapParams,
  network: Network
): Promise<SwapIntent | null> {
  const { hash, sender } = params;

  const api = getApi(network).smartContractsApi;
  const contractAddress = CONTRACT_DEPLOYER;
  const contractName = CONTRACT_NAME;
  const functionName = 'get-swap-intent';

  try {
    const response = await api.callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      readOnlyFunctionArgs: {
        sender: contractAddress,
        arguments: [
          `0x${serializeCV(bufferCV(hash)).toString()}`,
          `0x${serializeCV(principalCV(sender)).toString()}`,
        ],
      },
    });

    // Parse Clarity value response
    const clarityValue = parseReadOnlyResponse(response);

    // If none or undefined, swap doesn't exist
    if (!clarityValue || clarityValue.type === ClarityType.OptionalNone) {
      return null;
    }

    // Unwrap optional if present
    let cv: ClarityValue = clarityValue;
    if (clarityValue.type === ClarityType.OptionalSome) {
      cv = clarityValue.value;
    }

    if (cv.type !== ClarityType.Tuple) {
      return null;
    }

    // Extract swap intent data from tuple using cvToValue
    const swapData = cvToValue(cv);
    return {
      expirationHeight: BigInt(swapData['expiration-height']),
      amount: BigInt(swapData.amount),
      recipient: swapData.recipient,
    };
  } catch (error) {
    console.error('Error querying swap intent:', error);
    throw error;
  }
}

/**
 * Check if a swap intent exists
 * @param params - Query parameters (hash and sender)
 * @param network - Network configuration
 * @returns true if swap exists, false otherwise
 */
export async function hasSwapIntent(params: QuerySwapParams, network: Network): Promise<boolean> {
  const { hash, sender } = params;

  const api = getApi(network).smartContractsApi;
  const contractAddress = CONTRACT_DEPLOYER;
  const contractName = CONTRACT_NAME;
  const functionName = 'has-swap-intent';

  try {
    const response = await api.callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      readOnlyFunctionArgs: {
        sender: contractAddress,
        arguments: [
          `0x${serializeCV(bufferCV(hash)).toString()}`,
          `0x${serializeCV(principalCV(sender)).toString()}`,
        ],
      },
    });

    const clarityValue = parseReadOnlyResponse(response);
    if (!clarityValue) return false;

    return cvToValue(clarityValue) === true;
  } catch (error) {
    console.error('Error checking swap intent existence:', error);
    throw error;
  }
}

/**
 * Check if a swap intent has expired
 * @param params - Query parameters (hash and sender)
 * @param network - Network configuration
 * @returns true if expired, false if still active
 */
export async function isSwapExpired(params: QuerySwapParams, network: Network): Promise<boolean> {
  const { hash, sender } = params;

  const api = getApi(network).smartContractsApi;
  const contractAddress = CONTRACT_DEPLOYER;
  const contractName = CONTRACT_NAME;
  const functionName = 'is-swap-intent-expired';

  try {
    const response = await api.callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      readOnlyFunctionArgs: {
        sender: contractAddress,
        arguments: [
          `0x${serializeCV(bufferCV(hash)).toString()}`,
          `0x${serializeCV(principalCV(sender)).toString()}`,
        ],
      },
    });

    const clarityValue = parseReadOnlyResponse(response);
    if (!clarityValue) return false;

    return cvToValue(clarityValue) === true;
  } catch (error) {
    console.error('Error checking swap expiration:', error);
    throw error;
  }
}

/**
 * Get current block height from the network
 * @param network - Network configuration
 * @returns Current block height
 */
export async function getCurrentBlockHeight(network: Network): Promise<number> {
  const api = getApi(network);

  try {
    const result = await api.infoApi.getCoreApiInfo();
    return result.stacks_tip_height;
  } catch (error) {
    console.error('Error getting current block height:', error);
    throw error;
  }
}

/**
 * Get account STX balance
 * @param address - Stacks address
 * @param network - Network configuration
 * @returns Balance in microSTX
 */
export async function getStxBalance(address: string, network: Network): Promise<bigint> {
  const api = getApi(network);

  try {
    const result = await api.accountsApi.getAccountBalance({ principal: address });
    return BigInt(result.stx.balance);
  } catch (error) {
    console.error('Error getting STX balance:', error);
    throw error;
  }
}
