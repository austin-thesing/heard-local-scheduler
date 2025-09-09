# HubSpot Form Router Codebase Guide

## Build/Test/Run Commands
- **Test locally**: Open `test-embed.html?debug=true` or `form-with-router.html?debug=true` in browser
- **Debug mode**: Add `?debug=true` to any URL for console logging
- **No build process**: Pure JavaScript/HTML - no npm/yarn needed
- **Format code**: Use Prettier (configured via `.prettierignore`)

## Code Style & Conventions
- **JavaScript**: ES6+ with IIFE pattern for encapsulation, strict mode always enabled
- **Naming**: camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants
- **Functions**: Prefer small, composable, pure functions with JSDoc comments
- **Error handling**: Always wrap external calls in try-catch, provide fallback UIs, validate all inputs
- **Security**: Validate postMessage origins, sanitize URL parameters, check element existence before DOM manipulation
- **Logging**: Use `log()` wrapper function that respects DEBUG flag, never log sensitive data

## Key Architecture
- **scheduler-redirect.js**: Main routing logic, postMessage listener, HubSpot form integration
- **scheduler-standalone.js**: Standalone scheduler page with URL parameter routing
- **No dependencies**: Pure vanilla JS - no frameworks, no build tools, no package.json
- **Testing**: Manual browser testing via test-embed.html with debug=true parameter