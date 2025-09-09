/**
 * Webflow Scheduler Complete - Refactored Version
 * Handles form data detection, scheduler injection, and fallback redirect
 */

(function () {
  'use strict';

  // Simple module system for browser compatibility
  const modules = {};

  function defineModule(name, dependencies, factory) {
    const deps = dependencies.map((dep) => modules[dep]);
    modules[name] = factory.apply(null, deps);
  }

  // Configuration module
  defineModule('config', [], () => ({
    ROUND_ROBIN_CONFIG: {
      sole_prop: {
        url: 'https://meetings.hubspot.com/bz/consultation',
        name: 'Round Robin Consultation',
        description: 'For all practices (round-robin)',
      },
    },
    FIELD_MAPPINGS: {
      email: ['email', 'email_address', '0-1/email', '0-2/email'],
      firstname: [
        'firstname',
        'first_name',
        'fname',
        '0-1/firstname',
        '0-2/firstname',
      ],
      lastname: [
        'lastname',
        'last_name',
        'lname',
        '0-1/lastname',
        '0-2/lastname',
      ],
      company: [
        'company',
        'practice_name',
        'business_name',
        '0-1/company',
        '0-2/company',
      ],
      phone: ['phone', 'phone_number', 'telephone', '0-1/phone', '0-2/phone'],
    },
    ADDITIONAL_HUBSPOT_FIELDS: [
      'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
      'what_best_describes_your_practice_',
      'referrer',
      'submissionGuid',
      'uuid',
    ],
    UTM_PARAMS: [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
    ],
  }));

  // Utilities module
  defineModule('utils', ['config'], (config) => {
    const DEBUG = window.location.search.includes('debug=true');

    function log(...args) {
      if (DEBUG) console.log('[Webflow Scheduler]', ...args);
    }

    function error(...args) {
      console.error('[Webflow Scheduler]', ...args);
    }

    function getQueryParams() {
      const params = {};
      const searchParams = new URLSearchParams(window.location.search);
      for (const [key, value] of searchParams) {
        params[key] = value;
      }
      return params;
    }

    function buildSchedulerUrl(formData) {
      const schedulerConfig = config.ROUND_ROBIN_CONFIG.sole_prop;
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

      config.ADDITIONAL_HUBSPOT_FIELDS.forEach((fieldName) => {
        if (formData[fieldName]) {
          url.searchParams.set(fieldName, formData[fieldName]);
          log(`Adding additional field: ${fieldName} = ${formData[fieldName]}`);
        } else {
          const prefixedVersions = [`0-1/${fieldName}`, `0-2/${fieldName}`];
          for (const prefixedField of prefixedVersions) {
            if (formData[prefixedField]) {
              url.searchParams.set(fieldName, formData[prefixedField]);
              log(
                `Adding prefixed field: ${prefixedField} -> ${fieldName} = ${formData[prefixedField]}`
              );
              break;
            }
          }
        }
      });

      config.UTM_PARAMS.forEach((param) => {
        if (formData[param]) {
          url.searchParams.set(param, formData[param]);
        }
      });

      log('Built scheduler URL:', url.toString());
      return url.toString();
    }

    function safeHtmlInjection(target, html) {
      if (!target || typeof html !== 'string') {
        return false;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        error('HTML parsing error:', parserError.textContent);
        return false;
      }

      target.innerHTML = '';
      while (doc.body.firstChild) {
        target.appendChild(doc.body.firstChild);
      }

      return true;
    }

    return {
      log,
      error,
      getQueryParams,
      buildSchedulerUrl,
      safeHtmlInjection,
      DEBUG,
    };
  });

  // Storage module
  defineModule('storage', ['utils'], (utils) => {
    function getLocalStorage(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        utils.log('localStorage access failed:', e);
        return null;
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

    function removeCookie(name) {
      try {
        document.cookie = `${name}=; path=/; max-age=0`;
        return true;
      } catch (e) {
        utils.log('Cookie removal failed:', e);
        return false;
      }
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
          getSessionStorage('scheduler_router_data'); // Clear after reading
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
      getStoredFormData,
    };
  });

  // Analytics module
  defineModule('analytics', ['utils'], (utils) => {
    function fireLeadEvents() {
      try {
        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
          fbq('track', 'Lead', {
            content_category: 'consultation',
            content_name: 'round_robin_consultation',
          });
        }

        // Reddit Pixel
        if (typeof rdt !== 'undefined') {
          rdt('track', 'Lead', {
            customEventName: 'ConsultationScheduler',
            schedulerType: 'round_robin',
          });
        }

        // Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'generate_lead', {
            event_category: 'engagement',
            event_label: 'round_robin_consultation',
          });
        } else if (typeof ga !== 'undefined') {
          ga('send', 'event', 'Lead', 'Generate', 'round_robin_consultation');
        }

        // PostHog
        if (typeof window.posthog !== 'undefined') {
          window.posthog.capture('scheduler_lead_generated', {
            scheduler_type: 'round_robin',
            source: 'webflow_complete',
          });
        }

        // Amplitude
        if (typeof window.amplitude !== 'undefined') {
          window.amplitude.track('scheduler_lead_generated', {
            scheduler_type: 'round_robin',
            source: 'webflow_complete',
          });
        }

        utils.log('Lead events fired');
      } catch (e) {
        utils.log('Lead tracking error:', e);
      }
    }

    return {
      fireLeadEvents,
    };
  });

  // Debug module
  defineModule('debug', ['utils', 'storage'], (utils, storage) => {
    function addDebugPanel() {
      if (!utils.DEBUG) return;

      const debugPanel = document.createElement('div');
      debugPanel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        max-width: 400px;
        z-index: 10000;
        border: 2px solid #226752;
      `;

      const storedData = storage.getStoredFormData();
      const urlParams = new URLSearchParams(window.location.search);

      debugPanel.innerHTML = `
        <strong>🔧 Webflow Scheduler Debug</strong><br><br>
        <strong>Form Data Sources:</strong><br>
        📁 localStorage: ${localStorage.getItem('hubspot_form_data') ? '✅ Found' : '❌ Empty'}<br>
        💾 sessionStorage: ${sessionStorage.getItem('scheduler_router_data') ? '✅ Found' : '❌ Empty'}<br>
        🍪 Cookies: ${document.cookie.includes('form_data=') ? '✅ Found' : '❌ Empty'}<br><br>
        <strong>URL Parameters:</strong><br>
        ${urlParams.toString() || 'None'}<br><br>
        <strong>Stored Data:</strong><br>
        ${storedData ? `Source: ${storedData.source}<br>Fields: ${Object.keys(storedData.formData || {}).join(', ')}` : 'None found'}<br><br>
        <strong>Action:</strong><br>
        ${storedData || urlParams.toString() ? '✅ Loading scheduler' : '❌ Will redirect to /free-consult'}
      `;

      document.body.appendChild(debugPanel);

      // Make it draggable
      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };

      debugPanel.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - debugPanel.offsetLeft;
        dragOffset.y = e.clientY - debugPanel.offsetTop;
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          debugPanel.style.left = e.clientX - dragOffset.x + 'px';
          debugPanel.top = e.clientY - dragOffset.y + 'px';
          debugPanel.style.right = 'auto';
        }
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    return {
      addDebugPanel,
    };
  });

  // Main scheduler module
  defineModule(
    'scheduler',
    ['config', 'utils', 'storage', 'analytics', 'debug'],
    (config, utils, storage, analytics, debug) => {
      class WebflowScheduler {
        constructor() {
          this.options = {
            debug: utils.DEBUG,
          };

          utils.log(
            'Webflow Scheduler initialized with options:',
            this.options
          );
        }

        init() {
          utils.log('Webflow Scheduler Complete initializing...');

          if (this.options.debug) {
            debug.addDebugPanel();
          }

          this.handleScheduler();

          utils.log('Webflow Scheduler Complete initialized');
        }

        handleScheduler() {
          utils.log('Starting scheduler setup...');

          const urlParams = utils.getQueryParams();
          const storedData = storage.getStoredFormData();

          let allFormData = { ...urlParams };
          if (storedData && storedData.formData) {
            allFormData = { ...allFormData, ...storedData.formData };
            utils.log('Merged form data from storage:', allFormData);
          }

          if (!this.hasMeaningfulFormData(allFormData)) {
            utils.log('No form data found, redirecting to /free-consult');
            window.location.href = '/free-consult';
            return;
          }

          utils.log('Form data found, setting up scheduler');

          const target = this.findOrCreateTarget();
          if (!target) {
            utils.error('Failed to find or create scheduler target');
            return;
          }

          const schedulerUrl = utils.buildSchedulerUrl(allFormData);

          utils.log('Injecting scheduler into target');
          utils.log('Final URL:', schedulerUrl);

          this.injectScheduler(target, schedulerUrl);
        }

        hasMeaningfulFormData(formData) {
          const hasBasicInfo =
            formData.email ||
            formData.firstname ||
            formData.first_name ||
            formData['0-1/email'] ||
            formData['0-1/firstname'] ||
            formData['0-2/email'] ||
            formData['0-2/firstname'];

          const hasOtherData = Object.keys(formData).some(
            (key) =>
              key !== 'debug' &&
              key !== 'utm_source' &&
              key !== 'utm_medium' &&
              key !== 'utm_campaign' &&
              !key.startsWith('group[') &&
              formData[key]
          );

          return hasBasicInfo || hasOtherData;
        }

        findOrCreateTarget() {
          let target = document.getElementById('scheduler-target');

          if (!target) {
            const existingIframe = document.querySelector(
              'iframe[src*="meetings.hubspot.com"]'
            );
            const iframeContainer = document.querySelector(
              '.meetings-iframe-container'
            );

            if (existingIframe || iframeContainer) {
              utils.log('Found existing iframe/container, will enhance it');
              target = this.wrapExistingIframe(existingIframe, iframeContainer);
            }
          }

          if (!target) {
            utils.log('No target found, creating scheduler-target div');
            target = this.createTargetDiv();
          }

          return target;
        }

        wrapExistingIframe(existingIframe, iframeContainer) {
          const wrapper = document.createElement('div');
          wrapper.id = 'scheduler-target';

          if (iframeContainer) {
            iframeContainer.parentNode.insertBefore(wrapper, iframeContainer);
            wrapper.appendChild(iframeContainer);
          } else if (existingIframe) {
            existingIframe.parentNode.insertBefore(wrapper, existingIframe);
            wrapper.appendChild(existingIframe);
          }

          return wrapper;
        }

        createTargetDiv() {
          const target = document.createElement('div');
          target.id = 'scheduler-target';
          target.style.cssText = 'min-height: 600px; width: 100%;';
          document.body.appendChild(target);
          return target;
        }

        injectScheduler(target, schedulerUrl) {
          const html = `<div class="meetings-iframe-container" data-src="${schedulerUrl}"></div>`;

          if (!utils.safeHtmlInjection(target, html)) {
            utils.error('Failed to inject scheduler HTML');
            return;
          }

          this.loadHubSpotEmbedScript();
        }

        loadHubSpotEmbedScript() {
          const script = document.createElement('script');
          script.src =
            'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
          script.onload = () => {
            utils.log('HubSpot embed script loaded successfully');
            analytics.fireLeadEvents();
          };
          script.onerror = () => {
            utils.error('Failed to load HubSpot embed script');
          };
          document.head.appendChild(script);
        }
      }

      return WebflowScheduler;
    }
  );

  // Initialize the scheduler
  const WebflowScheduler = modules.scheduler;
  const scheduler = new WebflowScheduler();

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduler.init());
  } else {
    scheduler.init();
  }

  // Expose for debugging
  if (modules.utils.DEBUG) {
    window.WebflowSchedulerComplete = {
      getStoredFormData: modules.storage.getStoredFormData,
      getQueryParams: modules.utils.getQueryParams,
      buildSchedulerUrl: modules.utils.buildSchedulerUrl,
      handleScheduler: () => scheduler.handleScheduler(),
      fireLeadEvents: modules.analytics.fireLeadEvents,
      init: () => scheduler.init(),
      config: modules.config.ROUND_ROBIN_CONFIG,
    };
  }

  modules.utils.log('Webflow Scheduler Complete script loaded');
})();
