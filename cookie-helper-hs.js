// Helper to read a cookie by name
function getCookie(name) {
  console.log('[PartnerStack] getCookie called with name:', name);
  if (!name || typeof name !== 'string') {
    console.log('[PartnerStack] getCookie: invalid name parameter');
    return null;
  }
  try {
    const re = new RegExp(
      '(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'
    );
    const match = document.cookie.match(re);
    const result = match ? decodeURIComponent(match[1]) : null;
    console.log('[PartnerStack] getCookie result for', name + ':', result);
    return result;
  } catch (e) {
    console.warn('[PartnerStack] getCookie error:', e);
    // Fail gracefully
    return null;
  }
}

// Get PartnerStack click ID from multiple sources
function getPartnerStackId() {
  console.log('[PartnerStack] getPartnerStackId called');
  // Priority: sessionStorage → localStorage → cookie
  var psXid = null;

  // Check sessionStorage first (most recent)
  try {
    if (typeof sessionStorage !== 'undefined') {
      console.log('[PartnerStack] Checking sessionStorage for ps_xid');
      psXid = sessionStorage.getItem('ps_xid');
      console.log('[PartnerStack] sessionStorage ps_xid:', psXid);
    } else {
      console.log('[PartnerStack] sessionStorage not available');
    }
  } catch (e) {
    console.warn('[PartnerStack] sessionStorage access error:', e);
    psXid = null;
  }

  // Fall back to localStorage (persistent backup)
  if (!psXid) {
    try {
      if (typeof localStorage !== 'undefined') {
        console.log('[PartnerStack] Checking localStorage for ps_xid');
        psXid = localStorage.getItem('ps_xid');
        console.log('[PartnerStack] localStorage ps_xid:', psXid);
      } else {
        console.log('[PartnerStack] localStorage not available');
      }
    } catch (e) {
      console.warn('[PartnerStack] localStorage access error:', e);
      psXid = null;
    }
  }

  // Final fallback to cookie
  if (!psXid) {
    console.log('[PartnerStack] Falling back to cookie');
    psXid = getCookie('ps_xid');
  }

  console.log('[PartnerStack] Final PartnerStack ID:', psXid);
  return psXid;
}

// Inject PartnerStack ID into existing form fields
function injectPartnerStackId() {
  console.log('[PartnerStack] injectPartnerStackId called');
  const psXid = getPartnerStackId();
  if (!psXid) {
    console.log(
      '[PartnerStack] No PartnerStack ID available, skipping injection'
    );
    return; // No PartnerStack ID to inject
  }
  console.log('[PartnerStack] Injecting PartnerStack ID:', psXid);

  // Find all PartnerStack input fields in existing forms
  const selectors = [
    'input[name="partnerstack_click_id"]',
    'input[name$="/partnerstack_click_id"]', // Handle prefixed field names
    'input[name="ps_xid"]',
    'input[name$="/ps_xid"]',
  ];
  console.log('[PartnerStack] Searching for fields with selectors:', selectors);
  const inputs = document.querySelectorAll(selectors.join(', '));
  console.log('[PartnerStack] Found', inputs.length, 'potential input fields');

  inputs.forEach(function (input, index) {
    console.log(
      '[PartnerStack] Processing field',
      index + 1,
      '- name:',
      input.name,
      'current value:',
      input.value
    );
    if (input && !input.value) {
      try {
        console.log('[PartnerStack] Injecting into field:', input.name);
        input.value = psXid;
        input.setAttribute('value', psXid);

        // Trigger events to ensure form validation and submission handlers see the value
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);

        console.log(
          '[PartnerStack] Successfully injected ID into field:',
          input.name
        );
      } catch (e) {
        console.warn(
          '[PartnerStack] Failed to inject into field:',
          input.name,
          e
        );
      }
    } else {
      console.log(
        '[PartnerStack] Skipping field:',
        input.name,
        '- reason:',
        input.value ? 'already has value' : 'invalid element'
      );
    }
  });
}

// For HubSpot developer embeds, listen for form ready events
function setupHubSpotListener() {
  console.log('[PartnerStack] setupHubSpotListener called');
  if (!window.hbspt || !window.hbspt.forms) {
    console.log(
      '[PartnerStack] HubSpot forms library not available, skipping listener setup'
    );
    return;
  }
  console.log(
    '[PartnerStack] HubSpot forms library detected, setting up message listener'
  );

  // Listen for postMessage events from HubSpot forms
  window.addEventListener('message', function (event) {
    console.log('[PartnerStack] Received message event:', event.data);
    try {
      if (event.data && event.data.type === 'hsFormCallback') {
        const payload = event.data;
        const eventName = payload.eventName;
        console.log(
          '[PartnerStack] HubSpot form callback received:',
          eventName
        );

        // Inject PartnerStack ID when form is ready
        if (eventName === 'onFormReady') {
          console.log(
            '[PartnerStack] Form ready event detected, scheduling injection in 100ms'
          );
          // Small delay to ensure form is fully rendered
          setTimeout(injectPartnerStackId, 100);
        }
      } else {
        console.log(
          '[PartnerStack] Ignoring non-HubSpot message:',
          event.data ? event.data.type : 'no type'
        );
      }
    } catch (e) {
      console.warn('[PartnerStack] Error processing message event:', e);
      // Ignore message parsing errors
    }
  });
}

// Initialize when DOM is ready
function init() {
  console.log('[PartnerStack] Initializing PartnerStack cookie helper');
  console.log(
    '[PartnerStack] Current document readyState:',
    document.readyState
  );

  // Try to inject immediately (for forms that are already loaded)
  console.log('[PartnerStack] Attempting immediate injection');
  injectPartnerStackId();

  // Set up HubSpot event listeners
  console.log('[PartnerStack] Setting up HubSpot listeners');
  setupHubSpotListener();

  // Also try again after a short delay in case forms load asynchronously
  console.log('[PartnerStack] Scheduling delayed injections at 1s and 3s');
  setTimeout(function () {
    console.log('[PartnerStack] Running 1-second delayed injection');
    injectPartnerStackId();
  }, 1000);
  setTimeout(function () {
    console.log('[PartnerStack] Running 3-second delayed injection');
    injectPartnerStackId();
  }, 3000); // Backup for slower-loading forms
}

// Run initialization
console.log(
  '[PartnerStack] Checking DOM readyState for initialization:',
  document.readyState
);
if (document.readyState === 'loading') {
  console.log('[PartnerStack] DOM still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', function () {
    console.log(
      '[PartnerStack] DOMContentLoaded fired, starting initialization'
    );
    init();
  });
} else {
  console.log(
    '[PartnerStack] DOM already loaded, starting initialization immediately'
  );
  init();
}
