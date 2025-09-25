/**
 * HubSpot Form Router
 * Listens for HubSpot form submissions and routes users to appropriate schedulers
 * Based on form responses, particularly "Does your practice have multiple owners?"
 */

(function () {
  'use strict';

  // Single scheduler destination configuration
  const SCHEDULER_CONFIG = {
    general: {
      url: 'https://meetings.hubspot.com/bz/consultation',
      name: 'Consultation Scheduler',
      description: 'General consultation scheduling',
    },
  };

  const ROUTE_DESTINATIONS = {
    success: '/thank-you/success',
    schedule: '/thank-you/schedule',
  };

  const MULTI_PRACTICE_FIELDS = [
    'do_you_file_taxes_as_an_independent_contractor_or_as_the_sole_owner_of_your_business_',
    'does_your_practice_have_multiple_owners',
  ];

  const INCOME_THRESHOLD_FIELDS = [
    'is_your_2025_expected_annual_revenue_over__25_000_',
  ];

  const YES_VALUES = ['yes', 'true', 'y', '1', 'multiple owners', 'multi'];
  const NO_VALUES = [
    'no',
    'false',
    'n',
    '0',
    'less than 25000',
    'less than 25,000',
    'less than $25,000',
    'under 25k',
    'under $25,000',
    'under 25000',
    'no - less than $25,000',
  ];

  function normalizeResponse(value) {
    if (value == null) return '';
    return String(value).trim().toLowerCase();
  }

  function isAffirmative(value) {
    const normalized = normalizeResponse(value);
    if (!normalized) return false;
    if (YES_VALUES.includes(normalized)) return true;

    return (
      normalized.startsWith('yes') ||
      normalized.includes('multiple owners') ||
      normalized.includes('multi practice') ||
      normalized.includes('multi-owner') ||
      normalized.includes('multi owner') ||
      normalized.includes('multi-practice')
    );
  }

  function isNegative(value) {
    const normalized = normalizeResponse(value);
    if (!normalized) return false;
    if (NO_VALUES.includes(normalized)) return true;

    return (
      normalized.startsWith('no') ||
      normalized.includes('less than') ||
      normalized.includes('under 25') ||
      normalized.includes('under $25') ||
      normalized.includes('under25')
    );
  }

  function findFirstValue(formData, fieldNames) {
    if (!formData) return null;

    for (const fieldName of fieldNames) {
      if (formData[fieldName]) {
        return formData[fieldName];
      }

      const prefixedCandidates = [
        `0-1/${fieldName}`,
        `0-2/${fieldName}`,
        `0-3/${fieldName}`,
      ];

      for (const candidate of prefixedCandidates) {
        if (formData[candidate]) {
          return formData[candidate];
        }
      }
    }

    return null;
  }

  // Debug logging
  const DEBUG =
    window.location.hostname === 'localhost' ||
    window.location.search.includes('debug=true');

  function log(...args) {
    if (DEBUG) {
      console.log('[HubSpot Router]', ...args);
    }
  }

  const PARTNERSTACK_FIELD_NAME = 'partnerstack_click_id';
  const PARTNERSTACK_STORAGE_KEYS = [PARTNERSTACK_FIELD_NAME, 'ps_xid'];

  function getPartnerstackClickId() {
    const candidates = [];

    try {
      if (window.partnerstack && window.partnerstack.ps_xid) {
        candidates.push(window.partnerstack.ps_xid);
      }
    } catch (e) {
      log('Partnerstack global lookup error:', e);
    }

    try {
      if (window.ps_xid) {
        candidates.push(window.ps_xid);
      }
    } catch (e) {
      log('ps_xid global lookup error:', e);
    }

    try {
      PARTNERSTACK_STORAGE_KEYS.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value) {
          candidates.push(value);
        }
      });
    } catch (e) {
      log('localStorage access error for partnerstack id:', e);
    }

    try {
      PARTNERSTACK_STORAGE_KEYS.forEach((key) => {
        const value = sessionStorage.getItem(key);
        if (value) {
          candidates.push(value);
        }
      });
    } catch (e) {
      log('sessionStorage access error for partnerstack id:', e);
    }

    try {
      const cookieValue = document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${PARTNERSTACK_FIELD_NAME}=`));
      if (cookieValue) {
        const [, value] = cookieValue.split('=');
        if (value) {
          candidates.push(decodeURIComponent(value));
        }
      }
    } catch (e) {
      log('cookie access error for partnerstack id:', e);
    }

    const resolved = candidates.find(
      (value) => value && value !== 'undefined' && value !== 'null'
    );
    return resolved || null;
  }

  // Expose DEBUG flag for other scripts
  window.HubSpotRouter = window.HubSpotRouter || {};
  window.HubSpotRouter.DEBUG = DEBUG;

  // Ensure we only route once per page load
  let HAS_ROUTED = false;

  // Normalize HubSpot payloads and raw form objects into a flat key/value map
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

    // hsFormCallback often sends { fields: Array<{name,value}> } or an object
    if (Array.isArray(input)) {
      input.forEach((f) => {
        if (!f) return;
        const raw = f.name || f.field || '';
        const name = canonicalKey(raw);
        const val =
          typeof f.value === 'string'
            ? f.value
            : Array.isArray(f.value)
              ? f.value[0]
              : f.value != null
                ? String(f.value)
                : '';
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
          const val =
            typeof f.value === 'string'
              ? f.value
              : Array.isArray(f.value)
                ? f.value[0]
                : f.value != null
                  ? String(f.value)
                  : '';
          if (raw) out[raw] = val;
          if (name && name !== raw) out[name] = val;
        });
      } else if (typeof fields === 'object') {
        Object.entries(fields).forEach(([k, v]) => {
          const name = canonicalKey(k);
          const val =
            typeof v === 'string'
              ? v
              : Array.isArray(v)
                ? v[0]
                : v != null
                  ? String(v)
                  : '';
          out[k] = val;
          if (name && name !== k) out[name] = val;
        });
      }
      return out;
    }

    // Plain object of key/values
    Object.entries(input).forEach(([k, v]) => {
      const name = canonicalKey(k);
      const val =
        typeof v === 'string'
          ? v
          : Array.isArray(v)
            ? v[0]
            : v != null
              ? String(v)
              : '';
      out[k] = val;
      if (name && name !== k) out[name] = val;
    });
    return out;
  }

  /**
   * Determine scheduler type based on form data
   * Routes to 'success' if NO to either question, 'general' if YES to both
   */
  function determineSchedulerType(formData) {
    // Check multi-practice questions
    const multiPracticeResponse = findFirstValue(
      formData,
      MULTI_PRACTICE_FIELDS
    );
    const hasMultiPracticeYes =
      multiPracticeResponse && isAffirmative(multiPracticeResponse);

    // Check income threshold questions
    const incomeResponse = findFirstValue(formData, INCOME_THRESHOLD_FIELDS);
    const hasIncomeYes = incomeResponse && isAffirmative(incomeResponse);

    // Route to success if either question is answered "no" or not answered
    if (!hasMultiPracticeYes) {
      log('Multi-practice question not answered yes, routing to success page', {
        field: MULTI_PRACTICE_FIELDS.find((field) => formData[field]),
        value: multiPracticeResponse,
        hasYes: hasMultiPracticeYes,
      });
      return 'success';
    }

    if (!hasIncomeYes) {
      log(
        'Income threshold question not answered yes, routing to success page',
        {
          field: INCOME_THRESHOLD_FIELDS.find((field) => formData[field]),
          value: incomeResponse,
          hasYes: hasIncomeYes,
        }
      );
      return 'success';
    }

    // Only route to scheduler if BOTH questions are answered "yes"
    log(
      'Both income and multi-practice questions answered yes, routing to scheduler',
      {
        multiPracticeValue: multiPracticeResponse,
        incomeValue: incomeResponse,
      }
    );
    return 'general';
  }

  /**
   * Build scheduler URL with pre-filled data
   */
  function buildSchedulerUrl(schedulerType, formData) {
    const config = SCHEDULER_CONFIG[schedulerType] || SCHEDULER_CONFIG.general;
    const url = new URL(config.url);

    // Always add embed parameter
    url.searchParams.set('embed', 'true');

    // Pre-fill common fields
    const fieldMappings = {
      email: ['email', 'email_address'],
      firstName: ['firstname', 'first_name', 'fname'],
      lastName: ['lastname', 'last_name', 'lname'],
      company: ['company', 'practice_name', 'business_name'],
      phone: ['phone', 'phone_number', 'telephone'],
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

  /**
   * Redirect to appropriate destination (scheduler or success page)
   */
  function redirectToScheduler(formData, schedulerType) {
    // Handle success/soft rejection routing
    if (schedulerType === 'success') {
      // Build minimal URL with only email visible
      const params = new URLSearchParams();
      if (formData.email) {
        params.set('email', formData.email);
      }

      // Redirect to success page for soft rejections
      const redirectUrl = `${ROUTE_DESTINATIONS.success}${params.toString() ? '?' + params.toString() : ''}`;
      log('Redirecting to success page for soft rejection:', redirectUrl);
      window.location.href = redirectUrl;
      return;
    }

    // Store sensitive data in sessionStorage for scheduler routing
    const routerData = {
      scheduler_type: schedulerType,
      formData: formData,
      timestamp: Date.now(),
      source: 'hubspot_form',
    };

    try {
      sessionStorage.setItem(
        'scheduler_router_data',
        JSON.stringify(routerData)
      );
      log('Stored router data in sessionStorage');
    } catch (e) {
      log('Failed to store in sessionStorage, falling back to cookies');
      // Fallback to cookie if sessionStorage fails
      document.cookie = `scheduler_type=${schedulerType}; path=/; max-age=3600`;
      // Base64 encode the form data to avoid issues with special characters
      document.cookie = `form_data=${btoa(JSON.stringify(formData))}; path=/; max-age=3600`;
    }

    // Also store form data in localStorage for prefill functionality
    try {
      localStorage.setItem('hubspot_form_data', JSON.stringify(formData));
      log('Stored form data in localStorage for prefill');
    } catch (e) {
      log('Failed to store form data in localStorage:', e);
    }

    // Build minimal URL with only email visible
    const params = new URLSearchParams();
    if (formData.email) {
      params.set('email', formData.email);
    }

    // Redirect to target scheduler page with minimal query string
    const redirectUrl = `${ROUTE_DESTINATIONS.schedule}${params.toString() ? '?' + params.toString() : ''}`;
    log('Redirecting to:', redirectUrl);
    window.location.href = redirectUrl;
  }

  /**
   * Main form submission handler
   */
  function handleFormSubmission(formData, options = {}) {
    log('Form submission detected:', formData);
    if (HAS_ROUTED) {
      log('Routing already performed; skipping');
      return;
    }
    HAS_ROUTED = true;

    const partnerstackId = getPartnerstackClickId();
    if (partnerstackId) {
      if (!formData[PARTNERSTACK_FIELD_NAME]) {
        formData[PARTNERSTACK_FIELD_NAME] = partnerstackId;
      }

      try {
        sessionStorage.setItem(PARTNERSTACK_FIELD_NAME, partnerstackId);
      } catch (e) {
        log('Failed to persist partnerstack id in sessionStorage:', e);
      }

      try {
        localStorage.setItem(PARTNERSTACK_FIELD_NAME, partnerstackId);
      } catch (e) {
        log('Failed to persist partnerstack id in localStorage:', e);
      }
    }

    const schedulerType = determineSchedulerType(formData);
    redirectToScheduler(formData, schedulerType);

    // Fire analytics events
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
  }

  /**
   * Monitor form inputs for developer embed forms
   * Captures form data since developer embeds don't provide submission data
   */
  function initFormMonitoring() {
    // Store captured form data globally
    window._capturedFormData = window._capturedFormData || {};
    // Track previous values to avoid duplicate logging
    const previousValues = {};
    // Track processed elements to avoid duplicate listeners
    const processedElements = new WeakSet();

    // Function to capture the value
    function captureValue(input, eventType = 'change') {
      if (!input.name) return;

      let value = input.value;
      const fieldKey = input.name;

      // Check if value actually changed
      if (previousValues[fieldKey] === value) {
        return; // Value hasn't changed, skip
      }
      previousValues[fieldKey] = value;

      // Skip HubSpot internal fields
      if (
        fieldKey === 'hs_context' ||
        fieldKey.startsWith('hs_') ||
        fieldKey === 'guid'
      ) {
        return; // Don't track or log HubSpot internal fields
      }

      // Store the value
      window._capturedFormData[fieldKey] = value;

      // Only log if there's an actual value
      if (value) {
        // Determine field type for better logging
        let fieldType = input.type || input.tagName.toLowerCase();

        // Special handling for phone fields
        if (input.type === 'tel' || fieldKey.toLowerCase().includes('phone')) {
          // Also store clean version without formatting
          const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
          if (cleanPhone) {
            window._capturedFormData[fieldKey + '_clean'] = cleanPhone;
          }
          log('Captured phone:', fieldKey, '=', value);
        }
        // Check if it's a radio button based on type
        else if (input.type === 'radio') {
          log('Captured radio selection:', fieldKey, '=', value);
        }
        // Hidden inputs are often used for dropdowns in HubSpot
        else if (input.type === 'hidden') {
          // Skip hs_context and other HubSpot internal fields
          if (
            fieldKey === 'hs_context' ||
            fieldKey.startsWith('hs_') ||
            fieldKey === 'guid'
          ) {
            return; // Don't log HubSpot internal fields
          }
          // Check if this is actually a dropdown by looking for nearby dropdown elements
          const parent = input.closest('.hsfc-DropdownField');
          if (parent) {
            log('Captured dropdown:', fieldKey, '=', value);
          } else {
            // Only log hidden fields that aren't HubSpot internal
            log('Captured field:', fieldKey, '=', value);
          }
        } else {
          log('Captured', fieldType + ':', fieldKey, '=', value);
        }
      }
    }

    // Monitor form inputs using MutationObserver
    function monitorFormInputs() {
      const observer = new MutationObserver((mutations) => {
        // Process only new nodes, not all inputs every time
        const addedNodes = [];
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Element node
              addedNodes.push(node);
            }
          });
        });

        if (addedNodes.length === 0) return;

        // Find inputs in the newly added nodes
        addedNodes.forEach((node) => {
          const inputs = node.querySelectorAll
            ? node.querySelectorAll('input[name], select[name], textarea[name]')
            : [];

          // Also check if the node itself is an input
          if (
            node.tagName &&
            (node.tagName === 'INPUT' ||
              node.tagName === 'SELECT' ||
              node.tagName === 'TEXTAREA') &&
            node.name
          ) {
            processInput(node);
          }

          inputs.forEach((input) => processInput(input));
        });
      });

      function processInput(input) {
        // Skip if already processed
        if (processedElements.has(input)) return;
        processedElements.add(input);

        // Skip readonly inputs UNLESS they're hidden
        if (input.readOnly && input.type !== 'hidden') return;

        if (input.name === PARTNERSTACK_FIELD_NAME && !input.value) {
          const partnerstackId = getPartnerstackClickId();
          if (partnerstackId) {
            input.value = partnerstackId;
            captureValue(input, 'partnerstack_prefill');
          }
        }

        // For hidden inputs, monitor value changes directly
        if (input.type === 'hidden' && input.name) {
          // Use a simple interval check for hidden inputs (more reliable than property override)
          let lastValue = input.value;
          const checkInterval = setInterval(() => {
            if (input.value !== lastValue) {
              lastValue = input.value;
              captureValue(input, 'programmatic');
            }
            // Stop checking if element is removed
            if (!document.body.contains(input)) {
              clearInterval(checkInterval);
            }
          }, 500); // Check every 500ms

          // Capture initial value
          if (input.value) {
            captureValue(input, 'initial');
          }
        }
        // For radio buttons
        else if (input.type === 'radio') {
          input.addEventListener('change', () => captureValue(input));
        }
        // For phone inputs
        else if (
          input.type === 'tel' ||
          (input.name && input.name.toLowerCase().includes('phone'))
        ) {
          input.addEventListener('blur', () => captureValue(input));
          input.addEventListener('change', () => captureValue(input));
        }
        // For other inputs
        else {
          input.addEventListener('change', () => captureValue(input));
          input.addEventListener('blur', () => captureValue(input));

          // Capture initial value if present
          if (input.value) {
            captureValue(input, 'initial');
          }
        }
      }

      // Process any existing inputs on page load
      document
        .querySelectorAll('input[name], select[name], textarea[name]')
        .forEach(processInput);

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      log('Form input monitoring activated');
    }

    // Start monitoring when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', monitorFormInputs);
    } else {
      monitorFormInputs();
    }
  }

  /**
   * PostMessage event listener for HubSpot form submissions
   */
  function initPostMessageListener(options = {}) {
    log('Initializing postMessage listener');

    window.addEventListener('message', function (event) {
      // Verify the message is from HubSpot (broadened to hsforms.com)
      const isValidOrigin = (function (orig) {
        try {
          const host = new URL(orig).hostname;
          return (
            host.endsWith('hubspot.com') ||
            host.endsWith('hsforms.com') ||
            host.endsWith('hsforms.net') ||
            host.endsWith('hsappstatic.net') ||
            host.includes('hubspot') ||
            host.includes('hsforms')
          );
        } catch (e) {
          return false;
        }
      })(event.origin);

      if (!isValidOrigin) {
        return;
      }

      // Some HubSpot messages send stringified JSON
      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (_) {
          /* ignore */
        }
      }

      log('Received message from HubSpot:', payload);

      // Support both `type` and `messageType`
      const msgType = payload && (payload.type || payload.messageType);
      const eventName = payload && payload.eventName;

      // Check for standard form submission event
      if (
        payload &&
        msgType === 'hsFormCallback' &&
        (eventName === 'onFormSubmitted' || eventName === 'onFormSubmit')
      ) {
        const submissionData = payload.data;
        if (submissionData) {
          const normalized = normalizeFormData(submissionData);
          handleFormSubmission(normalized, options);
        }
      }
      // Check for developer embed submission (accepted: true)
      else if (payload && payload.formGuid && payload.accepted === true) {
        log('Developer embed submission detected');
        log('Using captured form data:', window._capturedFormData);

        // Use captured form data for developer embeds
        if (
          window._capturedFormData &&
          Object.keys(window._capturedFormData).length > 0
        ) {
          // Also store captured form data in localStorage for prefill
          try {
            localStorage.setItem(
              'hubspot_form_data',
              JSON.stringify(window._capturedFormData)
            );
            log('Stored captured form data in localStorage for prefill');
          } catch (e) {
            log('Failed to store captured form data in localStorage:', e);
          }

          handleFormSubmission(window._capturedFormData, options);
        }
      } else if (payload && msgType === 'hsFormCallback' && DEBUG) {
        // Helpful debug for other HS callbacks (ready, inlineMessage, etc.)
        log('Ignoring hsFormCallback event:', eventName);
      }
    });

    log('PostMessage listener initialized');
  }

  /**
   * Initialize the router with options
   */
  function init(options = {}) {
    const defaultOptions = {
      redirect: true, // Always redirect instead of embed
      debug: DEBUG,
    };

    const config = { ...defaultOptions, ...options };

    if (config.debug) {
      window.HubSpotRouterDebug = {
        config: SCHEDULER_CONFIG,
        determineSchedulerType,
        buildSchedulerUrl,
        handleFormSubmission,
      };
      log('Debug mode enabled. Access via window.HubSpotRouterDebug');
    }

    // Initialize form monitoring for developer embeds
    initFormMonitoring();

    // Initialize postMessage listener
    initPostMessageListener(config);

    log('HubSpot Form Router initialized with config:', config);
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  // Expose public API (merge with existing if already defined)
  window.HubSpotRouter = {
    ...window.HubSpotRouter,
    init,
    handleFormSubmission,
    determineSchedulerType,
    buildSchedulerUrl,
    config: SCHEDULER_CONFIG,
    DEBUG: DEBUG,
  };

  log('HubSpot Form Router loaded');
})();
