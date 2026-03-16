# Test Guide: Shortlist Data Mapping Fix

## Quick Test (5 minutes)

### Step 1: Export from Recommendations
1. Navigate to **Recommendations** step
2. Select 2-3 reviewers
3. Click **Export** button
4. Choose **CSV** format
5. Save the file as `recommendations_export.csv`
6. **Note down** the data in these columns:
   - Column A: Reviewer name
   - Column B: Email
   - Column F: Total Publications
   - Column G: Publications (10 years)

### Step 2: Create Shortlist with Same Reviewers
1. Navigate to **Shortlist** step
2. Add the **same 2-3 reviewers** to shortlist
3. Click **Export** button
4. Choose **CSV** format
5. Save the file as `shortlist_export.csv`

### Step 3: Compare the Exports
1. Open both CSV files side by side
2. Compare the data:

| Field | Recommendations | Shortlist | Match? |
|-------|-----------------|-----------|--------|
| Reviewer Name | [value] | [value] | ✓/✗ |
| Email | [value] | [value] | ✓/✗ |
| Total Publications | [value] | [value] | ✓/✗ |
| Publications (10 years) | [value] | [value] | ✓/✗ |
| Conditions Met | [value] | [value] | ✓/✗ |

### Expected Result:
✅ **All data should match exactly** in the same columns

---

## Detailed Test (15 minutes)

### Test Case 1: Basic Data Mapping
**Objective**: Verify all basic fields are correctly mapped

**Steps**:
1. Export from Recommendations
2. Export from Shortlist
3. Compare these columns:
   - author (Column A)
   - email (Column B)
   - aff (Column C)
   - city (Column D)
   - country (Column E)
   - conditions_met (Column F)
   - conditions_satisfied (Column G)

**Expected**: All values match exactly

---

### Test Case 2: Publication Metrics
**Objective**: Verify publication data is correctly mapped

**Steps**:
1. Export from Recommendations
2. Export from Shortlist
3. Compare publication columns:
   - Total_Publications
   - Publications_10_years
   - Publications_5_years
   - Publications_2_years
   - Publications_last_year
   - English_Pubs

**Expected**: All publication counts match exactly

---

### Test Case 3: Validation Condition Data
**Objective**: Verify validation condition fields are correctly mapped

**Steps**:
1. Export from Recommendations
2. Export from Shortlist
3. Compare validation columns:
   - coauthor (Yes/No)
   - aff_match (yes/no)
   - country_match (yes/no)
   - sanction_country (yes/no)
   - Retracted_Pubs_no (number)

**Expected**: All validation data matches exactly

---

### Test Case 4: Different Export Formats
**Objective**: Verify fix works for all export formats

**Steps**:
1. Export from Recommendations as **CSV**
2. Export from Shortlist as **CSV**
3. Compare data ✓

4. Export from Recommendations as **Excel**
5. Export from Shortlist as **Excel**
6. Compare data ✓

7. Export from Recommendations as **JSON**
8. Export from Shortlist as **JSON**
9. Compare data ✓

**Expected**: Data matches in all formats

---

## Debugging If Test Fails

### If Data Doesn't Match:

1. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for `[ShortlistService]` messages
   - Check for `Normalizing reviewer data` messages

2. **Check Data Source**:
   - Console should show which source was used:
     - "Found reviewers from validationRecommendations"
     - "Found reviewers from recommendations cache"
     - "Fetching reviewers from API"

3. **Verify Field Mapping**:
   - Check if all fields are being normalized
   - Look for any warnings about missing fields

4. **Compare Field Names**:
   - Recommendations might use: `Publications (last 10 years)`
   - Shortlist should normalize to: `Publications_10_years`
   - Both should export with same column header

### Common Issues:

**Issue**: Data in wrong column
- **Cause**: Field name mismatch
- **Fix**: Check normalization function for missing field mapping

**Issue**: Missing data in Shortlist export
- **Cause**: Field not being normalized
- **Fix**: Add field to normalizeReviewerData() function

**Issue**: Different values between exports
- **Cause**: Data transformation error
- **Fix**: Check console logs for normalization details

---

## Console Logging for Debugging

When exporting from Shortlist, you should see:

```
[ShortlistService] Starting export for process: [processId]
[ShortlistService] Found reviewers from [source]: [count]
[ShortlistService] Normalizing reviewer data for: [email]
[ShortlistService] Normalized reviewer data keys: [count]
[ShortlistService] Export details:
- Reviewers count: [count]
- Selected validation conditions: [array]
[ShortlistService] Exporting CSV with conditions: [array]
[ShortlistService] Generated CSV headers: [headers]
```

---

## Success Criteria

✅ **Test Passed If**:
- All data matches between Recommendations and Shortlist exports
- No data is in wrong columns
- All fields are properly populated
- No empty columns where data should be
- All formats (CSV, Excel, JSON) work correctly

❌ **Test Failed If**:
- Data appears in different columns
- Some fields are missing
- Values don't match between exports
- Any format produces incorrect output

---

## Reporting Results

If test fails, please provide:

1. **Console logs** from browser (F12 → Console)
2. **Sample data** from both exports
3. **Which fields** are misaligned
4. **Export format** used (CSV/Excel/JSON)
5. **Number of reviewers** in shortlist

This information will help identify and fix any remaining issues.