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
  } else {
    var existing = getCookie('ps_xid');
    if (existing) setCookie('ps_xid', existing); // refresh TTL
  }

  // Set/refresh ps_partner_key (optional)
  if (pk) {
    setCookie('ps_partner_key', pk);
  } else {
    var existingPk = getCookie('ps_partner_key');
    if (existingPk) setCookie('ps_partner_key', existingPk);
  }
})();
