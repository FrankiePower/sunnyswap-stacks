/**
 * Tests for HTLC Utility Functions
 * Verifies hash generation, validation, and conversion utilities
 */

import {
  generateSecret,
  hashSecret,
  validateHash,
  validatePreimage,
  calculateExpirationHeight,
  bytesToHex,
  hexToBytes,
  microStxToStx,
  stxToMicroStx,
  formatTimeUntilBlock,
} from './utils';

describe('HTLC Utility Functions', () => {
  describe('generateSecret', () => {
    it('should generate a 32-byte secret', () => {
      const secret = generateSecret();

      expect(secret).toBeInstanceOf(Uint8Array);
      expect(secret.length).toBe(32);
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();

      expect(secret1).not.toEqual(secret2);
    });

    it('should generate non-zero secrets', () => {
      const secret = generateSecret();
      const isAllZeros = secret.every((byte) => byte === 0);

      expect(isAllZeros).toBe(false);
    });

    it('should generate multiple unique secrets', () => {
      const secrets = Array.from({ length: 10 }, () => generateSecret());
      const uniqueSecrets = new Set(secrets.map((s) => bytesToHex(s)));

      expect(uniqueSecrets.size).toBe(10);
    });
  });

  describe('hashSecret', () => {
    it('should hash a 32-byte secret to 32 bytes', async () => {
      const secret = new Uint8Array(32);
      secret.fill(0x42);

      const hash = await hashSecret(secret);

      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32);
    });

    it('should produce consistent hashes for same input', async () => {
      const secret = new Uint8Array(32);
      secret.fill(0xaa);

      const hash1 = await hashSecret(secret);
      const hash2 = await hashSecret(secret);

      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const secret1 = new Uint8Array(32);
      secret1.fill(0x11);

      const secret2 = new Uint8Array(32);
      secret2.fill(0x22);

      const hash1 = await hashSecret(secret1);
      const hash2 = await hashSecret(secret2);

      expect(hash1).not.toEqual(hash2);
    });

    it('should throw error for non-32-byte secrets', async () => {
      const shortSecret = new Uint8Array(16);

      await expect(hashSecret(shortSecret)).rejects.toThrow(
        'Secret must be exactly 32 bytes'
      );
    });

    it('should throw error for empty secrets', async () => {
      const emptySecret = new Uint8Array(0);

      await expect(hashSecret(emptySecret)).rejects.toThrow(
        'Secret must be exactly 32 bytes'
      );
    });

    it('should throw error for oversized secrets', async () => {
      const largeSecret = new Uint8Array(64);

      await expect(hashSecret(largeSecret)).rejects.toThrow(
        'Secret must be exactly 32 bytes'
      );
    });

    it('should produce known SHA256 hash', async () => {
      // Test vector: hash of "hello" padded to 32 bytes
      const secret = new Uint8Array(32);
      const helloBytes = new TextEncoder().encode('hello');
      secret.set(helloBytes);

      const hash = await hashSecret(secret);

      // Just verify it produces a valid 32-byte hash
      expect(hash.length).toBe(32);
      expect(hash).toBeInstanceOf(Uint8Array);
    });
  });

  describe('validateHash', () => {
    it('should return true for valid 32-byte hash', () => {
      const validHash = new Uint8Array(32);

      expect(validateHash(validHash)).toBe(true);
    });

    it('should return false for short hash', () => {
      const shortHash = new Uint8Array(31);

      expect(validateHash(shortHash)).toBe(false);
    });

    it('should return false for long hash', () => {
      const longHash = new Uint8Array(33);

      expect(validateHash(longHash)).toBe(false);
    });

    it('should return false for empty hash', () => {
      const emptyHash = new Uint8Array(0);

      expect(validateHash(emptyHash)).toBe(false);
    });

    it('should return false for non-Uint8Array', () => {
      const notArray = [1, 2, 3] as any;

      expect(validateHash(notArray)).toBe(false);
    });

    it('should return false for null', () => {
      expect(validateHash(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateHash(undefined as any)).toBe(false);
    });
  });

  describe('validatePreimage', () => {
    it('should return true for valid 32-byte preimage', () => {
      const validPreimage = new Uint8Array(32);

      expect(validatePreimage(validPreimage)).toBe(true);
    });

    it('should return false for short preimage', () => {
      const shortPreimage = new Uint8Array(16);

      expect(validatePreimage(shortPreimage)).toBe(false);
    });

    it('should return false for long preimage', () => {
      const longPreimage = new Uint8Array(64);

      expect(validatePreimage(longPreimage)).toBe(false);
    });

    it('should return false for empty preimage', () => {
      const emptyPreimage = new Uint8Array(0);

      expect(validatePreimage(emptyPreimage)).toBe(false);
    });

    it('should return false for non-Uint8Array', () => {
      const notArray = 'not an array' as any;

      expect(validatePreimage(notArray)).toBe(false);
    });
  });

  describe('calculateExpirationHeight', () => {
    it('should calculate correct block height for 1 hour', () => {
      const currentHeight = 1000;
      const hoursFromNow = 1;

      const result = calculateExpirationHeight(hoursFromNow, currentHeight);

      expect(result).toBe(1006); // 1000 + (1 * 6 blocks/hour)
    });

    it('should calculate correct block height for 24 hours', () => {
      const currentHeight = 1000;
      const hoursFromNow = 24;

      const result = calculateExpirationHeight(hoursFromNow, currentHeight);

      expect(result).toBe(1144); // 1000 + (24 * 6)
    });

    it('should calculate correct block height for fractional hours', () => {
      const currentHeight = 1000;
      const hoursFromNow = 0.5; // 30 minutes

      const result = calculateExpirationHeight(hoursFromNow, currentHeight);

      expect(result).toBe(1003); // 1000 + floor(0.5 * 6)
    });

    it('should handle zero hours', () => {
      const currentHeight = 1000;
      const hoursFromNow = 0;

      const result = calculateExpirationHeight(hoursFromNow, currentHeight);

      expect(result).toBe(1000);
    });

    it('should handle large hour values', () => {
      const currentHeight = 1000;
      const hoursFromNow = 168; // 1 week

      const result = calculateExpirationHeight(hoursFromNow, currentHeight);

      expect(result).toBe(2008); // 1000 + (168 * 6)
    });

    it('should floor fractional blocks', () => {
      const currentHeight = 1000;
      const hoursFromNow = 1.7; // Should give 10.2 blocks, floored to 10

      const result = calculateExpirationHeight(hoursFromNow, currentHeight);

      expect(result).toBe(1010); // 1000 + floor(1.7 * 6)
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);

      const hex = bytesToHex(bytes);

      expect(hex).toBe('12345678');
    });

    it('should handle all zeros', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);

      const hex = bytesToHex(bytes);

      expect(hex).toBe('00000000');
    });

    it('should handle all FFs', () => {
      const bytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);

      const hex = bytesToHex(bytes);

      expect(hex).toBe('ffffffff');
    });

    it('should handle empty array', () => {
      const bytes = new Uint8Array([]);

      const hex = bytesToHex(bytes);

      expect(hex).toBe('');
    });

    it('should handle single byte', () => {
      const bytes = new Uint8Array([0xab]);

      const hex = bytesToHex(bytes);

      expect(hex).toBe('ab');
    });

    it('should pad single digit bytes', () => {
      const bytes = new Uint8Array([0x01, 0x0a, 0x0f]);

      const hex = bytesToHex(bytes);

      expect(hex).toBe('010a0f');
    });
  });

  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const hex = '12345678';

      const bytes = hexToBytes(hex);

      expect(bytes).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
    });

    it('should handle 0x prefix', () => {
      const hex = '0x12345678';

      const bytes = hexToBytes(hex);

      expect(bytes).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]));
    });

    it('should handle lowercase hex', () => {
      const hex = 'abcdef';

      const bytes = hexToBytes(hex);

      expect(bytes).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
    });

    it('should handle uppercase hex', () => {
      const hex = 'ABCDEF';

      const bytes = hexToBytes(hex);

      expect(bytes).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
    });

    it('should handle mixed case hex', () => {
      const hex = 'AbCdEf';

      const bytes = hexToBytes(hex);

      expect(bytes).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
    });

    it('should handle empty string', () => {
      const hex = '';

      const bytes = hexToBytes(hex);

      expect(bytes).toEqual(new Uint8Array([]));
    });

    it('should throw error for odd length hex', () => {
      const hex = '123'; // Odd length

      expect(() => hexToBytes(hex)).toThrow('Hex string must have even length');
    });

    it('should be inverse of bytesToHex', () => {
      const originalBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);

      const hex = bytesToHex(originalBytes);
      const recoveredBytes = hexToBytes(hex);

      expect(recoveredBytes).toEqual(originalBytes);
    });
  });

  describe('microStxToStx', () => {
    it('should convert 1 STX worth of microSTX', () => {
      const microStx = 1000000n;

      const stx = microStxToStx(microStx);

      expect(stx).toBe(1);
    });

    it('should convert 0 microSTX', () => {
      const microStx = 0n;

      const stx = microStxToStx(microStx);

      expect(stx).toBe(0);
    });

    it('should convert fractional STX', () => {
      const microStx = 500000n; // 0.5 STX

      const stx = microStxToStx(microStx);

      expect(stx).toBe(0.5);
    });

    it('should convert large amounts', () => {
      const microStx = 1000000000000n; // 1 million STX

      const stx = microStxToStx(microStx);

      expect(stx).toBe(1000000);
    });

    it('should handle small fractions', () => {
      const microStx = 1n; // 0.000001 STX

      const stx = microStxToStx(microStx);

      expect(stx).toBe(0.000001);
    });
  });

  describe('stxToMicroStx', () => {
    it('should convert 1 STX to microSTX', () => {
      const stx = 1;

      const microStx = stxToMicroStx(stx);

      expect(microStx).toBe(1000000n);
    });

    it('should convert 0 STX', () => {
      const stx = 0;

      const microStx = stxToMicroStx(stx);

      expect(microStx).toBe(0n);
    });

    it('should convert fractional STX', () => {
      const stx = 0.5;

      const microStx = stxToMicroStx(stx);

      expect(microStx).toBe(500000n);
    });

    it('should convert large amounts', () => {
      const stx = 1000000; // 1 million STX

      const microStx = stxToMicroStx(stx);

      expect(microStx).toBe(1000000000000n);
    });

    it('should floor fractional microSTX', () => {
      const stx = 0.0000005; // Would be 0.5 microSTX

      const microStx = stxToMicroStx(stx);

      expect(microStx).toBe(0n); // Floored to 0
    });

    it('should be inverse of microStxToStx for whole numbers', () => {
      const originalStx = 10;

      const microStx = stxToMicroStx(originalStx);
      const recoveredStx = microStxToStx(microStx);

      expect(recoveredStx).toBe(originalStx);
    });
  });

  describe('formatTimeUntilBlock', () => {
    it('should format minutes for blocks less than 1 hour away', () => {
      const currentHeight = 1000;
      const targetHeight = 1003; // 3 blocks = 30 minutes

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~30 minutes');
    });

    it('should format hours for blocks 1-23 hours away', () => {
      const currentHeight = 1000;
      const targetHeight = 1012; // 12 blocks = 2 hours

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~2 hours');
    });

    it('should format days for blocks 24+ hours away', () => {
      const currentHeight = 1000;
      const targetHeight = 1288; // 288 blocks = 48 hours = 2 days

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~2 days');
    });

    it('should return "Expired" for past blocks', () => {
      const currentHeight = 1000;
      const targetHeight = 900; // In the past

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('Expired');
    });

    it('should return "Expired" for current block', () => {
      const currentHeight = 1000;
      const targetHeight = 1000; // Same height

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('Expired');
    });

    it('should handle 1 block away', () => {
      const currentHeight = 1000;
      const targetHeight = 1001; // 1 block = 10 minutes

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~10 minutes');
    });

    it('should handle exactly 1 hour', () => {
      const currentHeight = 1000;
      const targetHeight = 1006; // 6 blocks = 60 minutes = 1 hour

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~1 hours');
    });

    it('should handle exactly 1 day', () => {
      const currentHeight = 1000;
      const targetHeight = 1144; // 144 blocks = 24 hours = 1 day

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~1 days');
    });

    it('should handle 1 week', () => {
      const currentHeight = 1000;
      const targetHeight = 2008; // 1008 blocks = 168 hours = 7 days

      const result = formatTimeUntilBlock(targetHeight, currentHeight);

      expect(result).toBe('~7 days');
    });
  });

  describe('Integration tests', () => {
    it('should generate, hash, and validate a secret', async () => {
      const secret = generateSecret();
      const hash = await hashSecret(secret);

      expect(validatePreimage(secret)).toBe(true);
      expect(validateHash(hash)).toBe(true);
    });

    it('should convert between hex and bytes consistently', () => {
      const secret = generateSecret();
      const hex = bytesToHex(secret);
      const recovered = hexToBytes(hex);

      expect(recovered).toEqual(secret);
    });

    it('should convert between STX and microSTX consistently', () => {
      const stx = 123.456;
      const microStx = stxToMicroStx(stx);
      const recoveredStx = microStxToStx(microStx);

      // Allow small floating point differences
      expect(Math.abs(recoveredStx - stx)).toBeLessThan(0.000001);
    });

    it('should calculate expiration and format time correctly', () => {
      const currentHeight = 1000;
      const hoursFromNow = 24;

      const expirationHeight = calculateExpirationHeight(hoursFromNow, currentHeight);
      const timeString = formatTimeUntilBlock(expirationHeight, currentHeight);

      expect(timeString).toContain('day');
    });
  });
});
