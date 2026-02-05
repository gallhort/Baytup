/**
 * Unit Tests for Sanitize Middleware
 */

const { sanitizeInput, escapeHtml } = require('../../src/middleware/sanitize');

describe('Sanitize Middleware', () => {

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = escapeHtml(input);

      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      const input = 'He said "hello"';
      const result = escapeHtml(input);

      expect(result).toContain('&quot;');
    });

    it('should escape single quotes', () => {
      const input = "It's a test";
      const result = escapeHtml(input);

      expect(result).toContain('&#x27;');
    });

    it('should return non-string values unchanged', () => {
      expect(escapeHtml(123)).toBe(123);
      expect(escapeHtml(null)).toBe(null);
      expect(escapeHtml(undefined)).toBe(undefined);
      expect(escapeHtml(true)).toBe(true);
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeInput middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        path: '/api/test',
        body: {},
        query: {},
        params: {}
      };
      res = {};
      next = jest.fn();
    });

    it('should sanitize body strings', () => {
      req.body = {
        name: '<script>alert(1)</script>',
        description: 'Normal text'
      };

      sanitizeInput(req, res, next);

      expect(req.body.name).not.toContain('<script>');
      expect(req.body.description).toBe('Normal text');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      req.body = {
        user: {
          name: '<img src=x onerror=alert(1)>',
          profile: {
            bio: '<script>alert(1)</script>'
          }
        }
      };

      sanitizeInput(req, res, next);

      // HTML tags are escaped
      expect(req.body.user.name).not.toContain('<img');
      expect(req.body.user.name).toContain('&lt;img');
      expect(req.body.user.profile.bio).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize arrays', () => {
      req.body = {
        tags: ['<script>bad</script>', 'good', '<b>bold</b>']
      };

      sanitizeInput(req, res, next);

      expect(req.body.tags[0]).not.toContain('<script>');
      expect(req.body.tags[1]).toBe('good');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      req.query = {
        search: '<script>alert(1)</script>test'
      };

      sanitizeInput(req, res, next);

      expect(req.query.search).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize URL params', () => {
      req.params = {
        id: "'; DROP TABLE users; --"
      };

      sanitizeInput(req, res, next);

      expect(req.params.id).toContain('&#x27;');
      expect(next).toHaveBeenCalled();
    });

    it('should skip webhook routes', () => {
      req.path = '/api/webhooks/stripe';
      req.body = {
        data: '<script>test</script>'
      };

      sanitizeInput(req, res, next);

      // Webhook routes should be skipped, body unchanged
      expect(req.body.data).toBe('<script>test</script>');
      expect(next).toHaveBeenCalled();
    });

    it('should preserve numbers and booleans', () => {
      req.body = {
        count: 42,
        active: true,
        price: 99.99
      };

      sanitizeInput(req, res, next);

      expect(req.body.count).toBe(42);
      expect(req.body.active).toBe(true);
      expect(req.body.price).toBe(99.99);
      expect(next).toHaveBeenCalled();
    });

    it('should handle null and undefined', () => {
      req.body = {
        nullValue: null,
        undefinedValue: undefined
      };

      sanitizeInput(req, res, next);

      expect(req.body.nullValue).toBe(null);
      expect(req.body.undefinedValue).toBe(undefined);
      expect(next).toHaveBeenCalled();
    });
  });
});
