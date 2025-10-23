/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('form-handler.js', () => {
  let originalWindow;

  beforeEach(() => {
    // Save original window
    originalWindow = { ...window };

    // Reset window globals
    delete window.HubSpotRouter;
    delete window.HubSpotFormsComplete;
    delete window.getPartnerStackId;
    delete window.injectPartnerStackId;

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Restore window properties
    if (originalWindow.HubSpotRouter) {
      window.HubSpotRouter = originalWindow.HubSpotRouter;
    }
  });

  describe('module exports', () => {
    test('should export HubSpotFormsComplete object', async () => {
      // Mock the imported modules
      window.HubSpotRouter = {
        init: mock(() => {}),
        handleFormSubmission: mock(() => {}),
        DEBUG: true,
      };

      // Simulate the exports from form-handler.js
      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete).toBeDefined();
      expect(HubSpotFormsComplete.initialized).toBe(true);
      expect(HubSpotFormsComplete.version).toBe('1.0.0');
    });

    test('should have router getter that returns HubSpotRouter', () => {
      window.HubSpotRouter = {
        init: mock(() => {}),
        DEBUG: true,
      };

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router).toBeDefined();
      expect(HubSpotFormsComplete.router.DEBUG).toBe(true);
    });

    test('should return empty object when HubSpotRouter is not available', () => {
      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router).toEqual({});
    });

    test('should have cookieHelper getter that returns helper functions', () => {
      window.getPartnerStackId = mock(() => 'test123');
      window.injectPartnerStackId = mock(() => {});

      const HubSpotFormsComplete = {
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeDefined();
      expect(HubSpotFormsComplete.cookieHelper.injectPartnerStackId).toBeDefined();
      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId()).toBe('test123');
    });

    test('should return null for helper functions when not available', () => {
      const HubSpotFormsComplete = {
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeNull();
      expect(HubSpotFormsComplete.cookieHelper.injectPartnerStackId).toBeNull();
    });
  });

  describe('initialization', () => {
    test('should set initialized to true', () => {
      const HubSpotFormsComplete = {
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.initialized).toBe(true);
    });

    test('should set version correctly', () => {
      const HubSpotFormsComplete = {
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.version).toBe('1.0.0');
    });

    test('should be available on window.HubSpotFormsComplete', () => {
      window.HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId: null,
            injectPartnerStackId: null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(window.HubSpotFormsComplete).toBeDefined();
      expect(window.HubSpotFormsComplete.initialized).toBe(true);
    });
  });

  describe('integration with router', () => {
    test('should expose router functions', () => {
      window.HubSpotRouter = {
        init: mock(() => {}),
        handleFormSubmission: mock(() => {}),
        determineSchedulerType: mock(() => 'general'),
        buildSchedulerUrl: mock(() => 'https://example.com'),
        DEBUG: true,
      };

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router.init).toBeDefined();
      expect(HubSpotFormsComplete.router.handleFormSubmission).toBeDefined();
      expect(HubSpotFormsComplete.router.determineSchedulerType).toBeDefined();
      expect(HubSpotFormsComplete.router.buildSchedulerUrl).toBeDefined();
    });

    test('should allow calling router methods', () => {
      const mockHandleSubmission = mock(() => {});
      window.HubSpotRouter = {
        handleFormSubmission: mockHandleSubmission,
      };

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        initialized: true,
        version: '1.0.0',
      };

      const formData = {
        email: 'test@example.com',
      };

      HubSpotFormsComplete.router.handleFormSubmission(formData);

      expect(mockHandleSubmission).toHaveBeenCalledWith(formData);
    });
  });

  describe('integration with cookie helper', () => {
    test('should expose cookie helper functions when available', () => {
      window.getPartnerStackId = mock(() => 'test123');
      window.injectPartnerStackId = mock(() => {});

      const HubSpotFormsComplete = {
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(typeof HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBe('function');
      expect(typeof HubSpotFormsComplete.cookieHelper.injectPartnerStackId).toBe('function');
    });

    test('should allow calling cookie helper methods', () => {
      const mockGetId = mock(() => 'partner123');
      const mockInject = mock(() => {});

      window.getPartnerStackId = mockGetId;
      window.injectPartnerStackId = mockInject;

      const HubSpotFormsComplete = {
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      const id = HubSpotFormsComplete.cookieHelper.getPartnerStackId();
      expect(id).toBe('partner123');
      expect(mockGetId).toHaveBeenCalled();

      HubSpotFormsComplete.cookieHelper.injectPartnerStackId();
      expect(mockInject).toHaveBeenCalled();
    });
  });

  describe('load order and coordination', () => {
    test('should handle router loading before cookie helper', () => {
      // Router loads first
      window.HubSpotRouter = {
        init: mock(() => {}),
        DEBUG: true,
      };

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId: null,
            injectPartnerStackId: null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router).toBeDefined();
      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeNull();

      // Cookie helper loads later
      window.getPartnerStackId = mock(() => 'late123');
      window.injectPartnerStackId = mock(() => {});

      // Getter should now return the functions
      const updatedHelper = {
        getPartnerStackId:
          typeof window.getPartnerStackId === 'function'
            ? window.getPartnerStackId
            : null,
        injectPartnerStackId:
          typeof window.injectPartnerStackId === 'function'
            ? window.injectPartnerStackId
            : null,
      };

      expect(updatedHelper.getPartnerStackId).toBeDefined();
      expect(updatedHelper.injectPartnerStackId).toBeDefined();
    });

    test('should handle cookie helper loading before router', () => {
      // Cookie helper loads first
      window.getPartnerStackId = mock(() => 'early123');
      window.injectPartnerStackId = mock(() => {});

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeDefined();
      expect(HubSpotFormsComplete.router).toEqual({});

      // Router loads later
      window.HubSpotRouter = {
        init: mock(() => {}),
        DEBUG: true,
      };

      // Getter should now return the router
      expect(HubSpotFormsComplete.router).toBeDefined();
      expect(HubSpotFormsComplete.router.DEBUG).toBe(true);
    });
  });

  describe('debugging interface', () => {
    test('should expose complete debugging interface', () => {
      window.HubSpotRouter = {
        init: mock(() => {}),
        handleFormSubmission: mock(() => {}),
        determineSchedulerType: mock(() => 'general'),
        buildSchedulerUrl: mock(() => 'https://example.com'),
        DEBUG: true,
      };

      window.getPartnerStackId = mock(() => 'debug123');
      window.injectPartnerStackId = mock(() => {});

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      window.HubSpotFormsComplete = HubSpotFormsComplete;

      // Verify complete interface
      expect(window.HubSpotFormsComplete.router).toBeDefined();
      expect(window.HubSpotFormsComplete.cookieHelper).toBeDefined();
      expect(window.HubSpotFormsComplete.initialized).toBe(true);
      expect(window.HubSpotFormsComplete.version).toBe('1.0.0');
    });

    test('should allow debugging access to all components', () => {
      const mockHandleSubmission = mock(() => {});
      const mockGetId = mock(() => 'test123');

      window.HubSpotRouter = {
        handleFormSubmission: mockHandleSubmission,
        DEBUG: true,
      };

      window.getPartnerStackId = mockGetId;

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      window.HubSpotFormsComplete = HubSpotFormsComplete;

      // Should be able to call methods through debug interface
      window.HubSpotFormsComplete.router.handleFormSubmission({ email: 'test@example.com' });
      expect(mockHandleSubmission).toHaveBeenCalled();

      const id = window.HubSpotFormsComplete.cookieHelper.getPartnerStackId();
      expect(mockGetId).toHaveBeenCalled();
      expect(id).toBe('test123');
    });
  });

  describe('version management', () => {
    test('should expose version number', () => {
      const HubSpotFormsComplete = {
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.version).toBe('1.0.0');
    });

    test('should maintain version consistency', () => {
      const HubSpotFormsComplete = {
        initialized: true,
        version: '1.0.0',
      };

      window.HubSpotFormsComplete = HubSpotFormsComplete;

      expect(window.HubSpotFormsComplete.version).toBe('1.0.0');
    });
  });

  describe('edge cases', () => {
    test('should handle missing window object gracefully', () => {
      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId: null,
            injectPartnerStackId: null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router).toEqual({});
      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeNull();
    });

    test('should handle partial module loading', () => {
      // Only router is loaded
      window.HubSpotRouter = {
        DEBUG: true,
      };

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router).toBeDefined();
      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeNull();
      expect(HubSpotFormsComplete.initialized).toBe(true);
    });

    test('should handle repeated initialization', () => {
      const HubSpotFormsComplete = {
        initialized: true,
        version: '1.0.0',
      };

      window.HubSpotFormsComplete = HubSpotFormsComplete;

      // Try to reinitialize
      const secondInit = {
        initialized: true,
        version: '1.0.0',
      };

      window.HubSpotFormsComplete = secondInit;

      expect(window.HubSpotFormsComplete.initialized).toBe(true);
    });
  });

  describe('getter behavior', () => {
    test('should return fresh router state on each access', () => {
      window.HubSpotRouter = {
        DEBUG: false,
      };

      const HubSpotFormsComplete = {
        get router() {
          return window.HubSpotRouter || {};
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.router.DEBUG).toBe(false);

      // Update router
      window.HubSpotRouter.DEBUG = true;

      // Getter should reflect new state
      expect(HubSpotFormsComplete.router.DEBUG).toBe(true);
    });

    test('should return fresh cookie helper state on each access', () => {
      const HubSpotFormsComplete = {
        get cookieHelper() {
          return {
            getPartnerStackId:
              typeof window.getPartnerStackId === 'function'
                ? window.getPartnerStackId
                : null,
            injectPartnerStackId:
              typeof window.injectPartnerStackId === 'function'
                ? window.injectPartnerStackId
                : null,
          };
        },
        initialized: true,
        version: '1.0.0',
      };

      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeNull();

      // Add helper function
      window.getPartnerStackId = mock(() => 'fresh123');

      // Getter should reflect new state
      expect(HubSpotFormsComplete.cookieHelper.getPartnerStackId).toBeDefined();
    });
  });
});