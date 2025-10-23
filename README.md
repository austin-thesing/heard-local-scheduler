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

- `ps-cookie-setter.js` - Global PartnerStack cookie capture for affiliate tracking
- `hubspot-form-router.js` - Main routing logic that listens for HubSpot form submissions
- `wf-scheduler-injection.js` - Handles scheduler injection and form data prefilling
- `cookie-helper-hs.js` - HubSpot-specific PartnerStack ID injection helper
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
<script
  src="https://js.hsforms.net/forms/embed/developer/7507639.js"
  defer
></script>
<div
  class="hs-form-html"
  data-form-id="YOUR-FORM-ID"
  data-portal-id="7507639"
></div>

<!-- Load the Router -->
<script src="hubspot-form-router.js"></script>
```

2. On your scheduler page, include the complete scheduler script:

```html
<script src="wf-scheduler-injection.js"></script>
```

### Routing Logic

The system routes based on the "Does your practice have multiple owners?" question:

- **"Yes" (Multiple Owners)** → Routes to consultation scheduler
- **"No" or not answered** → Routes to success page (no scheduler)

**Note**: Income-based routing has been removed. The system no longer considers annual revenue thresholds for routing decisions as of 10/22/2025.

### Debug Mode

Enable debug logging by adding `?debug=true` to any URL:

```
https://yoursite.com/scheduler?debug=true
```

## Configuration

Scheduler URLs and routing logic are configured in the main script:

```javascript
const SCHEDULER_CONFIG = {
  general: {
    url: 'https://meetings.hubspot.com/bz/consultation',
    name: 'Consultation Scheduler',
    description: 'General consultation scheduling',
  },
};

const ROUTE_DESTINATIONS = {
  success: '/thank-you/success', // Disqualified users
  schedule: '/thank-you/schedule', // Qualified users
};
```

**Note**: The system now uses a single general scheduler configuration. Routing is determined solely by the multi-practice ownership question.

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

## Changelog

### October 22, 2025

- **Removed**: Income-based disqualification logic
  - The system no longer checks annual revenue thresholds for routing decisions
  - Routing is now based solely on the multi-practice ownership question
  - Simplified configuration to use a single general scheduler
  - Updated documentation to reflect the simplified routing logic
