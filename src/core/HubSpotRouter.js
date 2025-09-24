/**
 * HubSpot Form Router - Main router class
 * Handles HubSpot form submissions and routes users to appropriate schedulers
 */

import {
  normalizeFormData,
  determineSchedulerType,
} from '../utils/form-utils.js';
import {
  storeFormDataWithFallback,
  getStoredFormData,
} from '../utils/storage-utils.js';
import {
  buildSchedulerUrl,
  getQueryParams,
  isValidHubSpotOrigin,
} from '../utils/url-utils.js';
import { FormMonitor } from '../utils/dom-utils.js';
import {
  SCHEDULER_CONFIG,
  MULTIPLE_OWNERS_FIELDS,
} from '../config/scheduler-config.js';

/**
 * HubSpot Router main class
 */
export class HubSpotRouter {
  constructor(options = {}) {
    this.options = {
      redirect: true,
      debug: this.isDebugMode(),
      ...options,
    };

    this.logger = this.createLogger();
    this.hasRouted = false;
    this.formMonitor = null;

    this.logger.log('HubSpot Router initialized with options:', this.options);
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} Debug mode status
   */
  isDebugMode() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.search.includes('debug=true')
    );
  }

  /**
   * Create logger instance
   * @returns {Object} Logger object
   */
  createLogger() {
    return {
      log: (...args) => {
        if (this.options.debug) {
          console.log('[HubSpot Router]', ...args);
        }
      },
      error: (...args) => {
        console.error('[HubSpot Router]', ...args);
      },
    };
  }

  /**
   * Initialize the router
   */
  init() {
    this.logger.log('Initializing HubSpot Router...');

    // Initialize form monitoring for developer embeds
    this.initFormMonitoring();

    // Initialize postMessage listener
    this.initPostMessageListener();

    // Expose debug API if in debug mode
    if (this.options.debug) {
      this.exposeDebugApi();
    }

    this.logger.log('HubSpot Router initialization complete');
  }

  /**
   * Initialize form monitoring for developer embeds
   */
  initFormMonitoring() {
    this.formMonitor = new FormMonitor(this.logger);
    this.formMonitor.init();

    // Store captured data globally for compatibility
    window._capturedFormData = this.formMonitor.getCapturedData();

    // Update global reference when data changes
    const originalCapture = this.formMonitor.captureValue.bind(
      this.formMonitor
    );
    this.formMonitor.captureValue = (...args) => {
      originalCapture(...args);
      window._capturedFormData = this.formMonitor.getCapturedData();
    };
  }

  /**
   * Initialize postMessage event listener
   */
  initPostMessageListener() {
    this.logger.log('Initializing postMessage listener');

    window.addEventListener('message', this.handleMessage.bind(this));
    this.logger.log('PostMessage listener initialized');
  }

  /**
   * Handle incoming postMessage events
   * @param {MessageEvent} event - Message event
   */
  handleMessage(event) {
    // Verify the message is from HubSpot
    if (!isValidHubSpotOrigin(event.origin)) {
      return;
    }

    // Parse payload
    let payload = event.data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Ignore invalid JSON
        return;
      }
    }

    this.logger.log('Received message from HubSpot:', payload);

    // Handle different message types
    const msgType = payload && (payload.type || payload.messageType);
    const eventName = payload && payload.eventName;

    if (this.isFormSubmission(payload, msgType, eventName)) {
      this.handleFormSubmission(payload.data);
    } else if (this.isDeveloperEmbedSubmission(payload)) {
      this.handleDeveloperEmbedSubmission();
    } else if (this.options.debug && msgType === 'hsFormCallback') {
      this.logger.log('Ignoring hsFormCallback event:', eventName);
    }
  }

  /**
   * Check if message is a form submission
   * @param {Object} payload - Message payload
   * @param {string} msgType - Message type
   * @param {string} eventName - Event name
   * @returns {boolean} Whether message is form submission
   */
  isFormSubmission(payload, msgType, eventName) {
    return (
      payload &&
      msgType === 'hsFormCallback' &&
      (eventName === 'onFormSubmitted' || eventName === 'onFormSubmit')
    );
  }

  /**
   * Check if message is developer embed submission
   * @param {Object} payload - Message payload
   * @returns {boolean} Whether message is developer embed submission
   */
  isDeveloperEmbedSubmission(payload) {
    return payload && payload.formGuid && payload.accepted === true;
  }

  /**
   * Handle form submission
   * @param {Object} submissionData - Form submission data
   */
  handleFormSubmission(submissionData) {
    this.logger.log('Form submission detected:', submissionData);

    if (this.hasRouted) {
      this.logger.log('Routing already performed; skipping');
      return;
    }

    this.hasRouted = true;

    const normalizedData = normalizeFormData(submissionData);
    this.processFormSubmission(normalizedData);
  }

  /**
   * Handle developer embed submission
   */
  handleDeveloperEmbedSubmission() {
    this.logger.log('Developer embed submission detected');

    if (this.hasRouted) {
      this.logger.log('Routing already performed; skipping');
      return;
    }

    this.hasRouted = true;

    const capturedData = this.formMonitor.getCapturedData();
    this.logger.log('Using captured form data:', capturedData);

    if (Object.keys(capturedData).length > 0) {
      // Store captured form data for prefill
      try {
        localStorage.setItem('hubspot_form_data', JSON.stringify(capturedData));
        this.logger.log(
          'Stored captured form data in localStorage for prefill'
        );
      } catch (e) {
        this.logger.error(
          'Failed to store captured form data in localStorage:',
          e
        );
      }

      this.processFormSubmission(capturedData);
    }
  }

  /**
   * Process form submission and route to scheduler
   * @param {Object} formData - Form data
   */
  processFormSubmission(formData) {
    const schedulerType = determineSchedulerType(formData, this.logger);
    this.redirectToScheduler(formData, schedulerType);
    this.fireAnalyticsEvents(schedulerType, formData);
  }

  /**
   * Redirect to scheduler display page
   * @param {Object} formData - Form data
   * @param {string} schedulerType - Scheduler type
   */
  redirectToScheduler(formData, schedulerType) {
    // Store data with fallback mechanism
    const success = storeFormDataWithFallback(
      {
        schedulerType,
        formData,
        timestamp: Date.now(),
        source: 'hubspot_form',
      },
      this.logger
    );

    if (!success) {
      this.logger.error('Failed to store form data');
    }

    // Build minimal URL with only email visible
    const params = new URLSearchParams();
    if (formData.email) {
      params.set('email', formData.email);
    }

    // Redirect to target scheduler page
    const redirectUrl = `/hs-scheduler/ty-general${params.toString() ? '?' + params.toString() : ''}`;
    this.logger.log('Redirecting to:', redirectUrl);
    window.location.href = redirectUrl;
  }

  /**
   * Fire analytics events
   * @param {string} schedulerType - Scheduler type
   * @param {Object} formData - Form data
   */
  fireAnalyticsEvents(schedulerType, formData) {
    try {
      // Amplitude
      if (typeof window.amplitude !== 'undefined') {
        window.amplitude.track('scheduler_router_triggered', {
          scheduler_type: schedulerType,
          has_email: !!formData.email,
          has_name: !!(formData.firstname || formData.first_name),
        });
      }

      // PostHog
      if (typeof window.posthog !== 'undefined') {
        window.posthog.capture('scheduler_router_triggered', {
          scheduler_type: schedulerType,
          method: 'redirect',
        });
      }

      this.logger.log('Analytics events fired');
    } catch (e) {
      this.logger.error('Analytics tracking error:', e);
    }
  }

  /**
   * Expose debug API
   */
  exposeDebugApi() {
    window.HubSpotRouterDebug = {
      config: SCHEDULER_CONFIG,
      determineSchedulerType: (data) =>
        determineSchedulerType(data, this.logger),
      buildSchedulerUrl: (type, data) =>
        buildSchedulerUrl(type, data, SCHEDULER_CONFIG, this.logger),
      handleFormSubmission: this.handleFormSubmission.bind(this),
      getCapturedData: () => this.formMonitor.getCapturedData(),
      router: this,
    };

    this.logger.log('Debug API exposed via window.HubSpotRouterDebug');
  }

  /**
   * Cleanup resources
   */
export class HubSpotRouter {
  constructor(options = {}) {
    // ... existing code ...
    this.boundHandleMessage = null;
  }

  initPostMessageListener() {
    this.logger.log('Initializing postMessage listener');
   this.boundHandleMessage = this.handleMessage.bind(this);
   window.addEventListener('message', this.boundHandleMessage);
    this.logger.log('PostMessage listener initialized');
  }

  destroy() {
    if (this.formMonitor) {
      this.formMonitor.destroy();
    }
   if (this.boundHandleMessage) {
     window.removeEventListener('message', this.boundHandleMessage);
   }
    this.logger.log('HubSpot Router destroyed');
  }
}
}

/**
 * Create and initialize router instance
 * @param {Object} options - Router options
 * @returns {HubSpotRouter} Router instance
 */
export function createRouter(options = {}) {
  const router = new HubSpotRouter(options);
  router.init();
  return router;
}
