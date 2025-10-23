(function () {
  var params = new URLSearchParams(location.search || '');
  var xid = params.get('ps_xid');
  var pk = params.get('ps_partner_key');

  function sanitize(s) {
    if (typeof s !== 'string') return '';
    var m = s.trim().match(/[A-Za-z0-9._\-+/=]+/g);
    return m ? m.join('') : '';
  }

  xid = sanitize(xid);
  pk = sanitize(pk);

  var COOKIE_DOMAIN = window.PS_COOKIE_DOMAIN || '.joinheard.com'; // override if needed
  var MAX_AGE = 90 * 24 * 60 * 60; // 90 days

  function setCookie(name, value) {
    if (!value) return;
    var parts = [
      name + '=' + encodeURIComponent(value),
      'path=/',
      'max-age=' + MAX_AGE,
      'SameSite=Lax',
      'Secure', // requires HTTPS
    ];
    if (COOKIE_DOMAIN) parts.push('Domain=' + COOKIE_DOMAIN);
    document.cookie = parts.join('; ');
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // Set/refresh ps_xid
  if (xid) {
    setCookie('ps_xid', xid);
    // Also sync to localStorage
    try {
      localStorage.setItem('ps_xid', xid);
    } catch (e) {
      // Ignore storage errors
    }
  } else {
    var existing = getCookie('ps_xid');
    if (existing) {
      setCookie('ps_xid', existing); // refresh TTL
    } else {
      // Check localStorage as fallback
      try {
        var lsXid = localStorage.getItem('ps_xid');
        if (lsXid) {
          setCookie('ps_xid', lsXid);
          existing = lsXid;
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  // Set/refresh ps_partner_key (optional)
  if (pk) {
    setCookie('ps_partner_key', pk);
  } else {
    var existingPk = getCookie('ps_partner_key');
    if (existingPk) setCookie('ps_partner_key', existingPk);
  }

  // Auto-append ps_xid to URLs on pages with HubSpot forms or key conversion pages
  function ensureXidInUrl() {
    // Determine if this page should have ps_xid in URL
    var shouldAppendXid = false;
    
    // Check for HubSpot form indicators
    if (window.hbspt || window.HubSpotForms) {
      shouldAppendXid = true;
    }
    
    // Check for HubSpot form elements (developer embeds or standard embeds)
    if (document.querySelector('.hs-form, .hbspt-form, [id*="hsForm"], [class*="hubspot"]')) {
      shouldAppendXid = true;
    }
    
    // Check for specific pages that should always have tracking
    var trackingPages = ['/free-consult', '/thank-you', '/schedule', '/consultation'];
    var currentPath = window.location.pathname.toLowerCase();
    if (trackingPages.some(function(page) { return currentPath.includes(page); })) {
      shouldAppendXid = true;
    }
    
    // Only proceed if we should append and ps_xid is not already in URL
    if (shouldAppendXid) {
      var currentParams = new URLSearchParams(window.location.search);
      var urlXid = currentParams.get('ps_xid');
      
      if (!urlXid) {
        // Get stored ps_xid from cookie or localStorage
        var storedXid = getCookie('ps_xid');
        if (!storedXid) {
          try {
            storedXid = localStorage.getItem('ps_xid');
          } catch (e) {
            // Ignore storage errors
          }
        }
        
        if (storedXid) {
          // Add ps_xid to current URL
          currentParams.set('ps_xid', storedXid);
          
          // Update URL without reload using replaceState
          var newUrl = window.location.pathname + '?' + currentParams.toString() + window.location.hash;
          try {
            window.history.replaceState(null, '', newUrl);
          } catch (e) {
            // Ignore if replaceState fails (some browsers block it)
          }
        }
      }
    }
  }

  // Execute URL update after a small delay to ensure HubSpot elements are loaded
  setTimeout(ensureXidInUrl, 100);
  
  // Also monitor for dynamically added HubSpot forms
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      var hasNewForms = mutations.some(function(mutation) {
        return Array.from(mutation.addedNodes).some(function(node) {
          return node.nodeType === 1 && (
            node.classList && (
              node.classList.contains('hs-form') ||
              node.classList.contains('hbspt-form') ||
              node.className.includes('hubspot')
            ) ||
            (node.id && node.id.includes('hsForm'))
          );
        });
      });
      
      if (hasNewForms) {
        ensureXidInUrl();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
