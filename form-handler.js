// HubSpot Forms Complete Router
// Combines form routing and PartnerStack cookie helper functionality
// Load order: router first (sets up monitoring), then cookie helper (injects IDs)

// Import and initialize both modules
import './hubspot-form-router.js';
import './cookie-helper-hs.js';

// Export a combined interface for debugging
const HubSpotFormsComplete = {
  // Expose router debug interface
  get router() {
    return window.HubSpotRouter || {};
  },
  // Expose cookie helper functionality (these will be available globally from the imported scripts)
  get cookieHelper() {
    return {
      getPartnerStackId:
        typeof window.getPartnerStackId === 'function'
          ? window.getPartnerStackId
          : null,
      injectPartnerStackId:
        typeof window.injectPartnerStackId === 'function'
          ? window.injectPartnerStackId
          : null,
    };
  },
  // Initialization status
  initialized: true,
  version: '1.0.0',
};

// Make available globally
window.HubSpotFormsComplete = HubSpotFormsComplete;

export default HubSpotFormsComplete;
