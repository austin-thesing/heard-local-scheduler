/**
 * HubSpot Form Router - Refactored Version
 * Listens for HubSpot form submissions and routes users to appropriate schedulers
 * Based on form responses, particularly "Does your practice have multiple owners?"
 */

(function () {
  'use strict';

  // Import modules (in a real ES6 module environment, these would be actual imports)
  // For browser compatibility, we'll use a simple module loader pattern
  const modules = {};

  // Simple module system for browser compatibility
  function defineModule(name, dependencies, factory) {
    const deps = dependencies.map((dep) => modules[dep]);
    modules[name] = factory.apply(null, deps);
  }

  // Define all modules
  defineModule('config', [], () => ({
    SCHEDULER_CONFIG: {
      sole_prop: {
        url: 'https://meetings.hubspot.com/bz/consultation',
        name: 'Sole Proprietor Consultation',
        description: 'For single-owner practices',
      },
      s_corp: {
        url: 'https://meetings.hubspot.com/bz/consultations',
        name: 'S-Corp Consultation',
        description: 'For multi-owner practices',
      },
      default: {
        url: 'https://meetings.hubspot.com/bz/consultation',
        name: 'Default Consultation',
        description: 'Default consultation scheduler',
      },
    },
    MULTIPLE_OWNERS_FIELDS: [
      'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
      'does_your_practice_have_multiple_owners',
      'multiple_owners',
      'practice_multiple_owners',
      'has_multiple_owners',
    ],
    FIELD_MAPPINGS: {
      email: ['email', 'email_address'],
      firstName: ['firstname', 'first_name', 'fname'],
      lastName: ['lastname', 'last_name', 'lname'],
      company: ['company', 'practice_name', 'business_name'],
      phone: ['phone', 'phone_number', 'telephone'],
    },
    UTM_PARAMS: [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
    ],
    VALID_HUBSPOT_DOMAINS: [
      'hubspot.com',
      'hsforms.com',
      'hsforms.net',
      'hsappstatic.net',
    ],
  }));

  defineModule('utils', ['config'], (config) => {
    const DEBUG =
      window.location.hostname === 'localhost' ||
      window.location.search.includes('debug=true');

    function log(...args) {
      if (DEBUG) {
        console.log('[HubSpot Router]', ...args);
      }
    }

    function sanitizeInput(input) {
      if (typeof input !== 'string') return '';
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function canonicalKey(key) {
      try {
        if (!key) return '';
        const str = String(key);
        return str.indexOf('/') !== -1 ? str.split('/').pop() : str;
      } catch (e) {
        return key;
      }
    }

    function normalizeFormData(input) {
      const out = {};
      if (!input) return out;

      if (Array.isArray(input)) {
        input.forEach((f) => {
          if (!f) return;
          const raw = f.name || f.field || '';
          const name = canonicalKey(raw);
          const val = sanitizeInput(normalizeValue(f.value));
          if (raw) out[raw] = val;
          if (name && name !== raw) out[name] = val;
        });
        return out;
      }

      if (input.fields) {
        const fields = input.fields;
        if (Array.isArray(fields)) {
          fields.forEach((f) => {
            if (!f) return;
            const raw = f.name || f.field || '';
            const name = canonicalKey(raw);
            const val = sanitizeInput(normalizeValue(f.value));
            if (raw) out[raw] = val;
            if (name && name !== raw) out[name] = val;
          });
        } else if (typeof fields === 'object') {
          Object.entries(fields).forEach(([k, v]) => {
            const name = canonicalKey(k);
            const val = sanitizeInput(normalizeValue(v));
            out[k] = val;
            if (name && name !== k) out[name] = val;
          });
        }
        return out;
      }

      Object.entries(input).forEach(([k, v]) => {
        const name = canonicalKey(k);
        const val = sanitizeInput(normalizeValue(v));
        out[k] = val;
        if (name && name !== k) out[name] = val;
      });
      return out;
    }

    function normalizeValue(value) {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value[0] || '';
      if (value != null) return String(value);
      return '';
    }

    function determineSchedulerType(formData) {
      log('Determining scheduler type from form data:', formData);

      let multipleOwners = null;

      for (const fieldName of config.MULTIPLE_OWNERS_FIELDS) {
        if (formData[fieldName]) {
          multipleOwners = formData[fieldName];
          log(`Found multiple owners field: ${fieldName} = ${multipleOwners}`);
          break;
        }
      }

      if (!multipleOwners) {
        log('No multiple owners field found, using default');
        return 'default';
      }

      const normalizedValue = multipleOwners.toString().toLowerCase().trim();

      if (normalizedValue === 'no' || normalizedValue === 'false') {
        log('Single owner detected -> sole_prop');
        return 'sole_prop';
      } else if (normalizedValue === 'yes' || normalizedValue === 'true') {
        log('Multiple owners detected -> s_corp');
        return 's_corp';
      }

      log('Unclear response, using default');
      return 'default';
    }

    function buildSchedulerUrl(schedulerType, formData) {
      const schedulerConfig =
        config.SCHEDULER_CONFIG[schedulerType] ||
        config.SCHEDULER_CONFIG.default;
      const url = new URL(schedulerConfig.url);

      url.searchParams.set('embed', 'true');

      Object.entries(config.FIELD_MAPPINGS).forEach(
        ([paramName, fieldNames]) => {
          for (const fieldName of fieldNames) {
            if (formData[fieldName]) {
              url.searchParams.set(paramName, formData[fieldName]);
              log(
                `Mapping ${fieldName} -> ${paramName}: ${formData[fieldName]}`
              );
              break;
            }
          }
        }
      );

      config.UTM_PARAMS.forEach((param) => {
        if (formData[param]) {
          url.searchParams.set(param, formData[param]);
        }
      });

      log('Built scheduler URL:', url.toString());
      return url.toString();
    }

    function isValidHubSpotOrigin(origin) {
      try {
        const host = new URL(origin).hostname;
        return config.VALID_HUBSPOT_DOMAINS.some(
          (domain) => host === domain || host.endsWith(`.${domain}`)
        );
      } catch (e) {
        return false;
      }
    }

    function getQueryParams() {
      const params = {};
      const searchParams = new URLSearchParams(window.location.search);
      for (const [key, value] of searchParams) {
        params[key] = value;
      }
      return params;
    }

    return {
      log,
      sanitizeInput,
      canonicalKey,
      normalizeFormData,
      determineSchedulerType,
      buildSchedulerUrl,
      isValidHubSpotOrigin,
      getQueryParams,
      DEBUG,
    };
  });

  defineModule('storage', ['utils'], (utils) => {
    function getLocalStorage(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        utils.log('localStorage access failed:', e);
        return null;
      }
    }

    function setLocalStorage(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        utils.log('localStorage write failed:', e);
        return false;
      }
    }

    function getSessionStorage(key) {
      try {
        return sessionStorage.getItem(key);
      } catch (e) {
        utils.log('sessionStorage access failed:', e);
        return null;
      }
    }

    function setSessionStorage(key, value) {
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (e) {
        utils.log('sessionStorage write failed:', e);
        return false;
      }
    }

    function getCookie(name) {
      try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      } catch (e) {
        utils.log('Cookie access failed:', e);
        return null;
      }
    }

    function setCookie(name, value, maxAge = 3600) {
      try {
        document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
        return true;
      } catch (e) {
        utils.log('Cookie write failed:', e);
        return false;
      }
    }

    function removeCookie(name) {
      try {
        document.cookie = `${name}=; path=/; max-age=0`;
        return true;
      } catch (e) {
        utils.log('Cookie removal failed:', e);
        return false;
      }
    }

    function storeFormDataWithFallback(data) {
      const routerData = {
        scheduler_type: data.schedulerType,
        formData: data.formData,
        timestamp: Date.now(),
        source: 'hubspot_form',
      };

      if (
        setSessionStorage('scheduler_router_data', JSON.stringify(routerData))
      ) {
        utils.log('Stored router data in sessionStorage');
        return true;
      }

      utils.log('Failed to store in sessionStorage, falling back to cookies');
      const success1 = setCookie('scheduler_type', data.schedulerType);
      const success2 = setCookie(
        'form_data',
        btoa(JSON.stringify(data.formData))
      );

      return success1 && success2;
    }

    function getStoredFormData() {
      const localStorageData = getLocalStorage('hubspot_form_data');
      if (localStorageData) {
        try {
          const formData = JSON.parse(localStorageData);
          utils.log('Found form data in localStorage:', formData);
          return { formData, source: 'localStorage' };
        } catch (e) {
          utils.log('localStorage JSON parse error:', e);
        }
      }

      const sessionStorageData = getSessionStorage('scheduler_router_data');
      if (sessionStorageData) {
        try {
          const data = JSON.parse(sessionStorageData);
          utils.log('Found router data in sessionStorage:', data);
          setSessionStorage('scheduler_router_data', '');
          return {
            formData: data.formData,
            schedulerType: data.scheduler_type,
            source: 'sessionStorage',
          };
        } catch (e) {
          utils.log('sessionStorage JSON parse error:', e);
        }
      }

      const schedulerType = getCookie('scheduler_type');
      const formDataCookie = getCookie('form_data');

      if (schedulerType || formDataCookie) {
        try {
          const formData = formDataCookie
            ? JSON.parse(atob(formDataCookie))
            : {};

          removeCookie('scheduler_type');
          removeCookie('form_data');

          utils.log('Found data in cookies:', { schedulerType, formData });
          return { formData, schedulerType, source: 'cookies' };
        } catch (e) {
          utils.log('Cookie JSON parse error:', e);
        }
      }

      return null;
    }

    return {
      storeFormDataWithFallback,
      getStoredFormData,
    };
  });

  defineModule('dom', ['utils'], (utils) => {
    class FormMonitor {
      constructor() {
        this.capturedFormData = {};
        this.previousValues = {};
        this.processedElements = new WeakSet();
        this.observer = null;
      }

      init() {
        this.setupMutationObserver();
        this.processExistingInputs();
        utils.log('Form input monitoring activated');
      }

      setupMutationObserver() {
        this.observer = new MutationObserver((mutations) => {
          const addedNodes = [];

          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                addedNodes.push(node);
              }
            });
          });

          if (addedNodes.length === 0) return;

          addedNodes.forEach((node) => {
            const inputs = node.querySelectorAll
              ? node.querySelectorAll(
                  'input[name], select[name], textarea[name]'
                )
              : [];

            if (
              node.tagName &&
              ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) &&
              node.name
            ) {
              this.processInput(node);
            }

            inputs.forEach((input) => this.processInput(input));
          });
        });

        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      processExistingInputs() {
        document
          .querySelectorAll('input[name], select[name], textarea[name]')
          .forEach((input) => this.processInput(input));
      }

      processInput(input) {
        if (this.processedElements.has(input)) return;
        this.processedElements.add(input);

        if (input.readOnly && input.type !== 'hidden') return;

        if (input.type === 'hidden' && input.name) {
          this.setupHiddenInputObserver(input);
        } else if (input.type === 'radio') {
          input.addEventListener('change', () => this.captureValue(input));
        } else if (
          input.type === 'tel' ||
          (input.name && input.name.toLowerCase().includes('phone'))
        ) {
          input.addEventListener('blur', () => this.captureValue(input));
          input.addEventListener('change', () => this.captureValue(input));
        } else {
          input.addEventListener('change', () => this.captureValue(input));
          input.addEventListener('blur', () => this.captureValue(input));
        }

        if (input.value) {
          this.captureValue(input, 'initial');
        }
      }

      setupHiddenInputObserver(input) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (
              mutation.type === 'attributes' &&
              mutation.attributeName === 'value'
            ) {
              this.captureValue(input, 'mutation');
            }
          });
        });

        observer.observe(input, {
          attributes: true,
          attributeFilter: ['value'],
        });

        input._mutationObserver = observer;

        if (input.value) {
          this.captureValue(input, 'initial');
        }
      }

      captureValue(input, eventType = 'change') {
        if (!input.name) return;

        let value = input.value;
        const fieldKey = input.name;

        if (this.previousValues[fieldKey] === value) {
          return;
        }
        this.previousValues[fieldKey] = value;

        if (this.isHubSpotInternalField(fieldKey)) {
          return;
        }

        this.capturedFormData[fieldKey] = value;

        if (value) {
          this.logCapturedValue(input, fieldKey, value, eventType);
        }
      }

      isHubSpotInternalField(fieldKey) {
        return (
          fieldKey === 'hs_context' ||
          fieldKey.startsWith('hs_') ||
          fieldKey === 'guid'
        );
      }

      logCapturedValue(input, fieldKey, value, eventType) {
        let fieldType = input.type || input.tagName.toLowerCase();

        if (input.type === 'tel' || fieldKey.toLowerCase().includes('phone')) {
          const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
          if (cleanPhone) {
            this.capturedFormData[fieldKey + '_clean'] = cleanPhone;
          }
          utils.log('Captured phone:', fieldKey, '=', value);
        } else if (input.type === 'radio') {
          utils.log('Captured radio selection:', fieldKey, '=', value);
        } else if (input.type === 'hidden') {
          const parent = input.closest('.hsfc-DropdownField');
          if (parent) {
            utils.log('Captured dropdown:', fieldKey, '=', value);
          } else {
            utils.log('Captured field:', fieldKey, '=', value);
          }
        } else {
          utils.log('Captured', fieldType + ':', fieldKey, '=', value);
        }
      }

      getCapturedData() {
        return { ...this.capturedFormData };
      }

      destroy() {
        if (this.observer) {
          this.observer.disconnect();
        }

        this.processedElements.forEach((input) => {
          if (input._mutationObserver) {
            input._mutationObserver.disconnect();
          }
        });
      }
    }

    return { FormMonitor };
  });

  defineModule(
    'router',
    ['config', 'utils', 'storage', 'dom'],
    (config, utils, storage, dom) => {
      class HubSpotRouter {
        constructor(options = {}) {
          this.options = {
            redirect: true,
            debug: utils.DEBUG,
            ...options,
          };

          this.hasRouted = false;
          this.formMonitor = null;

          utils.log('HubSpot Router initialized with options:', this.options);
        }

        init() {
          utils.log('Initializing HubSpot Router...');

          this.initFormMonitoring();
          this.initPostMessageListener();

          if (this.options.debug) {
            this.exposeDebugApi();
          }

          utils.log('HubSpot Router initialization complete');
        }

        initFormMonitoring() {
          this.formMonitor = new dom.FormMonitor();
          this.formMonitor.init();

          window._capturedFormData = this.formMonitor.getCapturedData();

          const originalCapture = this.formMonitor.captureValue.bind(
            this.formMonitor
          );
          this.formMonitor.captureValue = (...args) => {
            originalCapture(...args);
            window._capturedFormData = this.formMonitor.getCapturedData();
          };
        }

        initPostMessageListener() {
          utils.log('Initializing postMessage listener');

          window.addEventListener('message', this.handleMessage.bind(this));
          utils.log('PostMessage listener initialized');
        }

        handleMessage(event) {
          if (!utils.isValidHubSpotOrigin(event.origin)) {
            return;
          }

          let payload = event.data;
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch {
              return;
            }
          }

          utils.log('Received message from HubSpot:', payload);

          const msgType = payload && (payload.type || payload.messageType);
          const eventName = payload && payload.eventName;

          if (this.isFormSubmission(payload, msgType, eventName)) {
            this.handleFormSubmission(payload.data);
          } else if (this.isDeveloperEmbedSubmission(payload)) {
            this.handleDeveloperEmbedSubmission();
          } else if (this.options.debug && msgType === 'hsFormCallback') {
            utils.log('Ignoring hsFormCallback event:', eventName);
          }
        }

        isFormSubmission(payload, msgType, eventName) {
          return (
            payload &&
            msgType === 'hsFormCallback' &&
            (eventName === 'onFormSubmitted' || eventName === 'onFormSubmit')
          );
        }

        isDeveloperEmbedSubmission(payload) {
          return payload && payload.formGuid && payload.accepted === true;
        }

        handleFormSubmission(submissionData) {
          utils.log('Form submission detected:', submissionData);

          if (this.hasRouted) {
            utils.log('Routing already performed; skipping');
            return;
          }

          this.hasRouted = true;

          const normalizedData = utils.normalizeFormData(submissionData);
          this.processFormSubmission(normalizedData);
        }

        handleDeveloperEmbedSubmission() {
          utils.log('Developer embed submission detected');

          if (this.hasRouted) {
            utils.log('Routing already performed; skipping');
            return;
          }

          this.hasRouted = true;

          const capturedData = this.formMonitor.getCapturedData();
          utils.log('Using captured form data:', capturedData);

          if (Object.keys(capturedData).length > 0) {
            try {
              storage.setLocalStorage(
                'hubspot_form_data',
                JSON.stringify(capturedData)
              );
              utils.log(
                'Stored captured form data in localStorage for prefill'
              );
            } catch (e) {
              utils.log(
                'Failed to store captured form data in localStorage:',
                e
              );
            }

            this.processFormSubmission(capturedData);
          }
        }

        processFormSubmission(formData) {
          const schedulerType = utils.determineSchedulerType(formData);
          this.redirectToScheduler(formData, schedulerType);
          this.fireAnalyticsEvents(schedulerType, formData);
        }

        redirectToScheduler(formData, schedulerType) {
          const success = storage.storeFormDataWithFallback({
            schedulerType,
            formData,
            timestamp: Date.now(),
            source: 'hubspot_form',
          });

          if (!success) {
            utils.log('Failed to store form data');
          }

          const params = new URLSearchParams();
          if (formData.email) {
            params.set('email', formData.email);
          }

          const redirectUrl = `/hs-scheduler/ty-general${params.toString() ? '?' + params.toString() : ''}`;
          utils.log('Redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
        }

        fireAnalyticsEvents(schedulerType, formData) {
          try {
            if (typeof window.amplitude !== 'undefined') {
              window.amplitude.track('scheduler_router_triggered', {
                scheduler_type: schedulerType,
                has_email: !!formData.email,
                has_name: !!(formData.firstname || formData.first_name),
              });
            }

            if (typeof window.posthog !== 'undefined') {
              window.posthog.capture('scheduler_router_triggered', {
                scheduler_type: schedulerType,
                method: 'redirect',
              });
            }

            utils.log('Analytics events fired');
          } catch (e) {
            utils.log('Analytics tracking error:', e);
          }
        }

        exposeDebugApi() {
          window.HubSpotRouterDebug = {
            config: config.SCHEDULER_CONFIG,
            determineSchedulerType: utils.determineSchedulerType,
            buildSchedulerUrl: utils.buildSchedulerUrl,
            handleFormSubmission: this.handleFormSubmission.bind(this),
            getCapturedData: () => this.formMonitor.getCapturedData(),
            router: this,
          };

          utils.log('Debug API exposed via window.HubSpotRouterDebug');
        }

        destroy() {
          if (this.formMonitor) {
            this.formMonitor.destroy();
          }

          window.removeEventListener('message', this.handleMessage.bind(this));
          utils.log('HubSpot Router destroyed');
        }
      }

      return HubSpotRouter;
    }
  );

  // Initialize the router
  const HubSpotRouter = modules.router;
  const router = new HubSpotRouter({
    debug: modules.utils.DEBUG,
    redirect: true,
  });

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => router.init());
  } else {
    router.init();
  }

  // Expose public API (merge with existing if already defined)
  window.HubSpotRouter = {
    ...window.HubSpotRouter,
    init: (options) => router.init(options),
    handleFormSubmission: (data) => router.handleFormSubmission(data),
    determineSchedulerType: (data) =>
      modules.utils.determineSchedulerType(data),
    buildSchedulerUrl: (type, data) =>
      modules.utils.buildSchedulerUrl(type, data),
    config: modules.config.SCHEDULER_CONFIG,
    DEBUG: modules.utils.DEBUG,
  };

  modules.utils.log('HubSpot Form Router loaded');
})();
