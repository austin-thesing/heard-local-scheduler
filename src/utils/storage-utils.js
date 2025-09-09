/**
 * Storage utilities for handling form data persistence across different storage mechanisms
 */

/**
 * Safe localStorage wrapper with error handling
 */
export class SafeStorage {
  /**
   * Get item from localStorage
   * @param {string} key - Storage key
   * @returns {string|null} Stored value or null
   */
  static getLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage access failed:', e);
      return null;
    }
  }

  /**
   * Set item in localStorage
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @returns {boolean} Success status
   */
  static setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('localStorage write failed:', e);
      return false;
    }
  }

  /**
   * Get item from sessionStorage
   * @param {string} key - Storage key
   * @returns {string|null} Stored value or null
   */
  static getSessionStorage(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.error('sessionStorage access failed:', e);
      return null;
    }
  }

  /**
   * Set item in sessionStorage
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @returns {boolean} Success status
   */
  static setSessionStorage(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('sessionStorage write failed:', e);
      return false;
    }
  }

  /**
   * Get cookie value
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null
   */
  static getCookie(name) {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    } catch (e) {
      console.error('Cookie access failed:', e);
      return null;
    }
  }

  /**
   * Set cookie value
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} maxAge - Max age in seconds
   * @returns {boolean} Success status
   */
  static setCookie(name, value, maxAge = 3600) {
    try {
      document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
      return true;
    } catch (e) {
      console.error('Cookie write failed:', e);
      return false;
    }
  }

  /**
   * Remove cookie
   * @param {string} name - Cookie name
   * @returns {boolean} Success status
   */
  static removeCookie(name) {
    try {
      document.cookie = `${name}=; path=/; max-age=0`;
      return true;
    } catch (e) {
      console.error('Cookie removal failed:', e);
      return false;
    }
  }
}

/**
 * Store form data with fallback mechanism
 * @param {Object} data - Data to store
 * @param {Object} logger - Logger instance
 * @returns {boolean} Success status
 */
export function storeFormDataWithFallback(data, logger = console) {
  const routerData = {
    scheduler_type: data.schedulerType,
    formData: data.formData,
    timestamp: Date.now(),
    source: 'hubspot_form',
  };

  // Try sessionStorage first
  if (
    SafeStorage.setSessionStorage(
      'scheduler_router_data',
      JSON.stringify(routerData)
    )
  ) {
    logger.log('Stored router data in sessionStorage');
    return true;
  }

  // Fallback to cookies
  logger.log('Failed to store in sessionStorage, falling back to cookies');
  const success1 = SafeStorage.setCookie('scheduler_type', data.schedulerType);
  const success2 = SafeStorage.setCookie(
    'form_data',
    btoa(JSON.stringify(data.formData))
  );

  return success1 && success2;
}

/**
 * Retrieve form data from all storage sources
 * @param {Object} logger - Logger instance
 * @returns {Object|null} Retrieved data or null
 */
export function getStoredFormData(logger = console) {
  // Try localStorage first (for form data prefill)
  const localStorageData = SafeStorage.getLocalStorage('hubspot_form_data');
  if (localStorageData) {
    try {
      const formData = JSON.parse(localStorageData);
      logger.log('Found form data in localStorage:', formData);
      return { formData, source: 'localStorage' };
    } catch (e) {
      logger.error('localStorage JSON parse error:', e);
    }
  }

  // Try sessionStorage
  const sessionStorageData = SafeStorage.getSessionStorage(
    'scheduler_router_data'
  );
  if (sessionStorageData) {
    try {
      const data = JSON.parse(sessionStorageData);
      logger.log('Found router data in sessionStorage:', data);
      SafeStorage.setSessionStorage('scheduler_router_data', ''); // Clear after reading
      return {
        formData: data.formData,
        schedulerType: data.scheduler_type,
        source: 'sessionStorage',
      };
    } catch (e) {
      logger.error('sessionStorage JSON parse error:', e);
    }
  }

  // Try cookies as fallback
  const schedulerType = SafeStorage.getCookie('scheduler_type');
  const formDataCookie = SafeStorage.getCookie('form_data');

  if (schedulerType || formDataCookie) {
    try {
      const formData = formDataCookie ? JSON.parse(atob(formDataCookie)) : {};

      // Clear cookies
      SafeStorage.removeCookie('scheduler_type');
      SafeStorage.removeCookie('form_data');

      logger.log('Found data in cookies:', { schedulerType, formData });
      return { formData, schedulerType, source: 'cookies' };
    } catch (e) {
      logger.error('Cookie JSON parse error:', e);
    }
  }

  return null;
}
