/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { readFileSync } from 'fs';

describe('hubspot-form-router.js - PartnerStack Integration', () => {
  let originalConsole;
  let consoleLogSpy;
  let originalLocation;

  beforeEach(() => {
    // Reset DOM and storage
    document.body.innerHTML = '';
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    localStorage.clear();
    sessionStorage.clear();

    // Mock console
    originalConsole = { ...console };
    consoleLogSpy = mock(() => {});
    console.log = consoleLogSpy;

    // Mock location for debug mode
    originalLocation = window.location;
    delete window.location;
    window.location = {
      hostname: 'localhost',
      search: '?debug=true',
      href: '',
      replace: mock(() => {}),
    };

    // Reset router state
    delete window.HubSpotRouter;
    delete window._capturedFormData;
  });

  afterEach(() => {
    console.log = originalConsole.log;
    window.location = originalLocation;
  });

  describe('getPartnerstackClickId function', () => {
    test('should retrieve PartnerStack ID from ps_xid cookie', () => {
      document.cookie = 'ps_xid=cookie123; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      // Trigger form submission to test PartnerStack ID retrieval
      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      // Check that sessionStorage was updated with PartnerStack ID
      expect(sessionStorage.getItem('ps_xid')).toBe('cookie123');
    });

    test('should retrieve PartnerStack ID from psx_id cookie', () => {
      document.cookie = 'psx_id=cookie456; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(sessionStorage.getItem('ps_xid')).toBe('cookie456');
    });

    test('should prioritize sessionStorage over cookies', () => {
      sessionStorage.setItem('ps_xid', 'session123');
      document.cookie = 'ps_xid=cookie456; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      // Should use sessionStorage value
      expect(sessionStorage.getItem('ps_xid')).toBe('session123');
    });

    test('should prioritize localStorage over cookies', () => {
      localStorage.setItem('ps_xid', 'local789');
      document.cookie = 'ps_xid=cookie456; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      // Should use localStorage value
      expect(sessionStorage.getItem('ps_xid')).toBe('local789');
    });

    test('should check window.partnerstack global', () => {
      window.partnerstack = {
        ps_xid: 'global123',
      };

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(sessionStorage.getItem('ps_xid')).toBe('global123');

      delete window.partnerstack;
    });

    test('should check window.ps_xid global', () => {
      window.ps_xid = 'window123';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(sessionStorage.getItem('ps_xid')).toBe('window123');

      delete window.ps_xid;
    });

    test('should return null when no PartnerStack ID is available', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      // No PartnerStack ID should be stored
      expect(sessionStorage.getItem('ps_xid')).toBeNull();
    });

    test('should filter out undefined and null values', () => {
      localStorage.setItem('ps_xid', 'undefined');
      sessionStorage.setItem('psx_id', 'null');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      // Should not use 'undefined' or 'null' strings
      const storedValue = sessionStorage.getItem('ps_xid');
      expect(storedValue).not.toBe('undefined');
      expect(storedValue).not.toBe('null');
    });

    test('should handle storage access errors gracefully', () => {
      // Mock localStorage to throw
      const originalLocalStorage = localStorage;
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true,
      });

      document.cookie = 'ps_xid=cookie123; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');

      expect(() => new Function(scriptContent)()).not.toThrow();

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      });
    });
  });

  describe('PartnerStack ID injection into form submission', () => {
    test('should inject PartnerStack ID into partnerstack_click_id field', () => {
      sessionStorage.setItem('ps_xid', 'test123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData.partnerstack_click_id).toBe('test123');
    });

    test('should inject PartnerStack ID into all prefixed variations', () => {
      sessionStorage.setItem('ps_xid', 'test456');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData['partnerstack_click_id']).toBe('test456');
      expect(formData['0-1/partnerstack_click_id']).toBe('test456');
      expect(formData['0-2/partnerstack_click_id']).toBe('test456');
      expect(formData['0-3/partnerstack_click_id']).toBe('test456');
    });

    test('should persist PartnerStack ID to sessionStorage', () => {
      document.cookie = 'ps_xid=persist123; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(sessionStorage.getItem('ps_xid')).toBe('persist123');
    });

    test('should persist PartnerStack ID to localStorage', () => {
      document.cookie = 'ps_xid=persist456; path=/';

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(localStorage.getItem('ps_xid')).toBe('persist456');
    });

    test('should handle persistence errors gracefully', () => {
      sessionStorage.setItem('ps_xid', 'test123');

      // Mock sessionStorage.setItem to throw
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = mock(() => {
        throw new Error('Storage full');
      });

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      // Should not throw
      expect(() => window.HubSpotRouter.handleFormSubmission(formData)).not.toThrow();

      sessionStorage.setItem = originalSetItem;
    });

    test('should not inject if no PartnerStack ID is available', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData.partnerstack_click_id).toBeUndefined();
    });
  });

  describe('determineSchedulerType with PartnerStack', () => {
    test('should route to scheduler when multi-practice is yes', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
        partnerstack_click_id: 'partner123',
      };

      const schedulerType = window.HubSpotRouter.determineSchedulerType(formData);
      expect(schedulerType).toBe('general');
    });

    test('should route to success page when multi-practice is no', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'no',
        partnerstack_click_id: 'partner123',
      };

      const schedulerType = window.HubSpotRouter.determineSchedulerType(formData);
      expect(schedulerType).toBe('success');
    });

    test('should include PartnerStack ID in form data during routing', () => {
      sessionStorage.setItem('ps_xid', 'routing123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData.partnerstack_click_id).toBe('routing123');
    });
  });

  describe('normalizeResponse function', () => {
    test('should normalize various yes responses', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'YES',
      })).toBe('general');

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'Yes',
      })).toBe('general');

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'true',
      })).toBe('general');

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'multiple owners',
      })).toBe('general');
    });

    test('should normalize various no responses', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'NO',
      })).toBe('success');

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'No',
      })).toBe('success');

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: 'false',
      })).toBe('success');
    });

    test('should handle null and undefined values', () => {
      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: null,
      })).toBe('success');

      expect(window.HubSpotRouter.determineSchedulerType({
        does_your_practice_have_multiple_owners: undefined,
      })).toBe('success');
    });
  });

  describe('postMessage handling with PartnerStack', () => {
    test('should handle hsFormCallback with PartnerStack ID', () => {
      sessionStorage.setItem('ps_xid', 'postmsg123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      window._capturedFormData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      const messageEvent = new MessageEvent('message', {
        origin: 'https://forms.hubspot.com',
        data: {
          type: 'hsFormCallback',
          eventName: 'onFormSubmitted',
          data: {
            formGuid: 'test-guid-123',
            portalId: '12345',
          },
        },
      });

      window.dispatchEvent(messageEvent);

      // Check that formData includes PartnerStack ID
      expect(window._capturedFormData.partnerstack_click_id).toBeDefined();
    });

    test('should merge captured form data with submission data', () => {
      sessionStorage.setItem('ps_xid', 'merge123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      window._capturedFormData = {
        email: 'captured@example.com',
      };

      const messageEvent = new MessageEvent('message', {
        origin: 'https://forms.hubspot.com',
        data: {
          type: 'hsFormCallback',
          eventName: 'onFormSubmitted',
          data: {
            fields: [
              { name: 'does_your_practice_have_multiple_owners', value: 'yes' },
            ],
          },
        },
      });

      window.dispatchEvent(messageEvent);

      // Captured data should be merged
      expect(window._capturedFormData.email).toBe('captured@example.com');
    });

    test('should handle developer embed submissions with PartnerStack', () => {
      sessionStorage.setItem('ps_xid', 'embed123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      window._capturedFormData = {
        email: 'embed@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      const messageEvent = new MessageEvent('message', {
        origin: 'https://forms.hubspot.com',
        data: {
          formGuid: 'embed-guid',
          portalId: '67890',
          accepted: true,
        },
      });

      window.dispatchEvent(messageEvent);

      // Should have stored data with PartnerStack ID
      const storedData = JSON.parse(localStorage.getItem('hubspot_form_data') || '{}');
      expect(storedData.partnerstack_click_id).toBeDefined();
    });
  });

  describe('logging and debugging', () => {
    test('should log PartnerStack ID candidates in debug mode', () => {
      sessionStorage.setItem('ps_xid', 'debug123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      // Should have logged candidates
      const logCalls = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const hasPartnerstackLog = logCalls.some((log) =>
        log.includes('PartnerStack ID')
      );
      expect(hasPartnerstackLog).toBe(true);
    });

    test('should log injection success', () => {
      sessionStorage.setItem('ps_xid', 'inject123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      const logCalls = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const hasInjectionLog = logCalls.some((log) =>
        log.includes('Injected PartnerStack ID')
      );
      expect(hasInjectionLog).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle empty formData object', () => {
      sessionStorage.setItem('ps_xid', 'empty123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      expect(() =>
        window.HubSpotRouter.handleFormSubmission({})
      ).not.toThrow();
    });

    test('should handle very long PartnerStack IDs', () => {
      const longId = 'a'.repeat(10000);
      sessionStorage.setItem('ps_xid', longId);

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData.partnerstack_click_id).toBe(longId);
    });

    test('should handle special characters in PartnerStack ID', () => {
      sessionStorage.setItem('ps_xid', 'test+value/123=abc');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData.partnerstack_click_id).toBe('test+value/123=abc');
    });

    test('should only route once per page load', () => {
      sessionStorage.setItem('ps_xid', 'once123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      // First submission
      window.HubSpotRouter.handleFormSubmission(formData);

      // Try second submission
      const secondFormData = {
        email: 'test2@example.com',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(secondFormData);

      // Should have logged "already performed"
      const logCalls = consoleLogSpy.mock.calls.map((call) => call.join(' '));
      const hasSkipLog = logCalls.some((log) =>
        log.includes('already performed')
      );
      expect(hasSkipLog).toBe(true);
    });
  });

  describe('integration with existing routing logic', () => {
    test('should preserve existing form data when injecting PartnerStack ID', () => {
      sessionStorage.setItem('ps_xid', 'preserve123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        company: 'Test Corp',
        does_your_practice_have_multiple_owners: 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData.email).toBe('test@example.com');
      expect(formData.firstname).toBe('John');
      expect(formData.lastname).toBe('Doe');
      expect(formData.company).toBe('Test Corp');
      expect(formData.partnerstack_click_id).toBe('preserve123');
    });

    test('should work with prefixed field names', () => {
      sessionStorage.setItem('ps_xid', 'prefixed123');

      const scriptContent = readFileSync('./hubspot-form-router.js', 'utf-8');
      new Function(scriptContent)();

      const formData = {
        '0-1/email': 'test@example.com',
        '0-1/does_your_practice_have_multiple_owners': 'yes',
      };

      window.HubSpotRouter.handleFormSubmission(formData);

      expect(formData['0-1/partnerstack_click_id']).toBe('prefixed123');
    });
  });
});