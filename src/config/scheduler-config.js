/**
 * Scheduler configuration management
 */

/**
 * Default scheduler configuration
 */
export const SCHEDULER_CONFIG = {
  sole_prop: {
    url: 'https://meetings.hubspot.com/bz/consultation',
    name: 'Sole Proprietor Consultation',
    description: 'For single-owner practices',
  },
  s_corp: {
    url: 'https://meetings.hubspot.com/bz/consultations',
    name: 'S-Corp Consultation',
    description: 'For multi-owner practices',
  },
  default: {
    url: 'https://meetings.hubspot.com/bz/consultation',
    name: 'Default Consultation',
    description: 'Default consultation scheduler',
  },
};

/**
 * Round-robin only configuration (for Webflow)
 */
export const ROUND_ROBIN_CONFIG = {
  sole_prop: {
    url: 'https://meetings.hubspot.com/bz/consultation',
    name: 'Round Robin Consultation',
    description: 'For all practices (round-robin)',
  },
};

/**
 * Field mapping configuration
 */
export const FIELD_MAPPINGS = {
  email: ['email', 'email_address', '0-1/email', '0-2/email'],
  firstName: [
    'firstname',
    'first_name',
    'fname',
    '0-1/firstname',
    '0-2/firstname',
  ],
  lastName: ['lastname', 'last_name', 'lname', '0-1/lastname', '0-2/lastname'],
  company: [
    'company',
    'practice_name',
    'business_name',
    '0-1/company',
    '0-2/company',
  ],
  phone: ['phone', 'phone_number', 'telephone', '0-1/phone', '0-2/phone'],
};

/**
 * Multiple owners field names configuration
 */
export const MULTIPLE_OWNERS_FIELDS = [
  'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
  'does_your_practice_have_multiple_owners',
  'multiple_owners',
  'practice_multiple_owners',
  'has_multiple_owners',
];

/**
 * Additional HubSpot fields to include
 */
export const ADDITIONAL_HUBSPOT_FIELDS = [
  'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
  'what_best_describes_your_practice_',
  'referrer',
  'submissionGuid',
  'uuid',
];

/**
 * UTM parameters to preserve
 */
export const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

/**
 * Valid HubSpot domains for origin validation
 */
export const VALID_HUBSPOT_DOMAINS = [
  'hubspot.com',
  'hsforms.com',
  'hsforms.net',
  'hsappstatic.net',
];

/**
 * Configuration validator
 */
export class ConfigValidator {
  /**
   * Validate scheduler configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} Whether configuration is valid
   */
  static validateSchedulerConfig(config) {
    if (!config || typeof config !== 'object') {
      return false;
    }

    const requiredKeys = ['sole_prop', 's_corp'];
    for (const key of requiredKeys) {
      if (!config[key] || !config[key].url) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Whether URL is valid
   */
  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
