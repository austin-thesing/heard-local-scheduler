/**
 * Site-wide lightweight entry: PartnerStack attribution capture only
 */

import { initPartnerStackCapture } from './utils/partnerstack-utils.js';

function init() {
  try {
    initPartnerStackCapture();
  } catch (e) {
    console.error('[Sitewide] PartnerStack init failed:', e);
  }
}

// Auto-init
init();

export { init };
