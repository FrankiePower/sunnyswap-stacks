/**
 * Tests for HTLC Cancel Swap Operations
 * Verifies transaction builders create correct contract call options
 */

import {
  buildCancelSwapIntent,
  buildCancelSwapIntentWithPostCondition,
} from './cancel-swap';
import { CancelSwapParams } from './types';
import {
  AnchorMode,
  PostConditionMode,
  bufferCV,
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

// Generate a valid 32-byte hash for testing
const TEST_HASH = hexToBytes(
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
);

describe('HTLC Cancel Swap Operations', () => {
  describe('buildCancelSwapIntent', () => {
    it('should create correct contract call options for basic cancel', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const result = buildCancelSwapIntent(params, mockNetwork);

      expect(result).toEqual({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CONTRACT_NAME,
        functionName: 'cancel-swap-intent',
        functionArgs: [bufferCV(TEST_HASH)],
        postConditions: [],
        postConditionMode: PostConditionMode.Allow,
        network: mockNetwork,
        anchorMode: AnchorMode.Any,
      });
    });

    it('should include the hash as a buffer CV', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const result = buildCancelSwapIntent(params, mockNetwork);

      expect(result.functionArgs).toHaveLength(1);
      expect(result.functionArgs[0]).toEqual(bufferCV(TEST_HASH));
    });

    it('should use PostConditionMode.Allow by default', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const result = buildCancelSwapIntent(params, mockNetwork);

      expect(result.postConditionMode).toBe(PostConditionMode.Allow);
      expect(result.postConditions).toEqual([]);
    });

    it('should throw error for invalid hash length', () => {
      const invalidHash = new Uint8Array(16); // Only 16 bytes instead of 32

      expect(() => {
        buildCancelSwapIntent({ hash: invalidHash }, mockNetwork);
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });

    it('should throw error for empty hash', () => {
      const emptyHash = new Uint8Array(0);

      expect(() => {
        buildCancelSwapIntent({ hash: emptyHash }, mockNetwork);
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });

    it('should throw error for oversized hash', () => {
      const oversizedHash = new Uint8Array(64); // 64 bytes instead of 32

      expect(() => {
        buildCancelSwapIntent({ hash: oversizedHash }, mockNetwork);
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });
  });

  describe('buildCancelSwapIntentWithPostCondition', () => {
    it('should create correct contract call options with post-condition', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };
      const expectedAmount = 1000000n; // 1 STX in microSTX

      const result = buildCancelSwapIntentWithPostCondition(
        params,
        expectedAmount,
        TEST_SENDER,
        mockNetwork
      );

      expect(result).toEqual({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CONTRACT_NAME,
        functionName: 'cancel-swap-intent',
        functionArgs: [bufferCV(TEST_HASH)],
        postConditions: expect.any(Array),
        postConditionMode: PostConditionMode.Deny,
        network: mockNetwork,
        anchorMode: AnchorMode.Any,
      });
    });

    it('should use PostConditionMode.Deny with post-condition', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };
      const expectedAmount = 1000000n;

      const result = buildCancelSwapIntentWithPostCondition(
        params,
        expectedAmount,
        TEST_SENDER,
        mockNetwork
      );

      expect(result.postConditionMode).toBe(PostConditionMode.Deny);
      expect(result.postConditions).toHaveLength(1);
    });

    it('should include post-condition for expected refund amount', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };
      const expectedAmount = 5000000n; // 5 STX

      const result = buildCancelSwapIntentWithPostCondition(
        params,
        expectedAmount,
        TEST_SENDER,
        mockNetwork
      );

      expect(result.postConditions).toHaveLength(1);
      // Post-condition should verify sender receives back the amount
      expect(result.postConditions[0]).toBeDefined();
    });

    it('should throw error for invalid hash length', () => {
      const invalidHash = new Uint8Array(20);
      const expectedAmount = 1000000n;

      expect(() => {
        buildCancelSwapIntentWithPostCondition(
          { hash: invalidHash },
          expectedAmount,
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });

    it('should throw error for zero expected amount', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };
      const zeroAmount = 0n;

      expect(() => {
        buildCancelSwapIntentWithPostCondition(
          params,
          zeroAmount,
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Expected amount must be greater than 0');
    });

    it('should throw error for negative expected amount', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };
      const negativeAmount = -1000000n;

      expect(() => {
        buildCancelSwapIntentWithPostCondition(
          params,
          negativeAmount,
          TEST_SENDER,
          mockNetwork
        );
      }).toThrow('Expected amount must be greater than 0');
    });

    it('should handle large expected amounts', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };
      const largeAmount = 1000000000000n; // 1 million STX

      const result = buildCancelSwapIntentWithPostCondition(
        params,
        largeAmount,
        TEST_SENDER,
        mockNetwork
      );

      expect(result.postConditions).toHaveLength(1);
      expect(result.functionArgs[0]).toEqual(bufferCV(TEST_HASH));
    });
  });

  describe('Contract call structure', () => {
    it('should target the correct contract', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const result = buildCancelSwapIntent(params, mockNetwork);

      expect(result.contractAddress).toBe(CONTRACT_DEPLOYER);
      expect(result.contractName).toBe(CONTRACT_NAME);
    });

    it('should call the cancel-swap-intent function', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const result = buildCancelSwapIntent(params, mockNetwork);

      expect(result.functionName).toBe('cancel-swap-intent');
    });

    it('should use AnchorMode.Any for both variants', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const basicResult = buildCancelSwapIntent(params, mockNetwork);
      const withPostConditionResult = buildCancelSwapIntentWithPostCondition(
        params,
        1000000n,
        TEST_SENDER,
        mockNetwork
      );

      expect(basicResult.anchorMode).toBe(AnchorMode.Any);
      expect(withPostConditionResult.anchorMode).toBe(AnchorMode.Any);
    });

    it('should include the network object', () => {
      const params: CancelSwapParams = {
        hash: TEST_HASH,
      };

      const result = buildCancelSwapIntent(params, mockNetwork);

      expect(result.network).toBe(mockNetwork);
    });
  });

  describe('Hash validation', () => {
    it('should accept exactly 32-byte hashes', () => {
      const validHash = new Uint8Array(32);
      validHash.fill(0xff); // Fill with some data

      expect(() => {
        buildCancelSwapIntent({ hash: validHash }, mockNetwork);
      }).not.toThrow();
    });

    it('should reject 31-byte hashes', () => {
      const shortHash = new Uint8Array(31);

      expect(() => {
        buildCancelSwapIntent({ hash: shortHash }, mockNetwork);
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });

    it('should reject 33-byte hashes', () => {
      const longHash = new Uint8Array(33);

      expect(() => {
        buildCancelSwapIntent({ hash: longHash }, mockNetwork);
      }).toThrow('Invalid hash: must be exactly 32 bytes');
    });
  });
});
