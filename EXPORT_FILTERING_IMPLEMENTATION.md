# Export Filtering Implementation Summary

## Overview
Updated the export functionality in the Reviewer Recommendations workflow to only export data columns related to the validation conditions that were selected during the validation process, instead of exporting all validation condition data.

## Changes Made

### 1. Updated Export Utilities (`src/utils/exportUtils.ts`)

#### Added Validation Condition Mapping
- Created `VALIDATION_CONDITION_COLUMNS` mapping that defines which data columns belong to each validation condition
- Maps conditions like 'Publications', 'Coauthor', 'Conflict of Interest', etc. to their related data fields

#### Modified Export Functions
- **`generateCSV()`**: Now accepts optional `selectedConditions` parameter
  - Only includes columns related to selected validation conditions
  - Maintains backward compatibility when no conditions are specified
  - Base columns (name, email, affiliation, etc.) are always included

- **`generateJSON()`**: Now accepts optional `selectedConditions` parameter  
  - Only includes data fields related to selected validation conditions
  - Includes `selectedValidationConditions` array in export metadata
  - Maintains backward compatibility for existing exports

- **`exportReviewersAsCSV()` and `exportReviewersAsJSON()`**: Updated to accept and pass through `selectedConditions` parameter

#### Added Helper Function
- **`getReviewerFieldValue()`**: Handles field value extraction with fallbacks for different field name mappings

### 2. Updated Export Dialog (`src/components/results/ExportReviewersDialog.tsx`)

#### Enhanced Props Interface
- Added `selectedValidationConditions?: string[]` prop to receive selected conditions

#### Improved Export Contents Display
- Shows different content descriptions based on whether conditions are selected
- When conditions are selected: Lists the specific conditions being exported
- When no conditions: Shows all data will be exported (backward compatibility)
- Added informational note explaining the filtering behavior

### 3. Updated Reviewer Results Component (`src/components/results/ReviewerResults.tsx`)

#### Enhanced Props Interface
- Added `selectedValidationConditions?: string[]` prop

#### Updated Export Handler
- Modified `handleExport()` to pass selected validation conditions to export functions
- Enhanced activity logging to include information about selected conditions

#### Updated Dialog Usage
- Pass `selectedValidationConditions` to `ExportReviewersDialog`

### 4. Updated Process Workflow (`src/components/process/ProcessWorkflow.tsx`)

#### Enhanced ReviewerResults Usage
- Pass `selectedValidationConditions` to `ReviewerResults` component in RECOMMENDATIONS case
- Ensures the selected conditions from validation step are available for export filtering

## Validation Condition to Column Mapping

The following validation conditions map to these data columns:

- **Publications**: Total publications, 10-year publications, 2-year publications, publication condition flags
- **First/Last Author in publications**: All first/last author publication counts across time periods
- **Relevant Publications**: 5-year publications, relevant publication counts, primary/secondary publications
- **Publication Types**: English publications, clinical trials, case reports, retractions, quality indicators
- **T&F Publications last year**: Taylor & Francis publications, last year publications
- **Coauthor**: Coauthor status and condition flag
- **Conflict of Interest**: COI status and condition flag
- **Affiliation/Country match**: Affiliation match, country match, sanction country status
- **Study Type Detection**: Study type distribution data

## Backward Compatibility

- All export functions maintain backward compatibility
- When no `selectedConditions` are provided, all validation data is exported (existing behavior)
- Existing export calls continue to work without modification

## Benefits

1. **Focused Exports**: Users only get data relevant to their selected validation criteria
2. **Reduced File Size**: Smaller export files when fewer conditions are selected
3. **Clearer Data**: Less confusion about which validation criteria were actually used
4. **Better UX**: Export dialog clearly shows what will be included
5. **Audit Trail**: Export metadata includes which conditions were selected

## Usage Example

```typescript
// Export only data for selected validation conditions
const selectedConditions = ['Publications', 'Coauthor', 'Publication Types'];
exportReviewersAsCSV(reviewers, selectedConditions);

// Export all data (backward compatibility)
exportReviewersAsCSV(reviewers);
```

## Testing

The implementation includes:
- Backward compatibility for existing export functionality
- Proper handling of missing or empty condition selections
- Correct field mapping and value extraction
- Enhanced user feedback in the export dialog

## Files Modified

1. `src/utils/exportUtils.ts` - Core export logic
2. `src/components/results/ExportReviewersDialog.tsx` - Export dialog UI
3. `src/components/results/ReviewerResults.tsx` - Results component
4. `src/components/process/ProcessWorkflow.tsx` - Workflow integration