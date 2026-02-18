# Upload State Persistence Fix

## Problem
When users upload a file to a process and then navigate away to the home page, the upload status is lost when they return to the process. The FileUpload component shows `uploadedFile: null` even though the data should be persisted in localStorage.

## Root Cause Analysis
The issue occurred due to multiple problems:

1. **Component Reuse with Different Process IDs**: When switching between processes or navigating away and back, the ProcessWorkflow component may be reused with a different `processId`. The state initialization only runs once when the component first mounts, so switching to a different process wouldn't trigger state restoration.

2. **Incomplete State Restoration**: The restoration effect that runs after mount wasn't comprehensive enough and had dependency issues that prevented it from running reliably when the process ID changed.

3. **Navigation Before Upload Completion**: If users navigate away before the file upload completes, the upload response never gets saved to localStorage, so there's nothing to restore.

## Solution Implemented

### 1. Added Process ID Change Detection
Added a new `useEffect` that runs whenever `processId` changes. This effect:
- Detects when the user switches between processes
- Loads all workflow state from localStorage for the new process
- Clears state if no data exists for the new process
- Restores: uploadResponse, uploadedFile, keywords, search status, validation status, etc.

```typescript
useEffect(() => {
  console.log('[ProcessWorkflow] ProcessId changed, restoring state for:', processId);
  
  // Restore uploadResponse
  const savedUploadResponse = localStorage.getItem(`process_${processId}_uploadResponse`);
  if (savedUploadResponse) {
    const parsed = JSON.parse(savedUploadResponse);
    setUploadResponse(parsed);
    
    // Also restore uploadedFile
    if (parsed?.fileName && parsed?.fileSize) {
      setUploadedFile({ 
        name: parsed.fileName, 
        size: parsed.fileSize 
      } as File);
    }
  } else {
    // Clear state if no data for this process
    setUploadResponse(null);
    setUploadedFile(null);
  }
  
  // ... restore other workflow state
}, [processId]);
```

### 2. Enhanced Existing Restoration Logic
Improved the existing restoration effect to also restore `uploadResponse` state if it's missing:

```typescript
if (parsed?.fileName && parsed?.fileSize) {
  setUploadedFile({ 
    name: parsed.fileName, 
    size: parsed.fileSize 
  } as File);
  // Also restore uploadResponse state if it's missing
  if (!uploadResponse) {
    setUploadResponse(parsed);
  }
}
```

### 3. Added Comprehensive Logging
Added detailed logging to track:
- When uploadResponse and uploadedFile states are being set
- The exact localStorage key being used
- Verification that localStorage save was successful
- What values are being passed to FileUpload component

### 4. Fixed Callback Dependencies
Fixed the `handleFileUpload` callback dependencies to use `processId` directly instead of the `getStorageKey` function, ensuring the callback uses the correct process ID.

## Important Notes

### Upload Must Complete Before Navigation
For the upload state to be persisted, the file upload must complete successfully BEFORE navigating away. If you navigate away while the upload is in progress:
- The upload may be cancelled
- The upload response won't be saved to localStorage
- There will be nothing to restore when you return

**Best Practice**: Wait for the upload success message before navigating away from the process.

## Testing Scenarios

### Scenario 1: Upload and Navigate Away (After Completion)
1. Create a new process
2. Upload a file
3. **WAIT for upload to complete** (success message appears)
4. Navigate to home page
5. Return to the process
6. ✅ Upload status should be preserved

### Scenario 2: Switch Between Processes
1. Create process A and upload file A (wait for completion)
2. Create process B and upload file B (wait for completion)
3. Switch back to process A
4. ✅ File A should be shown
5. Switch to process B
6. ✅ File B should be shown

### Scenario 3: Upload and Move Through Steps
1. Upload a file (wait for completion)
2. Move to Metadata Extraction step
3. Navigate to home
4. Return to process
5. ✅ Should show uploaded file and current step

### Scenario 4: Navigate During Upload (Expected Behavior)
1. Start uploading a file
2. Navigate away BEFORE upload completes
3. Return to the process
4. ⚠️ Upload status will NOT be preserved (expected - upload didn't complete)

## Files Modified
- `src/components/process/ProcessWorkflow.tsx`
  - Added processId change detection effect
  - Enhanced restoration logic for uploadResponse state
  - Comprehensive state restoration for all workflow data
  - Added detailed logging for debugging
  - Fixed callback dependencies

## Related Issues
This fix addresses the upload state persistence issue reported in the console logs where:
- `FileUpload.tsx:49 [FileUpload] Rendered with uploadedFile: null`
- `ProcessWorkflow.tsx:76 [ProcessWorkflow] Initializing uploadResponse from localStorage: null`

The fix ensures that all workflow state is properly restored when:
- Navigating away and returning to a process (after upload completes)
- Switching between different processes
- Refreshing the page (existing functionality maintained)

## Debugging
If upload state is not persisting, check the console logs for:
1. `[ProcessWorkflow] Saving to localStorage with key:` - Shows the storage key being used
2. `[ProcessWorkflow] Verified localStorage save:` - Confirms save was successful
3. `[ProcessWorkflow] Setting uploadResponse state:` - Shows the data being saved
4. `[ProcessWorkflow] Restoring uploadResponse for new processId:` - Shows restoration on return

If you see "Verified localStorage save: FAILED", there may be a browser storage issue or quota exceeded.
