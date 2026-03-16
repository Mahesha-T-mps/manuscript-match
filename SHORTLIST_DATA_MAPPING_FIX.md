# Shortlist Export Data Mapping Fix

## Problem Identified
When exporting data from the Reviewer Shortlists step, the data was not being stored in the correct columns, even though the Recommendations step export was working correctly.

## Root Cause
The shortlist service was retrieving reviewer data from different sources (validationRecommendations, recommendations cache, or API), but the data structure from these sources might have different field names or missing fields. When the data was passed to the export functions, the field mapping wasn't consistent, causing data to be placed in wrong columns.

### Example of the Issue:
- **Recommendations export**: Data correctly mapped to columns
- **Shortlist export**: Same data but in wrong columns or missing

## Solution Implemented

### 1. Added Data Normalization Function
Created `normalizeReviewerData()` method in the shortlist service that:
- Maps all possible field name variations to standard field names
- Ensures all expected fields exist with proper default values
- Handles both API response format and cached data format
- Provides fallback values for missing fields

### 2. Applied Normalization to All Data Sources
Updated all three data retrieval paths to normalize reviewer data:
- **validationRecommendations** from localStorage
- **recommendations** cache from localStorage
- **API** response from fileService

### 3. Field Mapping Handled
The normalization function handles these field name variations:

```typescript
// Example mappings:
reviewer.name → reviewer.reviewer
reviewer.affiliation → reviewer.aff
reviewer.publications → reviewer.Total_Publications
reviewer['Publications (last 10 years)'] → reviewer.Publications_10_years
reviewer.clinical_trials → reviewer.Clinical_Trials_no
reviewer.english_pubs → reviewer.English_Pubs
reviewer.tf_publications_last_year → reviewer.TF_Publications_last_year
```

## How It Works

### Before Fix:
```
API Response → Filter by email → Export (data in wrong columns)
```

### After Fix:
```
API Response → Filter by email → Normalize data → Export (data in correct columns)
```

## Data Normalization Process

The `normalizeReviewerData()` function ensures:

1. **Basic Information** is properly mapped:
   - reviewer/name → reviewer
   - affiliation → aff
   - publications → Total_Publications

2. **Publication Metrics** are standardized:
   - All 10-year, 5-year, 2-year, and last-year publications
   - First author and last author counts
   - Relevant publications

3. **Specialized Publications** are mapped:
   - Clinical trials, studies, case reports
   - Retracted publications
   - Taylor & Francis publications

4. **Validation Fields** are normalized:
   - Coauthor status
   - Conflict of interest
   - Affiliation and country matches
   - Sanction country status

5. **Condition Flags** are standardized:
   - All publication condition flags
   - English language condition
   - Coauthor condition
   - Affiliation condition
   - Country match condition
   - Retracted condition
   - COI condition

## Testing the Fix

### Step 1: Export from Recommendations
1. Go to Recommendations step
2. Select reviewers
3. Export as CSV/Excel
4. Note the data in columns

### Step 2: Create Shortlist
1. Add same reviewers to shortlist
2. Export from Shortlist step
3. Compare with Recommendations export

### Expected Result:
- **Same data** should appear in **same columns** in both exports
- All fields should be properly populated
- No missing or misaligned data

## Verification Checklist

After applying this fix, verify:

- [ ] Reviewer names appear in correct column
- [ ] Email addresses are in correct column
- [ ] Publication counts match between Recommendations and Shortlist exports
- [ ] Validation condition data is in correct columns
- [ ] No empty columns where data should be
- [ ] No data overflow to adjacent columns
- [ ] All numeric values are properly formatted
- [ ] Boolean values (coauthor, etc.) show as Yes/No

## Console Logging

When exporting from shortlist, you should see:
```
[ShortlistService] Normalizing reviewer data for: [email]
[ShortlistService] Normalized reviewer data keys: [count]
```

This confirms the normalization is happening.

## Files Modified

1. **src/services/shortlistService.ts**
   - Added `normalizeReviewerData()` method
   - Updated `getReviewerDetails()` to normalize data from all sources
   - Added comprehensive logging for debugging

## Benefits

1. **Consistency**: Shortlist exports now match Recommendations exports
2. **Reliability**: Data is properly mapped regardless of source
3. **Flexibility**: Handles different data formats from API and cache
4. **Maintainability**: Centralized field mapping logic
5. **Debuggability**: Detailed logging for troubleshooting

## Backward Compatibility

- No breaking changes
- Existing exports continue to work
- Graceful handling of missing fields
- Default values for all fields

## Future Improvements

Consider:
1. Creating a shared data normalization utility for both Recommendations and Shortlist
2. Adding data validation before export
3. Creating a data mapping configuration file
4. Adding unit tests for field mapping