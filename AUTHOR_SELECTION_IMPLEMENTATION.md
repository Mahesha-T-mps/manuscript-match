# Author Selection Implementation Guide

## Overview
This implementation allows you to select specific authors from database search results before validation, instead of validating all potential authors.

## Changes Made

### 1. Backend Changes (`scholarfinder_api.py`)

Modified the `/validate_authors` endpoint to accept an optional `selected_authors` parameter:

```python
@app.post("/validate_authors")
def validate_authors(
        job_id: str = Form(..., description="Unique job ID"),
        selected_authors: str = Form(None, description="JSON string of selected author emails (optional)")
):
```

**How it works:**
- If `selected_authors` is provided, only those authors will be validated
- If not provided, all authors from `author_email_df_before_val.csv` will be validated (current behavior)
- The selection is filtered by email (primary) or author name (fallback)

### 2. Frontend Components Created

#### `AuthorSelection.tsx`
A reusable component that displays a list of authors with checkboxes for selection.

**Features:**
- Search/filter authors by name, email, affiliation, or country
- Select all / Clear all buttons
- Shows selection count
- Saves selection to localStorage
- Validates that at least one author is selected

#### `AuthorSelectionStep.tsx`
A wrapper component that loads authors from database search results and displays the AuthorSelection component.

**Features:**
- Loads authors from localStorage (database search results)
- Handles loading and error states
- Supports multiple result formats from the API

### 3. API Service Updates

Updated `ScholarFinderApiService.ts` to support passing selected authors:

```typescript
async validateAuthors(jobId: string, selectedAuthors?: string[]): Promise<ValidationResponse>
```

## Integration Steps

To integrate this into your workflow, you have two options:

### Option 1: Add as a New Step (Recommended)

Add a new step "AUTHOR_SELECTION" between "DATABASE_SEARCH" and "MANUAL_SEARCH":

1. Update your workflow step order in `ProcessWorkflow.tsx`:
```typescript
const stepOrder = [
  'UPLOAD',
  'METADATA_EXTRACTION', 
  'KEYWORD_ENHANCEMENT',
  'DATABASE_SEARCH',
  'AUTHOR_SELECTION',  // NEW STEP
  'MANUAL_SEARCH',
  'VALIDATION',
  'RECOMMENDATIONS',
  'SHORTLIST'
];
```

2. Add the case in the workflow render:
```typescript
case "AUTHOR_SELECTION":
  return (
    <div className="space-y-4">
      <AuthorSelectionStep
        processId={processId}
        onSelectionComplete={(selectedAuthors) => {
          // Save selected authors
          localStorage.setItem(
            `process_${processId}_selectedAuthors`,
            JSON.stringify(selectedAuthors)
          );
          // Move to next step
          handleStepChange('MANUAL_SEARCH');
        }}
        onBack={() => handleStepChange('DATABASE_SEARCH')}
      />
    </div>
  );
```

3. Update the validation handler to use selected authors:
```typescript
const handleValidateAuthors = useCallback(async () => {
  // ... existing code ...
  
  // Get selected authors from localStorage
  const selectedAuthorsStr = localStorage.getItem(`process_${processId}_selectedAuthors`);
  const selectedAuthors = selectedAuthorsStr ? JSON.parse(selectedAuthorsStr) : undefined;
  
  // Call the validate authors API with selection
  const response = await scholarFinderApiService.validateAuthors(jobId, selectedAuthors);
  
  // ... rest of existing code ...
}, [processId, /* other dependencies */]);
```

### Option 2: Integrate into Existing MANUAL_SEARCH Step

Replace or enhance the MANUAL_SEARCH step to show author selection first:

```typescript
case "MANUAL_SEARCH":
  const [showAuthorSelection, setShowAuthorSelection] = useState(true);
  
  if (showAuthorSelection) {
    return (
      <AuthorSelectionStep
        processId={processId}
        onSelectionComplete={(selectedAuthors) => {
          localStorage.setItem(
            `process_${processId}_selectedAuthors`,
            JSON.stringify(selectedAuthors)
          );
          setShowAuthorSelection(false);
        }}
      />
    );
  }
  
  return (
    <AuthorValidation
      processId={processId}
      onValidationComplete={() => handleStepChange('VALIDATION')}
    />
  );
```

## Usage Flow

1. **Database Search**: User completes database search, results are cached in localStorage
2. **Author Selection** (NEW): User sees all potential authors and selects which ones to validate
3. **Manual Search**: User can still add additional authors manually
4. **Validation**: Only selected authors (+ any manually added) are validated

## Benefits

- **Faster validation**: Only validate authors you're interested in
- **Cost savings**: Reduce API calls and processing time
- **Better control**: Focus on the most relevant candidates
- **Flexibility**: Can still validate all authors by selecting all

## Testing

To test the implementation:

1. Complete a database search to get potential authors
2. Navigate to the author selection step
3. Select a few authors (not all)
4. Continue to validation
5. Verify that only selected authors are validated

## Backward Compatibility

The implementation is fully backward compatible:
- If no authors are selected, all authors will be validated (current behavior)
- Existing workflows will continue to work without changes
- The selection is optional and stored in localStorage per process

## Files Modified

- `scholarfinder_api.py` - Backend validation endpoint
- `src/features/scholarfinder/services/ScholarFinderApiService.ts` - API service
- `src/components/validation/AuthorSelection.tsx` - New component
- `src/components/validation/AuthorSelectionStep.tsx` - New component
- `src/components/validation/index.ts` - Export updates

## Next Steps

1. Choose integration option (Option 1 recommended)
2. Update ProcessWorkflow.tsx with the new step
3. Test the complete flow
4. Adjust UI/UX as needed
