# Shortlist Export Debugging Guide

## Issue
The shortlist export is still including all validation condition columns instead of only the selected ones.

## Debugging Steps

### 1. Check Browser Console Logs
When you export a shortlist, check the browser console for these debug messages:

```
[ShortlistService] Starting export for process: [processId] shortlist: [shortlistId] format: [format]
[ShortlistService] Found reviewers from validationRecommendations: [count]
[ShortlistService] Found selected validation conditions: [array]
[ShortlistService] Export details:
- Selected validation conditions: [array]
- Conditions count: [number]
[ShortlistService] Exporting CSV with conditions: [array]
[generateCSV] Called with: {reviewerCount: X, selectedConditions: [array], conditionsCount: X}
[generateCSV] Processing selected conditions: [array]
[generateCSV] Final headers: [array]
```

### 2. Use Debug Console Script
Copy and paste the content of `debug-shortlist-export-console.js` into your browser console while on the shortlist page. This will:

- Check localStorage for validation conditions
- Verify the data structure
- Simulate the export filtering logic
- Show what headers would be generated

### 3. Manual localStorage Check
In browser console, run:

```javascript
// Replace 'your-process-id' with actual process ID
const processId = 'your-process-id';
const key = `process_${processId}_selectedValidationConditions`;
const data = localStorage.getItem(key);
console.log('Key:', key);
console.log('Data:', data);
if (data) {
    console.log('Parsed:', JSON.parse(data));
}
```

### 4. Check Validation Conditions Storage
The validation conditions should be stored in localStorage with the key format:
`process_${processId}_selectedValidationConditions`

Example data: `["Publications", "Coauthor", "Publication Types"]`

## Common Issues and Fixes

### Issue 1: No Selected Validation Conditions Found
**Symptoms:** Console shows "No selected validation conditions found in localStorage"

**Causes:**
- Validation step was not completed
- Validation conditions were not saved properly
- Wrong process ID being used

**Fix:**
1. Go back to the validation step
2. Select validation conditions
3. Complete the validation process
4. Check that conditions are saved in localStorage

### Issue 2: Selected Conditions Array is Empty
**Symptoms:** Console shows `selectedValidationConditions: []`

**Causes:**
- All validation conditions were deselected
- Validation step was reset

**Fix:**
1. Go back to validation step
2. Select at least one validation condition
3. Complete validation

### Issue 3: Export Still Shows All Columns
**Symptoms:** Export file contains all validation columns despite conditions being found

**Possible Causes:**
- Bug in generateCSV function
- Conditions not being passed correctly to export function
- Validation condition mapping is incorrect

**Debug Steps:**
1. Check console logs for `[generateCSV]` messages
2. Verify that `selectedConditions` parameter is not undefined/null
3. Check that condition names match the mapping in `VALIDATION_CONDITION_COLUMNS`

### Issue 4: Condition Names Don't Match Mapping
**Symptoms:** Console shows conditions but no columns are selected

**Fix:** Check that the condition names in localStorage match exactly with the keys in `VALIDATION_CONDITION_COLUMNS`:

```javascript
// Valid condition names:
- "Publications"
- "First/Last Author in publications"  
- "Relevant Publications"
- "Publication Types"
- "T&F Publications last year"
- "Coauthor"
- "Conflict of Interest"
- "Affiliation/Country match"
- "Study Type Detection"
```

## Testing the Fix

### Test 1: Basic Filtering
1. Select only "Publications" and "Coauthor" conditions in validation
2. Complete validation
3. Create shortlist
4. Export shortlist as CSV
5. Check that CSV only contains these columns:
   - Base columns: author, email, aff, city, country, conditions_met, conditions_satisfied
   - Publications columns: Total_Publications, Publications_10_years, etc.
   - Coauthor columns: coauthor, coauthor_condition

### Test 2: No Conditions Selected
1. Deselect all validation conditions
2. Complete validation
3. Export shortlist
4. Should include all validation columns (backward compatibility)

### Test 3: Different Formats
1. Test with CSV, JSON, Excel, and Word formats
2. All should respect the same filtering logic

## Manual Fix if Issue Persists

If the automatic detection isn't working, you can manually set the validation conditions in localStorage:

```javascript
// Replace with your actual process ID and desired conditions
const processId = 'your-process-id';
const selectedConditions = ['Publications', 'Coauthor', 'Publication Types'];

localStorage.setItem(
    `process_${processId}_selectedValidationConditions`, 
    JSON.stringify(selectedConditions)
);

console.log('Manually set validation conditions:', selectedConditions);
```

## Verification

After export, verify the filtering worked by:

1. **CSV**: Open in Excel/text editor and count columns
2. **JSON**: Check the structure and field names
3. **Excel**: Open and verify column headers
4. **Word**: Check that only relevant data sections are included

Expected column counts for different condition combinations:
- Base columns only: 7 columns
- Publications only: 7 + 11 = 18 columns  
- Coauthor only: 7 + 2 = 9 columns
- All conditions: 7 + 60+ columns (full set)

## Contact for Further Help

If the issue persists after following this guide:

1. Share the console log output from the debug script
2. Provide the localStorage data for your process ID
3. Specify which validation conditions you selected
4. Include the actual vs expected column headers from the export