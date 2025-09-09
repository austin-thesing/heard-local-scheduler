# Heard Local Scheduler

A modern, refactored HubSpot form routing and Webflow scheduler system with improved architecture, security, and maintainability.

## 🚀 What's New

### Architecture Improvements
- **Modular Design**: Split monolithic IIFEs into focused modules
- **ES6 Modules**: Proper import/export structure for better code organization
- **Encapsulation**: Eliminated global namespace pollution
- **Separation of Concerns**: Clear boundaries between utilities, core logic, and configuration

### Security Enhancements
- **XSS Prevention**: Input sanitization for all user data
- **Secure Origin Validation**: Improved HubSpot domain validation
- **Safe HTML Injection**: DOMParser-based HTML injection instead of innerHTML
- **Consistent Error Handling**: Proper error boundaries throughout

### Performance Optimizations
- **Efficient DOM Monitoring**: Replaced polling with MutationObserver
- **Reduced Code Duplication**: Shared utilities eliminate repeated logic
- **Optimized Storage Handling**: Better fallback mechanisms and error recovery

## 📁 Project Structure

```
src/
├── core/
│   ├── HubSpotRouter.js          # Main HubSpot router class
│   └── WebflowScheduler.js       # Webflow scheduler class
├── utils/
│   ├── form-utils.js            # Form data normalization and processing
│   ├── storage-utils.js         # Storage management with fallbacks
│   ├── url-utils.js             # URL building and validation
│   └── dom-utils.js             # DOM monitoring and manipulation
├── config/
│   └── scheduler-config.js       # Configuration management
└── bundle.js                    # Main bundle entry point

# Legacy files (for backward compatibility)
scheduler-redirect-new.js        # Refactored HubSpot router
webflow-scheduler-complete-new.js # Refactored Webflow scheduler
```

## 🛠️ Development

### Prerequisites
- Node.js >= 18.0.0
- Bun (recommended) or npm

### Setup
```bash
# Install dependencies
bun install

# Development mode with watch
bun run dev

# Build for production
bun run build

# Build legacy versions
bun run build:legacy

# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format

# Type checking
bun run type-check
```

## 🔧 Configuration

### Scheduler Configuration
```javascript
// src/config/scheduler-config.js
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
};
```

### Field Mappings
```javascript
export const FIELD_MAPPINGS = {
  email: ['email', 'email_address', '0-1/email', '0-2/email'],
  firstName: ['firstname', 'first_name', 'fname', '0-1/firstname', '0-2/firstname'],
  // ... more mappings
};
```

## 📊 Usage

### HubSpot Router
```javascript
import { createRouter } from './src/core/HubSpotRouter.js';

const router = createRouter({
  debug: true,
  redirect: true
});

// Manual initialization
router.init();
```

### Webflow Scheduler
```javascript
import { createScheduler } from './src/core/WebflowScheduler.js';

const scheduler = createScheduler({
  debug: true
});

// Manual initialization
scheduler.init();
```

## 🔒 Security Features

### Input Sanitization
```javascript
import { sanitizeInput } from './src/utils/form-utils.js';

const cleanInput = sanitizeInput(userInput); // Escapes HTML entities
```

### Safe HTML Injection
```javascript
import { safeHtmlInjection } from './src/utils/dom-utils.js';

const success = safeHtmlInjection(targetElement, htmlString);
```

### Secure Origin Validation
```javascript
import { isValidHubSpotOrigin } from './src/utils/url-utils.js';

const isValid = isValidHubSpotOrigin(messageOrigin);
```

## 🐛 Debugging

### Debug Mode
Enable debug mode by adding `debug=true` to URL parameters or running on localhost:

```javascript
// Debug panel will appear with detailed information
// https://yoursite.com/page?debug=true
```

### Debug APIs
When debug mode is enabled, additional APIs are exposed:

```javascript
// HubSpot Router debug
window.HubSpotRouterDebug = {
  config: SCHEDULER_CONFIG,
  determineSchedulerType,
  buildSchedulerUrl,
  handleFormSubmission,
  getCapturedData,
  router: routerInstance
};

// Webflow Scheduler debug
window.WebflowSchedulerComplete = {
  getStoredFormData,
  getQueryParams,
  buildSchedulerUrl,
  handleScheduler,
  fireLeadEvents,
  config: ROUND_ROBIN_CONFIG
};
```

## 📈 Analytics Integration

The system automatically fires tracking events to multiple platforms:

- **Facebook Pixel**: Lead events
- **Reddit Pixel**: Custom lead events
- **Google Analytics**: Generate lead events
- **PostHog**: Custom scheduler events
- **Amplitude**: Scheduler lead events

## 🔄 Migration from Legacy

### Step 1: Replace Script Tags
```html
<!-- Old -->
<script src="scheduler-redirect.js"></script>
<script src="webflow-scheduler-complete.js"></script>

<!-- New -->
<script src="dist/bundle.js"></script>
```

### Step 2: Update Configuration
Move hardcoded values to configuration files:

```javascript
// Old: Hardcoded in multiple places
const url = "https://meetings.hubspot.com/bz/consultation";

// New: Centralized configuration
import { SCHEDULER_CONFIG } from './src/config/scheduler-config.js';
const url = SCHEDULER_CONFIG.sole_prop.url;
```

### Step 3: Update API Usage
```javascript
// Old: Global namespace
window.HubSpotRouter.handleFormSubmission(data);

// New: Instance methods
const router = createRouter();
router.handleFormSubmission(data);
```

## 🧪 Testing

Run the test suite:

```bash
bun test
```

Test files should be placed in a `tests/` directory and follow the naming pattern `*.test.js`.

## 📝 Code Style

- **ES6+**: Modern JavaScript features
- **Prettier**: Automated code formatting
- **ESLint**: Code linting and quality checks
- **TypeScript**: Type safety (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

Private project - Heard LLC

## 🔮 Future Enhancements

- [ ] Full TypeScript migration
- [ ] Comprehensive test suite
- [ ] Performance monitoring
- [ ] Advanced error reporting
- [ ] Plugin system for custom schedulers
- [ ] Multi-language support