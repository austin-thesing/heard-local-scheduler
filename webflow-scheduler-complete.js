/**
 * Webflow Scheduler Complete - Standalone Version
 * This is a backward-compatible wrapper around the new modular architecture.
 * For new implementations, use the bundled version from dist/bundle.js
 */

// Import and initialize the Webflow Scheduler from the bundle
(function() {
  'use strict';
  
  // Load the main bundle if not already loaded
  if (!window.WebflowSchedulerModule) {
    const script = document.createElement('script');
    script.src = 'dist/bundle.js';
    script.async = false; // Load synchronously to ensure proper initialization
    script.onload = function() {
      console.log('[Webflow Scheduler] Modular bundle loaded successfully');
    };
    script.onerror = function() {
      console.error('[Webflow Scheduler] Failed to load modular bundle');
    };
    document.head.appendChild(script);
  }
})();