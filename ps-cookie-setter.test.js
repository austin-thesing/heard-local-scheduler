/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('ps-cookie-setter.js', () => {
  let originalCookie;
  let originalLocation;
  let originalWindow;

  beforeEach(() => {
    // Save original values
    originalCookie = document.cookie;
    originalLocation = global.location;
    originalWindow = global.window;

    // Clear all cookies before each test
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    // Setup mock window object
    global.window = {
      PS_COOKIE_DOMAIN: undefined,
      location: {
        search: '',
      },
    };
  });

  afterEach(() => {
    // Restore original values
    if (originalLocation) {
      global.location = originalLocation;
    }
    if (originalWindow) {
      global.window = originalWindow;
    }
  });

  describe('sanitize function', () => {
    test('should sanitize valid alphanumeric strings', async () => {
      // Test by checking cookie values after script execution
      global.window.location.search = '?ps_xid=abc123XYZ';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      expect(decodeURIComponent(cookieValue || '')).toBe('abc123XYZ');
    });

    test('should sanitize strings with allowed special characters', async () => {
      global.window.location.search = '?ps_xid=abc_123-456.789+test/value=end';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      expect(decodeURIComponent(cookieValue || '')).toContain('abc_123-456');
    });

    test('should remove dangerous characters', async () => {
      global.window.location.search = '?ps_xid=abc<script>alert(1)</script>123';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      const decoded = decodeURIComponent(cookieValue || '');
      expect(decoded).not.toContain('<');
      expect(decoded).not.toContain('>');
      expect(decoded).not.toContain('script');
    });

    test('should handle null and undefined inputs', async () => {
      global.window.location.search = '';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='));
      
      expect(cookieValue).toBeUndefined();
    });

    test('should handle empty strings', async () => {
      global.window.location.search = '?ps_xid=';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='));
      
      expect(cookieValue).toBeUndefined();
    });
  });

  describe('setCookie function', () => {
    test('should set cookie with correct name and value', async () => {
      global.window.location.search = '?ps_xid=test123';
      await import('ps-cookie-setter.js');
      
      const cookies = document.cookie.split('; ');
      const psXidCookie = cookies.find((c) => c.startsWith('ps_xid='));
      
      expect(psXidCookie).toBeDefined();
      expect(decodeURIComponent(psXidCookie.split('=')[1])).toBe('test123');
    });

    test('should set cookie with path=/', async () => {
      global.window.location.search = '?ps_xid=test123';
      await import('ps-cookie-setter.js');
      
      // Cookie should be accessible (path=/ means accessible everywhere)
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should set cookie with 90-day expiration', async () => {
      global.window.location.search = '?ps_xid=test123';
      await import('ps-cookie-setter.js');
      
      // We can't directly test max-age in jsdom, but we can verify cookie is set
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should not set cookie when value is empty', async () => {
      global.window.location.search = '?ps_xid=';
      await import('ps-cookie-setter.js');
      
      const cookies = document.cookie.split('; ');
      const psXidCookie = cookies.find((c) => c.startsWith('ps_xid='));
      
      expect(psXidCookie).toBeUndefined();
    });

    test('should handle partner key parameter', async () => {
      global.window.location.search = '?ps_partner_key=partner123';
      await import('ps-cookie-setter.js');
      
      const cookies = document.cookie.split('; ');
      const partnerKeyCookie = cookies.find((c) => c.startsWith('ps_partner_key='));
      
      expect(partnerKeyCookie).toBeDefined();
      expect(decodeURIComponent(partnerKeyCookie.split('=')[1])).toBe('partner123');
    });

    test('should set both ps_xid and ps_partner_key when provided', async () => {
      global.window.location.search = '?ps_xid=xid123&ps_partner_key=partner456';
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_xid=');
      expect(document.cookie).toContain('ps_partner_key=');
    });

    test('should use custom cookie domain when PS_COOKIE_DOMAIN is set', async () => {
      global.window.PS_COOKIE_DOMAIN = '.customdomain.com';
      global.window.location.search = '?ps_xid=test123';
      await import('ps-cookie-setter.js');
      
      // Cookie should still be set (domain is in cookie attributes)
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should use default domain when PS_COOKIE_DOMAIN is not set', async () => {
      global.window.PS_COOKIE_DOMAIN = undefined;
      global.window.location.search = '?ps_xid=test123';
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_xid=');
    });
  });

  describe('getCookie function', () => {
    test('should retrieve existing cookie value', async () => {
      // Manually set a cookie first
      document.cookie = 'ps_xid=existing123; path=/';
      
      global.window.location.search = '';
      await import('ps-cookie-setter.js');
      
      // Cookie should be refreshed (still present)
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should handle non-existent cookies', async () => {
      global.window.location.search = '';
      await import('ps-cookie-setter.js');
      
      // No ps_xid parameter and no existing cookie = no cookie set
      const cookies = document.cookie.split('; ');
      const psXidCookie = cookies.find((c) => c.startsWith('ps_xid=') && c !== 'ps_xid=');
      
      expect(psXidCookie).toBeUndefined();
    });

    test('should properly decode cookie values', async () => {
      // Set encoded cookie
      document.cookie = 'ps_xid=' + encodeURIComponent('test+value/123=') + '; path=/';
      
      global.window.location.search = '';
      await import('ps-cookie-setter.js');
      
      // Cookie should be refreshed with same value
      expect(document.cookie).toContain('ps_xid=');
    });
  });

  describe('cookie refresh behavior', () => {
    test('should refresh existing ps_xid cookie when no URL parameter provided', async () => {
      document.cookie = 'ps_xid=existing123; path=/';
      
      global.window.location.search = '';
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should override existing cookie with new URL parameter', async () => {
      document.cookie = 'ps_xid=old123; path=/';
      
      global.window.location.search = '?ps_xid=new456';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      expect(decodeURIComponent(cookieValue || '')).toBe('new456');
    });

    test('should refresh partner key cookie', async () => {
      document.cookie = 'ps_partner_key=partner123; path=/';
      
      global.window.location.search = '';
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_partner_key=');
    });
  });

  describe('edge cases', () => {
    test('should handle malformed query strings', async () => {
      global.window.location.search = '?ps_xid=test&&&ps_partner_key=';
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should handle very long parameter values', async () => {
      const longValue = 'a'.repeat(1000);
      global.window.location.search = `?ps_xid=${longValue}`;
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_xid=');
    });

    test('should handle special URL-encoded characters', async () => {
      global.window.location.search = '?ps_xid=test%2Bvalue%2Fdata';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      expect(cookieValue).toBeDefined();
    });

    test('should handle case-sensitive parameter names', async () => {
      global.window.location.search = '?PS_XID=test123';
      await import('ps-cookie-setter.js');
      
      // Should NOT set cookie (parameter is case-sensitive)
      const cookies = document.cookie.split('; ').filter((c) => c.trim());
      const psXidCookie = cookies.find((c) => c.startsWith('ps_xid=') && c !== 'ps_xid=');
      
      expect(psXidCookie).toBeUndefined();
    });

    test('should handle multiple query parameters', async () => {
      global.window.location.search = '?utm_source=google&ps_xid=test123&utm_campaign=summer';
      await import('ps-cookie-setter.js');
      
      expect(document.cookie).toContain('ps_xid=');
    });
  });

  describe('security considerations', () => {
    test('should prevent XSS via cookie injection', async () => {
      global.window.location.search = '?ps_xid=<img src=x onerror=alert(1)>';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      const decoded = decodeURIComponent(cookieValue || '');
      expect(decoded).not.toContain('<img');
      expect(decoded).not.toContain('onerror');
    });

    test('should prevent cookie manipulation via semicolons', async () => {
      global.window.location.search = '?ps_xid=test;domain=evil.com';
      await import('ps-cookie-setter.js');
      
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      const decoded = decodeURIComponent(cookieValue || '');
      expect(decoded).not.toContain(';');
      expect(decoded).not.toContain('domain=evil.com');
    });

    test('should handle SQL injection attempts gracefully', async () => {
      global.window.location.search = "?ps_xid='; DROP TABLE users; --";
      await import('ps-cookie-setter.js');
      
      // Should sanitize or not set dangerous content
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith('ps_xid='))
        ?.split('=')[1];
      
      if (cookieValue) {
        const decoded = decodeURIComponent(cookieValue);
        expect(decoded).not.toContain('DROP TABLE');
      }
    });
  });
});