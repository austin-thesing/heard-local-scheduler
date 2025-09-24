import { test, expect, afterEach } from 'bun:test';
import {
  initPartnerStackCapture,
  getPartnerStackAttribution,
  clearPartnerStackAttribution,
} from '../src/utils/partnerstack-utils.js';

// Simple storage mocks
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

// Minimal window/location mock
global.window = {
  location: {
    search: '',
    hostname: 'www.joinheard.com',
  },
};

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? m[1] : '';
}

test('captures ps_xid and ps_partner_key from URL and persists', () => {
  // Prepare URL
  window.location.search = '?ps_xid=abc123-XYZ&ps_partner_key=base64_key-._+=';

  initPartnerStackCapture({ cookieDomain: '.joinheard.com' });

  const { ps_xid, ps_partner_key } = getPartnerStackAttribution();
  expect(ps_xid).toBe('abc123-XYZ');
  expect(ps_partner_key).toBe('base64_key-._+=');

  // Present in cookie
  expect(getCookie('ps_xid')).toBe('abc123-XYZ');
  expect(getCookie('ps_partner_key')).toBe('base64_key-._+=');
});

test('refreshes cookies from storage when URL lacks params', () => {
  // Clear then seed local storage
  document.cookie = '';
  mockLocalStorage.ps_xid = 'persistedX';
  mockLocalStorage.ps_partner_key = 'persistedPK';

  window.location.search = '';
  initPartnerStackCapture({ cookieDomain: '.joinheard.com' });

  expect(getCookie('ps_xid')).toBe('persistedX');
  expect(getCookie('ps_partner_key')).toBe('persistedPK');
});

test('clearPartnerStackAttribution removes stored values', () => {
  document.cookie = 'ps_xid=toClear; ps_partner_key=toClear2';
  mockLocalStorage.ps_xid = 'toClear';
  mockLocalStorage.ps_partner_key = 'toClear2';
  mockSessionStorage.ps_xid = 'toClear';
  mockSessionStorage.ps_partner_key = 'toClear2';

  clearPartnerStackAttribution({ cookieDomain: '.joinheard.com' });

  const { ps_xid, ps_partner_key } = getPartnerStackAttribution();
  expect(ps_xid).toBe('');
  expect(ps_partner_key).toBe('');
});

afterEach(() => {
  // Reset mocks
  for (const k of Object.keys(mockLocalStorage)) delete mockLocalStorage[k];
  for (const k of Object.keys(mockSessionStorage)) delete mockSessionStorage[k];
  document.cookie = '';
  window.location.search = '';
});
