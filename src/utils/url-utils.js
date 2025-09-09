/**
 * URL utilities for building scheduler URLs with form data
 */

/**
 * Build scheduler URL with pre-filled form data
 * @param {string} schedulerType - Type of scheduler
 * @param {Object} formData - Form data to pre-fill
 * @param {Object} config - Scheduler configuration
 * @param {Object} logger - Logger instance
 * @returns {string} Built scheduler URL
 */
export function buildSchedulerUrl(
  schedulerType,
  formData,
  config,
  logger = console
) {
  const schedulerConfig = config[schedulerType] || config.default;
  const url = new URL(schedulerConfig.url);

  // Always add embed parameter
  url.searchParams.set('embed', 'true');

  // Pre-fill common fields
  const fieldMappings = {
    email: ['email', 'email_address', '0-1/email', '0-2/email'],
    firstName: [
      'firstname',
      'first_name',
      'fname',
      '0-1/firstname',
      '0-2/firstname',
    ],
    lastName: [
      'lastname',
      'last_name',
      'lname',
      '0-1/lastname',
      '0-2/lastname',
    ],
    company: [
      'company',
      'practice_name',
      'business_name',
      '0-1/company',
      '0-2/company',
    ],
    phone: ['phone', 'phone_number', 'telephone', '0-1/phone', '0-2/phone'],
  };

  Object.entries(fieldMappings).forEach(([paramName, fieldNames]) => {
    for (const fieldName of fieldNames) {
      if (formData[fieldName]) {
        url.searchParams.set(paramName, formData[fieldName]);
        logger.log(
          `Mapping ${fieldName} -> ${paramName}: ${formData[fieldName]}`
        );
        break;
      }
    }
  });

  // Handle additional HubSpot-specific fields
  const additionalFields = [
    'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
    'what_best_describes_your_practice_',
    'referrer',
    'submissionGuid',
    'uuid',
  ];

  additionalFields.forEach((fieldName) => {
    // Check for exact field name first
    if (formData[fieldName]) {
      url.searchParams.set(fieldName, formData[fieldName]);
      logger.log(
        `Adding additional field: ${fieldName} = ${formData[fieldName]}`
      );
    } else {
      // Check for prefixed versions
      const prefixedVersions = [`0-1/${fieldName}`, `0-2/${fieldName}`];
      for (const prefixedField of prefixedVersions) {
        if (formData[prefixedField]) {
          url.searchParams.set(fieldName, formData[prefixedField]);
          logger.log(
            `Adding prefixed field: ${prefixedField} -> ${fieldName} = ${formData[prefixedField]}`
          );
          break;
        }
      }
    }
  });

  // Add UTM parameters if present
  const utmParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
  ];
  utmParams.forEach((param) => {
    if (formData[param]) {
      url.searchParams.set(param, formData[param]);
    }
  });

  logger.log('Built scheduler URL:', url.toString());
  return url.toString();
}

/**
 * Get URL parameters from current page
 * @returns {Object} URL parameters as key-value pairs
 */
export function getQueryParams() {
  const params = {};
  const searchParams = new URLSearchParams(window.location.search);
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

/**
 * Validate URL origin for security
 * @param {string} origin - URL origin to validate
 * @returns {boolean} Whether origin is valid
 */
export function isValidHubSpotOrigin(origin) {
  try {
    const host = new URL(origin).hostname;
    const validDomains = [
      'hubspot.com',
      'hsforms.com',
      'hsforms.net',
      'hsappstatic.net',
    ];

    return validDomains.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch (e) {
    return false;
  }
}
