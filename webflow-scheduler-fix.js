/**
 * Webflow Scheduler Enhancement Script
 * This script should be added to the Webflow scheduler page to enable form data passthrough
 * It detects stored form data and enhances the default HubSpot iframe with pre-filled data
 */

(function () {
  "use strict";

  const DEBUG = window.location.search.includes("debug=true");

  function log(...args) {
    if (DEBUG) console.log("[Webflow Scheduler Fix]", ...args);
  }

  // Configuration - matches the main router config
  const SCHEDULER_CONFIG = {
    sole_prop: {
      url: "https://meetings.hubspot.com/bz/consultation",
      name: "Round Robin Consultation",
      description: "For all practices (round-robin)",
    },
    s_corp: {
      url: "https://meetings.hubspot.com/bz/consultations", 
      name: "S-Corp Consultation",
      description: "For multi-owner practices",
    },
  };

  // Get form data from storage
  function getStoredFormData() {
    // Try localStorage first (for form data prefill)
    try {
      const localStorageData = localStorage.getItem("hubspot_form_data");
      if (localStorageData) {
        const formData = JSON.parse(localStorageData);
        log("Found form data in localStorage:", formData);
        return { formData: formData, source: "localStorage" };
      }
    } catch (e) {
      log("localStorage error:", e);
    }

    // Try sessionStorage
    try {
      const storedData = sessionStorage.getItem("scheduler_router_data");
      if (storedData) {
        const data = JSON.parse(storedData);
        log("Found router data in sessionStorage:", data);
        sessionStorage.removeItem("scheduler_router_data"); // Clear after reading
        return { formData: data.formData, schedulerType: data.scheduler_type, source: "sessionStorage" };
      }
    } catch (e) {
      log("sessionStorage error:", e);
    }

    // Try cookies as fallback
    try {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
      };

      const schedulerType = getCookie("scheduler_type");
      const formDataCookie = getCookie("form_data");

      if (schedulerType || formDataCookie) {
        const formData = formDataCookie ? JSON.parse(atob(formDataCookie)) : {};

        // Clear cookies
        document.cookie = "scheduler_type=; path=/; max-age=0";
        document.cookie = "form_data=; path=/; max-age=0";

        log("Found data in cookies:", { schedulerType, formData });
        return { formData: formData, schedulerType: schedulerType, source: "cookies" };
      }
    } catch (e) {
      log("cookie error:", e);
    }

    return null;
  }

  // Build enhanced scheduler URL with form data
  function buildEnhancedSchedulerUrl(formData, schedulerType = "sole_prop") {
    const config = SCHEDULER_CONFIG[schedulerType] || SCHEDULER_CONFIG.sole_prop;
    const url = new URL(config.url);

    // Always add embed parameter
    url.searchParams.set("embed", "true");

    // Pre-fill common fields
    const fieldMappings = {
      email: ["email", "email_address"],
      firstName: ["firstname", "first_name", "fname"],
      lastName: ["lastname", "last_name", "lname"],
      company: ["company", "practice_name", "business_name"],
      phone: ["phone", "phone_number", "telephone"],
    };

    // Handle additional HubSpot-specific fields that don't get mapped to standard params
    const additionalFields = [
      "is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_",
      "what_best_describes_your_practice_",
      "referrer",
      "submissionGuid", 
      "uuid"
    ];

    Object.entries(fieldMappings).forEach(([paramName, fieldNames]) => {
      for (const fieldName of fieldNames) {
        if (formData[fieldName]) {
          url.searchParams.set(paramName, formData[fieldName]);
          log(`Mapping ${fieldName} -> ${paramName}: ${formData[fieldName]}`);
          break;
        }
      }
    });

    // Add additional fields as-is (these are HubSpot-specific fields)
    additionalFields.forEach(fieldName => {
      if (formData[fieldName]) {
        url.searchParams.set(fieldName, formData[fieldName]);
        log(`Adding additional field: ${fieldName} = ${formData[fieldName]}`);
      }
    });

    // Add UTM parameters if present
    const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    utmParams.forEach((param) => {
      if (formData[param]) {
        url.searchParams.set(param, formData[param]);
      }
    });

    log("Built enhanced scheduler URL:", url.toString());
    return url.toString();
  }

  // Fix existing URLs that might be missing embed=true parameter
  function fixExistingUrlsWithoutEmbed() {
    // Find all iframes with HubSpot URLs
    const iframes = document.querySelectorAll('iframe[src*="meetings.hubspot.com"]');
    
    iframes.forEach(iframe => {
      try {
        const currentUrl = new URL(iframe.src);
        
        // If embed=true is missing, add it
        if (!currentUrl.searchParams.has('embed')) {
          log("Found iframe without embed=true, fixing:", iframe.src);
          currentUrl.searchParams.set('embed', 'true');
          iframe.src = currentUrl.toString();
          log("Fixed iframe URL:", iframe.src);
        }
      } catch (e) {
        log("Error fixing iframe URL:", e);
      }
    });

    // Also check iframe containers
    const containers = document.querySelectorAll('.meetings-iframe-container[data-src*="meetings.hubspot.com"]');
    
    containers.forEach(container => {
      try {
        const dataSrc = container.getAttribute('data-src');
        const currentUrl = new URL(dataSrc);
        
        if (!currentUrl.searchParams.has('embed')) {
          log("Found container without embed=true, fixing:", dataSrc);
          currentUrl.searchParams.set('embed', 'true');
          container.setAttribute('data-src', currentUrl.toString());
          log("Fixed container data-src:", currentUrl.toString());
        }
      } catch (e) {
        log("Error fixing container URL:", e);
      }
    });
  }

  // Find and enhance existing HubSpot iframe
  function enhanceExistingIframe() {
    log("Looking for existing HubSpot iframe...");

    // Look for the iframe container or iframe itself
    const iframeContainer = document.querySelector('.meetings-iframe-container');
    const iframe = document.querySelector('iframe[src*="meetings.hubspot.com"]') || 
                   document.querySelector('iframe[src*="hsforms.com"]');

    if (!iframeContainer && !iframe) {
      log("No HubSpot iframe found");
      return false;
    }

    const storedData = getStoredFormData();
    if (!storedData || !storedData.formData) {
      log("No stored form data found, leaving iframe as-is");
      return false;
    }

    log("Found stored form data, enhancing iframe...");
    
    // Force round-robin (sole_prop config) regardless of stored scheduler type
    const enhancedUrl = buildEnhancedSchedulerUrl(storedData.formData, "sole_prop");

    // Update the iframe or container
    if (iframeContainer) {
      log("Updating iframe container");
      iframeContainer.setAttribute('data-src', enhancedUrl);
      
      // If there's an existing iframe inside, update its src
      const existingIframe = iframeContainer.querySelector('iframe');
      if (existingIframe) {
        existingIframe.src = enhancedUrl;
        log("Updated existing iframe src");
      }
    } else if (iframe) {
      log("Updating iframe directly");
      iframe.src = enhancedUrl;
    }

    // Also check for and fix any existing URLs that might be missing embed=true
    fixExistingUrlsWithoutEmbed();

    // Fire analytics events
    try {
      // PostHog
      if (typeof window.posthog !== "undefined") {
        window.posthog.capture("scheduler_enhanced_on_webflow", {
          source: storedData.source,
          has_email: !!storedData.formData.email,
          has_name: !!(storedData.formData.firstname || storedData.formData.first_name),
        });
      }

      // Amplitude
      if (typeof window.amplitude !== "undefined") {
        window.amplitude.track("scheduler_enhanced_on_webflow", {
          source: storedData.source,
          has_email: !!storedData.formData.email,
        });
      }
    } catch (e) {
      log("Analytics error:", e);
    }

    log("Iframe enhancement completed");
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
      📁 localStorage: ${localStorage.getItem("hubspot_form_data") ? "✅ Found" : "❌ Empty"}<br>
      💾 sessionStorage: ${sessionStorage.getItem("scheduler_router_data") ? "✅ Found" : "❌ Empty"}<br>
      🍪 Cookies: ${document.cookie.includes("form_data=") ? "✅ Found" : "❌ Empty"}<br><br>
      <strong>URL Parameters:</strong><br>
      ${urlParams.toString() || "None"}<br><br>
      <strong>Stored Data:</strong><br>
      ${storedData ? `Source: ${storedData.source}<br>Fields: ${Object.keys(storedData.formData || {}).join(", ")}` : "None found"}
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
        debugPanel.style.left = (e.clientX - dragOffset.x) + 'px';
        debugPanel.style.top = (e.clientY - dragOffset.y) + 'px';
        debugPanel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Main initialization function
  function init() {
    log("Webflow Scheduler Fix initializing...");

    // Add debug panel if in debug mode
    addDebugPanel();

    // Always try to fix embed=true parameter first, even without form data
    setTimeout(() => {
      log("Ensuring all HubSpot iframes have embed=true parameter...");
      fixExistingUrlsWithoutEmbed();
    }, 500);

    // Try to enhance existing iframe immediately
    if (enhanceExistingIframe()) {
      log("Successfully enhanced existing iframe");
      return;
    }

    // If no iframe found, wait a bit and try again
    setTimeout(() => {
      log("Retrying iframe enhancement after delay...");
      enhanceExistingIframe();
    }, 2000);

    // Also set up a MutationObserver to catch dynamically added iframes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const iframe = node.querySelector && node.querySelector('iframe[src*="meetings.hubspot.com"]');
            if (iframe || (node.tagName === 'IFRAME' && node.src && node.src.includes('meetings.hubspot.com'))) {
              log("New HubSpot iframe detected, enhancing...");
              setTimeout(() => enhanceExistingIframe(), 100);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log("Webflow Scheduler Fix initialized");
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  if (DEBUG) {
    window.WebflowSchedulerFix = {
      getStoredFormData,
      buildEnhancedSchedulerUrl,
      enhanceExistingIframe,
      config: SCHEDULER_CONFIG,
      init
    };
  }

  log("Webflow Scheduler Fix script loaded");
})();
