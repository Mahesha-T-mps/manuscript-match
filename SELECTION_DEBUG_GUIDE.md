# Author Selection Debug Guide

## Issue: Individual checkboxes not working

The Select All/Clear buttons work, but individual checkboxes don't respond to clicks.

## Debugging Steps

### 1. Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try clicking on individual checkboxes
4. Look for these log messages:
   ```
   [ReviewerSearch] Toggling author: [author-id]
   [ReviewerSearch] Selected author: [author-id]
   [ReviewerSearch] Updated selection: [array of selected authors]
   ```

### 2. Check Author Data
In the console, you can also inspect the author data:
```javascript
// Check what authors look like
console.log('Search results:', localStorage.getItem('process_[YOUR_PROCESS_ID]_searchResults'));

// Check current selection
console.log('Selected authors:', localStorage.getItem('process_[YOUR_PROCESS_ID]_selectedAuthors'));
```

### 3. Common Issues & Fixes

#### Issue A: Authors have no email
**Symptom**: Console shows `undefined` or empty string for author ID
**Fix**: The code now uses author name as fallback if email is missing

#### Issue B: Click events not firing
**Symptom**: No console logs when clicking checkboxes
**Fix**: Check if there are any CSS issues or event propagation problems

#### Issue C: State not updating
**Symptom**: Console logs show correct values but UI doesn't update
**Fix**: React state update issue

## Quick Test

Try this in the browser console while on the search results page:

```javascript
// Manually trigger selection (replace 'test@email.com' with actual author email/name)
window.dispatchEvent(new CustomEvent('test-selection', { 
  detail: { authorId: 'test@email.com' } 
}));
```

## Temporary Workaround

If individual selection still doesn't work, you can use this approach:

1. **Use Filter + Select All**: 
   - Filter to show only the authors you want
   - Click "Select All" to select all visible authors
   - Clear filter to see all results with your selection

2. **Multiple Filter Sessions**:
   - Filter for first group of authors → Select All
   - Filter for second group → Select All  
   - Continue until you have all desired authors selected

## Expected Behavior

✅ **Working**: Select All, Clear buttons  
❌ **Not Working**: Individual checkboxes  
❌ **Not Working**: Row clicks  

## Next Steps

1. Check browser console for error messages
2. Try the filter + select all workaround
3. Let me know what console logs you see when clicking checkboxes

## Alternative Quick Fix

If you want a simpler approach, I can modify the code to:
1. Remove individual selection
2. Only use Filter + Select All approach
3. This would still give you control over which authors to select

Would you like me to implement this simpler approach?