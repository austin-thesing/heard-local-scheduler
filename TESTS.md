# Test Suite Documentation

This repository includes comprehensive unit tests for the changed files in this branch. The tests are written using Bun's built-in test runner, which provides a Jest-compatible API.

## Test Files

### 1. `ps-cookie-setter.test.js`
Tests for the PartnerStack cookie setter utility that captures affiliate tracking parameters from URL query strings.

**Coverage:**
- Cookie sanitization and security
- Query parameter parsing
- Cookie setting with proper attributes (domain, path, max-age, SameSite, Secure)
- Cookie retrieval and refresh logic
- Edge cases (malformed input, XSS attempts, special characters)
- Custom domain configuration

**Key Test Suites:**
- `sanitize function` - Validates input sanitization
- `setCookie function` - Tests cookie creation and attributes
- `getCookie function` - Tests cookie retrieval
- `cookie refresh behavior` - Tests TTL refresh logic
- `security considerations` - Tests XSS and injection prevention

### 2. `cookie-helper-hs.test.js`
Tests for the HubSpot-specific PartnerStack ID injection helper that automatically populates form fields.

**Coverage:**
- Cookie reading with special character handling
- PartnerStack ID retrieval from multiple sources (sessionStorage, localStorage, cookies)
- Source prioritization logic
- Form field injection
- HubSpot form event listeners
- DOM manipulation and event dispatching
- Error handling and graceful degradation

**Key Test Suites:**
- `getCookie function` - Cookie retrieval logic
- `getPartnerStackId function` - Multi-source ID resolution
- `injectPartnerStackId function` - DOM manipulation and injection
- `setupHubSpotListener function` - Event handling
- `initialization` - Script startup and timing
- `edge cases and error handling` - Robustness tests

### 3. `hubspot-form-router.test.js`
Tests for the PartnerStack integration in the main HubSpot form router.

**Coverage:**
- PartnerStack ID retrieval from various sources
- ID injection into form submission data
- Persistence to sessionStorage and localStorage
- Integration with routing logic
- Response normalization
- postMessage event handling
- Debug logging
- Error handling

**Key Test Suites:**
- `getPartnerstackClickId function` - ID retrieval logic
- `PartnerStack ID injection into form submission` - Data augmentation
- `determineSchedulerType with PartnerStack` - Routing logic
- `normalizeResponse function` - Input normalization
- `postMessage handling with PartnerStack` - Event integration
- `logging and debugging` - Debug output
- `edge cases` - Boundary conditions
- `integration with existing routing logic` - Compatibility

### 4. `form-handler.test.js`
Tests for the combined module that brings together the router and cookie helper.

**Coverage:**
- Module exports and interface
- Router integration
- Cookie helper integration
- Load order coordination
- Debugging interface
- Version management
- Getter behavior and state freshness

**Key Test Suites:**
- `module exports` - Export structure
- `initialization` - Module setup
- `integration with router` - Router access
- `integration with cookie helper` - Helper access
- `load order and coordination` - Module loading
- `debugging interface` - Debug features
- `version management` - Version tracking
- `getter behavior` - Dynamic state access

## Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test File
```bash
bun test ps-cookie-setter.test.js
bun test cookie-helper-hs.test.js
bun test hubspot-form-router.test.js
bun test form-handler.test.js
```

### Run Tests with Coverage
```bash
bun test --coverage
```

### Run Tests in Watch Mode
```bash
bun test --watch
```

### Run Tests with Specific Pattern
```bash
bun test --test-name-pattern "PartnerStack"
```

## Test Philosophy

The test suite follows these principles:

1. **Comprehensive Coverage**: Tests cover happy paths, edge cases, error conditions, and security considerations
2. **Isolation**: Each test is independent and doesn't rely on global state from other tests
3. **Clarity**: Test names clearly describe what is being tested
4. **Realistic Scenarios**: Tests simulate actual browser environments and user interactions
5. **Security-First**: Special attention to XSS prevention, injection attacks, and data sanitization
6. **Error Resilience**: Tests verify graceful degradation when APIs are unavailable or throw errors

## Test Environment

Tests run in a DOM environment with mocked browser APIs:
- `document` (DOM manipulation)
- `window` (global state)
- `localStorage` and `sessionStorage` (web storage)
- `document.cookie` (cookie access)
- `MessageEvent` and `postMessage` (cross-frame communication)
- `URLSearchParams` (query string parsing)

## Key Testing Patterns

### DOM Setup and Teardown
```javascript
beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
  // Clear cookies
});
```

### Testing Async Operations
```javascript
test('should handle delayed injection', (done) => {
  setTimeout(() => {
    // assertions
    done();
  }, 1000);
});
```

### Testing Event Listeners
```javascript
test('should respond to postMessage events', () => {
  const event = new MessageEvent('message', {
    data: { type: 'hsFormCallback' }
  });
  window.dispatchEvent(event);
  // assertions
});
```

### Mocking Console
```javascript
const consoleLogSpy = mock(() => {});
console.log = consoleLogSpy;
expect(consoleLogSpy).toHaveBeenCalled();
```

## Test Coverage Goals

- **Unit Test Coverage**: 90%+ for all new code
- **Edge Case Coverage**: Tests for null/undefined, empty strings, malformed input
- **Security Coverage**: Tests for XSS, injection, cookie manipulation
- **Integration Coverage**: Tests for inter-module communication

## Common Issues and Solutions

### Issue: Tests timing out
**Solution**: Increase timeout with `test('name', () => {}, 10000)` or use `done()` callback

### Issue: Cookie tests failing
**Solution**: Ensure cookies are cleared in `beforeEach()` and paths are set correctly

### Issue: DOM manipulation not working
**Solution**: Ensure `document.body.innerHTML` is set before running assertions

### Issue: Storage access errors
**Solution**: Mock storage APIs when testing error-handling scenarios

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all existing tests pass
3. Add tests for edge cases and error conditions
4. Update this README with new test suite information

## Related Documentation

- [Bun Test Runner Documentation](https://bun.sh/docs/cli/test)
- [Jest API Reference](https://jestjs.io/docs/api) (Bun is Jest-compatible)
- [Testing Best Practices](./.cursor/rules/04-testing.mdc)