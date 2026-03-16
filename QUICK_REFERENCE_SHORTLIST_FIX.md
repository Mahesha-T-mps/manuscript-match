# Quick Reference: Shortlist Export Data Mapping Fix

## What Was Fixed?
Data from Shortlist exports was appearing in wrong columns compared to Recommendations exports.

## Why It Happened?
Different data sources (API, cache, localStorage) use different field names. The shortlist service wasn't normalizing these differences.

## What Changed?
Added a `normalizeReviewerData()` function that converts all field name variations to standard names before export.

## How to Test?

### 30-Second Test:
```
1. Export from Recommendations → Save as rec.csv
2. Create shortlist with same reviewers
3. Export from Shortlist → Save as short.csv
4. Compare: Should be identical
```

### Expected Result:
✅ Same data in same columns

## Files Changed
- `src/services/shortlistService.ts` - Added data normalization

## What Gets Normalized?

| Category | Examples |
|----------|----------|
| Names | `name` → `reviewer`, `affiliation` → `aff` |
| Publications | `publications` → `Total_Publications` |
| Time Periods | `Publications (last 10 years)` → `Publications_10_years` |
| Specialized | `clinical_trials` → `Clinical_Trials_no` |
| Language | `english_pubs` → `English_Pubs` |
| Validation | `coauthor`, `aff_match`, `country_match` |

## Console Logs to Look For
```
[ShortlistService] Normalizing reviewer data for: [email]
[ShortlistService] Normalized reviewer data keys: [count]
```

## If It Doesn't Work

1. **Check console** for error messages
2. **Verify data source** (API, cache, or localStorage)
3. **Compare field names** between sources
4. **Check normalization** is happening

## Key Points

✅ **Works with all data sources** (API, cache, localStorage)
✅ **Handles all field name variations**
✅ **Provides default values** for missing fields
✅ **No breaking changes**
✅ **Works for all export formats** (CSV, Excel, JSON)

## Before & After

### Before:
```
Recommendations Export:
- Column A: Dr. Smith
- Column F: 45

Shortlist Export:
- Column A: (empty)
- Column F: Dr. Smith
- Column G: 45
```

### After:
```
Recommendations Export:
- Column A: Dr. Smith
- Column F: 45

Shortlist Export:
- Column A: Dr. Smith
- Column F: 45
```

## Verification Checklist

- [ ] Reviewer names in correct column
- [ ] Email addresses in correct column
- [ ] Publication counts match
- [ ] Validation data in correct columns
- [ ] No empty columns with data
- [ ] No data overflow
- [ ] All formats work (CSV, Excel, JSON)

## Need Help?

1. Check `SHORTLIST_EXPORT_FIX_SUMMARY.md` for detailed explanation
2. See `TEST_SHORTLIST_DATA_MAPPING.md` for comprehensive tests
3. Review console logs for debugging info
4. Check `SHORTLIST_DATA_MAPPING_FIX.md` for technical details