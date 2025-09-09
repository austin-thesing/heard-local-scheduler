/**
 * Main bundle entry point
 * Handles both HubSpot router and Webflow scheduler initialization
 */

import { createRouter } from './core/HubSpotRouter.js';
import { createScheduler } from './core/WebflowScheduler.js';

/**
 * Initialize HubSpot Router if on a page with HubSpot forms
 */
function initHubSpotRouter() {
  // Check if we're on a page that needs the router
  const hasHubSpotForm = document.querySelector(
    '[data-form-id], .hs-form-html, script[src*="hsforms.net"]'
  );

  if (hasHubSpotForm || window.location.pathname.includes('/hs-scheduler/')) {
    try {
      const router = createRouter({
        debug: window.location.search.includes('debug=true'),
        redirect: true,
      });

      // Expose for backward compatibility
      window.HubSpotRouter = {
        init: (options) => router.init(options),
        handleFormSubmission: (data) => router.handleFormSubmission(data),
        determineSchedulerType: (data) => router.determineSchedulerType(data),
        buildSchedulerUrl: (type, data) => router.buildSchedulerUrl(type, data),
        config: router.config,
        DEBUG: router.options.debug,
      };

      console.log('[Bundle] HubSpot Router initialized');
    } catch (error) {
      console.error('[Bundle] Failed to initialize HubSpot Router:', error);
    }
  }
}

/**
 * Initialize Webflow Scheduler if on scheduler completion page
 */
function initWebflowScheduler() {
  // Check if we're on the scheduler completion page
  const isSchedulerPage =
    window.location.pathname.includes('/hs-scheduler/ty-general') ||
    document.getElementById('scheduler-target') ||
    document.querySelector('.meetings-iframe-container');

  if (isSchedulerPage) {
    try {
      const scheduler = createScheduler({
        debug: window.location.search.includes('debug=true'),
      });

      // Expose for backward compatibility
      if (scheduler.options.debug) {
        window.WebflowSchedulerComplete = {
          getStoredFormData: scheduler.getStoredFormData,
          getQueryParams: scheduler.getQueryParams,
          buildSchedulerUrl: scheduler.buildSchedulerUrl,
          handleScheduler: scheduler.handleScheduler,
          fireLeadEvents: scheduler.fireLeadEvents,
          init: scheduler.init,
          config: scheduler.config,
        };
      }

      console.log('[Bundle] Webflow Scheduler initialized');
    } catch (error) {
      console.error('[Bundle] Failed to initialize Webflow Scheduler:', error);
    }
  }
}

/**
 * Main initialization function
 */
function init() {
  console.log('[Bundle] Initializing scheduler components...');

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHubSpotRouter();
      initWebflowScheduler();
    });
  } else {
    initHubSpotRouter();
    initWebflowScheduler();
  }

  console.log('[Bundle] Scheduler bundle loaded');
}

// Auto-initialize
init();

// Export for manual initialization if needed
export { createRouter, createScheduler, init };
