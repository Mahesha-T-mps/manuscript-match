# Quick Integration Guide - Author Selection

## Current Status ✅

Your backend is now ready! The `/validate_authors` endpoint accepts optional `selected_authors` parameter.

## Frontend Integration (3 Simple Steps)

### Step 1: Import the Component

In `ProcessWorkflow.tsx`, add the import:

```typescript
import { AuthorSelectionStep } from '@/components/validation/AuthorSelectionStep';
```

### Step 2: Add State for Selected Authors

Add this state near the top of your ProcessWorkflow component:

```typescript
const [selectedAuthors, setSelectedAuthors] = useState<string[]>(() => {
  const saved = localStorage.getItem(`process_${processId}_selectedAuthors`);
  return saved ? JSON.parse(saved) : [];
});
```

### Step 3: Add the Author Selection Case

Add this case in your workflow switch statement (between DATABASE_SEARCH and MANUAL_SEARCH):

```typescript
case "AUTHOR_SELECTION":
  return (
    <div className="space-y-4">
      <AuthorSelectionStep
        processId={processId}
        onSelectionComplete={(selected) => {
          setSelectedAuthors(selected);
          localStorage.setItem(
            `process_${processId}_selectedAuthors`,
            JSON.stringify(selected)
          );
          toast({
            title: process?.title || 'Process',
            description: `${selected.length} authors selected for validation.`,
          });
        }}
        onBack={() => handleStepChange('DATABASE_SEARCH')}
      />
      {selectedAuthors.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={() => handleStepChange('MANUAL_SEARCH')}
            size="lg"
          >
            Continue with {selectedAuthors.length} Selected Author{selectedAuthors.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
```

### Step 4: Update DATABASE_SEARCH Next Button

Change the DATABASE_SEARCH next button to go to AUTHOR_SELECTION:

```typescript
case "DATABASE_SEARCH":
  return (
    <div className="space-y-4">
      <ReviewerSearch
        processId={processId}
        keywordString={keywordString}
        onSearchComplete={() => {
          if (!searchCompleted) {
            setSearchCompleted(true);
            toast({
              title: process?.title || 'Process',
              description: 'Search Completed & Saved',
            });
          }
        }}
      />
      {searchCompleted && (
        <div className="flex justify-end">
          <Button 
            onClick={() => handleStepChange('AUTHOR_SELECTION')}  // Changed from 'MANUAL_SEARCH'
            size="lg"
          >
            Next: Select Authors
          </Button>
        </div>
      )}
    </div>
  );
```

### Step 5: Update Validation Handler

Modify your `handleValidateAuthors` function to pass selected authors:

```typescript
const handleValidateAuthors = useCallback(async () => {
  // ... existing validation checks ...
  
  try {
    validationInProgressRef.current = true;
    setIsValidating(true);
    
    const validationId = Date.now().toString();
    localStorage.setItem(`process_${processId}_isValidating`, JSON.stringify(true));
    localStorage.setItem(`process_${processId}_validationCompleted`, JSON.stringify(false));
    localStorage.setItem(`process_${processId}_validationId`, validationId);
    
    const jobId = fileService.getJobId(processId);
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'No job ID found. Please upload a file first.',
        variant: 'destructive',
      });
      return;
    }

    console.log('[ProcessWorkflow] Starting validation for jobId:', jobId);
    console.log('[ProcessWorkflow] Selected authors:', selectedAuthors);

    // Pass selected authors to validation
    const response = await scholarFinderApiService.validateAuthors(
      jobId, 
      selectedAuthors.length > 0 ? selectedAuthors : undefined
    );
    
    // ... rest of your existing validation code ...
    
  } catch (error: any) {
    // ... existing error handling ...
  } finally {
    setIsValidating(false);
    validationInProgressRef.current = false;
  }
}, [processId, selectedAuthors, toast, startValidationPolling, stopValidationPolling]);
```

### Step 6: Update Step Order

Update your step order array to include the new step:

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

## How It Works

1. **Database Search** → Finds ALL potential authors and saves to `author_email_df_before_val.csv`
2. **Author Selection** (NEW) → User reviews and selects which authors to validate
3. **Manual Search** → User can add additional authors manually
4. **Validation** → Only selected authors are validated (or all if none selected)

## Testing

1. Complete database search
2. You'll see the author selection screen with all found authors
3. Select a few authors (use search/filter if needed)
4. Click "Continue with X Selected Authors"
5. Proceed to validation
6. Verify only selected authors are validated

## Benefits

✅ Review all results before deciding  
✅ No need to re-run expensive database searches  
✅ Faster validation (only selected authors)  
✅ Better user control  
✅ Backward compatible (validates all if none selected)

## Optional: Skip Selection

If you want to allow users to skip selection and validate all authors:

```typescript
<div className="flex justify-between">
  <Button 
    variant="outline"
    onClick={() => {
      setSelectedAuthors([]);
      handleStepChange('MANUAL_SEARCH');
    }}
  >
    Skip Selection (Validate All)
  </Button>
  <Button 
    onClick={() => handleStepChange('MANUAL_SEARCH')}
    disabled={selectedAuthors.length === 0}
  >
    Continue with {selectedAuthors.length} Selected
  </Button>
</div>
```
