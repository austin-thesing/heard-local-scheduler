/**
 * Webflow Scheduler Complete - Handles scheduler injection and fallback redirect
 */

import { getStoredFormData } from '../utils/storage-utils.js';
import { buildSchedulerUrl, getQueryParams } from '../utils/url-utils.js';
import { safeHtmlInjection } from '../utils/dom-utils.js';
import {
  ROUND_ROBIN_CONFIG,
  FIELD_MAPPINGS,
  ADDITIONAL_HUBSPOT_FIELDS,
  UTM_PARAMS,
} from '../config/scheduler-config.js';

/**
 * Webflow Scheduler main class
 */
export class WebflowScheduler {
  constructor(options = {}) {
    this.options = {
      debug: window.location.search.includes('debug=true'),
      ...options,
    };

    this.logger = this.createLogger();
    this.debugPanel = null;

    this.logger.log(
      'Webflow Scheduler initialized with options:',
      this.options
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
          console.log('[Webflow Scheduler]', ...args);
        }
      },
      error: (...args) => {
        console.error('[Webflow Scheduler]', ...args);
      },
    };
  }

  /**
   * Initialize the scheduler
   */
  init() {
    this.logger.log('Webflow Scheduler Complete initializing...');

    // Add debug panel if in debug mode
    if (this.options.debug) {
      this.addDebugPanel();
    }

    // Handle scheduler setup
    this.handleScheduler();

    this.logger.log('Webflow Scheduler Complete initialized');
  }

  /**
   * Main scheduler handling logic
   */
  handleScheduler() {
    this.logger.log('Starting scheduler setup...');

    const urlParams = getQueryParams();
    const storedData = getStoredFormData(this.logger);

    // Merge URL params with any stored form data
    let allFormData = { ...urlParams };
    if (storedData && storedData.formData) {
      allFormData = { ...allFormData, ...storedData.formData };
      this.logger.log('Merged form data from storage:', allFormData);
    }

    // Check if we have any meaningful form data
    if (!this.hasMeaningfulFormData(allFormData)) {
      this.logger.log('No form data found, redirecting to /free-consult');
      window.location.href = '/free-consult';
      return;
    }

    this.logger.log('Form data found, setting up scheduler');

    // Find or create target element
    const target = this.findOrCreateTarget();
    if (!target) {
      this.logger.error('Failed to find or create scheduler target');
      return;
    }

    // Build scheduler URL with all form data
    const schedulerUrl = this.buildSchedulerUrl(allFormData);

    this.logger.log('Injecting scheduler into target');
    this.logger.log('Final URL:', schedulerUrl);

    // Inject scheduler
    this.injectScheduler(target, schedulerUrl);
  }

  /**
   * Check if form data contains meaningful information
   * @param {Object} formData - Form data to check
   * @returns {boolean} Whether data is meaningful
   */
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

  /**
   * Find existing target or create new one
   * @returns {HTMLElement|null} Target element
   */
  findOrCreateTarget() {
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
        this.logger.log('Found existing iframe/container, will enhance it');
        target = this.wrapExistingIframe(existingIframe, iframeContainer);
      }
    }

    // If still no target, create one
    if (!target) {
      this.logger.log('No target found, creating scheduler-target div');
      target = this.createTargetDiv();
    }

    return target;
  }

  /**
   * Wrap existing iframe in target div
   * @param {HTMLIFrameElement|null} existingIframe - Existing iframe
   * @param {HTMLElement|null} iframeContainer - Existing container
   * @returns {HTMLElement} Wrapper element
   */
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

  /**
   * Create new target div
   * @returns {HTMLElement} Created target div
   */
  createTargetDiv() {
    const target = document.createElement('div');
    target.id = 'scheduler-target';
    target.style.cssText = 'min-height: 600px; width: 100%;';
    document.body.appendChild(target);
    return target;
  }

  /**
   * Build scheduler URL with form data
   * @param {Object} formData - Form data
   * @returns {string} Built scheduler URL
   */
  buildSchedulerUrl(formData) {
    const config = ROUND_ROBIN_CONFIG.sole_prop;
    const url = new URL(config.url);

    // Always add embed parameter
    url.searchParams.set('embed', 'true');

    // Pre-fill common fields
    Object.entries(FIELD_MAPPINGS).forEach(([paramName, fieldNames]) => {
      for (const fieldName of fieldNames) {
        if (formData[fieldName]) {
          url.searchParams.set(paramName, formData[fieldName]);
          this.logger.log(
            `Mapping ${fieldName} -> ${paramName}: ${formData[fieldName]}`
          );
          break;
        }
      }
    });

    // Handle additional HubSpot-specific fields
    ADDITIONAL_HUBSPOT_FIELDS.forEach((fieldName) => {
      // Check for exact field name first
      if (formData[fieldName]) {
        url.searchParams.set(fieldName, formData[fieldName]);
        this.logger.log(
          `Adding additional field: ${fieldName} = ${formData[fieldName]}`
        );
      } else {
        // Check for prefixed versions
        const prefixedVersions = [`0-1/${fieldName}`, `0-2/${fieldName}`];
        for (const prefixedField of prefixedVersions) {
          if (formData[prefixedField]) {
            url.searchParams.set(fieldName, formData[prefixedField]);
            this.logger.log(
              `Adding prefixed field: ${prefixedField} -> ${fieldName} = ${formData[prefixedField]}`
            );
            break;
          }
        }
      }
    });

    // Add UTM parameters if present
    UTM_PARAMS.forEach((param) => {
      if (formData[param]) {
        url.searchParams.set(param, formData[param]);
      }
    });

    this.logger.log('Built scheduler URL:', url.toString());
    return url.toString();
  }

  /**
   * Inject scheduler into target element
   * @param {HTMLElement} target - Target element
   * @param {string} schedulerUrl - Scheduler URL
   */
  injectScheduler(target, schedulerUrl) {
    // Use safe HTML injection
    const html = `<div class="meetings-iframe-container" data-src="${schedulerUrl}"></div>`;

    if (!safeHtmlInjection(target, html)) {
      this.logger.error('Failed to inject scheduler HTML');
      return;
    }

    // Load HubSpot embed script
    this.loadHubSpotEmbedScript();
  }

  /**
   * Load HubSpot embed script
   */
  loadHubSpotEmbedScript() {
    const script = document.createElement('script');
    script.src =
      'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.onload = () => {
      this.logger.log('HubSpot embed script loaded successfully');
      this.fireLeadEvents();
    };
    script.onerror = () => {
      this.logger.error('Failed to load HubSpot embed script');
    };
    document.head.appendChild(script);
  }

  /**
   * Fire lead tracking events
   */
  fireLeadEvents() {
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

      this.logger.log('Lead events fired');
    } catch (e) {
      this.logger.error('Lead tracking error:', e);
    }
  }

  /**
   * Add debug panel if debug mode is enabled
   */
  addDebugPanel() {
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

    const storedData = getStoredFormData(this.logger);
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
    this.debugPanel = debugPanel;

    // Make it draggable
    this.makeDebugPanelDraggable(debugPanel);
  }

  /**
   * Make debug panel draggable
   * @param {HTMLElement} debugPanel - Debug panel element
   */
  makeDebugPanelDraggable(debugPanel) {
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

  /**
   * Expose debug API
   */
  exposeDebugApi() {
    if (this.options.debug) {
      window.WebflowSchedulerComplete = {
        getStoredFormData: () => getStoredFormData(this.logger),
        getQueryParams,
        buildSchedulerUrl: (data) => this.buildSchedulerUrl(data),
        handleScheduler: () => this.handleScheduler(),
        fireLeadEvents: () => this.fireLeadEvents(),
        init: () => this.init(),
        config: ROUND_ROBIN_CONFIG,
      };
    }
  }
}

/**
 * Create and initialize scheduler instance
 * @param {Object} options - Scheduler options
 * @returns {WebflowScheduler} Scheduler instance
 */
export function createScheduler(options = {}) {
  const scheduler = new WebflowScheduler(options);
  scheduler.init();
  return scheduler;
}
