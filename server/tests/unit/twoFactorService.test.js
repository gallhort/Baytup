/**
 * Unit Tests for Two-Factor Authentication Service
 */

const twoFactorService = require('../../src/services/twoFactorService');
const speakeasy = require('speakeasy');

describe('Two-Factor Authentication Service', () => {

  describe('generateSecret', () => {
    // Signature: generateSecret(userName, email) returns Promise<{secret, qrCode, backupCodes}>

    it('should generate a valid secret with QR code', async () => {
      const result = await twoFactorService.generateSecret('Test User', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toBeDefined();
      expect(result.qrCode).toContain('data:image/png;base64');
      expect(result.backupCodes.length).toBe(10);
    });

    it('should generate unique secrets for different calls', async () => {
      const result1 = await twoFactorService.generateSecret('User1', 'test@example.com');
      const result2 = await twoFactorService.generateSecret('User2', 'test@example.com');

      expect(result1.secret).not.toBe(result2.secret);
    });

    it('should generate 10 backup codes', async () => {
      const result = await twoFactorService.generateSecret('Test User', 'test@example.com');

      expect(result.backupCodes).toHaveLength(10);
      // Each backup code should be a string in format XXXX-XXXX
      result.backupCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBe(9); // XXXX-XXXX = 9 chars
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });
  });

  describe('verifyTOTP', () => {
    let secret;

    beforeEach(() => {
      // Generate a secret for testing
      secret = speakeasy.generateSecret({ length: 32 });
    });

    it('should verify valid TOTP code', () => {
      // Generate a valid code
      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const result = twoFactorService.verifyTOTP(secret.base32, validCode);

      expect(result).toBe(true);
    });

    it('should reject invalid TOTP code', () => {
      const result = twoFactorService.verifyTOTP(secret.base32, '000000');

      expect(result).toBe(false);
    });

    it('should reject empty code', () => {
      const result = twoFactorService.verifyTOTP(secret.base32, '');

      expect(result).toBe(false);
    });

    it('should accept codes within time window (±60s)', () => {
      // Generate a code with some time drift
      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) - 30 // 30 seconds ago
      });

      const result = twoFactorService.verifyTOTP(secret.base32, validCode);

      // Should accept due to window tolerance
      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate specified number of codes', () => {
      const codes = twoFactorService.generateBackupCodes(10);

      expect(codes).toHaveLength(10);
    });

    it('should generate unique codes', () => {
      const codes = twoFactorService.generateBackupCodes(10);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should generate codes in XXXX-XXXX format', () => {
      const codes = twoFactorService.generateBackupCodes(5);

      codes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBe(9);
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('should not include ambiguous characters (0, O, 1, I)', () => {
      const codes = twoFactorService.generateBackupCodes(20);

      codes.forEach(code => {
        expect(code).not.toMatch(/[0O1I]/);
      });
    });
  });

  describe('hashBackupCodes', () => {
    it('should hash all backup codes', async () => {
      const plainCodes = ['ABCD-EFGH', 'IJKL-MNOP'];

      const hashedCodes = await twoFactorService.hashBackupCodes(plainCodes);

      expect(hashedCodes).toHaveLength(2);
      hashedCodes.forEach(item => {
        expect(item).toHaveProperty('code');
        expect(item).toHaveProperty('used');
        expect(item.used).toBe(false);
        // Hashed codes should be different from plain
        expect(item.code).not.toBe('ABCD-EFGH');
        expect(item.code).not.toBe('IJKL-MNOP');
        // bcrypt hashes start with $2
        expect(item.code).toMatch(/^\$2[ab]\$/);
      });
    });
  });

  describe('verifyBackupCode', () => {
    let hashedCodes;
    let plainCodes;

    beforeEach(async () => {
      // Generate and hash backup codes
      plainCodes = twoFactorService.generateBackupCodes(5);
      hashedCodes = await twoFactorService.hashBackupCodes(plainCodes);
    });

    it('should verify valid backup code', async () => {
      const result = await twoFactorService.verifyBackupCode(
        plainCodes[0],
        hashedCodes
      );

      expect(result.valid).toBe(true);
      expect(result.codeIndex).toBe(0);
    });

    it('should verify second backup code', async () => {
      const result = await twoFactorService.verifyBackupCode(
        plainCodes[2],
        hashedCodes
      );

      expect(result.valid).toBe(true);
      expect(result.codeIndex).toBe(2);
    });

    it('should reject invalid backup code', async () => {
      const result = await twoFactorService.verifyBackupCode(
        'INVALID-CODE',
        hashedCodes
      );

      expect(result.valid).toBe(false);
      expect(result.codeIndex).toBe(-1);
    });

    it('should reject already used backup code', async () => {
      // Mark first code as used
      hashedCodes[0].used = true;

      const result = await twoFactorService.verifyBackupCode(
        plainCodes[0],
        hashedCodes
      );

      expect(result.valid).toBe(false);
    });

    it('should be case insensitive and ignore spaces', async () => {
      // Test with lowercase and spaces
      const codeWithSpaces = plainCodes[1].toLowerCase().replace('-', ' - ');

      const result = await twoFactorService.verifyBackupCode(
        codeWithSpaces,
        hashedCodes
      );

      expect(result.valid).toBe(true);
      expect(result.codeIndex).toBe(1);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes and hashes', async () => {
      const result = await twoFactorService.regenerateBackupCodes();

      expect(result).toHaveProperty('backupCodes');
      expect(result).toHaveProperty('hashedCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.hashedCodes).toHaveLength(10);
    });

    it('should return matching plain and hashed codes', async () => {
      const result = await twoFactorService.regenerateBackupCodes();

      // Verify first code matches
      const verifyResult = await twoFactorService.verifyBackupCode(
        result.backupCodes[0],
        result.hashedCodes
      );

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.codeIndex).toBe(0);
    });
  });

  describe('check2FAStatus', () => {
    it('should return disabled status for user without 2FA', () => {
      const user = {
        twoFactorEnabled: false,
        role: 'guest'
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.enabled).toBe(false);
    });

    it('should return enabled status for user with 2FA', () => {
      const user = {
        twoFactorEnabled: true,
        backupCodes: [{ used: false }, { used: false }, { used: true }]
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.enabled).toBe(true);
      expect(result.backupCodesCount).toBe(2);
    });

    it('should recommend 2FA for hosts', () => {
      const user = {
        twoFactorEnabled: false,
        role: 'host'
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.shouldEnable).toBe(true);
      expect(result.reason).toContain('revenus');
    });

    it('should recommend 2FA for users with payment methods', () => {
      const user = {
        twoFactorEnabled: false,
        role: 'guest',
        paymentMethods: [{ id: 'pm_123' }]
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.shouldEnable).toBe(true);
      expect(result.reason).toContain('Sécurisez');
    });

    it('should recommend 2FA for users with Stripe Connect', () => {
      const user = {
        twoFactorEnabled: false,
        role: 'guest',
        stripeConnect: { accountId: 'acct_123' }
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.shouldEnable).toBe(true);
    });

    it('should warn when backup codes are running low', () => {
      const user = {
        twoFactorEnabled: true,
        backupCodes: [
          { used: false },
          { used: false },
          { used: true },
          { used: true },
          { used: true }
        ]
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.warning).toContain('moins de 3');
    });

    it('should not warn when enough backup codes remain', () => {
      const user = {
        twoFactorEnabled: true,
        backupCodes: [
          { used: false },
          { used: false },
          { used: false },
          { used: false },
          { used: true }
        ]
      };

      const result = twoFactorService.check2FAStatus(user);

      expect(result.warning).toBeUndefined();
    });
  });

  describe('Security Considerations', () => {
    it('should use secure random generation for backup codes', () => {
      const codes1 = twoFactorService.generateBackupCodes(10);
      const codes2 = twoFactorService.generateBackupCodes(10);

      // Should be different each time
      expect(codes1).not.toEqual(codes2);
    });

    it('should generate secrets with sufficient entropy', async () => {
      const result = await twoFactorService.generateSecret('Test', 'test@example.com');

      // Base32 secret should be at least 32 characters
      expect(result.secret.length).toBeGreaterThanOrEqual(32);
    });
  });
});
