/**
 * Tests for HTLC Register Swap Operations
 * Verifies transaction builders create correct contract call options
 */

import { buildRegisterSwapIntent } from './register-swap';
import { RegisterSwapParams } from './types';
import {
  AnchorMode,
  PostConditionMode,
  bufferCV,
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { hexToBytes } from './utils';

// Mock network object
const mockNetwork = {
  version: 128,
  chainId: 2147483648,
  bnsLookupUrl: 'https://stacks-node-api.testnet.stacks.co',
  broadcastEndpoint: '/v2/transactions',
  transferFeeEstimateEndpoint: '/v2/fees/transfer',
  accountEndpoint: '/v2/accounts',
  contractAbiEndpoint: '/v2/contracts/interface',
  readOnlyFunctionCallEndpoint: '/v2/contracts/call-read',
};

// Test constants
const CONTRACT_DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'stx-htlc';
const TEST_SENDER = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const TEST_RECIPIENT = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

// Generate a valid 32-byte hash for testing
const TEST_HASH = hexToBytes(
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
);

describe('HTLC Register Swap Operations', () => {
  describe('buildRegisterSwapIntent', () => {
    it('should create correct contract call options for basic registration', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 1000000n, // 1 STX
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result).toEqual({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CONTRACT_NAME,
        functionName: 'register-swap-intent',
        functionArgs: [
          bufferCV(TEST_HASH),
          uintCV(1000),
          uintCV(1000000n),
          principalCV(TEST_RECIPIENT),
        ],
        postConditions: expect.any(Array),
        postConditionMode: PostConditionMode.Deny,
        network: mockNetwork,
        anchorMode: AnchorMode.Any,
      });
    });

    it('should include all required function arguments in correct order', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 2000,
        amount: 5000000n, // 5 STX
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.functionArgs).toHaveLength(4);
      expect(result.functionArgs[0]).toEqual(bufferCV(TEST_HASH));
      expect(result.functionArgs[1]).toEqual(uintCV(2000));
      expect(result.functionArgs[2]).toEqual(uintCV(5000000n));
      expect(result.functionArgs[3]).toEqual(principalCV(TEST_RECIPIENT));
    });

    it('should include post-condition for exact STX transfer amount', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 3000000n, // 3 STX
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.postConditions).toHaveLength(1);
      expect(result.postConditionMode).toBe(PostConditionMode.Deny);
    });

    it('should use PostConditionMode.Deny', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 1000000n,
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.postConditionMode).toBe(PostConditionMode.Deny);
    });

    it('should throw error for invalid hash length', () => {
      const invalidHash = new Uint8Array(16);

      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: invalidHash,
            expirationHeight: 1000,
            amount: 1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });

    it('should throw error for zero amount', () => {
      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: TEST_HASH,
            expirationHeight: 1000,
            amount: 0n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Amount must be greater than 0');
    });

    it('should throw error for negative amount', () => {
      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: TEST_HASH,
            expirationHeight: 1000,
            amount: -1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Amount must be greater than 0');
    });

    it('should throw error for zero expiration height', () => {
      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: TEST_HASH,
            expirationHeight: 0,
            amount: 1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Expiration height must be greater than 0');
    });

    it('should throw error for negative expiration height', () => {
      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: TEST_HASH,
            expirationHeight: -100,
            amount: 1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Expiration height must be greater than 0');
    });

    it('should handle large amounts', () => {
      const largeAmount = 1000000000000n; // 1 million STX

      const result = buildRegisterSwapIntent(
        {
          hash: TEST_HASH,
          expirationHeight: 1000,
          amount: largeAmount,
          recipient: TEST_RECIPIENT,
        },
        TEST_SENDER,
        mockNetwork
      );

      expect(result.functionArgs[2]).toEqual(uintCV(largeAmount));
    });

    it('should handle large expiration heights', () => {
      const largeHeight = 999999999;

      const result = buildRegisterSwapIntent(
        {
          hash: TEST_HASH,
          expirationHeight: largeHeight,
          amount: 1000000n,
          recipient: TEST_RECIPIENT,
        },
        TEST_SENDER,
        mockNetwork
      );

      expect(result.functionArgs[1]).toEqual(uintCV(largeHeight));
    });
  });

  describe('Contract call structure', () => {
    it('should target the correct contract', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 1000000n,
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.contractAddress).toBe(CONTRACT_DEPLOYER);
      expect(result.contractName).toBe(CONTRACT_NAME);
    });

    it('should call the register-swap-intent function', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 1000000n,
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.functionName).toBe('register-swap-intent');
    });

    it('should use AnchorMode.Any', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 1000000n,
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.anchorMode).toBe(AnchorMode.Any);
    });

    it('should include the network object', () => {
      const params: RegisterSwapParams = {
        hash: TEST_HASH,
        expirationHeight: 1000,
        amount: 1000000n,
        recipient: TEST_RECIPIENT,
      };

      const result = buildRegisterSwapIntent(params, TEST_SENDER, mockNetwork);

      expect(result.network).toBe(mockNetwork);
    });
  });

  describe('Different recipients', () => {
    it('should accept different recipient addresses', () => {
      const recipient1 = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      const recipient2 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

      const result1 = buildRegisterSwapIntent(
        {
          hash: TEST_HASH,
          expirationHeight: 1000,
          amount: 1000000n,
          recipient: recipient1,
        },
        TEST_SENDER,
        mockNetwork
      );

      const result2 = buildRegisterSwapIntent(
        {
          hash: TEST_HASH,
          expirationHeight: 1000,
          amount: 1000000n,
          recipient: recipient2,
        },
        TEST_SENDER,
        mockNetwork
      );

      expect(result1.functionArgs[3]).toEqual(principalCV(recipient1));
      expect(result2.functionArgs[3]).toEqual(principalCV(recipient2));
    });

    it('should handle contract principal as recipient', () => {
      const contractRecipient = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-contract';

      const result = buildRegisterSwapIntent(
        {
          hash: TEST_HASH,
          expirationHeight: 1000,
          amount: 1000000n,
          recipient: contractRecipient,
        },
        TEST_SENDER,
        mockNetwork
      );

      expect(result.functionArgs[3]).toEqual(principalCV(contractRecipient));
    });
  });

  describe('Hash validation', () => {
    it('should accept exactly 32-byte hashes', () => {
      const validHash = new Uint8Array(32);
      validHash.fill(0xff);

      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: validHash,
            expirationHeight: 1000,
            amount: 1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).not.toThrow();
    });

    it('should reject 31-byte hashes', () => {
      const shortHash = new Uint8Array(31);

      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: shortHash,
            expirationHeight: 1000,
            amount: 1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });

    it('should reject 33-byte hashes', () => {
      const longHash = new Uint8Array(33);

      expect(() => {
        buildRegisterSwapIntent(
          {
            hash: longHash,
            expirationHeight: 1000,
            amount: 1000000n,
            recipient: TEST_RECIPIENT,
          },
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });
  });
});
