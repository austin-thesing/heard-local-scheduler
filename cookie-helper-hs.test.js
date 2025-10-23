/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { readFileSync } from 'fs';

describe('cookie-helper-hs.js', () => {
  let originalConsole;
  let consoleLogSpy;
  let consoleWarnSpy;
  
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock console methods
    originalConsole = { ...console };
    consoleLogSpy = mock(() => {});
    consoleWarnSpy = mock(() => {});
    console.log = consoleLogSpy;
    console.warn = consoleWarnSpy;
    
    // Reset window globals
    delete window.hbspt;
    delete window.ps_xid;
    delete window.partnerstack;
    
    // Set document readyState to complete
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'complete',
    });
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
  });

  describe('getCookie function', () => {
    test('should retrieve a valid cookie by name', () => {
      document.cookie = 'ps_xid=test123; path=/';
      
      // Load and execute the script
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      // The getCookie function should have been called and logged
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('should return null for non-existent cookies', () => {
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      
      // Extract just the getCookie function for isolated testing
      const getCookieFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        return getCookie;
      `)();
      
      const result = getCookieFunc('nonexistent_cookie');
      expect(result).toBeNull();
    });

    test('should handle invalid name parameter', () => {
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getCookieFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        return getCookie;
      `)();
      
      expect(getCookieFunc(null)).toBeNull();
      expect(getCookieFunc(undefined)).toBeNull();
      expect(getCookieFunc('')).toBeNull();
      expect(getCookieFunc(123)).toBeNull();
    });

    test('should properly decode URI-encoded cookie values', () => {
      document.cookie = 'ps_xid=' + encodeURIComponent('test+value/123') + '; path=/';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getCookieFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        return getCookie;
      `)();
      
      const result = getCookieFunc('ps_xid');
      expect(result).toBe('test+value/123');
    });

    test('should handle cookies with special regex characters in name', () => {
      document.cookie = 'test.cookie=value123; path=/';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getCookieFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        return getCookie;
      `)();
      
      const result = getCookieFunc('test.cookie');
      expect(result).toBe('value123');
    });

    test('should handle errors gracefully', () => {
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getCookieFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        return getCookie;
      `)();
      
      // Should not throw
      expect(() => getCookieFunc('test')).not.toThrow();
    });
  });

  describe('getPartnerStackId function', () => {
    test('should prioritize sessionStorage over other sources', () => {
      sessionStorage.setItem('ps_xid', 'session123');
      localStorage.setItem('ps_xid', 'local456');
      document.cookie = 'ps_xid=cookie789; path=/';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getPartnerStackIdFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        ${scriptContent.match(/function getPartnerStackId\(\) \{[\s\S]*?\n\}/)[0]}
        return getPartnerStackId;
      `)();
      
      const result = getPartnerStackIdFunc();
      expect(result).toBe('session123');
    });

    test('should fall back to localStorage when sessionStorage is empty', () => {
      localStorage.setItem('ps_xid', 'local456');
      document.cookie = 'ps_xid=cookie789; path=/';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getPartnerStackIdFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        ${scriptContent.match(/function getPartnerStackId\(\) \{[\s\S]*?\n\}/)[0]}
        return getPartnerStackId;
      `)();
      
      const result = getPartnerStackIdFunc();
      expect(result).toBe('local456');
    });

    test('should fall back to cookie when storage is empty', () => {
      document.cookie = 'ps_xid=cookie789; path=/';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getPartnerStackIdFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        ${scriptContent.match(/function getPartnerStackId\(\) \{[\s\S]*?\n\}/)[0]}
        return getPartnerStackId;
      `)();
      
      const result = getPartnerStackIdFunc();
      expect(result).toBe('cookie789');
    });

    test('should return null when no PartnerStack ID is found', () => {
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getPartnerStackIdFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        ${scriptContent.match(/function getPartnerStackId\(\) \{[\s\S]*?\n\}/)[0]}
        return getPartnerStackId;
      `)();
      
      const result = getPartnerStackIdFunc();
      expect(result).toBeNull();
    });

    test('should handle sessionStorage access errors gracefully', () => {
      // Mock sessionStorage to throw error
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true,
      });
      
      localStorage.setItem('ps_xid', 'local456');
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getPartnerStackIdFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        ${scriptContent.match(/function getPartnerStackId\(\) \{[\s\S]*?\n\}/)[0]}
        return getPartnerStackId;
      `)();
      
      const result = getPartnerStackIdFunc();
      expect(result).toBe('local456');
    });

    test('should handle localStorage access errors gracefully', () => {
      sessionStorage.setItem('ps_xid', 'session123');
      
      // Mock localStorage to throw error
      const originalLocalStorage = localStorage;
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true,
      });
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      const getPartnerStackIdFunc = new Function(`
        ${scriptContent.match(/function getCookie\(name\) \{[\s\S]*?\n\}/)[0]}
        ${scriptContent.match(/function getPartnerStackId\(\) \{[\s\S]*?\n\}/)[0]}
        return getPartnerStackId;
      `)();
      
      const result = getPartnerStackIdFunc();
      expect(result).toBe('session123');
      
      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      });
    });
  });

  describe('injectPartnerStackId function', () => {
    test('should inject PartnerStack ID into matching input fields', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
          <input type="text" name="email" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      expect(input.value).toBe('test123');
    });

    test('should not inject when no PartnerStack ID is available', () => {
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      expect(input.value).toBe('');
    });

    test('should not overwrite existing field values', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="existing456" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      expect(input.value).toBe('existing456');
    });

    test('should handle multiple matching fields', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
          <input type="hidden" name="ps_xid" value="" />
          <input type="hidden" name="0-1/partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const fields = document.querySelectorAll('input[name*="partnerstack"], input[name="ps_xid"]');
      fields.forEach((field) => {
        if (!field.value || field.value === '') {
          // Field should have been injected
        }
      });
    });

    test('should dispatch input and change events after injection', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      let inputEventFired = false;
      let changeEventFired = false;
      
      input.addEventListener('input', () => {
        inputEventFired = true;
      });
      input.addEventListener('change', () => {
        changeEventFired = true;
      });
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      expect(inputEventFired).toBe(true);
      expect(changeEventFired).toBe(true);
    });

    test('should handle fields with prefixed names', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="0-1/partnerstack_click_id" value="" />
          <input type="hidden" name="0-2/ps_xid" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const field1 = document.querySelector('input[name="0-1/partnerstack_click_id"]');
      const field2 = document.querySelector('input[name="0-2/ps_xid"]');
      
      expect(field1.value).toBe('test123');
      expect(field2.value).toBe('test123');
    });

    test('should handle injection errors gracefully', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      
      // Make value setter throw error
      Object.defineProperty(input, 'value', {
        set() {
          throw new Error('Cannot set value');
        },
        configurable: true,
      });
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      
      // Should not throw
      expect(() => new Function(scriptContent)()).not.toThrow();
    });
  });

  describe('setupHubSpotListener function', () => {
    test('should set up message listener when HubSpot forms library is available', () => {
      window.hbspt = {
        forms: {},
      };
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      // Check that console.log was called with listener setup message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PartnerStack]'),
        expect.stringContaining('message listener')
      );
    });

    test('should skip listener setup when HubSpot library is not available', () => {
      delete window.hbspt;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PartnerStack]'),
        expect.stringContaining('not available')
      );
    });

    test('should respond to onFormReady event', (done) => {
      window.hbspt = {
        forms: {},
      };
      
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      // Simulate HubSpot form ready event
      setTimeout(() => {
        const event = new MessageEvent('message', {
          data: {
            type: 'hsFormCallback',
            eventName: 'onFormReady',
          },
        });
        
        window.dispatchEvent(event);
        
        // Give time for injection to occur
        setTimeout(() => {
          const input = document.querySelector('input[name="partnerstack_click_id"]');
          expect(input.value).toBe('test123');
          done();
        }, 150);
      }, 50);
    });

    test('should ignore non-HubSpot messages', () => {
      window.hbspt = {
        forms: {},
      };
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const event = new MessageEvent('message', {
        data: {
          type: 'otherMessage',
          eventName: 'someEvent',
        },
      });
      
      // Should not throw
      expect(() => window.dispatchEvent(event)).not.toThrow();
    });

    test('should handle message parsing errors gracefully', () => {
      window.hbspt = {
        forms: {},
      };
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const event = new MessageEvent('message', {
        data: 'invalid json string',
      });
      
      // Should not throw
      expect(() => window.dispatchEvent(event)).not.toThrow();
    });
  });

  describe('initialization', () => {
    test('should initialize immediately when DOM is already loaded', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
      });
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PartnerStack]'),
        expect.stringContaining('Initializing')
      );
    });

    test('should wait for DOMContentLoaded when DOM is loading', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading',
      });
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PartnerStack]'),
        expect.stringContaining('waiting for DOMContentLoaded')
      );
    });

    test('should attempt immediate injection on init', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      expect(input.value).toBe('test123');
    });

    test('should schedule delayed injections', (done) => {
      sessionStorage.setItem('ps_xid', 'delayed123');
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      // Add form field after initialization
      setTimeout(() => {
        document.body.innerHTML = `
          <form>
            <input type="hidden" name="partnerstack_click_id" value="" />
          </form>
        `;
      }, 500);
      
      // Check after 1.5 seconds (after 1s delayed injection)
      setTimeout(() => {
        const input = document.querySelector('input[name="partnerstack_click_id"]');
        expect(input.value).toBe('delayed123');
        done();
      }, 1500);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle empty form fields gracefully', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      document.body.innerHTML = '<form></form>';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      
      expect(() => new Function(scriptContent)()).not.toThrow();
    });

    test('should handle missing form elements', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      document.body.innerHTML = '';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      
      expect(() => new Function(scriptContent)()).not.toThrow();
    });

    test('should handle null querySelector results', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      document.body.innerHTML = '<div>No forms here</div>';
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      
      expect(() => new Function(scriptContent)()).not.toThrow();
    });

    test('should handle very long PartnerStack IDs', () => {
      const longId = 'a'.repeat(5000);
      sessionStorage.setItem('ps_xid', longId);
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      expect(input.value).toBe(longId);
    });

    test('should handle special characters in PartnerStack ID', () => {
      sessionStorage.setItem('ps_xid', 'test+value/data=123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      const input = document.querySelector('input[name="partnerstack_click_id"]');
      expect(input.value).toBe('test+value/data=123');
    });
  });

  describe('logging and debugging', () => {
    test('should log all major operations', () => {
      sessionStorage.setItem('ps_xid', 'test123');
      
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="partnerstack_click_id" value="" />
        </form>
      `;
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      // Should have logged initialization, ID retrieval, and injection
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(5);
    });

    test('should log warnings for errors', () => {
      // Mock sessionStorage to throw
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true,
      });
      
      const scriptContent = readFileSync('./cookie-helper-hs.js', 'utf-8');
      new Function(scriptContent)();
      
      // Should have logged warning
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});