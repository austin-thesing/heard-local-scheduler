# HubSpot Form Router Implementation Plan

## Overview
This solution replaces the default HubSpot form redirect behavior with a custom router that dynamically loads the appropriate meeting scheduler based on form responses. Instead of redirecting to meetings.hubspot.com, users see a seamless transition to the correct scheduler with their information pre-filled.

## Architecture

### Core Components

1. **scheduler-router.js** - JavaScript module that handles form submission detection and routing
2. **scheduler-display.html** - Dedicated page for displaying schedulers with routing logic
3. **form-with-router.html** - Example integration showing how to embed forms with routing

### Flow Diagram

```
[HubSpot Form] → [Form Submission] → [PostMessage Event] → [Router Logic] → [Scheduler Display]
```

## Technical Implementation

### 1. PostMessage Event Listening

HubSpot forms automatically send postMessage events to the parent window:

```javascript
{
    type: 'hsFormCallback',
    eventName: 'onFormSubmitted',
    data: {
        submissionGuid: '...',
        formGuid: '...',
        portalId: '...',
        fields: {
            email: 'user@example.com',
            firstname: 'John',
            lastname: 'Doe',
            does_your_practice_have_multiple_owners: 'No'
        }
    }
}
```

### 2. Routing Logic

Based on the "Does your practice have multiple owners?" field:

- **"No"** → Sole Proprietor scheduler (`/bz/consultation`)
- **"Yes"** → S-Corp scheduler (`/bz/consultations`)
- **Fallback** → Default to Sole Proprietor

### 3. Data Passing

User information is passed to schedulers via URL parameters:
- `email` - Pre-fill email field
- `firstName` - Pre-fill first name
- `lastName` - Pre-fill last name
- `company` - Pre-fill company/practice name
- `embed=true` - Enable embed mode

### 4. Scheduler URLs

```javascript
const SCHEDULER_CONFIG = {
    sole_prop: {
        url: 'https://meetings.hubspot.com/bz/consultation',
        name: 'Sole Proprietor Consultation'
    },
    s_corp: {
        url: 'https://meetings.hubspot.com/bz/consultations', 
        name: 'S-Corp Consultation'
    }
};
```

## Integration Methods

### Method 1: Same Page Transition
- Form submits and triggers postMessage
- JavaScript hides form and shows scheduler in same container
- Smooth user experience with no page reload

### Method 2: Redirect with Data
- Form submits and triggers postMessage
- JavaScript redirects to scheduler page with form data as URL parameters
- Scheduler page loads appropriate meeting embed

## Files Structure

```
heard-local-scheduler/
├── scheduler-embeds/
│   ├── sole-prop.html
│   └── s-corp.html
├── scheduler-router.js
├── scheduler-display.html
├── form-with-router.html
└── PLAN.md
```

## Implementation Steps

1. ✅ Research HubSpot postMessage events and scheduler URL parameters
2. 🔄 Create scheduler-router.js with postMessage listener
3. ⏳ Build scheduler-display.html with dynamic embed loading
4. ⏳ Create form-with-router.html example page
5. ⏳ Test with actual form submissions
6. ⏳ Add error handling and fallbacks
7. ⏳ Document setup instructions

## Setup Instructions

### For Existing Forms (Recommended Method)
1. **Include the router script** on your form pages:
   ```html
   <script src="scheduler-router.js"></script>
   ```

2. **Configure HubSpot form** to not redirect after submission:
   - In HubSpot, edit your form settings
   - Set "What should happen after a visitor submits this form?" to "Display a thank you message" 
   - Leave redirect URL empty

3. **Initialize the router** with your preferred settings:
   ```javascript
   window.HubSpotRouter.init({
       redirect: false, // Embed scheduler in same page
       container: '#hubspotForm', // CSS selector for form container
       debug: true // Enable for testing
   });
   ```

### For New Implementations
1. **Copy `form-with-router.html`** as your starting template
2. **Replace the HubSpot form embed** with your actual form:
   - Update `data-form-id` with your form ID
   - Update `data-portal-id` with your portal ID
3. **Customize scheduler URLs** in `scheduler-router.js` if needed
4. **Test with your specific form fields**

### HubSpot Form Configuration
Your form should include a field for business structure routing. Common field names supported:
- `does_your_practice_have_multiple_owners`
- `multiple_owners`
- `practice_multiple_owners`
- `has_multiple_owners`

The router will automatically detect these fields and route accordingly:
- **"No"** → Sole Proprietor scheduler
- **"Yes"** → S-Corp scheduler

### Testing
1. **Local Testing**: Open `form-with-router.html` with `?debug=true` parameter
2. **Form Testing**: Use the demo form (shows when HubSpot form fails to load)
3. **Router Testing**: Check browser console for debug messages
4. **Integration Testing**: Test with actual HubSpot form submissions

### Integration Options

#### Option 1: Same Page Embed (Recommended)
```javascript
window.HubSpotRouter.init({
    redirect: false,
    container: '#formContainer'
});
```
- Form disappears, scheduler appears in same container
- Smooth user experience
- No page reload

#### Option 2: Redirect to Scheduler Page
```javascript
window.HubSpotRouter.init({
    redirect: true
});
```
- User redirected to `scheduler-display.html` with form data
- Separate scheduler page
- Better for complex layouts

## Benefits

- ✅ Seamless user experience
- ✅ No email re-entry required
- ✅ Maintains HubSpot tracking
- ✅ Flexible routing based on form responses
- ✅ Works with existing HubSpot infrastructure
- ✅ Easy to customize and extend

## Browser Support

- Modern browsers with postMessage support
- IE11+ (if needed)
- Mobile browsers (iOS Safari, Android Chrome)

## Security Considerations

- Validates postMessage origin (hubspot domains only)
- Sanitizes form data before URL construction
- Uses HTTPS for all scheduler embeds