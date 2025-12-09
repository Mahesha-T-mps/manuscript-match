# Manual Step Navigation with Next Buttons

## Issue
The workflow was automatically advancing to the next step after completing each action (e.g., after uploading a file, it would immediately show the metadata extraction step). Users had no control over when to proceed and couldn't review the results before moving forward.

## Solution
Added "Next" buttons to each workflow step, allowing users to manually control when they want to proceed to the next step.

## Changes Made

### 1. Removed Automatic Step Advancement
Updated the following handlers to NOT automatically advance to the next step:

**handleFileUpload:**
- Before: Automatically moved to `METADATA_EXTRACTION` after upload
- After: Stays on `UPLOAD` step, waits for user to click Next

**handleKeywordEnhancement:**
- Before: Automatically moved to `KEYWORD_ENHANCEMENT` after enhancing keywords
- After: Stays on `METADATA_EXTRACTION` step, waits for user to click Next

**handleSearch:**
- Before: Automatically moved to `DATABASE_SEARCH` after initiating search
- After: Stays on `KEYWORD_ENHANCEMENT` step, waits for user to click Next

### 2. Added Next Buttons to Each Step

#### Step 1: Upload
```typescript
{uploadedFile && uploadResponse && (
  <div className="flex justify-end">
    <Button 
      onClick={() => handleStepChange('METADATA_EXTRACTION')}
      size="lg"
    >
      Next: Review Metadata
    </Button>
  </div>
)}
```
- Button appears after file is successfully uploaded
- Label: "Next: Review Metadata"

#### Step 2: Metadata Extraction & Keyword Enhancement
```typescript
{enhancedKeywords && (
  <div className="flex justify-end">
    <Button 
      onClick={() => handleStepChange('KEYWORD_ENHANCEMENT')}
      size="lg"
    >
      Next: Search Databases
    </Button>
  </div>
)}
```
- Button appears after keywords are enhanced
- Label: "Next: Search Databases"

#### Step 3: Database Search
```typescript
{searchCompleted && (
  <div className="flex justify-end">
    <Button 
      onClick={() => handleStepChange('RECOMMENDATIONS')}
      size="lg"
    >
      Next: View Recommendations
    </Button>
  </div>
)}
```
- Button appears after database search completes
- Label: "Next: View Recommendations"

## User Experience

### Before:
1. Upload file → **Automatically** shows metadata extraction
2. Enhance keywords → **Automatically** shows database search
3. Start search → **Automatically** shows recommendations
4. No control over workflow pace
5. Can't review results before proceeding

### After:
1. Upload file → **Review uploaded file** → Click "Next: Review Metadata"
2. Enhance keywords → **Review enhanced keywords** → Click "Next: Search Databases"
3. Start search → **Wait for search to complete** → Click "Next: View Recommendations"
4. Full control over workflow pace
5. Can review results at each step before proceeding

## Benefits

1. **User Control**: Users decide when to proceed to the next step
2. **Review Time**: Users can review results before moving forward
3. **Better UX**: Clear indication of what the next step will be
4. **Prevents Confusion**: Users aren't rushed through the workflow
5. **Flexibility**: Users can take breaks between steps

## Button Visibility Logic

Each Next button only appears when the step is complete:

- **Upload Step**: Button appears when `uploadedFile` and `uploadResponse` exist
- **Metadata Step**: Button appears when `enhancedKeywords` exist
- **Search Step**: Button appears when `searchCompleted` is true

This ensures users can't proceed until they've completed the current step.

## Files Modified

1. `src/components/process/ProcessWorkflow.tsx`
   - Removed automatic step advancement from handlers
   - Added Next buttons to each step in `renderCurrentStep()`
   - Added conditional rendering based on step completion

## Testing

- ✅ No TypeScript diagnostics
- ✅ Buttons only appear when step is complete
- ✅ Clicking Next advances to correct step
- ✅ Workflow no longer auto-advances

## Next Steps

Users can now:
1. Upload a file and review it before proceeding
2. Enhance keywords and review them before searching
3. Start a search and wait for results before viewing recommendations
4. Control the pace of their workflow
