/**
 * HubSpot Form Router
 * Listens for HubSpot form submissions and routes users to appropriate schedulers
 * Based on form responses, particularly "Does your practice have multiple owners?"
 */

(function () {
  "use strict";

  // Configuration for different scheduler types
  const SCHEDULER_CONFIG = {
    sole_prop: {
      url: "https://meetings.hubspot.com/bz/consultation",
      name: "Sole Proprietor Consultation",
      description: "For single-owner practices",
    },
    s_corp: {
      url: "https://meetings.hubspot.com/bz/consultations",
      name: "S-Corp Consultation",
      description: "For multi-owner practices",
    },
  };

  // Debug logging
  const DEBUG = window.location.hostname === "localhost" || window.location.search.includes("debug=true");

  function log(...args) {
    if (DEBUG) {
      console.log("[HubSpot Router]", ...args);
    }
  }

  // Ensure we only route once per page load
  let HAS_ROUTED = false;

  // Normalize HubSpot payloads and raw form objects into a flat key/value map
  function canonicalKey(key) {
    try {
      if (!key) return "";
      const str = String(key);
      return str.indexOf("/") !== -1 ? str.split("/").pop() : str;
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
        const raw = f.name || f.field || "";
        const name = canonicalKey(raw);
        const val = typeof f.value === "string" ? f.value : Array.isArray(f.value) ? f.value[0] : f.value != null ? String(f.value) : "";
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
          const raw = f.name || f.field || "";
          const name = canonicalKey(raw);
          const val = typeof f.value === "string" ? f.value : Array.isArray(f.value) ? f.value[0] : f.value != null ? String(f.value) : "";
          if (raw) out[raw] = val;
          if (name && name !== raw) out[name] = val;
        });
      } else if (typeof fields === "object") {
        Object.entries(fields).forEach(([k, v]) => {
          const name = canonicalKey(k);
          const val = typeof v === "string" ? v : Array.isArray(v) ? v[0] : v != null ? String(v) : "";
          out[k] = val;
          if (name && name !== k) out[name] = val;
        });
      }
      return out;
    }

    // Plain object of key/values
    Object.entries(input).forEach(([k, v]) => {
      const name = canonicalKey(k);
      const val = typeof v === "string" ? v : Array.isArray(v) ? v[0] : v != null ? String(v) : "";
      out[k] = val;
      if (name && name !== k) out[name] = val;
    });
    return out;
  }

  /**
   * Determine scheduler type based on form data
   */
  function determineSchedulerType(formData) {
    log("Determining scheduler type from form data:", formData);

    // Look for the "multiple owners" field with various possible names
    const multipleOwnersFields = ["is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_", "does_your_practice_have_multiple_owners", "multiple_owners", "practice_multiple_owners", "has_multiple_owners"];

    let multipleOwners = null;

    // Check each possible field name
    for (const fieldName of multipleOwnersFields) {
      if (formData[fieldName]) {
        multipleOwners = formData[fieldName];
        log(`Found multiple owners field: ${fieldName} = ${multipleOwners}`);
        break;
      }
    }

    if (!multipleOwners) {
      log("No multiple owners field found, using default");
      return "default";
    }

    // Normalize the value
    const normalizedValue = multipleOwners.toString().toLowerCase().trim();

    if (normalizedValue === "no" || normalizedValue === "false") {
      log("Single owner detected -> sole_prop");
      return "sole_prop";
    } else if (normalizedValue === "yes" || normalizedValue === "true") {
      log("Multiple owners detected -> s_corp");
      return "s_corp";
    }

    log("Unclear response, using default");
    return "default";
  }

  /**
   * Build scheduler URL with pre-filled data
   */
  function buildSchedulerUrl(schedulerType, formData) {
    const config = SCHEDULER_CONFIG[schedulerType] || SCHEDULER_CONFIG.default;
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
    const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    utmParams.forEach((param) => {
      if (formData[param]) {
        url.searchParams.set(param, formData[param]);
      }
    });

    log("Built scheduler URL:", url.toString());
    return url.toString();
  }

  /**
   * Redirect to scheduler display page
   */
  function redirectToScheduler(formData, schedulerType) {
    const params = new URLSearchParams();

    // Add form data as URL parameters
    Object.entries(formData).forEach(([key, value]) => {
      if (value && typeof value === "string") {
        params.set(key, value);
      }
    });

    // Add scheduler type
    params.set("scheduler_type", schedulerType);

    // Redirect to scheduler display page
    const redirectUrl = `scheduler-display.html?${params.toString()}`;
    log("Redirecting to:", redirectUrl);
    window.location.href = redirectUrl;
  }

  /**
   * Main form submission handler
   */
  function handleFormSubmission(formData, options = {}) {
    log("Form submission detected:", formData);
    if (HAS_ROUTED) {
      log("Routing already performed; skipping");
      return;
    }
    HAS_ROUTED = true;

    const schedulerType = determineSchedulerType(formData);
    redirectToScheduler(formData, schedulerType);

    // Fire analytics events
    if (typeof window.amplitude !== "undefined") {
      window.amplitude.track("scheduler_router_triggered", {
        scheduler_type: schedulerType,
        has_email: !!formData.email,
        has_name: !!(formData.firstname || formData.first_name),
      });
    }

    if (typeof window.posthog !== "undefined") {
      window.posthog.capture("scheduler_router_triggered", {
        scheduler_type: schedulerType,
        method: "redirect",
      });
    }
  }

  /**
   * PostMessage event listener for HubSpot form submissions
   */
  function initPostMessageListener(options = {}) {
    log("Initializing postMessage listener");

    window.addEventListener("message", function (event) {
      // Verify the message is from HubSpot (broadened to hsforms.com)
      const isValidOrigin = (function (orig) {
        try {
          const host = new URL(orig).hostname;
          return host.endsWith("hubspot.com") || host.endsWith("hsforms.com") || host.endsWith("hsforms.net") || host.endsWith("hsappstatic.net") || host.includes("hubspot") || host.includes("hsforms");
        } catch (e) {
          return false;
        }
      })(event.origin);

      if (!isValidOrigin) {
        return;
      }

      // Some HubSpot messages send stringified JSON
      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (_) {
          /* ignore */
        }
      }

      log("Received message from HubSpot:", payload);

      // Support both `type` and `messageType`
      const msgType = payload && (payload.type || payload.messageType);
      const eventName = payload && payload.eventName;

      // Check for form submission event
      if (payload && msgType === "hsFormCallback" && (eventName === "onFormSubmitted" || eventName === "onFormSubmit")) {
        const submissionData = payload.data;
        if (submissionData) {
          const normalized = normalizeFormData(submissionData);
          handleFormSubmission(normalized, options);
        }
      } else if (payload && msgType === "hsFormCallback" && DEBUG) {
        // Helpful debug for other HS callbacks (ready, inlineMessage, etc.)
        log("Ignoring hsFormCallback event:", eventName);
      }
    });

    log("PostMessage listener initialized");
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
      log("Debug mode enabled. Access via window.HubSpotRouterDebug");
    }

    initPostMessageListener(config);
    log("HubSpot Form Router initialized with config:", config);
  }

  // Auto-initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  // Expose public API
  window.HubSpotRouter = {
    init,
    handleFormSubmission,
    determineSchedulerType,
    buildSchedulerUrl,
    config: SCHEDULER_CONFIG,
  };

  log("HubSpot Form Router loaded");
})();
