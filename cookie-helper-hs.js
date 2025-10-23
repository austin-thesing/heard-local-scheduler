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
  
  // Hook into XMLHttpRequest to intercept HubSpot form submissions
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(data) {
    // Check if this is a HubSpot form submission
    if (this._url && (this._url.includes('forms.hubspot.com') || this._url.includes('hsforms.com'))) {
      console.log('[PartnerStack] Intercepted HubSpot form submission');
      const psXid = getPartnerStackId();
      
      if (psXid && data) {
        try {
          // Try to parse and modify the submission data
          if (typeof data === 'string') {
            // URL encoded form data
            if (data.includes('&')) {
              // Check if partnerstack_click_id is already in the data
              if (!data.includes('partnerstack_click_id=')) {
                data += '&partnerstack_click_id=' + encodeURIComponent(psXid);
                console.log('[PartnerStack] Added PartnerStack ID to URL-encoded submission');
              } else if (data.includes('partnerstack_click_id=&') || data.endsWith('partnerstack_click_id=')) {
                // Field exists but is empty, replace it
                data = data.replace(/partnerstack_click_id=[^&]*/, 'partnerstack_click_id=' + encodeURIComponent(psXid));
                console.log('[PartnerStack] Replaced empty PartnerStack ID in submission');
              }
            }
            // JSON data
            else if (data.startsWith('{')) {
              try {
                const jsonData = JSON.parse(data);
                if (jsonData.fields && Array.isArray(jsonData.fields)) {
                  const psField = jsonData.fields.find(f => f.name === 'partnerstack_click_id');
                  if (psField) {
                    psField.value = psXid;
                  } else {
                    jsonData.fields.push({ name: 'partnerstack_click_id', value: psXid });
                  }
                  data = JSON.stringify(jsonData);
                  console.log('[PartnerStack] Added PartnerStack ID to JSON submission');
                }
              } catch (e) {
                console.log('[PartnerStack] Could not parse JSON data:', e);
              }
            }
          } else if (data instanceof FormData) {
            // FormData object
            if (!data.has('partnerstack_click_id') || !data.get('partnerstack_click_id')) {
              data.set('partnerstack_click_id', psXid);
              console.log('[PartnerStack] Added PartnerStack ID to FormData submission');
            }
          }
        } catch (e) {
          console.warn('[PartnerStack] Error modifying submission data:', e);
        }
      }
    }
    
    // Call the original send method with potentially modified data
    return originalXHRSend.call(this, data);
  };
  
  // Also intercept the open method to capture the URL
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalXHROpen.apply(this, arguments);
  };
  
  // Hook into fetch API as well (newer forms might use this)
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (url && (url.includes('forms.hubspot.com') || url.includes('hsforms.com'))) {
        console.log('[PartnerStack] Intercepted HubSpot fetch submission');
        const psXid = getPartnerStackId();
        
        if (psXid && options && options.body) {
          try {
            if (typeof options.body === 'string') {
              // URL encoded or JSON
              if (options.body.includes('&')) {
                if (!options.body.includes('partnerstack_click_id=')) {
                  options.body += '&partnerstack_click_id=' + encodeURIComponent(psXid);
                } else if (options.body.includes('partnerstack_click_id=&') || options.body.endsWith('partnerstack_click_id=')) {
                  options.body = options.body.replace(/partnerstack_click_id=[^&]*/, 'partnerstack_click_id=' + encodeURIComponent(psXid));
                }
                console.log('[PartnerStack] Modified fetch body with PartnerStack ID');
              } else if (options.body.startsWith('{')) {
                const jsonData = JSON.parse(options.body);
                if (jsonData.fields && Array.isArray(jsonData.fields)) {
                  const psField = jsonData.fields.find(f => f.name === 'partnerstack_click_id');
                  if (psField) {
                    psField.value = psXid;
                  } else {
                    jsonData.fields.push({ name: 'partnerstack_click_id', value: psXid });
                  }
                  options.body = JSON.stringify(jsonData);
                  console.log('[PartnerStack] Added PartnerStack ID to fetch JSON body');
                }
              }
            } else if (options.body instanceof FormData) {
              if (!options.body.has('partnerstack_click_id') || !options.body.get('partnerstack_click_id')) {
                options.body.set('partnerstack_click_id', psXid);
                console.log('[PartnerStack] Added PartnerStack ID to fetch FormData');
              }
            }
          } catch (e) {
            console.warn('[PartnerStack] Error modifying fetch body:', e);
          }
        }
      }
      
      return originalFetch.call(this, url, options);
    };
  }
  
  if (!window.hbspt || !window.hbspt.forms) {
    console.log(
      '[PartnerStack] HubSpot forms library not available yet'
    );
    return;
  }
  console.log(
    '[PartnerStack] HubSpot forms library detected, setting up message listener'
  );

  // Listen for postMessage events from HubSpot forms
  window.addEventListener('message', function (event) {
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
  
  // Set up form submit interceptor to prevent value clearing
  setupFormSubmitInterceptor();

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

// Intercept form submissions to ensure PartnerStack ID is preserved
function setupFormSubmitInterceptor() {
  console.log('[PartnerStack] Setting up form submit interceptor');
  
  // Monitor for form submit events using capture phase
  document.addEventListener('submit', function(e) {
    console.log('[PartnerStack] Form submit event captured');
    const psXid = getPartnerStackId();
    if (psXid) {
      // Re-inject the value right before submission
      const inputs = e.target.querySelectorAll('input[name*="partnerstack"], input[name="ps_xid"]');
      inputs.forEach(function(input) {
        if (input.name.includes('partnerstack_click_id') || input.name === 'ps_xid') {
          console.log('[PartnerStack] Re-injecting value on submit for field:', input.name);
          input.value = psXid;
          input.setAttribute('value', psXid);
          
          // Force the value using defineProperty to make it stick
          try {
            Object.defineProperty(input, 'value', {
              get: function() { return psXid; },
              set: function() { return psXid; },
              configurable: true
            });
          } catch (err) {
            console.log('[PartnerStack] Could not define property:', err);
          }
        }
      });
    }
  }, true); // Use capture phase to run before HubSpot's handlers
  
  // Also monitor for click events on submit buttons
  document.addEventListener('click', function(e) {
    if (e.target && (e.target.type === 'submit' || e.target.classList.contains('hs-button'))) {
      console.log('[PartnerStack] Submit button clicked, ensuring PartnerStack ID is set');
      const psXid = getPartnerStackId();
      if (psXid) {
        // Find all partnerstack fields and ensure they have the value
        const inputs = document.querySelectorAll('input[name*="partnerstack"], input[name="ps_xid"]');
        inputs.forEach(function(input) {
          if (!input.value && (input.name.includes('partnerstack_click_id') || input.name === 'ps_xid')) {
            console.log('[PartnerStack] Setting value for empty field on button click:', input.name);
            input.value = psXid;
            input.setAttribute('value', psXid);
          }
        });
      }
      
      // Small delay to re-inject after HubSpot might clear it
      setTimeout(function() {
        injectPartnerStackId();
      }, 10);
    }
  }, true);
  
  // Monitor for value changes and restore them if cleared
  const monitorValueChanges = function() {
    const psXid = getPartnerStackId();
    if (!psXid) return;
    
    const inputs = document.querySelectorAll('input[name*="partnerstack"], input[name="ps_xid"]');
    inputs.forEach(function(input) {
      if (input.name.includes('partnerstack_click_id') || input.name === 'ps_xid') {
        // Store the expected value
        input.dataset.expectedValue = psXid;
        
        // Override the value property setter
        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (originalDescriptor) {
          Object.defineProperty(input, 'value', {
            get: function() {
              return psXid;
            },
            set: function(newValue) {
              if (!newValue || newValue === '') {
                console.log('[PartnerStack] Prevented clearing of field:', input.name);
                originalDescriptor.set.call(this, psXid);
              } else {
                originalDescriptor.set.call(this, newValue);
              }
            },
            configurable: true
          });
        }
      }
    });
  };
  
  // Run value monitor after a delay to catch dynamically added fields
  setTimeout(monitorValueChanges, 500);
  setTimeout(monitorValueChanges, 2000);
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
