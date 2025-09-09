/**
 * Form utilities for handling HubSpot form data normalization and processing
 */

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extract field name from HubSpot field path
 * @param {string} key - Field key/path
 * @returns {string} Normalized field name
 */
export function canonicalKey(key) {
  try {
    if (!key) return '';
    const str = String(key);
    return str.indexOf('/') !== -1 ? str.split('/').pop() : str;
  } catch (e) {
    return key;
  }
}

/**
 * Normalize HubSpot form data into flat key/value map
 * @param {Array|Object} input - Form data input
 * @returns {Object} Normalized form data
 */
export function normalizeFormData(input) {
  const out = {};
  if (!input) return out;

  // Handle array of fields (common HubSpot format)
  if (Array.isArray(input)) {
    input.forEach((f) => {
      if (!f) return;
      const raw = f.name || f.field || '';
      const name = canonicalKey(raw);
      const val = sanitizeInput(normalizeValue(f.value));
      if (raw) out[raw] = val;
      if (name && name !== raw) out[name] = val;
    });
    return out;
  }

  // Handle object with fields property
  if (input.fields) {
    const fields = input.fields;
    if (Array.isArray(fields)) {
      fields.forEach((f) => {
        if (!f) return;
        const raw = f.name || f.field || '';
        const name = canonicalKey(raw);
        const val = sanitizeInput(normalizeValue(f.value));
        if (raw) out[raw] = val;
        if (name && name !== raw) out[name] = val;
      });
    } else if (typeof fields === 'object') {
      Object.entries(fields).forEach(([k, v]) => {
        const name = canonicalKey(k);
        const val = sanitizeInput(normalizeValue(v));
        out[k] = val;
        if (name && name !== k) out[name] = val;
      });
    }
    return out;
  }

  // Handle plain object
  Object.entries(input).forEach(([k, v]) => {
    const name = canonicalKey(k);
    const val = sanitizeInput(normalizeValue(v));
    out[k] = val;
    if (name && name !== k) out[name] = val;
  });
  return out;
}

/**
 * Normalize form field value to string
 * @param {*} value - Field value
 * @returns {string} Normalized value
 */
function normalizeValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] || '';
  if (value != null) return String(value);
  return '';
}

/**
 * Determine scheduler type based on form data
 * @param {Object} formData - Normalized form data
 * @param {Object} logger - Logger instance
 * @returns {string} Scheduler type
 */
export function determineSchedulerType(formData, logger = console) {
  logger.log('Determining scheduler type from form data:', formData);

  // Look for the "multiple owners" field with various possible names
  const multipleOwnersFields = [
    'is_your_practice_a_c_corp_or_our_does_it_have_multiple_owners_',
    'does_your_practice_have_multiple_owners',
    'multiple_owners',
    'practice_multiple_owners',
    'has_multiple_owners',
  ];

  let multipleOwners = null;

  // Check each possible field name
  for (const fieldName of multipleOwnersFields) {
    if (formData[fieldName]) {
      multipleOwners = formData[fieldName];
      logger.log(
        `Found multiple owners field: ${fieldName} = ${multipleOwners}`
      );
      break;
    }
  }

  if (!multipleOwners) {
    logger.log('No multiple owners field found, using default');
    return 'default';
  }

  // Normalize the value
  const normalizedValue = multipleOwners.toString().toLowerCase().trim();

  if (normalizedValue === 'no' || normalizedValue === 'false') {
    logger.log('Single owner detected -> sole_prop');
    return 'sole_prop';
  } else if (normalizedValue === 'yes' || normalizedValue === 'true') {
    logger.log('Multiple owners detected -> s_corp');
    return 's_corp';
  }

  logger.log('Unclear response, using default');
  return 'default';
}
