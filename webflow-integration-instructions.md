# Webflow Scheduler Integration Instructions

## Problem
The Webflow scheduler page at `/hs-scheduler/ty-general` shows a default HubSpot iframe without form data pre-fill, even after users submit forms that should pass data through.

## Solution
Add the `webflow-scheduler-fix.js` script to your Webflow scheduler page to detect stored form data and enhance the existing iframe with pre-filled information.

## Implementation Steps

### 1. Add Script to Webflow Page

Add this script to the "Before `</body>` tag" section in your Webflow page settings for the `/hs-scheduler/ty-general` page:

```html
<script src="https://your-domain.com/path/to/webflow-scheduler-fix.js"></script>
```

OR paste the contents of `webflow-scheduler-fix.js` directly wrapped in `<script>` tags.

### 2. For Testing (Debug Mode)

To test the integration, add `?debug=true` to the URL: `https://heard2.webflow.io/hs-scheduler/ty-general?debug=true`

This will show a debug panel with information about:
- Form data sources (localStorage, sessionStorage, cookies)
- URL parameters
- Stored form data details

### 3. How It Works

1. **Detection**: Script looks for existing HubSpot iframes on the page
2. **Data Retrieval**: Checks localStorage, sessionStorage, and cookies for stored form data
3. **Enhancement**: If form data is found, replaces the iframe URL with a pre-filled version
4. **Fallback**: If no form data is found, leaves the original iframe unchanged

### 4. Data Flow

```
Form Page → scheduler-redirect.js captures data → stores in localStorage/sessionStorage 
→ redirects to /hs-scheduler/ty-general → webflow-scheduler-fix.js detects data 
→ enhances iframe with pre-filled data
```

### 5. Field Mappings

The script maps these form fields to HubSpot scheduler parameters:
- `email` → `email`
- `firstname`/`first_name` → `firstName`
- `lastname`/`last_name` → `lastName`
- `company`/`practice_name` → `company`
- `phone`/`phone_number` → `phone`

### 6. Analytics Events

The script fires these events when enhancement occurs:
- PostHog: `scheduler_enhanced_on_webflow`
- Amplitude: `scheduler_enhanced_on_webflow`

## Testing Checklist

- [ ] Form submission on original form page stores data in localStorage/sessionStorage
- [ ] Redirect to scheduler page works
- [ ] Webflow scheduler page loads the fix script
- [ ] Debug mode shows form data is detected
- [ ] Iframe URL includes form data parameters (email, firstName, etc.)
- [ ] Scheduler shows pre-filled fields instead of asking for email again

## Troubleshooting

### No form data detected:
1. Check that `scheduler-redirect.js` is loaded on the form page
2. Verify form submission triggers the router (check browser console)
3. Confirm data is stored before redirect (check localStorage/sessionStorage)

### Iframe not enhanced:
1. Ensure the fix script is loaded after the iframe is rendered
2. Check browser console for errors
3. Verify the iframe URL matches HubSpot patterns

### Debug mode:
Always test with `?debug=true` first to see what data is available and debug any issues.
