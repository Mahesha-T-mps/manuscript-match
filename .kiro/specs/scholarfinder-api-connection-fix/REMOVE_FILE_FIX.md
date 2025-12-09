# Remove File Button Fix

## Issue
The cancel/remove button (X mark) on the uploaded file card wasn't working. When users clicked the X button to remove an uploaded file, nothing happened.

## Root Cause
The `removeFile` function in the FileUpload component was only resetting local state but wasn't notifying the parent component (ProcessWorkflow) to clear the uploaded file. The parent component maintains the `uploadedFile` state, so without notifying it, the file card would remain visible.

## Solution

### 1. Update FileUpload Component
Modified the `removeFile` function to notify the parent component:

**Before:**
```typescript
const removeFile = () => {
  // Reset upload state - parent component should handle clearing the uploaded file
  setUploadProgress(0);
  setUploadStatus('idle');
  setCurrentFileName('');
  setUploadResponseData(null);
  // Note: We don't call onFileUpload(null) as the parent should manage this state
};
```

**After:**
```typescript
const removeFile = () => {
  // Reset upload state
  setUploadProgress(0);
  setUploadStatus('idle');
  setCurrentFileName('');
  setUploadResponseData(null);
  
  // Notify parent component to clear the uploaded file
  // Pass null or undefined to indicate file removal
  onFileUpload(null as any);
};
```

### 2. Update ProcessWorkflow Component
Modified the `handleFileUpload` callback to handle null values:

**Before:**
```typescript
const handleFileUpload = useCallback(async (uploadResponse: any) => {
  setUploadResponse(uploadResponse);
  setUploadedFile({ name: uploadResponse.fileName, size: uploadResponse.fileSize } as File);
  
  // Move to next step after successful upload
  await handleStepChange('METADATA_EXTRACTION');
}, [handleStepChange]);
```

**After:**
```typescript
const handleFileUpload = useCallback(async (uploadResponse: any) => {
  // Handle file removal (when uploadResponse is null)
  if (!uploadResponse) {
    setUploadResponse(null);
    setUploadedFile(null);
    // Reset to upload step when file is removed
    await handleStepChange('UPLOAD');
    return;
  }
  
  // Handle successful file upload
  setUploadResponse(uploadResponse);
  setUploadedFile({ name: uploadResponse.fileName, size: uploadResponse.fileSize } as File);
  
  // Move to next step after successful upload
  await handleStepChange('METADATA_EXTRACTION');
}, [handleStepChange]);
```

## Benefits

1. **Functional Remove Button**: Users can now successfully remove uploaded files
2. **State Synchronization**: Both child and parent components stay in sync
3. **Workflow Reset**: Removing a file resets the workflow back to the upload step
4. **Clean State**: All upload-related state is properly cleared

## Testing

- ✅ All FileUpload property tests passing (4/4)
- ✅ No TypeScript diagnostics
- ✅ Remove button functionality verified

## Files Modified

1. `src/components/upload/FileUpload.tsx`
   - Updated `removeFile()` to call `onFileUpload(null)`

2. `src/components/process/ProcessWorkflow.tsx`
   - Updated `handleFileUpload()` to handle null values
   - Added logic to reset workflow step when file is removed

## User Experience

**Before Fix:**
- User clicks X button → Nothing happens
- File card remains visible
- User is stuck with the uploaded file

**After Fix:**
- User clicks X button → File is removed
- File card disappears
- Upload area reappears
- Workflow resets to upload step
- User can upload a different file

## Next Steps

Users can now:
1. Upload a manuscript file
2. Review the uploaded file and metadata
3. Remove the file if they want to upload a different one
4. Upload a new file and continue the workflow
