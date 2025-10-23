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

  // Try to update via HubSpot API first if available
  if (window.HubSpotForms && typeof window.HubSpotForms.updateFieldValue === 'function') {
    console.log('[PartnerStack] HubSpot API available, attempting to update field via API');
    try {
      // Update all possible field variations
      ['partnerstack_click_id', '0-1/partnerstack_click_id', '0-2/partnerstack_click_id', '0-3/partnerstack_click_id'].forEach(function(fieldName) {
        try {
          window.HubSpotForms.updateFieldValue('partnerstack_click_id', fieldName, psXid);
          console.log('[PartnerStack] Updated field via HubSpot API:', fieldName);
        } catch (e) {
          // Field might not exist in this form
        }
      });
    } catch (e) {
      console.warn('[PartnerStack] Failed to update via HubSpot API:', e);
    }
  }

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
        
        // Update DOM value
        input.value = psXid;
        input.setAttribute('value', psXid);

        // Try to update HubSpot's internal state using React-like property setter
        if (input._valueTracker) {
          input._valueTracker.setValue(psXid);
        }

        // Trigger native input event for React/HubSpot forms
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, psXid);
        
        // Trigger events to ensure form validation and submission handlers see the value
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        const focusEvent = new Event('focus', { bubbles: true });
        const blurEvent = new Event('blur', { bubbles: true });
        
        input.dispatchEvent(focusEvent);
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
        input.dispatchEvent(blurEvent);

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

  // Also try to update HubSpot form instance directly if available
  try {
    if (window.hbspt && window.hbspt.forms && window.hbspt.forms.forEach) {
      window.hbspt.forms.forEach(function(form) {
        if (form && form.formInstance) {
          console.log('[PartnerStack] Found HubSpot form instance, attempting direct update');
          // Try to set the field value in the form instance
          if (form.formInstance.options && form.formInstance.options.fields) {
            form.formInstance.options.fields.forEach(function(field) {
              if (field.name === 'partnerstack_click_id' || field.name.includes('partnerstack_click_id')) {
                field.value = psXid;
                console.log('[PartnerStack] Updated field in form instance:', field.name);
              }
            });
          }
        }
      });
    }
  } catch (e) {
    console.log('[PartnerStack] Could not update form instances directly:', e);
  }
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
          // Also inject again after a longer delay to ensure it's captured
          setTimeout(injectPartnerStackId, 500);
        }
        
        // Also inject just before submission to ensure it's included
        if (eventName === 'onFormSubmit') {
          console.log(
            '[PartnerStack] Form submit event detected, ensuring PartnerStack ID is injected'
          );
          injectPartnerStackId();
          
          // Also try to add it to the submission data directly
          const psXid = getPartnerStackId();
          if (psXid && payload.data) {
            console.log('[PartnerStack] Adding PartnerStack ID to submission data');
            if (!payload.data.partnerstack_click_id) {
              payload.data.partnerstack_click_id = psXid;
            }
            // Also try to update the fields array if it exists
            if (payload.data.fields && Array.isArray(payload.data.fields)) {
              const existingField = payload.data.fields.find(f => f.name === 'partnerstack_click_id');
              if (existingField) {
                existingField.value = psXid;
              } else {
                payload.data.fields.push({ name: 'partnerstack_click_id', value: psXid });
              }
            }
          }
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
  
  // Also hook into HubSpot's onBeforeFormSubmit if available
  if (window.hbspt && window.hbspt.forms && window.hbspt.forms.create) {
    console.log('[PartnerStack] Attempting to hook into HubSpot form submission');
    const originalCreate = window.hbspt.forms.create;
    window.hbspt.forms.create = function(options) {
      // Add onBeforeFormSubmit callback if not already present
      if (!options.onBeforeFormSubmit) {
        options.onBeforeFormSubmit = function(formData) {
          console.log('[PartnerStack] onBeforeFormSubmit triggered');
          const psXid = getPartnerStackId();
          if (psXid) {
            // Ensure PartnerStack ID is in the submission
            const partnerStackField = formData.find(f => f.name === 'partnerstack_click_id');
            if (partnerStackField) {
              partnerStackField.value = psXid;
              console.log('[PartnerStack] Updated PartnerStack field in submission data');
            } else {
              formData.push({ name: 'partnerstack_click_id', value: psXid });
              console.log('[PartnerStack] Added PartnerStack field to submission data');
            }
          }
          return formData;
        };
      }
      return originalCreate.call(this, options);
    };
  }
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

// Expose functions globally for the form-handler interface
window.getPartnerStackId = getPartnerStackId;
window.injectPartnerStackId = injectPartnerStackId;

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
