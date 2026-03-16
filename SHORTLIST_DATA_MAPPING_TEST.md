# Shortlist Data Mapping Test Guide

## Step-by-Step Debugging

### Step 1: Run Debug Script
1. Open browser console (F12)
2. Copy and paste the content of `debug-shortlist-data-mapping.js`
3. Press Enter to run
4. Review the output

### Step 2: Export from Shortlist
1. Go to Shortlist step
2. Export a shortlist as CSV
3. Check browser console for these specific messages:

```
[ShortlistService] Starting export for process: [processId]
[ShortlistService] Found reviewers from [source]: [count]
[ShortlistService] Normalizing reviewer data for: [email]
[ShortlistService] Original reviewer keys: [array]
[ShortlistService] Original reviewer sample data: [object]
[ShortlistService] Normalized reviewer sample data: [object]
[ShortlistService] Exporting CSV with conditions: [array]
[ShortlistService] First reviewer data being exported: [object]
[generateCSV] Called with: {reviewerCount: X, selectedConditions: [array]}
[generateCSV] Final headers: [array]
```

### Step 3: Compare Data
Compare the console output with these questions:

#### Data Source Check:
- **Question**: Which source is being used?
- **Look for**: "Found reviewers from validationRecommendations" vs "Found reviewers from API"
- **Expected**: Should use validationRecommendations or recommendations cache, not API

#### Original Data Check:
- **Question**: What does the original reviewer data look like?
- **Look for**: "Original reviewer sample data"
- **Check**: Are the field names what you expect?

#### Normalization Check:
- **Question**: Is normalization working correctly?
- **Look for**: "Normalized reviewer sample data"
- **Check**: Are the values being mapped correctly?

#### Export Data Check:
- **Question**: What data is being passed to generateCSV?
- **Look for**: "First reviewer data being exported"
- **Check**: Does this match the normalized data?

### Step 4: Manual Comparison Test

#### Export from Recommendations:
1. Go to Recommendations step
2. Select 1-2 reviewers
3. Export as CSV
4. Open the CSV file
5. Note down the data in these columns:
   - Column A (author): ________________
   - Column B (email): ________________
   - Column F (conditions_met): ________________
   - Column H (Total_Publications): ________________
   - Column K (Publications_10_years): ________________

#### Export from Shortlist:
1. Add the SAME reviewers to shortlist
2. Export as CSV
3. Open the CSV file
4. Note down the data in the SAME columns:
   - Column A (author): ________________
   - Column B (email): ________________
   - Column F (conditions_met): ________________
   - Column H (Total_Publications): ________________
   - Column K (Publications_10_years): ________________

#### Compare Results:
- **Match?** Column A: ☐ Yes ☐ No
- **Match?** Column B: ☐ Yes ☐ No
- **Match?** Column F: ☐ Yes ☐ No
- **Match?** Column H: ☐ Yes ☐ No
- **Match?** Column K: ☐ Yes ☐ No

### Step 5: Identify the Issue

#### If normalization is NOT happening:
**Symptoms**: No "Normalizing reviewer data" messages in console
**Cause**: Data is coming from a source that doesn't call normalization
**Solution**: Check which data source is being used

#### If normalization IS happening but data is wrong:
**Symptoms**: "Normalizing reviewer data" messages appear, but values are incorrect
**Cause**: Field mapping in normalization function is incorrect
**Solution**: Check the field names in original data vs normalized data

#### If data is correct but export is wrong:
**Symptoms**: Normalized data looks correct, but CSV has wrong values
**Cause**: Issue in generateCSV function or field mapping
**Solution**: Check the generateCSV logs

### Step 6: Common Issues and Fixes

#### Issue 1: Data from API instead of cache
**Symptoms**: Console shows "Fetching reviewers from API"
**Problem**: API data has different field names than cached data
**Fix**: Ensure validation data is properly cached

#### Issue 2: Field names don't match
**Symptoms**: Original data has different field names than expected
**Problem**: Normalization mapping is incomplete
**Fix**: Add missing field mappings to normalizeReviewerData()

#### Issue 3: Values are undefined/null
**Symptoms**: Normalized data shows 0 or empty values
**Problem**: Original data uses different field names
**Fix**: Update field mapping in normalization function

### Step 7: Report Results

Please provide:

1. **Console logs** from Step 2 (copy all [ShortlistService] and [generateCSV] messages)
2. **Data comparison** from Step 4 (which columns match/don't match)
3. **CSV files** (both Recommendations and Shortlist exports)
4. **Data source** being used (from console logs)

### Quick Fix Test

If you want to test the fix immediately:

1. **Set validation conditions** (run in console):
```javascript
const processId = 'your-process-id'; // Replace with actual ID
localStorage.setItem(`process_${processId}_selectedValidationConditions`, JSON.stringify(['Publications', 'Coauthor']));
```

2. **Export and check** if only Publications and Coauthor columns appear

3. **Expected result**: ~15 columns instead of 46 columns

This will help us identify exactly where the data mapping is failing!