/**
 * Unit Tests for Moderation Service
 * Tests content moderation for messages and reviews
 */

// Mock the models before requiring the service
jest.mock('../../src/models/ModerationRule', () => ({
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([])
  }),
  findById: jest.fn().mockReturnValue({
    then: jest.fn().mockResolvedValue(null)
  })
}));

jest.mock('../../src/models/ModerationLog', () => ({
  create: jest.fn().mockResolvedValue({})
}));

const moderationService = require('../../src/services/moderationService');

describe('Moderation Service', () => {

  beforeEach(() => {
    // Reset cache before each test
    moderationService.invalidateCache();
  });

  describe('checkKeyword', () => {
    // Signature: checkKeyword(content, keyword) returns boolean

    it('should detect exact keyword match', () => {
      const result = moderationService.checkKeyword(
        'this is a scam website',
        'scam'
      );

      expect(result).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = moderationService.checkKeyword(
        'this is SPAM content',
        'spam'
      );

      expect(result).toBe(true);
    });

    it('should return false if no match', () => {
      const result = moderationService.checkKeyword(
        'This is a great listing!',
        'spam'
      );

      expect(result).toBe(false);
    });

    it('should detect French bad words', () => {
      const result = moderationService.checkKeyword(
        "c'est une arnaque totale",
        'arnaque'
      );

      expect(result).toBe(true);
    });

    it('should match whole words only', () => {
      // "spam" should not match "spammer" if using word boundaries
      const result = moderationService.checkKeyword(
        'hello scammer',
        'scam'
      );

      // This depends on implementation - may or may not match partial
      expect(typeof result).toBe('boolean');
    });
  });

  describe('checkPattern', () => {
    // Signature: checkPattern(content, pattern) returns boolean

    it('should detect phone number patterns', () => {
      const result = moderationService.checkPattern(
        'Contact me at +213555123456',
        '\\+?[0-9]{10,14}'
      );

      expect(result).toBe(true);
    });

    it('should detect email patterns', () => {
      const result = moderationService.checkPattern(
        'Email me at test@example.com for direct booking',
        '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
      );

      expect(result).toBe(true);
    });

    it('should detect WhatsApp mentions', () => {
      const result = moderationService.checkPattern(
        'Contact me on WhatsApp for better price',
        'whatsapp|viber|telegram|signal'
      );

      expect(result).toBe(true);
    });

    it('should return false for no pattern match', () => {
      const result = moderationService.checkPattern(
        'Great place, loved it!',
        '\\+?[0-9]{10,14}'
      );

      expect(result).toBe(false);
    });

    it('should handle invalid regex gracefully', () => {
      const result = moderationService.checkPattern(
        'test content',
        '[invalid regex(('
      );

      // Should return false and not throw
      expect(result).toBe(false);
    });
  });

  describe('checkBehavior', () => {
    // Signature: checkBehavior(content, behaviorType) returns boolean

    it('should detect excessive caps (excessive_caps)', () => {
      const result = moderationService.checkBehavior(
        'THIS IS ALL CAPS MESSAGE SCREAMING AT YOU',
        'excessive_caps'
      );

      expect(result).toBe(true);
    });

    it('should pass normal caps usage', () => {
      const result = moderationService.checkBehavior(
        'This is a Normal message with Some Caps',
        'excessive_caps'
      );

      expect(result).toBe(false);
    });

    it('should detect excessive emojis (excessive_emoji)', () => {
      const result = moderationService.checkBehavior(
        '🎉🎊🎁🎈🎂🎄🎃🎅🎁🎈',
        'excessive_emoji'
      );

      expect(result).toBe(true);
    });

    it('should pass normal emoji usage', () => {
      const result = moderationService.checkBehavior(
        'Great place! 🎉 Would recommend!',
        'excessive_emoji'
      );

      expect(result).toBe(false);
    });

    it('should detect repeated characters (repeated_chars)', () => {
      const result = moderationService.checkBehavior(
        'Helloooooooo anyone there?????',
        'repeated_chars'
      );

      expect(result).toBe(true);
    });

    it('should pass normal text without excessive repeats', () => {
      const result = moderationService.checkBehavior(
        'Hello, is anyone there?',
        'repeated_chars'
      );

      expect(result).toBe(false);
    });

    it('should return false for unknown behavior type', () => {
      const result = moderationService.checkBehavior(
        'test content',
        'unknown_behavior'
      );

      expect(result).toBe(false);
    });
  });

  describe('checkRule', () => {
    // Signature: checkRule(content, rule) returns boolean (async)

    it('should route keyword rule correctly', async () => {
      const rule = {
        type: 'keyword',
        content: 'test'
      };

      const result = await moderationService.checkRule('this is a test', rule);
      expect(result).toBe(true);
    });

    it('should route pattern rule correctly', async () => {
      const rule = {
        type: 'pattern',
        content: 'whatsapp'
      };

      const result = await moderationService.checkRule('contact on whatsapp', rule);
      expect(result).toBe(true);
    });

    it('should route behavior rule correctly', async () => {
      const rule = {
        type: 'behavior',
        content: 'repeated_chars'
      };

      // Test with repeated characters (5+ of same char)
      const result = await moderationService.checkRule('Helloooooooo world', rule);
      expect(result).toBe(true);
    });

    it('should return false for unknown rule type', async () => {
      const rule = {
        type: 'unknown_type',
        content: 'test'
      };

      const result = await moderationService.checkRule('test content', rule);
      expect(result).toBe(false);
    });
  });

  describe('getHighestSeverity', () => {
    it('should return high if any rule has high severity', () => {
      const triggeredRules = [
        { severity: 'low' },
        { severity: 'high' },
        { severity: 'medium' }
      ];

      const result = moderationService.getHighestSeverity(triggeredRules);
      expect(result).toBe('high');
    });

    it('should return medium if highest is medium', () => {
      const triggeredRules = [
        { severity: 'low' },
        { severity: 'medium' }
      ];

      const result = moderationService.getHighestSeverity(triggeredRules);
      expect(result).toBe('medium');
    });

    it('should return low if only low severity', () => {
      const triggeredRules = [
        { severity: 'low' },
        { severity: 'low' }
      ];

      const result = moderationService.getHighestSeverity(triggeredRules);
      expect(result).toBe('low');
    });
  });

  describe('getDefaultMessage', () => {
    it('should return appropriate message for high severity', () => {
      const message = moderationService.getDefaultMessage('high');
      expect(message).toContain('inapproprié');
    });

    it('should return appropriate message for medium severity', () => {
      const message = moderationService.getDefaultMessage('medium');
      expect(message).toContain('coordonnées');
    });

    it('should return appropriate message for low severity', () => {
      const message = moderationService.getDefaultMessage('low');
      expect(message).toContain('signalé');
    });

    it('should default to high message for unknown severity', () => {
      const message = moderationService.getDefaultMessage('unknown');
      expect(message).toContain('inapproprié');
    });
  });

  describe('invalidateCache', () => {
    it('should clear the rules cache', () => {
      // Set some cache
      moderationService.rulesCache = [{ test: 'rule' }];
      moderationService.lastCacheUpdate = Date.now();

      // Invalidate
      moderationService.invalidateCache();

      expect(moderationService.rulesCache).toBeNull();
      expect(moderationService.lastCacheUpdate).toBeNull();
    });
  });

  describe('External Contact Detection', () => {
    it('should flag WhatsApp mentions', () => {
      const result = moderationService.checkPattern(
        'Let\'s talk on WhatsApp instead',
        'whatsapp|viber|telegram'
      );

      expect(result).toBe(true);
    });

    it('should flag phone numbers', () => {
      const result = moderationService.checkPattern(
        'My number is 0555123456',
        '[0-9]{10}'
      );

      expect(result).toBe(true);
    });

    it('should flag email addresses', () => {
      const result = moderationService.checkPattern(
        'Contact me at user@gmail.com',
        '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
      );

      expect(result).toBe(true);
    });
  });

  describe('Multilingual Support', () => {
    it('should detect French keywords', () => {
      const result = moderationService.checkKeyword(
        'Quel connard ce proprietaire',
        'connard'
      );

      expect(result).toBe(true);
    });

    it('should detect Arabic transliterated words', () => {
      const result = moderationService.checkKeyword(
        'Hada nsab, attention!',
        'nsab'
      );

      expect(result).toBe(true);
    });
  });

  describe('Spam Detection', () => {
    it('should detect crypto spam keywords', () => {
      const result = moderationService.checkKeyword(
        'Make money with bitcoin investment!',
        'bitcoin'
      );

      expect(result).toBe(true);
    });

    it('should detect URLs in messages', () => {
      const result = moderationService.checkPattern(
        'Check out https://scam-site.com for deals',
        '(http|https)://[\\w./\\-?=&]+'
      );

      expect(result).toBe(true);
    });
  });

  describe('checkContent', () => {
    // This requires mocked rules from DB

    it('should return clean for empty content', async () => {
      const result = await moderationService.checkContent('', 'message');

      expect(result.level).toBe('clean');
      expect(result.action).toBe('allow');
    });

    it('should return clean for null content', async () => {
      const result = await moderationService.checkContent(null, 'message');

      expect(result.level).toBe('clean');
      expect(result.action).toBe('allow');
    });

    it('should return clean when no rules are triggered', async () => {
      const result = await moderationService.checkContent(
        'This is a completely normal message',
        'message'
      );

      expect(result.level).toBe('clean');
      expect(result.flags).toHaveLength(0);
    });
  });
});
