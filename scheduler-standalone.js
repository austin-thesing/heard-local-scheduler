/**
 * Scheduler Display - Injects HubSpot scheduler into target element
 * Usage: Include this script and have a div with id="scheduler-target" on your page
 */

(function () {
  "use strict";

  const DEBUG = window.location.search.includes("debug=true");

  function log(...args) {
    if (DEBUG) console.log("[Scheduler Display]", ...args);
  }

  // Force round-robin scheduler; ignore SCORP path
  const CONFIG_SCHEDULER_TYPE = "sole_prop"; // used to build URL via config
  const ANALYTICS_SCHEDULER_TYPE = "round_robin"; // used for event naming

  // Local fallback config so this script can run without the router loaded
  const FALLBACK_SCHEDULER_CONFIG = {
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

  // Fallback: determine scheduler type from params if not provided
  function determineSchedulerTypeFallback(params) {
    try {
      const candidates = ["is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_", "does_your_practice_have_multiple_owners", "multiple_owners", "practice_multiple_owners", "has_multiple_owners"];
      let value = null;
      for (const key of candidates) {
        if (params && params[key]) {
          value = params[key];
          break;
        }
      }
      if (!value) return "sole_prop";
      const normalized = String(value).toLowerCase().trim();
      if (normalized === "yes" || normalized === "true") return "s_corp";
      if (normalized === "no" || normalized === "false") return "sole_prop";
      return "sole_prop";
    } catch (_) {
      return "sole_prop";
    }
  }

  // Get data from sessionStorage or cookies (with localStorage support)
  function getRouterData() {
    // Try localStorage first (for form data prefill)
    try {
      const localStorageData = localStorage.getItem("hubspot_form_data");
      if (localStorageData) {
        const formData = JSON.parse(localStorageData);
        log("Found form data in localStorage");
        return { formData: formData };
      }
    } catch (e) {
      log("localStorage error:", e);
    }

    // Try sessionStorage first
    try {
      const storedData = sessionStorage.getItem("scheduler_router_data");
      if (storedData) {
        const data = JSON.parse(storedData);
        sessionStorage.removeItem("scheduler_router_data"); // Clear after reading
        return data;
      }
    } catch (e) {
      log("SessionStorage error:", e);
    }

    // Fallback to cookies
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

        return { scheduler_type: schedulerType, formData: formData };
      }
    } catch (e) {
      log("Cookie error:", e);
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

  // Build scheduler URL with prefill (enhanced to read localStorage)
  function buildSchedulerUrl(schedulerType, params) {
    const config = (window.HubSpotRouter && window.HubSpotRouter.config && window.HubSpotRouter.config[schedulerType]) || FALLBACK_SCHEDULER_CONFIG[schedulerType] || FALLBACK_SCHEDULER_CONFIG.sole_prop;
    const url = new URL(config.url);
    url.searchParams.set("embed", "true");

    // Standard field mappings (existing system)
    const fieldMappings = {
      email: ["email", "email_address"],
      firstName: ["firstname", "first_name", "fname"],
      lastName: ["lastname", "last_name", "lname"],
      company: ["company", "practice_name", "business_name"],
      phone: ["phone", "phone_number", "telephone"],
    };

    Object.entries(fieldMappings).forEach(([paramName, fieldNames]) => {
      for (const fieldName of fieldNames) {
        if (params && params[fieldName]) {
          url.searchParams.set(paramName, params[fieldName]);
          log(`Mapping ${fieldName} -> ${paramName}: ${params[fieldName]}`);
          break;
        }
      }
    });

    // Add UTM parameters if present
    const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    utmParams.forEach((param) => {
      if (params && params[param]) {
        url.searchParams.set(param, params[param]);
      }
    });

    log("Built scheduler URL:", url.toString());
    return url.toString();
  }

  // Fire lead tracking events
  function fireLeadEvents(schedulerType) {
    try {
      // Facebook Pixel
      if (typeof fbq !== "undefined") {
        fbq("track", "Lead", {
          content_category: "consultation",
          content_name: schedulerType + "_consultation",
        });
      }

      // Reddit Pixel
      if (typeof rdt !== "undefined") {
        rdt("track", "Lead", {
          customEventName: "ConsultationScheduler",
          schedulerType: schedulerType,
        });
      }

      // Google Analytics
      if (typeof gtag !== "undefined") {
        gtag("event", "generate_lead", {
          event_category: "engagement",
          event_label: schedulerType + "_consultation",
        });
      } else if (typeof ga !== "undefined") {
        ga("send", "event", "Lead", "Generate", schedulerType + "_consultation");
      }

      // PostHog
      if (typeof window.posthog !== "undefined") {
        window.posthog.capture("scheduler_lead_generated", {
          scheduler_type: schedulerType,
        });
      }

      // Amplitude
      if (typeof window.amplitude !== "undefined") {
        window.amplitude.track("scheduler_lead_generated", {
          scheduler_type: schedulerType,
        });
      }

      log("Lead events fired for:", schedulerType);
    } catch (e) {
      log("Lead tracking error:", e);
    }
  }

  // Inject scheduler into target element
  function injectScheduler() {
    // Find target element
    const target = document.getElementById("scheduler-target");
    if (!target) {
      console.error('[Scheduler Display] No element with id="scheduler-target" found');
      return;
    }

    const urlParams = getQueryParams();
    const routerData = getRouterData();

    // Merge URL params with any router-provided form data
    let params = { ...urlParams };
    if (routerData && routerData.formData) {
      params = { ...params, ...routerData.formData };
    }

    log("Params:", params);
    log("Forcing round-robin scheduler (ignoring scheduler_type)");

    // Build URL for forced round-robin scheduler (maps to sole_prop config)
    const configSource = window.HubSpotRouter && window.HubSpotRouter.config ? window.HubSpotRouter.config : FALLBACK_SCHEDULER_CONFIG;
    const selectedConfig = configSource[CONFIG_SCHEDULER_TYPE] || configSource.sole_prop;
    const schedulerUrl = window.HubSpotRouter && typeof window.HubSpotRouter.buildSchedulerUrl === "function" ? window.HubSpotRouter.buildSchedulerUrl(CONFIG_SCHEDULER_TYPE, params) : buildSchedulerUrl(CONFIG_SCHEDULER_TYPE, params);

    log("Loading scheduler:", selectedConfig && selectedConfig.name ? selectedConfig.name : "Round Robin");
    log("URL:", schedulerUrl);

    // Inject the scheduler
    target.innerHTML = `<div class="meetings-iframe-container" data-src="${schedulerUrl}"></div>`;

    // Load HubSpot embed script
    const script = document.createElement("script");
    script.src = "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";
    script.onload = function () {
      log("Scheduler loaded");
      fireLeadEvents(ANALYTICS_SCHEDULER_TYPE);
    };
    script.onerror = function () {
      console.error("[Scheduler Display] Failed to load scheduler");
    };
    document.head.appendChild(script);
  }

  // Initialize immediately; works with or without router present
  function init() {
    injectScheduler();
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  if (DEBUG) {
    window.SchedulerDisplay = {
      getRouterData,
      getQueryParams,
      determineSchedulerTypeFallback,
      buildSchedulerUrl,
      fireLeadEvents,
      injectScheduler,
      init,
    };
  }
})();
