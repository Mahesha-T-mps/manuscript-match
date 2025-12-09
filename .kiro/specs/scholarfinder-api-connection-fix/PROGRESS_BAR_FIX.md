# File Upload Progress Bar Fix

## Issue
The file upload progress bar wasn't working. When users uploaded a manuscript file, the progress bar remained at 0% or didn't update, even though the file was being uploaded successfully.

## Root Cause
The `onProgress` callback was being passed through the component chain but was never actually connected to the underlying Axios upload progress event. The callback chain was broken at two points:

1. **fileService.uploadFile()** - Accepted `onProgress` parameter but didn't pass it to `scholarFinderApiService.uploadManuscript()`
2. **scholarFinderApiService.uploadManuscript()** - Didn't accept `onProgress` parameter and didn't pass it to `apiService.uploadFile()`

Even though `apiService.uploadFile()` had full support for progress tracking via Axios's `onUploadProgress` event, the callback was never reaching it.

## Solution

### 1. Update ScholarFinderApiService
Added `onProgress` parameter to `uploadManuscript()` method and passed it through to `apiService.uploadFile()`:

**Before:**
```typescript
async uploadManuscript(file: File, processId?: string): Promise<UploadResponse> {
  // ... validation code ...
  
  const response = await this.apiService.uploadFile<UploadResponse>(
    url,
    file
  );
  
  return (response.data || response) as UploadResponse;
}
```

**After:**
```typescript
async uploadManuscript(file: File, processId?: string, onProgress?: (progress: number) => void): Promise<UploadResponse> {
  // ... validation code ...
  
  // Use uploadFile method for proper file upload handling with progress tracking
  const response = await this.apiService.uploadFile<UploadResponse>(
    url,
    file,
    onProgress // Pass the progress callback through
  );
  
  return (response.data || response) as UploadResponse;
}
```

### 2. Update fileService
Updated `uploadFile()` to pass the `onProgress` callback to `scholarFinderApiService.uploadManuscript()`:

**Before:**
```typescript
async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
  // Use ScholarFinder API with processId
  const response = await scholarFinderApiService.uploadManuscript(file, processId);
  // ...
}
```

**After:**
```typescript
async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
  // Use ScholarFinder API with processId and pass progress callback
  const response = await scholarFinderApiService.uploadManuscript(file, processId, onProgress);
  // ...
}
```

## How It Works Now

The complete callback chain:

1. **FileUpload Component** → Passes `onProgress` callback to mutation
   ```typescript
   onProgress: (progress) => {
     setUploadProgress(progress);
     if (progress >= 100) {
       setUploadStatus('processing');
     }
   }
   ```

2. **useFileUpload Hook** → Passes callback to fileService
   ```typescript
   fileService.uploadFile(processId, file, onProgress)
   ```

3. **fileService** → Passes callback to scholarFinderApiService
   ```typescript
   scholarFinderApiService.uploadManuscript(file, processId, onProgress)
   ```

4. **scholarFinderApiService** → Passes callback to apiService
   ```typescript
   this.apiService.uploadFile(url, file, onProgress)
   ```

5. **apiService** → Connects to Axios upload progress event
   ```typescript
   onUploadProgress: (progressEvent) => {
     if (onProgress && progressEvent.total) {
       const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
       onProgress(progress);
     }
   }
   ```

## Benefits

1. **Real-time Progress**: Users can now see actual upload progress
2. **Better UX**: Visual feedback during file upload
3. **Accurate Status**: Progress bar reflects actual upload completion
4. **Processing Indicator**: Automatically switches to "processing" state at 100%

## Testing

- ✅ All FileUpload property tests passing (4/4)
- ✅ No TypeScript diagnostics
- ✅ Progress callback chain verified

## Files Modified

1. `src/features/scholarfinder/services/ScholarFinderApiService.ts`
   - Added `onProgress` parameter to `uploadManuscript()` method
   - Passed `onProgress` to `apiService.uploadFile()`

2. `src/services/fileService.ts`
   - Updated `uploadFile()` to pass `onProgress` to `scholarFinderApiService.uploadManuscript()`

## User Experience

**Before Fix:**
- Progress bar stuck at 0%
- No visual feedback during upload
- Users unsure if upload is working

**After Fix:**
- Progress bar updates in real-time (0% → 100%)
- Clear visual feedback during upload
- Status changes to "processing" after upload completes
- Users can see upload progress

## Technical Details

The progress tracking uses Axios's built-in `onUploadProgress` event, which provides:
- `progressEvent.loaded` - Bytes uploaded so far
- `progressEvent.total` - Total bytes to upload
- Progress percentage calculated as: `(loaded / total) * 100`

The upload timeout is dynamically calculated based on file size:
- Base timeout: 5 minutes
- Additional: 1 minute per 10MB of file size
- This ensures large files have enough time to upload

## Next Steps

Users will now see:
1. Upload progress bar updating from 0% to 100%
2. "Uploading manuscript..." message with percentage
3. Automatic transition to "processing" state at 100%
4. Success message when metadata extraction completes
