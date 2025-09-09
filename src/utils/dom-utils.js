/**
 * DOM utilities for form monitoring and manipulation
 */

/**
 * Enhanced DOM monitoring using MutationObserver
 */
export class FormMonitor {
  constructor(logger = console) {
    this.logger = logger;
    this.capturedFormData = {};
    this.previousValues = {};
    this.processedElements = new WeakSet();
    this.observer = null;
    this.intervals = new Set();
  }

  /**
   * Initialize form monitoring
   */
  init() {
    this.setupMutationObserver();
    this.processExistingInputs();
    this.logger.log('Form input monitoring activated');
  }

  /**
   * Setup MutationObserver for dynamic form elements
   */
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      const addedNodes = [];

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            addedNodes.push(node);
          }
        });
      });

      if (addedNodes.length === 0) return;

      addedNodes.forEach((node) => {
        const inputs = node.querySelectorAll
          ? node.querySelectorAll('input[name], select[name], textarea[name]')
          : [];

        // Check if the node itself is an input
        if (
          node.tagName &&
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) &&
          node.name
        ) {
          this.processInput(node);
        }

        inputs.forEach((input) => this.processInput(input));
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Process existing inputs on page load
   */
  processExistingInputs() {
    document
      .querySelectorAll('input[name], select[name], textarea[name]')
      .forEach((input) => this.processInput(input));
  }

  /**
   * Process individual input element
   * @param {HTMLElement} input - Input element to process
   */
  processInput(input) {
    if (this.processedElements.has(input)) return;
    this.processedElements.add(input);

    // Skip readonly inputs unless they're hidden
    if (input.readOnly && input.type !== 'hidden') return;

    // For hidden inputs, use property observer instead of polling
    if (input.type === 'hidden' && input.name) {
      this.setupHiddenInputObserver(input);
    } else if (input.type === 'radio') {
      input.addEventListener('change', () => this.captureValue(input));
    } else if (
      input.type === 'tel' ||
      (input.name && input.name.toLowerCase().includes('phone'))
    ) {
      input.addEventListener('blur', () => this.captureValue(input));
      input.addEventListener('change', () => this.captureValue(input));
    } else {
      input.addEventListener('change', () => this.captureValue(input));
      input.addEventListener('blur', () => this.captureValue(input));
    }

    // Capture initial value if present
    if (input.value) {
      this.captureValue(input, 'initial');
    }
  }

  /**
   * Setup observer for hidden input value changes
   * @param {HTMLInputElement} input - Hidden input element
   */
  setupHiddenInputObserver(input) {
    // Use MutationObserver to detect value changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'value'
        ) {
          this.captureValue(input, 'mutation');
        }
      });
    });

    observer.observe(input, {
      attributes: true,
      attributeFilter: ['value'],
    });

    // Store observer reference for cleanup
    input._mutationObserver = observer;

    // Capture initial value
    if (input.value) {
      this.captureValue(input, 'initial');
    }
  }

  /**
   * Capture input value
   * @param {HTMLInputElement} input - Input element
   * @param {string} eventType - Type of event triggering capture
   */
  captureValue(input, eventType = 'change') {
    if (!input.name) return;

    let value = input.value;
    const fieldKey = input.name;

    // Check if value actually changed
    if (this.previousValues[fieldKey] === value) {
      return;
    }
    this.previousValues[fieldKey] = value;

    // Skip HubSpot internal fields
    if (this.isHubSpotInternalField(fieldKey)) {
      return;
    }

    // Store the value
    this.capturedFormData[fieldKey] = value;

    // Only log if there's an actual value
    if (value) {
      this.logCapturedValue(input, fieldKey, value, eventType);
    }
  }

  /**
   * Check if field is HubSpot internal
   * @param {string} fieldKey - Field key to check
   * @returns {boolean} Whether field is internal
   */
  isHubSpotInternalField(fieldKey) {
    return (
      fieldKey === 'hs_context' ||
      fieldKey.startsWith('hs_') ||
      fieldKey === 'guid'
    );
  }

  /**
   * Log captured value with appropriate context
   * @param {HTMLInputElement} input - Input element
   * @param {string} fieldKey - Field key
   * @param {string} value - Captured value
   * @param {string} eventType - Event type
   */
  logCapturedValue(input, fieldKey, value, eventType) {
    let fieldType = input.type || input.tagName.toLowerCase();

    // Special handling for phone fields
    if (input.type === 'tel' || fieldKey.toLowerCase().includes('phone')) {
      // Also store clean version without formatting
      const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
      if (cleanPhone) {
        this.capturedFormData[fieldKey + '_clean'] = cleanPhone;
      }
      this.logger.log('Captured phone:', fieldKey, '=', value);
    } else if (input.type === 'radio') {
      this.logger.log('Captured radio selection:', fieldKey, '=', value);
    } else if (input.type === 'hidden') {
      const parent = input.closest('.hsfc-DropdownField');
      if (parent) {
        this.logger.log('Captured dropdown:', fieldKey, '=', value);
      } else {
        this.logger.log('Captured field:', fieldKey, '=', value);
      }
    } else {
      this.logger.log('Captured', fieldType + ':', fieldKey, '=', value);
    }
  }

  /**
   * Get captured form data
   * @returns {Object} Captured form data
   */
  getCapturedData() {
    return { ...this.capturedFormData };
  }

  /**
   * Cleanup all observers and intervals
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    // Clean up mutation observers on inputs
    this.processedElements.forEach((input) => {
      if (input._mutationObserver) {
        input._mutationObserver.disconnect();
      }
    });

    // Clear any intervals
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }
}

/**
 * Safely inject HTML content into DOM
 * @param {HTMLElement} target - Target element
 * @param {string} html - HTML content to inject
 * @returns {boolean} Success status
 */
export function safeHtmlInjection(target, html) {
  if (!target || typeof html !== 'string') {
    return false;
  }

  // Use DOMParser for safer HTML parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    console.error('HTML parsing error:', parserError.textContent);
    return false;
  }

  // Clear target and append parsed content
  target.innerHTML = '';
  while (doc.body.firstChild) {
    target.appendChild(doc.body.firstChild);
  }

  return true;
}
