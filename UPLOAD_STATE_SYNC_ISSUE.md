# Upload State Synchronization Issue

## Problem
After file upload completes, the `uploadedFile` state in ProcessWorkflow is set but then immediately becomes `null` again, causing the FileUpload component to not show the "File Uploaded" card.

## Root Cause
The issue is a state synchronization problem between ProcessWorkflow and FileUpload components:

1. Upload completes in FileUpload
2. `onFileUpload` callback is called, which sets `uploadedFile` in ProcessWorkflow
3. ProcessWorkflow re-renders multiple times due to React's batching
4. During these re-renders, `uploadedFile` is `null` because the state update hasn't taken effect yet
5. FileUpload sees `uploadedFile` as `null` and continues showing upload UI

## Evidence from Logs
```
ProcessWorkflow.tsx:928 [ProcessWorkflow] Setting uploadedFile state: {name: '565182-ms-OR.docx', size: 75169}
ProcessWorkflow.tsx:1116 [ProcessWorkflow] Rendering UPLOAD step with uploadedFile: null uploadResponse: null
FileUpload.tsx:49 [FileUpload] Rendered with uploadedFile: null
```

The state is set but the component renders with `null` immediately after.

## Current Implementation Issues

### Issue 1: uploadedFile Not Initialized from localStorage
`uploadedFile` state is initialized as `null` and only restored in a useEffect, which runs after the first render.

### Issue 2: Multiple Re-renders with Stale State
React batches state updates, causing multiple renders where `uploadedFile` is still `null` even after being set.

### Issue 3: Progress State Cleared Too Early
FileUpload clears its progress state when it thinks upload is complete, but ProcessWorkflow hasn't updated yet.

## Solution

The fix is to ensure `uploadedFile` is properly initialized from localStorage on mount, just like `uploadResponse`:

```typescript
const [uploadedFile, setUploadedFile] = useState<File | null>(() => {
  const saved = localStorage.getItem(`process_${processId}_uploadResponse`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.fileName && parsed?.fileSize) {
        return { name: parsed.fileName, size: parsed.fileSize } as File;
      }
    } catch (e) {
      console.warn('[ProcessWorkflow] Failed to parse uploadResponse for uploadedFile:', e);
    }
  }
  return null;
});
```

This ensures that:
1. On first render, if there's a completed upload in localStorage, `uploadedFile` is immediately set
2. No waiting for useEffect to run
3. FileUpload receives the correct `uploadedFile` prop from the start
4. No "Upload In Progress" card shown for completed uploads

## Implementation
The fix needs to be applied in ProcessWorkflow.tsx where `uploadedFile` state is initialized.
