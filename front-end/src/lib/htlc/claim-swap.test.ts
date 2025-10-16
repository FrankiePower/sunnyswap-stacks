/**
 * Tests for HTLC Claim Swap Operations
 * Verifies transaction builders create correct contract call options
 */

import {
  buildClaimSwap,
  buildClaimSwapWithPostCondition,
} from './claim-swap';
import { ClaimSwapParams } from './types';
import {
  AnchorMode,
  PostConditionMode,
  bufferCV,
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

// Generate a valid 32-byte preimage for testing
const TEST_PREIMAGE = hexToBytes(
  'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
);

describe('HTLC Claim Swap Operations', () => {
  describe('buildClaimSwap', () => {
    it('should create correct contract call options for basic claim', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const result = buildClaimSwap(params, mockNetwork);

      expect(result).toEqual({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CONTRACT_NAME,
        functionName: 'swap',
        functionArgs: [
          principalCV(TEST_SENDER),
          bufferCV(TEST_PREIMAGE),
        ],
        postConditions: [],
        postConditionMode: PostConditionMode.Allow,
        network: mockNetwork,
        anchorMode: AnchorMode.Any,
      });
    });

    it('should include sender and preimage as function arguments', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const result = buildClaimSwap(params, mockNetwork);

      expect(result.functionArgs).toHaveLength(2);
      expect(result.functionArgs[0]).toEqual(principalCV(TEST_SENDER));
      expect(result.functionArgs[1]).toEqual(bufferCV(TEST_PREIMAGE));
    });

    it('should use PostConditionMode.Allow by default', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const result = buildClaimSwap(params, mockNetwork);

      expect(result.postConditionMode).toBe(PostConditionMode.Allow);
      expect(result.postConditions).toEqual([]);
    });

    it('should throw error for invalid preimage length', () => {
      const invalidPreimage = new Uint8Array(16); // Only 16 bytes instead of 32

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: invalidPreimage,
          },
          mockNetwork
        );
      }).toThrow('Invalid preimage: must be exactly 32 bytes');
    });

    it('should throw error for empty preimage', () => {
      const emptyPreimage = new Uint8Array(0);

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: emptyPreimage,
          },
          mockNetwork
        );
      }).toThrow('Invalid preimage: must be exactly 32 bytes');
    });

    it('should throw error for oversized preimage', () => {
      const oversizedPreimage = new Uint8Array(64); // 64 bytes instead of 32

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: oversizedPreimage,
          },
          mockNetwork
        );
      }).toThrow('Invalid preimage: must be exactly 32 bytes');
    });

    it('should handle different sender addresses', () => {
      const sender1 = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
      const sender2 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

      const result1 = buildClaimSwap(
        {
          sender: sender1,
          preimage: TEST_PREIMAGE,
        },
        mockNetwork
      );

      const result2 = buildClaimSwap(
        {
          sender: sender2,
          preimage: TEST_PREIMAGE,
        },
        mockNetwork
      );

      expect(result1.functionArgs[0]).toEqual(principalCV(sender1));
      expect(result2.functionArgs[0]).toEqual(principalCV(sender2));
    });
  });

  describe('buildClaimSwapWithPostCondition', () => {
    it('should create correct contract call options with post-condition', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };
      const expectedAmount = 1000000n; // 1 STX in microSTX

      const result = buildClaimSwapWithPostCondition(
        params,
        expectedAmount,
        TEST_RECIPIENT,
        mockNetwork
      );

      expect(result).toEqual({
        contractAddress: CONTRACT_DEPLOYER,
        contractName: CONTRACT_NAME,
        functionName: 'swap',
        functionArgs: [
          principalCV(TEST_SENDER),
          bufferCV(TEST_PREIMAGE),
        ],
        postConditions: expect.any(Array),
        postConditionMode: PostConditionMode.Deny,
        network: mockNetwork,
        anchorMode: AnchorMode.Any,
      });
    });

    it('should use PostConditionMode.Deny with post-condition', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };
      const expectedAmount = 1000000n;

      const result = buildClaimSwapWithPostCondition(
        params,
        expectedAmount,
        TEST_RECIPIENT,
        mockNetwork
      );

      expect(result.postConditionMode).toBe(PostConditionMode.Deny);
      expect(result.postConditions).toHaveLength(1);
    });

    it('should include post-condition for expected claim amount', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };
      const expectedAmount = 5000000n; // 5 STX

      const result = buildClaimSwapWithPostCondition(
        params,
        expectedAmount,
        TEST_RECIPIENT,
        mockNetwork
      );

      expect(result.postConditions).toHaveLength(1);
      expect(result.postConditions[0]).toBeDefined();
    });

    it('should throw error for invalid preimage length', () => {
      const invalidPreimage = new Uint8Array(20);
      const expectedAmount = 1000000n;

      expect(() => {
        buildClaimSwapWithPostCondition(
          {
            sender: TEST_SENDER,
            preimage: invalidPreimage,
          },
          expectedAmount,
          TEST_RECIPIENT,
          mockNetwork
        );
      }).toThrow('Invalid preimage: must be exactly 32 bytes');
    });

    it('should throw error for zero expected amount', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };
      const zeroAmount = 0n;

      expect(() => {
        buildClaimSwapWithPostCondition(
          params,
          zeroAmount,
          TEST_RECIPIENT,
          mockNetwork
        );
      }).toThrow('Expected amount must be greater than 0');
    });

    it('should throw error for negative expected amount', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };
      const negativeAmount = -1000000n;

      expect(() => {
        buildClaimSwapWithPostCondition(
          params,
          negativeAmount,
          TEST_RECIPIENT,
          mockNetwork
        );
      }).toThrow('Expected amount must be greater than 0');
    });

    it('should handle large expected amounts', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };
      const largeAmount = 1000000000000n; // 1 million STX

      const result = buildClaimSwapWithPostCondition(
        params,
        largeAmount,
        TEST_RECIPIENT,
        mockNetwork
      );

      expect(result.postConditions).toHaveLength(1);
      expect(result.functionArgs[1]).toEqual(bufferCV(TEST_PREIMAGE));
    });
  });

  describe('Contract call structure', () => {
    it('should target the correct contract', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const result = buildClaimSwap(params, mockNetwork);

      expect(result.contractAddress).toBe(CONTRACT_DEPLOYER);
      expect(result.contractName).toBe(CONTRACT_NAME);
    });

    it('should call the swap function', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const result = buildClaimSwap(params, mockNetwork);

      expect(result.functionName).toBe('swap');
    });

    it('should use AnchorMode.Any for both variants', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const basicResult = buildClaimSwap(params, mockNetwork);
      const withPostConditionResult = buildClaimSwapWithPostCondition(
        params,
        1000000n,
        TEST_RECIPIENT,
        mockNetwork
      );

      expect(basicResult.anchorMode).toBe(AnchorMode.Any);
      expect(withPostConditionResult.anchorMode).toBe(AnchorMode.Any);
    });

    it('should include the network object', () => {
      const params: ClaimSwapParams = {
        sender: TEST_SENDER,
        preimage: TEST_PREIMAGE,
      };

      const result = buildClaimSwap(params, mockNetwork);

      expect(result.network).toBe(mockNetwork);
    });
  });

  describe('Preimage validation', () => {
    it('should accept exactly 32-byte preimages', () => {
      const validPreimage = new Uint8Array(32);
      validPreimage.fill(0xaa); // Fill with some data

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: validPreimage,
          },
          mockNetwork
        );
      }).not.toThrow();
    });

    it('should reject 31-byte preimages', () => {
      const shortPreimage = new Uint8Array(31);

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: shortPreimage,
          },
          mockNetwork
        );
      }).toThrow('Invalid preimage: must be exactly 32 bytes');
    });

    it('should reject 33-byte preimages', () => {
      const longPreimage = new Uint8Array(33);

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: longPreimage,
          },
          mockNetwork
        );
      }).toThrow('Invalid preimage: must be exactly 32 bytes');
    });

    it('should accept all-zero preimages', () => {
      const zeroPreimage = new Uint8Array(32);
      zeroPreimage.fill(0x00);

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: zeroPreimage,
          },
          mockNetwork
        );
      }).not.toThrow();
    });

    it('should accept all-FF preimages', () => {
      const ffPreimage = new Uint8Array(32);
      ffPreimage.fill(0xff);

      expect(() => {
        buildClaimSwap(
          {
            sender: TEST_SENDER,
            preimage: ffPreimage,
          },
          mockNetwork
        );
      }).not.toThrow();
    });
  });

  describe('Sender validation', () => {
    it('should handle contract principal as sender', () => {
      const contractSender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-contract';

      const result = buildClaimSwap(
        {
          sender: contractSender,
          preimage: TEST_PREIMAGE,
        },
        mockNetwork
      );

      expect(result.functionArgs[0]).toEqual(principalCV(contractSender));
    });

    it('should handle standard principal as sender', () => {
      const standardSender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

      const result = buildClaimSwap(
        {
          sender: standardSender,
          preimage: TEST_PREIMAGE,
        },
        mockNetwork
      );

      expect(result.functionArgs[0]).toEqual(principalCV(standardSender));
    });
  });
});
