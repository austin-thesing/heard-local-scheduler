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

// For HubSpot developer embeds, use the global callback
function setupDeveloperEmbedHandler() {
  console.log('[PartnerStack] Setting up developer embed handler');
  
  // Create a global callback that HubSpot will call
  window.onHubSpotFormReady = function(form) {
    console.log('[PartnerStack] HubSpot form ready via developer embed');
    
    // Inject the PartnerStack ID
    const psXid = getPartnerStackId();
    if (psXid) {
      // Find the hidden field in the form
      const iframe = document.querySelector('iframe.hs-form-iframe');
      if (iframe) {
        try {
          // Send message to iframe to set the field value
          iframe.contentWindow.postMessage({
            type: 'hsFormCallback',
            eventName: 'setFieldValue', 
            fieldName: 'partnerstack_click_id',
            fieldValue: psXid
          }, '*');
          console.log('[PartnerStack] Sent message to iframe to set field value');
        } catch (e) {
          console.log('[PartnerStack] Could not post message to iframe:', e);
        }
      }
    }
  };
  
  // Override the hbspt.forms.create to intercept form creation
  if (window.hbspt && window.hbspt.forms && window.hbspt.forms.create) {
    const originalCreate = window.hbspt.forms.create;
    window.hbspt.forms.create = function(options) {
      console.log('[PartnerStack] Intercepting HubSpot form creation');
      
      // Store the original callbacks
      const originalOnFormReady = options.onFormReady;
      const originalOnFormSubmit = options.onFormSubmit;
      const originalOnFormSubmitted = options.onFormSubmitted;
      
      // Override onFormReady to inject PartnerStack ID
      options.onFormReady = function($form) {
        console.log('[PartnerStack] Form ready - injecting PartnerStack ID');
        
        const psXid = getPartnerStackId();
        if (psXid) {
          // Try to set the value using HubSpot's API
          if ($form && $form.find) {
            const field = $form.find('input[name="partnerstack_click_id"]');
            if (field.length) {
              field.val(psXid).change();
              console.log('[PartnerStack] Set field value via jQuery');
            }
          }
        }
        
        // Call original callback if it exists
        if (originalOnFormReady) {
          originalOnFormReady.apply(this, arguments);
        }
      };
      
      // Override onFormSubmit to ensure PartnerStack ID is included
      options.onFormSubmit = function($form) {
        console.log('[PartnerStack] Form submitting - ensuring PartnerStack ID');
        
        const psXid = getPartnerStackId();
        if (psXid) {
          // Store it globally for the XHR interceptor
          window._forcePartnerStackId = psXid;
          
          // Try to inject it one more time
          if ($form && $form.find) {
            const field = $form.find('input[name="partnerstack_click_id"]');
            if (field.length) {
              field.val(psXid).change();
              console.log('[PartnerStack] Re-injected field value on submit');
            }
          }
        }
        
        // Call original callback if it exists
        if (originalOnFormSubmit) {
          return originalOnFormSubmit.apply(this, arguments);
        }
      };
      
      // Call the original create with our modified options
      return originalCreate.call(this, options);
    };
    console.log('[PartnerStack] HubSpot form create hook installed');
  }
}

// For HubSpot developer embeds, listen for form ready events
function setupHubSpotListener() {
  console.log('[PartnerStack] setupHubSpotListener called');
  
  // Set up developer embed handler
  setupDeveloperEmbedHandler();
  
  // Hook into XMLHttpRequest to intercept HubSpot form submissions
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(data) {
    // Check if this is a HubSpot form submission
    if (this._url && (this._url.includes('forms.hubspot.com') || this._url.includes('hsforms.com'))) {
      console.log('[PartnerStack] 🎯 INTERCEPTED HubSpot form submission to:', this._url);
      // Use forced ID if available (set by router), otherwise get from storage
      const psXid = window._forcePartnerStackId || window._persistentPartnerStackId || getPartnerStackId();
      
      if (psXid && data) {
        // Store in localStorage for debugging (survives redirect)
        try {
          localStorage.setItem('ps_last_submission', JSON.stringify({
            timestamp: new Date().toISOString(),
            url: this._url,
            psXid: psXid,
            dataLength: data.length,
            status: 'intercepted'
          }));
        } catch (e) {}
        
        try {
          // Try to parse and modify the submission data
          if (typeof data === 'string') {
            // URL encoded form data (most common for HubSpot)
            if (data.includes('=') && data.includes('&')) {
              // ALWAYS inject the PartnerStack ID, regardless of whether field exists
              if (!data.includes('partnerstack_click_id=')) {
                // Field doesn't exist at all, add it
                data += '&partnerstack_click_id=' + encodeURIComponent(psXid);
                console.log('[PartnerStack] ✅ INJECTED PartnerStack ID to submission');
                localStorage.setItem('ps_injection_status', 'added_new_field');
              } else {
                // Field exists, make sure it has the right value
                // Replace any existing value (empty or wrong)
                data = data.replace(/partnerstack_click_id=[^&]*/g, 'partnerstack_click_id=' + encodeURIComponent(psXid));
                console.log('[PartnerStack] ✅ REPLACED PartnerStack field with correct ID');
                localStorage.setItem('ps_injection_status', 'replaced_existing');
              }
              
              // Log the result for debugging
              const finalMatch = data.match(/partnerstack_click_id=([^&]*)/);
              if (finalMatch && finalMatch[1]) {
                console.log('[PartnerStack] ✅ FINAL VALUE in submission:', decodeURIComponent(finalMatch[1]));
                localStorage.setItem('ps_final_value', decodeURIComponent(finalMatch[1]));
              }
            }
            // JSON data format
            else if (data.startsWith('{')) {
              try {
                const jsonData = JSON.parse(data);
                // HubSpot usually has a fields array
                if (jsonData.fields && Array.isArray(jsonData.fields)) {
                  const psField = jsonData.fields.find(f => f.name === 'partnerstack_click_id');
                  if (psField) {
                    psField.value = psXid;
                    console.log('[PartnerStack] ✅ Updated existing field in JSON');
                    localStorage.setItem('ps_injection_status', 'json_updated');
                  } else {
                    jsonData.fields.push({ name: 'partnerstack_click_id', value: psXid });
                    console.log('[PartnerStack] ✅ Added new field to JSON');
                    localStorage.setItem('ps_injection_status', 'json_added');
                  }
                  data = JSON.stringify(jsonData);
                  localStorage.setItem('ps_final_value', psXid);
                }
              } catch (e) {
                console.log('[PartnerStack] Could not parse JSON data:', e);
              }
            }
          } else if (data instanceof FormData) {
            // FormData object
            if (!data.has('partnerstack_click_id') || !data.get('partnerstack_click_id')) {
              data.set('partnerstack_click_id', psXid);
              console.log('[PartnerStack] ✅ Added PartnerStack ID to FormData submission');
              localStorage.setItem('ps_injection_status', 'formdata_added');
            }
          }
        } catch (e) {
          console.warn('[PartnerStack] Error modifying submission data:', e);
        }
        console.log('[PartnerStack] Final submission data being sent:', data);
        // Store for debugging
        if (window.PartnerStackDebug) {
          window.PartnerStackDebug.lastSubmission = data;
          window.PartnerStackDebug.submissionCount++;
          window.PartnerStackDebug.partnerStackId = psXid;
        }
      } else {
        console.log('[PartnerStack] No PartnerStack ID available to add to submission');
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
      // Check if this is from HubSpot
      if (event.origin && (event.origin.includes('hubspot') || event.origin.includes('hsforms'))) {
        console.log('[PartnerStack] Message from HubSpot:', event.data);
      }
      
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
            '[PartnerStack] Form ready event detected'
          );
          // Inject immediately and multiple times
          injectPartnerStackId();
          setTimeout(injectPartnerStackId, 100);
          setTimeout(injectPartnerStackId, 500);
          setTimeout(injectPartnerStackId, 1000);
        }
        
        // Also handle form submit event
        if (eventName === 'onFormSubmit') {
          console.log('[PartnerStack] Form submit detected via postMessage');
          const psXid = getPartnerStackId();
          if (psXid) {
            window._forcePartnerStackId = psXid;
            // Try to modify the payload data if possible
            if (payload.data && payload.data.fields) {
              const psField = payload.data.fields.find(f => f.name === 'partnerstack_click_id');
              if (psField) {
                psField.value = psXid;
                console.log('[PartnerStack] Modified field in postMessage payload');
              } else {
                payload.data.fields.push({name: 'partnerstack_click_id', value: psXid});
                console.log('[PartnerStack] Added field to postMessage payload');
              }
            }
          }
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
  
  // Simple submit handler - just ensure the value is available for XHR interceptor
  document.addEventListener('submit', function(e) {
    const psXid = getPartnerStackId();
    if (psXid) {
      // Store globally for XHR interceptor to use
      window._forcePartnerStackId = psXid;
      console.log('[PartnerStack] Form submitted, PartnerStack ID ready for interception:', psXid);
    }
  }, true); // Use capture phase
  
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

// Expose submission tracking for debugging
window.PartnerStackDebug = {
  lastSubmission: null,
  submissionCount: 0,
  getLastSubmission: function() {
    return this.lastSubmission;
  },
  wasPartnerStackIncluded: function() {
    if (!this.lastSubmission) return false;
    return this.lastSubmission.includes('partnerstack_click_id') && !this.lastSubmission.includes('partnerstack_click_id=&');
  },
  // Check what was stored in localStorage (survives redirect)
  checkLastInjection: function() {
    const status = localStorage.getItem('ps_injection_status');
    const value = localStorage.getItem('ps_final_value');
    const submission = localStorage.getItem('ps_last_submission');
    
    console.log('=== PartnerStack Injection Report ===');
    console.log('Status:', status);
    console.log('Final Value:', value);
    if (submission) {
      try {
        const data = JSON.parse(submission);
        console.log('Submission Details:', data);
      } catch (e) {
        console.log('Submission Data:', submission);
      }
    }
    console.log('=====================================');
    
    return {
      status: status,
      value: value,
      submission: submission
    };
  },
  // Clear debug data
  clearDebugData: function() {
    localStorage.removeItem('ps_injection_status');
    localStorage.removeItem('ps_final_value');
    localStorage.removeItem('ps_last_submission');
    console.log('Debug data cleared');
  }
};

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
