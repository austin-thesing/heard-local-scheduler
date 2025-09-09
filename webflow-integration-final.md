# Final Webflow Scheduler Integration

## The Solution: One Script to Rule Them All ✨

**Use only `webflow-scheduler-complete.js`** - this combines all functionality and handles every scenario.

## Implementation

### Replace All Scripts
Remove any existing scheduler scripts and use only this one:

```html
<script src="https://your-cdn.com/dist/webflow-scheduler-complete.js"></script>
```

## How It Works

### 1. **Smart Data Detection**
- ✅ Checks localStorage (from form submissions)
- ✅ Checks sessionStorage (from router redirects)
- ✅ Checks cookies (fallback storage)
- ✅ Checks URL parameters

### 2. **Intelligent Routing**
- **Has form data** → Creates pre-filled scheduler
- **No form data** → Redirects to `/free-consult`

### 3. **Flexible DOM Handling**
- Finds existing `#scheduler-target` div
- Can enhance existing HubSpot iframes
- Creates target div if none exists
- Works with any Webflow page structure

### 4. **Pre-filled Scheduler**
- Maps all form fields to HubSpot parameters
- Forces round-robin scheduler (`/consultation`)
- Includes `embed=true` for proper iframe display
- Preserves HubSpot tracking data (submissionGuid, uuid, etc.)

## Testing

### Debug Mode
Add `?debug=true` to see:
- Form data sources and contents
- URL parameters
- Decision logic (load scheduler vs redirect)
- Field mappings and final URL

### Test Scenarios

1. **Form Submission Flow** ✅
   - Submit form → stores data → redirects to scheduler page → shows pre-filled scheduler

2. **Direct Access** ✅
   - Visit scheduler page directly → no form data → redirects to `/free-consult`

3. **URL Parameters** ✅
   - Visit with `?email=test@example.com` → shows pre-filled scheduler

## Files in dist/

- `scheduler-redirect.js` - For form pages (HubSpot capture)
- `webflow-scheduler-complete.js` - **For Webflow scheduler page** ⭐
- `scheduler-standalone.js` - Legacy (no longer needed)
- `webflow-scheduler-fix.js` - Legacy (no longer needed)

## Migration Steps

1. **Remove old scripts** from Webflow scheduler page
2. **Add single script**: `webflow-scheduler-complete.js`
3. **Test both paths**:
   - Form submission → should show pre-filled scheduler
   - Direct access → should redirect to `/free-consult`

## Expected Behavior

### With Form Data:
- ✅ Scheduler loads with email, name, phone pre-filled
- ✅ No email input field shown
- ✅ Analytics events fire

### Without Form Data:
- ✅ Immediate redirect to `/free-consult`
- ✅ No broken iframe or loading states

This single script handles everything intelligently and provides the fallback behavior you requested!
