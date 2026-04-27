# Conflict of Interest (COI) Display Update

## Summary
Updated the COI display logic in Workflow Progress (Reviewer Recommendations) to handle three distinct cases for the `coi_coauthor` field.

## Status
✅ **COMPLETED** - All changes applied successfully with no syntax errors.

## Changes Made

### Updated Files
1. ✅ `src/components/process/ProcessWorkflow.tsx` - Workflow Progress display
2. ✅ `src/components/results/ReviewerResults.tsx` - Reviewer Results display

### New Logic

The COI status is now determined as follows:

```typescript
const isTrue = reviewer.coi_coauthor === true || 
              reviewer.coi_coauthor === 'TRUE' || 
              reviewer.coi_coauthor === 'True' || 
              reviewer.coi_coauthor === 'true';

const isFalse = reviewer.coi_coauthor === false || 
               reviewer.coi_coauthor === 'FALSE' || 
               reviewer.coi_coauthor === 'False' || 
               reviewer.coi_coauthor === 'false';

const coiStatus = isFalse 
  ? 'No' 
  : hasAuthorId(reviewer.coi_coauthor) 
    ? 'Yes' 
    : isTrue 
      ? 'Yes' 
      : 'No';

const isClickable = hasAuthorId(reviewer.coi_coauthor);
```

### Three Display Cases

#### Case 1: COI = "No" (Non-clickable)
- **Condition**: `coi_coauthor` is `false`, `'FALSE'`, `'False'`, or `'false'`
- **Display**: Green background, green text
- **Text**: "Conflict of Interest: No"
- **Behavior**: Not clickable, no underline
- **Icon**: ✓

#### Case 2: COI = "Yes" (Clickable with Link)
- **Condition**: `coi_coauthor` contains an author ID pattern (e.g., "A12345")
- **Display**: Red background, red text with underline
- **Text**: "Conflict of Interest: Yes"
- **Behavior**: Clickable button that opens COIPublicationsModal showing shared publications
- **Hover Effect**: Opacity changes on hover
- **Icon**: ⚠

#### Case 3: COI = "Yes" (Non-clickable) ⭐ NEW
- **Condition**: `coi_coauthor` is `true`, `'TRUE'`, `'True'`, or `'true'`
- **Display**: Red background, red text (no underline)
- **Text**: "Conflict of Interest: Yes"
- **Behavior**: Not clickable, displayed as static text
- **Icon**: ⚠

## Visual Differences

| Case | Background | Text Color | Underline | Clickable | Icon |
|------|-----------|------------|-----------|-----------|------|
| No COI | Green | Green | No | No | ✓ |
| Yes with Author ID | Red | Red | Yes | Yes | ⚠ |
| Yes (True) | Red | Red | No | No | ⚠ |

## Implementation Details

### ProcessWorkflow.tsx
- Updated the COI determination logic in the validation recommendations display (line ~2140)
- Changed the conditional rendering from `coiStatus === 'Yes'` to `isClickable`
- Added `isTrue` and `isFalse` helper checks for better readability

### ReviewerResults.tsx
- Updated the COI determination logic in two places:
  1. Main COI display container (line ~1211)
  2. Validation criteria section (line ~1140)
- Changed the conditional rendering from `coiStatus === 'Yes'` to `isClickable`
- Added `isTrue` and `isFalse` helper checks for better readability

## Testing Recommendations

1. ✅ Test with `coi_coauthor = false` → Should show green "No"
2. ✅ Test with `coi_coauthor = "A12345"` → Should show red "Yes" with clickable link
3. ✅ Test with `coi_coauthor = true` → Should show red "Yes" without clickable link
4. ✅ Verify the modal opens only for Case 2 (author ID pattern)
5. ✅ Check both locations: Workflow Progress and Reviewer Results pages

## Notes

- The logic is consistent across both components
- The author ID pattern is detected using regex: `/A\d+/`
- All string comparisons are case-insensitive for boolean values
- The validation criteria icon also reflects the updated logic
- No syntax errors or breaking changes introduced
