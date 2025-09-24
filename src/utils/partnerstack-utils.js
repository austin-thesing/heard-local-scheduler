/**
 * PartnerStack S2S helper - capture and persist ps_xid / ps_partner_key site-wide
 * - Captures from URL params on any page
 * - Persists redundantly: cookie (cross-subdomain), localStorage, sessionStorage
 * - Exposes getters for downstream usage
 */

import { SafeStorage } from './storage-utils.js';

const KEY_PS_XID = 'ps_xid';
const KEY_PS_PARTNER_KEY = 'ps_partner_key';

/**
 * Very conservative token sanitizer. PartnerStack ids are opaque; allow safe chars only
 * @param {string|null|undefined} value
 * @returns {string}
 */
function sanitizeToken(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  // Allow alphanumerics and common base64/url-safe chars: - _ . + / =
  const safe = trimmed.match(/[A-Za-z0-9._\-+/=]/g);
  return safe ? safe.join('') : '';
}

/**
 * Build cookie string with attributes
 * @param {string} name
 * @param {string} value
 * @param {{maxAgeSeconds?: number, domain?: string, sameSite?: 'Lax'|'Strict'|'None', secure?: boolean, path?: string}} opts
 * @returns {string}
 */
function buildCookieString(name, value, opts = {}) {
  const parts = [`${name}=${value}`];
  parts.push(`path=${opts.path || '/'}`);
  if (opts.maxAgeSeconds && Number.isFinite(opts.maxAgeSeconds)) {
    parts.push(`max-age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  }
  if (opts.domain) {
    parts.push(`Domain=${opts.domain}`);
  }
  if (opts.sameSite) {
    parts.push(`SameSite=${opts.sameSite}`);
  } else {
    parts.push('SameSite=Lax');
  }
  if (opts.secure !== false) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Persist a key/value redundantly across storages
 * @param {string} key
 * @param {string} value
 * @param {{ cookieDomain?: string, maxAgeDays?: number, logger?: Console }} options
 */
function persistEverywhere(key, value, options = {}) {
  const logger = options.logger || console;

  // Local + Session storage
  SafeStorage.setLocalStorage(key, value);
  SafeStorage.setSessionStorage(key, value);

  try {
    const maxAgeSeconds = Math.floor((options.maxAgeDays || 90) * 24 * 60 * 60);
    const domain =
      options.cookieDomain && typeof options.cookieDomain === 'string'
        ? options.cookieDomain
        : undefined;
    const cookie = buildCookieString(key, value, {
      maxAgeSeconds,
      domain,
      sameSite: 'Lax',
      secure: true,
      path: '/',
    });
    document.cookie = cookie;
  } catch (e) {
    logger.error('[PartnerStack] Cookie write failed:', e);
  }
}

/**
 * Attempt to read a key from cookie, then local, then session
 * @param {string} key
 * @returns {string}
 */
function readEverywhere(key) {
  const cookieVal = SafeStorage.getCookie(key);
  if (cookieVal) return cookieVal;
  const localVal = SafeStorage.getLocalStorage(key);
  if (localVal) return localVal;
  const sessionVal = SafeStorage.getSessionStorage(key);
  return sessionVal || '';
}

/**
 * Infer default cookie domain. Prefer provided option; else use .joinheard.com when applicable.
 * @param {string|undefined} preferred
 * @returns {string|undefined}
 */
function inferCookieDomain(preferred) {
  if (preferred) return preferred;
  try {
    const host = window.location.hostname || '';
    if (host.endsWith('joinheard.com')) return '.joinheard.com';
  } catch {}
  return undefined;
}

/**
 * Initialize PartnerStack capture on any page
 * @param {{ cookieDomain?: string, maxAgeDays?: number, logger?: Console, debug?: boolean }} options
 */
export function initPartnerStackCapture(options = {}) {
  const logger = options.logger || console;
  const debug = options.debug || window.location.search.includes('debug=true');

  const cookieDomain = inferCookieDomain(options.cookieDomain);
  const maxAgeDays = options.maxAgeDays || 90;

  try {
    const params = new URLSearchParams(window.location.search || '');
    const rawXid = params.get(KEY_PS_XID);
    const rawPartnerKey = params.get(KEY_PS_PARTNER_KEY);

    const ps_xid = sanitizeToken(rawXid);
    const ps_partner_key = sanitizeToken(rawPartnerKey);

    if (ps_xid) {
      persistEverywhere(KEY_PS_XID, ps_xid, {
        cookieDomain,
        maxAgeDays,
        logger,
      });
      if (debug) logger.log('[PartnerStack] Captured ps_xid from URL');
    }
    if (ps_partner_key) {
      persistEverywhere(KEY_PS_PARTNER_KEY, ps_partner_key, {
        cookieDomain,
        maxAgeDays,
        logger,
      });
      if (debug) logger.log('[PartnerStack] Captured ps_partner_key from URL');
    }

    // If nothing new in URL, ensure cookie is refreshed from existing storage (extend expiry)
    if (!ps_xid) {
      const existingXid = readEverywhere(KEY_PS_XID);
      if (existingXid)
        persistEverywhere(KEY_PS_XID, existingXid, {
          cookieDomain,
          maxAgeDays,
          logger,
        });
    }
    if (!ps_partner_key) {
      const existingPk = readEverywhere(KEY_PS_PARTNER_KEY);
      if (existingPk)
        persistEverywhere(KEY_PS_PARTNER_KEY, existingPk, {
          cookieDomain,
          maxAgeDays,
          logger,
        });
    }

    // Expose minimal global for debugging/consumers
    window.PartnerStackAttribution = {
      get: () => getPartnerStackAttribution(),
      clear: () => clearPartnerStackAttribution({ cookieDomain }),
    };
  } catch (e) {
    logger.error('[PartnerStack] Initialization error:', e);
  }
}

/**
 * Get current PartnerStack attribution values
 * @returns {{ ps_xid: string, ps_partner_key: string }}
 */
export function getPartnerStackAttribution() {
  return {
    ps_xid: readEverywhere(KEY_PS_XID),
    ps_partner_key: readEverywhere(KEY_PS_PARTNER_KEY),
  };
}

/**
 * Clear stored attribution (for debugging)
 * @param {{ cookieDomain?: string }} options
 */
export function clearPartnerStackAttribution(options = {}) {
  const cookieDomain = inferCookieDomain(options.cookieDomain);
  try {
    // Clear storage
    SafeStorage.setLocalStorage(KEY_PS_XID, '');
    SafeStorage.setLocalStorage(KEY_PS_PARTNER_KEY, '');
    SafeStorage.setSessionStorage(KEY_PS_XID, '');
    SafeStorage.setSessionStorage(KEY_PS_PARTNER_KEY, '');

    // Expire cookies
    const expired = buildCookieString(KEY_PS_XID, '', {
      maxAgeSeconds: 0,
      domain: cookieDomain,
      sameSite: 'Lax',
      secure: true,
      path: '/',
    });
    document.cookie = expired;
    const expired2 = buildCookieString(KEY_PS_PARTNER_KEY, '', {
      maxAgeSeconds: 0,
      domain: cookieDomain,
      sameSite: 'Lax',
      secure: true,
      path: '/',
    });
    document.cookie = expired2;
  } catch (e) {
    console.error('[PartnerStack] Clear error:', e);
  }
}
