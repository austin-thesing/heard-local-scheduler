import { test, expect } from 'bun:test';
import {
  SafeStorage,
  storeFormDataWithFallback,
  getStoredFormData,
} from '../src/utils/storage-utils.js';

// Mock localStorage and sessionStorage
const mockLocalStorage = {};
const mockSessionStorage = {};

global.localStorage = {
  getItem: (key) => mockLocalStorage[key] || null,
  setItem: (key, value) => {
    mockLocalStorage[key] = String(value);
    return true;
  },
  removeItem: (key) => {
    delete mockLocalStorage[key];
  },
};

global.sessionStorage = {
  getItem: (key) => mockSessionStorage[key] || null,
  setItem: (key, value) => {
    mockSessionStorage[key] = String(value);
    return true;
  },
  removeItem: (key) => {
    delete mockSessionStorage[key];
  },
};

global.document = {
  cookie: '',
};

test('SafeStorage getLocalStorage returns stored value', () => {
  mockLocalStorage.testKey = 'testValue';

  const result = SafeStorage.getLocalStorage('testKey');

  expect(result).toBe('testValue');
});

test('SafeStorage getLocalStorage returns null for missing key', () => {
  delete mockLocalStorage.missingKey;

  const result = SafeStorage.getLocalStorage('missingKey');

  expect(result).toBeNull();
});

test('SafeStorage setLocalStorage returns true on success', () => {
  const result = SafeStorage.setLocalStorage('newKey', 'newValue');

  expect(result).toBe(true);
  expect(mockLocalStorage.newKey).toBe('newValue');
});

test('SafeStorage handles localStorage errors gracefully', () => {
  const originalGetItem = global.localStorage.getItem;
  global.localStorage.getItem = () => {
    throw new Error('localStorage error');
  };

  const result = SafeStorage.getLocalStorage('testKey');

  expect(result).toBeNull();

  // Restore original
  global.localStorage.getItem = originalGetItem;
});

test('SafeStorage getSessionStorage works correctly', () => {
  mockSessionStorage.sessionKey = 'sessionValue';

  const result = SafeStorage.getSessionStorage('sessionKey');

  expect(result).toBe('sessionValue');
});

test('SafeStorage setSessionStorage works correctly', () => {
  const result = SafeStorage.setSessionStorage(
    'newSessionKey',
    'newSessionValue'
  );

  expect(result).toBe(true);
  expect(mockSessionStorage.newSessionKey).toBe('newSessionValue');
});

test('SafeStorage getCookie returns cookie value', () => {
  global.document.cookie = 'testCookie=cookieValue; otherCookie=otherValue';

  const result = SafeStorage.getCookie('testCookie');

  expect(result).toBe('cookieValue');
});

test('SafeStorage getCookie returns null for missing cookie', () => {
  global.document.cookie = 'testCookie=cookieValue';

  const result = SafeStorage.getCookie('missingCookie');

  expect(result).toBeNull();
});

test('SafeStorage setCookie sets cookie correctly', () => {
  const result = SafeStorage.setCookie('newCookie', 'newCookieValue');

  expect(result).toBe(true);
  expect(global.document.cookie).toContain('newCookie=newCookieValue');
});

test('storeFormDataWithFallback uses sessionStorage first', () => {
  const data = {
    schedulerType: 'sole_prop',
    formData: { email: 'test@example.com' },
  };

  const result = storeFormDataWithFallback(data, console);

  expect(result).toBe(true);
  expect(mockSessionStorage.scheduler_router_data).toBeTruthy();
});

test('storeFormDataWithFallback falls back to cookies', () => {
  // Make sessionStorage fail
  const originalSetItem = global.sessionStorage.setItem;
  global.sessionStorage.setItem = () => {
    throw new Error('sessionStorage error');
  };

  const data = {
    schedulerType: 'sole_prop',
    formData: { email: 'test@example.com' },
  };

  const result = storeFormDataWithFallback(data, console);

  expect(result).toBe(true);
  expect(global.document.cookie).toContain('scheduler_type=sole_prop');

  // Restore original
  global.sessionStorage.setItem = originalSetItem;
});

test('getStoredFormData retrieves from localStorage', () => {
  mockLocalStorage.hubspot_form_data = JSON.stringify({
    email: 'test@example.com',
  });

  const result = getStoredFormData(console);

  expect(result).toEqual({
    formData: { email: 'test@example.com' },
    source: 'localStorage',
  });
});

test('getStoredFormData retrieves from sessionStorage', () => {
  delete mockLocalStorage.hubspot_form_data;
  mockSessionStorage.scheduler_router_data = JSON.stringify({
    scheduler_type: 's_corp',
    formData: { email: 'test@example.com' },
  });

  const result = getStoredFormData(console);

  expect(result).toEqual({
    formData: { email: 'test@example.com' },
    schedulerType: 's_corp',
    source: 'sessionStorage',
  });
});

test('getStoredFormData retrieves from cookies', () => {
  delete mockLocalStorage.hubspot_form_data;
  delete mockSessionStorage.scheduler_router_data;
  global.document.cookie =
    'scheduler_type=sole_prop; form_data=eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ==';

  const result = getStoredFormData(console);

  expect(result).toEqual({
    formData: { email: 'test@example.com' },
    schedulerType: 'sole_prop',
    source: 'cookies',
  });
});

test('getStoredFormData returns null when no data found', () => {
  delete mockLocalStorage.hubspot_form_data;
  delete mockSessionStorage.scheduler_router_data;
  global.document.cookie = '';

  const result = getStoredFormData(console);

  expect(result).toBeNull();
});

// Cleanup after tests
test.afterEach(() => {
  // Clear all storage
  Object.keys(mockLocalStorage).forEach((key) => {
    delete mockLocalStorage[key];
  });
  Object.keys(mockSessionStorage).forEach((key) => {
    delete mockSessionStorage[key];
  });
  global.document.cookie = '';
});
