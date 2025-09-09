import { test, expect } from 'bun:test';
import { FormMonitor, safeHtmlInjection } from '../src/utils/dom-utils.js';

// Mock DOM environment
global.document = {
  body: {
    contains: () => true,
    appendChild: () => {},
    removeChild: () => {},
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getAttribute: () => null,
    setAttribute: () => {},
    hasAttribute: () => false,
    removeAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    cloneNode: () => ({}),
    getBoundingClientRect: () => ({}),
    getClientRects: () => [],
    compareDocumentPosition: () => 0,
    dispatchEvent: () => true,
    normalize: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    matches: () => false,
    requestFullscreen: () => {},
    requestPointerLock: () => {},
    releasePointerLock: () => {},
    getElementsByClassName: () => [],
    getElementsByTagName: () => [],
    getElementsByName: () => [],
    insertBefore: () => {},
    replaceChild: () => {},
    textContent: '',
    innerHTML: '',
    outerHTML: '',
    innerText: '',
    outerText: '',
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    parentNode: null,
    parentElement: null,
    childNodes: [],
    children: [],
    firstElementChild: null,
    lastElementChild: null,
    nextElementSibling: null,
    previousElementSibling: null,
    nodeType: 1,
    nodeName: '',
    nodeValue: null,
    ownerDocument: global.document,
    offsetParent: null,
    offsetTop: 0,
    offsetLeft: 0,
    offsetWidth: 0,
    offsetHeight: 0,
    clientLeft: 0,
    clientTop: 0,
    clientWidth: 0,
    clientHeight: 0,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
    scrollHeight: 0,
    id: '',
    className: '',
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => false,
    },
    dataset: {},
    tabIndex: 0,
    accessKey: '',
    accessKeyLabel: '',
    draggable: false,
    contentEditable: 'inherit',
    isContentEditable: false,
    spellcheck: false,
    title: '',
    lang: '',
    translate: true,
    dir: '',
    hidden: false,
    inert: false,
    enterKeyHint: '',
    inputMode: '',
    virtualKeyboardPolicy: '',
    nonce: '',
    autofocus: false,
    tabIndex: 0,
    style: {},
    onclick: null,
    ondblclick: null,
    onmousedown: null,
    onmouseup: null,
    onmouseover: null,
    onmousemove: null,
    onmouseout: null,
    onmouseenter: null,
    onmouseleave: null,
    oncontextmenu: null,
    onkeydown: null,
    onkeyup: null,
    onkeypress: null,
    oninput: null,
    onchange: null,
    onsubmit: null,
    onreset: null,
    onselect: null,
    onblur: null,
    onfocus: null,
    onfocusin: null,
    onfocusout: null,
    onabort: null,
    onbeforeunload: null,
    onerror: null,
    onhashchange: null,
    onload: null,
    onpageshow: null,
    onpagehide: null,
    onresize: null,
    onscroll: null,
    onunload: null,
    onwheel: null,
    oncopy: null,
    oncut: null,
    onpaste: null,
    ondrag: null,
    ondragend: null,
    ondragenter: null,
    ondragleave: null,
    ondragover: null,
    ondragstart: null,
    ondrop: null,
    ondurationchange: null,
    onemptied: null,
    onended: null,
    onloadeddata: null,
    onloadedmetadata: null,
    onloadstart: null,
    onpause: null,
    onplay: null,
    onplaying: null,
    onprogress: null,
    onratechange: null,
    onseeked: null,
    onseeking: null,
    onstalled: null,
    onsuspend: null,
    ontimeupdate: null,
    onvolumechange: null,
    onwaiting: null,
    oncanplay: null,
    oncanplaythrough: null,
    ontransitionend: null,
    onanimationend: null,
    onanimationiteration: null,
    onanimationstart: null,
    onmessage: null,
    onmessageerror: null,
    onoffline: null,
    ononline: null,
    onpopstate: null,
    onrejectionhandled: null,
    onstorage: null,
    onunhandledrejection: null,
    value: '',
    name: '',
    type: 'text',
    checked: false,
    disabled: false,
    readOnly: false,
    required: false,
    multiple: false,
    selected: false,
    defaultSelected: false,
    defaultChecked: false,
    minLength: 0,
    maxLength: 0,
    pattern: '',
    placeholder: '',
    size: 20,
    accept: '',
    autocomplete: '',
    capture: false,
    formAction: '',
    formEnctype: '',
    formMethod: '',
    formNoValidate: false,
    formTarget: '',
    height: 0,
    width: 0,
    src: '',
    alt: '',
    useMap: '',
    isMap: false,
    lowSrc: '',
    vspace: 0,
    hspace: 0,
    align: '',
    longDesc: '',
    border: 0,
    indeterminate: false,
    list: null,
    step: '',
    min: '',
    max: '',
    selectionStart: null,
    selectionEnd: null,
    selectionDirection: null,
    validationMessage: '',
    validity: {},
    willValidate: true,
    checkValidity: () => true,
    reportValidity: () => true,
    setCustomValidity: () => {},
    select: () => {},
    setRangeText: () => {},
    setSelectionRange: () => {},
    showPicker: () => {},
    click: () => {},
    focus: () => {},
    blur: () => {},
    closest: () => null,
  }),
  createTextNode: () => ({}),
  createDocumentFragment: () => ({
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  }),
  createComment: () => ({}),
  createAttribute: () => ({}),
  importNode: () => ({}),
  adoptNode: () => ({}),
  createEvent: () => ({
    initEvent: () => {},
  }),
  createRange: () => ({
    createContextualFragment: () => ({}),
  }),
  evaluate: () => ({}),
  execCommand: () => false,
  queryCommandEnabled: () => false,
  queryCommandIndeterm: () => false,
  queryCommandState: () => false,
  queryCommandSupported: () => false,
  queryCommandValue: () => '',
  getElementsByName: () => [],
  getSelection: () => null,
  hasFocus: () => false,
  readyState: 'complete',
  referrer: '',
  implementation: {
    hasFeature: () => true,
  },
  documentElement: {
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  createEvent: () => ({
    initEvent: () => {},
  }),
  createRange: () => ({
    createContextualFragment: () => ({}),
  }),
  getElementsByTagName: () => [],
  getElementsByClassName: () => [],
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target, options) {
    this.target = target;
    this.options = options;
  }

  disconnect() {
    this.callback = null;
  }

  takeRecords() {
    return [];
  }
};

global.DOMParser = class {
  parseFromString(html, type) {
    if (html.includes('parsererror')) {
      return {
        querySelector: (selector) => {
          if (selector === 'parsererror') {
            return { textContent: 'Parser error' };
          }
          return null;
        },
        body: {
          firstChild: null,
        },
      };
    }

    return {
      querySelector: () => null,
      body: {
        firstChild: {
          nodeType: 1,
          nodeName: 'DIV',
          textContent: 'Test content',
        },
      },
    };
  }
};

global.WeakSet = class {
  constructor() {
    this.items = [];
  }

  add(item) {
    if (!this.items.includes(item)) {
      this.items.push(item);
    }
  }

  has(item) {
    return this.items.includes(item);
  }

  delete(item) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }
};

test('FormMonitor initializes correctly', () => {
  const monitor = new FormMonitor(console);

  expect(monitor.logger).toBe(console);
  expect(monitor.capturedFormData).toEqual({});
  expect(monitor.previousValues).toEqual({});
  expect(monitor.processedElements).toBeInstanceOf(WeakSet);
});

test('FormMonitor captures input values', () => {
  const monitor = new FormMonitor(console);

  const mockInput = {
    name: 'test_field',
    value: 'test_value',
    type: 'text',
    tagName: 'INPUT',
    readOnly: false,
  };

  monitor.captureValue(mockInput);

  expect(monitor.capturedFormData.test_field).toBe('test_value');
  expect(monitor.previousValues.test_field).toBe('test_value');
});

test('FormMonitor skips HubSpot internal fields', () => {
  const monitor = new FormMonitor(console);

  const mockInput = {
    name: 'hs_context',
    value: 'internal_value',
    type: 'hidden',
    tagName: 'INPUT',
    readOnly: false,
  };

  monitor.captureValue(mockInput);

  expect(monitor.capturedFormData.hs_context).toBeUndefined();
});

test('FormMonitor handles phone fields specially', () => {
  const monitor = new FormMonitor(console);

  const mockInput = {
    name: 'phone',
    value: '(555) 123-4567',
    type: 'tel',
    tagName: 'INPUT',
    readOnly: false,
  };

  monitor.captureValue(mockInput);

  expect(monitor.capturedFormData.phone).toBe('(555) 123-4567');
  expect(monitor.capturedFormData.phone_clean).toBe('5551234567');
});

test('FormMonitor skips duplicate values', () => {
  const monitor = new FormMonitor(console);

  const mockInput = {
    name: 'test_field',
    value: 'test_value',
    type: 'text',
    tagName: 'INPUT',
    readOnly: false,
  };

  monitor.captureValue(mockInput);
  monitor.captureValue(mockInput); // Same value again

  expect(monitor.capturedFormData.test_field).toBe('test_value');
  // Should only log once, but we can't test that easily
});

test('FormMonitor gets captured data', () => {
  const monitor = new FormMonitor(console);

  monitor.capturedFormData = {
    email: 'test@example.com',
    name: 'John Doe',
  };

  const result = monitor.getCapturedData();

  expect(result).toEqual({
    email: 'test@example.com',
    name: 'John Doe',
  });
});

test('safeHtmlInjection injects HTML safely', () => {
  const target = {
    innerHTML: '',
    firstChild: null,
    appendChild: (child) => {
      target.firstChild = child;
    },
  };

  const html = '<div class="test">Test content</div>';

  const result = safeHtmlInjection(target, html);

  expect(result).toBe(true);
  expect(target.innerHTML).toBe('');
  expect(target.firstChild).toBeTruthy();
});

test('safeHtmlInjection handles invalid HTML', () => {
  const target = {
    innerHTML: '',
    firstChild: null,
    appendChild: () => {},
  };

  const html = 'parsererror<div>Invalid HTML</div>';

  const result = safeHtmlInjection(target, html);

  expect(result).toBe(false);
});

test('safeHtmlInjection handles invalid target', () => {
  const result = safeHtmlInjection(null, '<div>test</div>');

  expect(result).toBe(false);
});

test('safeHtmlInjection handles invalid HTML type', () => {
  const target = {
    innerHTML: '',
    firstChild: null,
    appendChild: () => {},
  };

  const result = safeHtmlInjection(target, 123);

  expect(result).toBe(false);
});
