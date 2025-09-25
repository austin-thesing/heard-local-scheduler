/**
 * Complete Webflow Scheduler Script
 * Handles form data detection, scheduler injection, and fallback redirect
 */

(function () {
  'use strict';

  const DEBUG = window.location.search.includes('debug=true');

  function log(...args) {
    if (DEBUG) console.log('[Webflow Scheduler]', ...args);
  }

  // Configuration - force round-robin scheduler
  const SCHEDULER_CONFIG = {
    sole_prop: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Round Robin Consultation',
      description: 'For all practices (round-robin)',
    },
  };

  // Get form data from all storage sources
  function getStoredFormData() {
    // Try localStorage first (for form data prefill)
    try {
      const localStorageData = localStorage.getItem('hubspot_form_data');
      if (localStorageData) {
        const formData = JSON.parse(localStorageData);
        log('Found form data in localStorage:', formData);
        return { formData: formData, source: 'localStorage' };
      }
    } catch (e) {
      log('localStorage error:', e);
    }

    // Try sessionStorage
    try {
      const storedData = sessionStorage.getItem('scheduler_router_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        log('Found router data in sessionStorage:', data);
        sessionStorage.removeItem('scheduler_router_data'); // Clear after reading
        return {
          formData: data.formData,
          schedulerType: data.scheduler_type,
          source: 'sessionStorage',
        };
      }
    } catch (e) {
      log('sessionStorage error:', e);
    }

    // Try cookies as fallback
    try {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };

      const schedulerType = getCookie('scheduler_type');
      const formDataCookie = getCookie('form_data');

      if (schedulerType || formDataCookie) {
        const formData = formDataCookie ? JSON.parse(atob(formDataCookie)) : {};

        // Clear cookies
        document.cookie = 'scheduler_type=; path=/; max-age=0';
        document.cookie = 'form_data=; path=/; max-age=0';

        log('Found data in cookies:', { schedulerType, formData });
        return {
          formData: formData,
          schedulerType: schedulerType,
          source: 'cookies',
        };
      }
    } catch (e) {
      log('cookie error:', e);
    }

    return null;
  }

  // Get URL parameters
  function getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  }

  // Build enhanced scheduler URL with form data
  function buildSchedulerUrl(formData) {
    const config = SCHEDULER_CONFIG.sole_prop;
    const url = new URL(config.url);

    // Always add embed parameter
    url.searchParams.set('embed', 'true');

    // PartnerStack tracking
    const partnerstackId =
      formData.partnerstack_click_id ||
      formData.ps_xid ||
      formData['0-1/partnerstack_click_id'] ||
      formData['0-2/partnerstack_click_id'];
    if (partnerstackId) {
      url.searchParams.set('partnerstack_click_id', partnerstackId);
      log('Adding PartnerStack click id', partnerstackId);
    }

    // Pre-fill common fields
    const fieldMappings = {
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
    };

    Object.entries(fieldMappings).forEach(([paramName, fieldNames]) => {
      for (const fieldName of fieldNames) {
        if (formData[fieldName]) {
          url.searchParams.set(paramName, formData[fieldName]);
          log(`Mapping ${fieldName} -> ${paramName}: ${formData[fieldName]}`);
          break;
        }
      }
    });

    // Handle additional HubSpot-specific fields
    const additionalFields = [
      'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
      'what_best_describes_your_practice_',
      'referrer',
      'submissionGuid',
      'uuid',
      'partnerstack_click_id',
    ];

    additionalFields.forEach((fieldName) => {
      // Check for exact field name first
      if (formData[fieldName]) {
        url.searchParams.set(fieldName, formData[fieldName]);
        log(`Adding additional field: ${fieldName} = ${formData[fieldName]}`);
      } else {
        // Check for prefixed versions
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

    // Add UTM parameters if present
    const utmParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
    ];
    utmParams.forEach((param) => {
      if (formData[param]) {
        url.searchParams.set(param, formData[param]);
      }
    });

    log('Built scheduler URL:', url.toString());
    return url.toString();
  }

  // Fire lead tracking events
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

      log('Lead events fired');
    } catch (e) {
      log('Lead tracking error:', e);
    }
  }

  // Inject scheduler into target element or enhance existing iframe
  function handleScheduler() {
    log('Starting scheduler setup...');

    const urlParams = getQueryParams();
    const storedData = getStoredFormData();

    // Merge URL params with any stored form data
    let allFormData = { ...urlParams };
    if (storedData && storedData.formData) {
      allFormData = { ...allFormData, ...storedData.formData };
      log('Merged form data from storage:', allFormData);
    }

    // Check if we have any meaningful form data (at least email or firstname)
    const hasFormData =
      allFormData.email ||
      allFormData.firstname ||
      allFormData.first_name ||
      allFormData['0-1/email'] ||
      allFormData['0-1/firstname'] ||
      allFormData['0-2/email'] ||
      allFormData['0-2/firstname'] ||
      Object.keys(allFormData).some(
        (key) =>
          key !== 'debug' &&
          key !== 'utm_source' &&
          key !== 'utm_medium' &&
          key !== 'utm_campaign' &&
          !key.startsWith('group[') && // Ignore HubSpot group fields
          allFormData[key]
      );

    if (!hasFormData) {
      log('No form data found, redirecting to /free-consult');
      window.location.href = '/free-consult';
      return;
    }

    log('Form data found, setting up scheduler');

    // Try to find existing target div
    let target = document.getElementById('scheduler-target');

    // If no target div exists, look for existing iframe to replace
    if (!target) {
      const existingIframe = document.querySelector(
        'iframe[src*="meetings.hubspot.com"]'
      );
      const iframeContainer = document.querySelector(
        '.meetings-iframe-container'
      );

      if (existingIframe || iframeContainer) {
        log('Found existing iframe/container, will enhance it');
        // Create a wrapper around existing iframe
        const wrapper = document.createElement('div');
        wrapper.id = 'scheduler-target';

        if (iframeContainer) {
          iframeContainer.parentNode.insertBefore(wrapper, iframeContainer);
          wrapper.appendChild(iframeContainer);
        } else if (existingIframe) {
          existingIframe.parentNode.insertBefore(wrapper, existingIframe);
          wrapper.appendChild(existingIframe);
        }

        target = wrapper;
      }
    }

    // If still no target, create one
    if (!target) {
      log('No target found, creating scheduler-target div');
      target = document.createElement('div');
      target.id = 'scheduler-target';
      target.style.cssText = 'min-height: 600px; width: 100%;';
      document.body.appendChild(target);
    }

    // Build scheduler URL with all form data
    const schedulerUrl = buildSchedulerUrl(allFormData);

    log('Injecting scheduler into target');
    log('Final URL:', schedulerUrl);

    // Clear target and inject new scheduler
    target.innerHTML = `<div class="meetings-iframe-container" data-src="${schedulerUrl}"></div>`;

    // Load HubSpot embed script
    const script = document.createElement('script');
    script.src =
      'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.onload = function () {
      log('HubSpot embed script loaded successfully');
      fireLeadEvents();
    };
    script.onerror = function () {
      console.error('[Webflow Scheduler] Failed to load HubSpot embed script');
    };
    document.head.appendChild(script);

    return true;
  }

  // Add debug panel if debug mode is enabled
  function addDebugPanel() {
    if (!DEBUG) return;

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

    const storedData = getStoredFormData();
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
        debugPanel.style.top = e.clientY - dragOffset.y + 'px';
        debugPanel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Main initialization function
  function init() {
    log('Webflow Scheduler Complete initializing...');

    // Add debug panel if in debug mode
    addDebugPanel();

    // Handle scheduler setup
    handleScheduler();

    log('Webflow Scheduler Complete initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  if (DEBUG) {
    window.WebflowSchedulerComplete = {
      getStoredFormData,
      getQueryParams,
      buildSchedulerUrl,
      handleScheduler,
      fireLeadEvents,
      init,
      config: SCHEDULER_CONFIG,
    };
  }

  log('Webflow Scheduler Complete script loaded');
})();
