# Heard Local Scheduler

A JavaScript-based routing system for HubSpot forms that intelligently directs users to appropriate scheduling pages based on their form responses.

## Overview

This project provides a seamless integration between HubSpot forms and HubSpot Meeting schedulers, automatically routing users to the correct consultation type based on their practice ownership structure. The system handles form data persistence, scheduler injection, and fallback redirects.

## Features

- **Smart Routing**: Automatically routes users to appropriate schedulers based on form responses
- **Data Persistence**: Preserves form data across page transitions using localStorage and sessionStorage
- **Scheduler Injection**: Dynamically embeds HubSpot Meeting schedulers with pre-filled information
- **Debug Mode**: Built-in debugging capabilities for troubleshooting
- **Fallback Support**: Graceful handling when schedulers fail to load

## Files

- `scheduler-redirect.js` - Main routing logic that listens for HubSpot form submissions
- `webflow-scheduler-complete.js` - Handles scheduler injection and form data prefilling
- `form.css` - Heard brand styling for HubSpot forms
- `embed.html` - Example HTML implementation

## Installation

```bash
# Install dependencies (if any)
bun install

# Build minified production files
bun run build
```

The build process creates minified versions in the `dist/` directory.

## Usage

### Basic Implementation

1. Include the form embed code and router script on your page:

```html
<!-- HubSpot Form -->
<script src="https://js.hsforms.net/forms/embed/developer/7507639.js" defer></script>
<div class="hs-form-html" data-form-id="YOUR-FORM-ID" data-portal-id="7507639"></div>

<!-- Load the Router -->
<script src="scheduler-redirect.js"></script>
```

2. On your scheduler page, include the complete scheduler script:

```html
<script src="webflow-scheduler-complete.js"></script>
```

### Routing Logic

The system routes based on the "Does your practice have multiple owners?" question:
- **"No" (Sole Proprietor)** → Round-robin consultation scheduler
- **"Yes" (S-Corp)** → S-Corp specific consultation scheduler

### Debug Mode

Enable debug logging by adding `?debug=true` to any URL:
```
https://yoursite.com/scheduler?debug=true
```

## Configuration

Scheduler URLs and routing logic are configured in both scripts:

```javascript
const SCHEDULER_CONFIG = {
  sole_prop: {
    url: "https://meetings.hubspot.com/bz/consultation",
    name: "Sole Proprietor Consultation"
  },
  s_corp: {
    url: "https://meetings.hubspot.com/bz/consultations", 
    name: "S-Corp Consultation"
  }
};
```

## Development

```bash
# Format code with Prettier
bunx prettier --write .

# Build for production
bun run build

# Test (when tests are added)
bun test
```

### Code Style

- Vanilla JavaScript (ES6+)
- IIFE pattern for script isolation
- Prettier formatting (single quotes, 2-space indent, semicolons)
- Try-catch blocks for storage operations
- Conditional logging with DEBUG flag

## Browser Compatibility

- Modern browsers with ES6 support
- localStorage and sessionStorage support required
- Works with HubSpot's embed/developer forms

## License

Private repository - Heard internal use only

## Support

For issues or questions, contact the Heard development team.