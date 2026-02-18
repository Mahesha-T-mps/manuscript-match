# Upload & Extract State Persistence - Debug Guide

## Issue
The Upload & Extract step shows "Drag and drop your manuscript" instead of displaying the uploaded file when navigating back to the step.

## Root Causes Fixed

### 1. Conditional Logic Issue
**Problem:** The original restoration logic had a condition `process.currentStep !== 'UPLOAD'` that prevented restoration when the user was ON the UPLOAD step.

**Fix:** Removed the conditional check and simplified the logic to restore whenever `uploadedFile` is null and we have upload data available.

### 2. State Initialization Issue
**Problem:** State initializations were using `getStorageKey()` function during initial state setup, which could cause timing issues.

**Fix:** Changed all state initializations to use direct string templates: `` `process_${processId}_uploadResponse` ``

## Changes Made

### File: `src/components/process/ProcessWorkflow.tsx`

#### Change 1: Fixed State Initialization
```typescript
// Before:
const [uploadResponse, setUploadResponse] = useState<any>(() => {
  const saved = localStorage.getItem(getStorageKey('uploadResponse'));
  return saved ? JSON.parse(saved) : null;
});

// After:
const [uploadResponse, setUploadResponse] = useState<any>(() => {
  const saved = localStorage.getItem(`process_${processId}_uploadResponse`);
  return saved ? JSON.parse(saved) : null;
});
```

#### Change 2: Simplified Restoration Logic
```typescript
// Before:
useEffect(() => {
  if (!uploadedFile && process?.currentStep && process.currentStep !== 'UPLOAD') {
    // Restoration logic
  }
  else if (!uploadedFile && process?.currentStep === 'UPLOAD' && uploadResponse?.fileName) {
    // Additional restoration logic
  }
}, [uploadResponse, process?.currentStep, uploadedFile, getStorageKey]);

// After:
useEffect(() => {
  if (!uploadedFile && process?.currentStep) {
    // Single unified restoration logic
  }
}, [uploadResponse, process?.currentStep, uploadedFile, getStorageKey]);
```

#### Change 3: Added Debug Logging
Added console.log statements to help track:
- When uploadResponse is saved to localStorage
- When restoration is attempted
- What data is available during restoration
- Whether restoration succeeds or fails

## How to Debug

### Step 1: Check Browser Console
Open the browser console (F12) and look for these log messages:

1. **When uploading a file:**
   ```
   [ProcessWorkflow] Saving uploadResponse to localStorage: {fileName: "...", fileSize: ...}
   ```

2. **When navigating back to Upload step:**
   ```
   [ProcessWorkflow] Restoration check - uploadedFile: null, currentStep: UPLOAD, uploadResponse: {...}
   [ProcessWorkflow] Restoring uploadedFile from uploadResponse: filename.docx
   ```

### Step 2: Check localStorage
Open browser DevTools → Application → Local Storage and verify:

1. **Key exists:** `process_<processId>_uploadResponse`
2. **Value contains:**
   ```json
   {
     "fileId": "...",
     "fileName": "document.docx",
     "fileSize": 12345,
     "uploadedAt": "...",
     "metadata": {...}
   }
   ```

### Step 3: Verify Process ID
The processId must be consistent across navigation. Check the console logs to ensure the same processId is being used.

### Step 4: Check Component Rendering
Verify that the FileUpload component receives the uploadedFile prop:
```typescript
<FileUpload 
  processId={processId}
  onFileUpload={handleFileUpload}
  uploadedFile={uploadedFile}  // Should not be null if file was uploaded
/>
```

## Common Issues and Solutions

### Issue 1: localStorage is Empty
**Symptom:** No `process_<processId>_uploadResponse` key in localStorage

**Possible Causes:**
- File upload didn't complete successfully
- localStorage was cleared
- Different processId is being used

**Solution:**
- Re-upload the file
- Check that the upload completes successfully
- Verify processId consistency

### Issue 2: uploadResponse Exists but uploadedFile is Not Restored
**Symptom:** localStorage has data, but UI still shows drag-and-drop

**Possible Causes:**
- uploadResponse doesn't have fileName or fileSize
- useEffect dependencies not triggering
- Component re-rendering before restoration completes

**Solution:**
- Check console logs for restoration attempts
- Verify uploadResponse structure in localStorage
- Check that fileName and fileSize fields exist

### Issue 3: File Restored but "Next" Button Not Showing
**Symptom:** File is shown but can't proceed to next step

**Possible Causes:**
- uploadResponse is null even though uploadedFile exists
- Condition `{uploadedFile && uploadResponse && ...}` not satisfied

**Solution:**
- Ensure both uploadedFile AND uploadResponse are set
- Check console logs for uploadResponse value

## Testing Checklist

- [ ] Upload a file successfully
- [ ] Verify console shows "Saving uploadResponse to localStorage"
- [ ] Navigate to Home page
- [ ] Return to Upload & Extract step
- [ ] Verify console shows "Restoration check" and "Restoring uploadedFile"
- [ ] Verify UI shows uploaded file (not drag-and-drop)
- [ ] Verify "Next: Review Metadata" button is visible
- [ ] Click Next and verify metadata is shown
- [ ] Go back to Upload step
- [ ] Verify file is still shown
- [ ] Refresh the page
- [ ] Verify file is restored after refresh

## Expected Console Output

### On File Upload:
```
[ProcessWorkflow] Saving uploadResponse to localStorage: {fileId: "...", fileName: "document.docx", fileSize: 12345, ...}
```

### On Navigation Back to Upload:
```
[ProcessWorkflow] Restoration check - uploadedFile: null, currentStep: UPLOAD, uploadResponse: {fileName: "document.docx", fileSize: 12345}
[ProcessWorkflow] Restoring uploadedFile from uploadResponse: document.docx
```

### On Page Refresh:
```
[ProcessWorkflow] Restoration check - uploadedFile: null, currentStep: UPLOAD, uploadResponse: null
[ProcessWorkflow] Checking localStorage for uploadResponse: {"fileId":"...","fileName":"document.docx",...}
[ProcessWorkflow] Restoring uploadedFile from localStorage: document.docx
```

## If Issue Persists

If the issue continues after these fixes:

1. **Clear all localStorage:**
   - Open DevTools → Application → Local Storage
   - Right-click → Clear
   - Re-upload the file

2. **Check for React StrictMode:**
   - StrictMode causes double-rendering in development
   - This is expected behavior and shouldn't affect production

3. **Verify FileUpload component:**
   - Check that FileUpload properly handles the uploadedFile prop
   - Verify the condition `if (uploadedFile)` in FileUpload.tsx

4. **Check for competing state updates:**
   - Look for other code that might be setting uploadedFile to null
   - Check handleFileUpload function for issues

5. **Report with logs:**
   - Copy all console logs from upload to navigation
   - Include localStorage contents
   - Include processId value
