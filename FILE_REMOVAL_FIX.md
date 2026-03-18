# File Removal Fix

## Issue Description

After fixing the upload progress state synchronization, a new issue appeared when removing/canceling uploaded documents:

**Problem**: When clicking "Remove files" (X button), instead of showing the upload interface, it displayed:
- "1 File(s) Uploaded"
- "Manuscripts uploaded successfully" 
- "uploaded_file"

**Root Cause**: The FileUpload component was calling `onFileUpload([])` (empty array) when removing files, but the ProcessWorkflow's `handleFileUpload` function was treating an empty array as a successful upload instead of file removal.

## Analysis from Logs

```
[ProcessWorkflow] File uploaded, saving to state and localStorage: []
[ProcessWorkflow] No job ID found in upload response
effectiveUploadedFiles: [{…}] // Still showing 1 file
```

The issue was:
1. `removeFiles()` called `onFileUpload([])` (empty array)
2. `handleFileUpload()` only checked for `null/undefined`, not empty arrays
3. Empty array `[]` is truthy in JavaScript, so it was treated as successful upload
4. The legacy `uploadedFile` prop still contained file data, causing display issues

## Solution

### 1. Fixed ProcessWorkflow handleFileUpload Function
```typescript
const handleFileUpload = useCallback(async (uploadResponse: any) => {
  // Handle file removal (when uploadResponse is null, undefined, or empty array)
  if (!uploadResponse || (Array.isArray(uploadResponse) && uploadResponse.length === 0)) {
    console.log('[ProcessWorkflow] File removal detected, clearing state');
    setUploadResponse(null);
    setUploadedFile(null);
    localStorage.removeItem(getStorageKey('uploadResponse'));
    // Reset all workflow state when file is removed
    resetWorkflowState();
    // Reset to upload step when file is removed
    await handleStepChange('UPLOAD');
    return;
  }
  // ... rest of upload handling
}, [/* dependencies */]);
```

### 2. Fixed FileUpload removeFiles Function
```typescript
const removeFiles = () => {
  // Reset upload state
  setUploadProgress(0);
  setUploadStatus('idle');
  setCurrentFileNames([]);
  setUploadResponseData([]);
  clearUploadState();
  
  // Notify parent component to clear the uploaded files
  onFileUpload(null); // Changed from [] to null
};
```

### 3. Updated TypeScript Interface
```typescript
interface FileUploadProps {
  processId: string;
  processTitle?: string;
  onFileUpload: (uploadResponse: UploadResponse | UploadResponse[] | null) => void; // Added | null
  uploadedFiles?: File[];
  uploadedFile?: File | null;
  uploadResponse?: UploadResponse | UploadResponse[];
}
```

## Testing Scenarios

After this fix:

1. **Upload files**: ✅ Shows upload progress → shows completed documents
2. **Remove files**: ✅ Shows upload interface (drag & drop area)
3. **Navigate away and back**: ✅ Maintains correct state
4. **Upload → Remove → Upload again**: ✅ Works correctly

## Files Modified

- `src/components/process/ProcessWorkflow.tsx` - Fixed handleFileUpload to handle empty arrays
- `src/components/upload/FileUpload.tsx` - Fixed removeFiles to pass null instead of empty array

## Key Improvements

1. **Proper File Removal Detection**: Handles both `null` and empty arrays as file removal
2. **Clear State Management**: Uses `null` for file removal instead of ambiguous empty array
3. **Type Safety**: Updated TypeScript interfaces to reflect the actual API
4. **Consistent Behavior**: File removal now properly resets to upload interface

This fix ensures that file removal works correctly and doesn't interfere with the upload state management system.