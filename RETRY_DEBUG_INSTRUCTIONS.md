# API Retry Debugging - Step by Step

## 🔍 You're seeing: `[API Retry] Attempt 1/3 for POST /manual_authors`

This means the API is being retried 3 times despite `retries: 0` configuration.

## ✅ Fixes Applied

1. **Added debug logging** to track retry configuration
2. **Verified `retries: 0`** is set in ScholarFinderApiService
3. **Added logging** to apiService.request() to show actual retry values

## 🧪 How to Debug

### Step 1: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"
3. Or: Ctrl+Shift+Delete → Clear cache

### Step 2: Check Console Logs

When you search for an author, you should see these logs **in order**:

```
1. [ManualSearch][abc123] handleSearch called
2. [ManualSearch][abc123] ✅ LOCK ACQUIRED
3. [ManualSearch][abc123] Starting search for: Dr. John Smith
4. [useAddManualAuthor] API call starting for: Dr. John Smith
5. [fileService] searchManualAuthor called: {...}
6. [ScholarFinderAPI] Manual author search request: { ..., retries: 0 }
7. [ScholarFinderAPI] Request config retries: 0
8. [API Request] POST /manual_authors?job_id=xxx
9. [API Request] retries config: 0
10. [API Request] maxRetries: 0
```

### Step 3: What the Logs Tell You

**If you see:**
```
[API Request] maxRetries: 0
[API Retry] Attempt 1/3
```

**This means:** The retry is happening AFTER the first attempt fails, which shouldn't happen with `maxRetries: 0`.

**Possible causes:**
1. **Browser cached old code** - Clear cache and hard reload
2. **Multiple API service instances** - One with retries, one without
3. **Request interceptor retrying** - Axios interceptor might be retrying
4. **Network layer retrying** - Browser or proxy retrying

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "manual_authors"
3. Click search button ONCE
4. Count the requests

**Expected:** 1 request
**If you see 3-4 requests:** Retries are happening

### Step 5: Check Request Timing

Look at the timestamps of the requests:
- **Simultaneous (same timestamp):** Multiple calls from React
- **Sequential (1-2 seconds apart):** Retry logic
- **Sequential (immediate):** Network/browser retry

## 🔧 Additional Fixes to Try

### Fix 1: Disable Axios Interceptor Retries

The axios response interceptor might be retrying. Check line 360 in `apiService.ts`:

```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  // ... retry logic
}
```

This retries 401 errors. If your API returns 401, it will retry.

### Fix 2: Check for Multiple apiService Instances

Search for all places creating `new ApiService()`:

```bash
# In your terminal
grep -r "new ApiService" src/
```

If there are multiple instances, one might have different retry config.

### Fix 3: Bypass apiService.request()

Try calling axios directly to bypass retry logic:

```typescript
// In ScholarFinderApiService.ts searchManualAuthor method
const response = await this.apiService['axiosInstance'].request({
  method: 'POST',
  url: `/manual_authors?job_id=${encodeURIComponent(jobId)}`,
  data: formData.toString(),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 60000
});
```

This bypasses the retry logic entirely.

## 📊 Expected vs Actual

### Expected Behavior (retries: 0)
```
Attempt 0: Try API call
  ↓
Success → Return result
  OR
Failure → Throw error immediately (NO RETRY)
```

### Current Behavior (what you're seeing)
```
Attempt 0: Try API call
  ↓
Failure
  ↓
[API Retry] Attempt 1/3 ← SHOULD NOT HAPPEN!
  ↓
Retry...
```

## 🎯 Quick Test

Add this at the very start of `apiService.request()`:

```typescript
async request<T = any>(requestConfig: RequestConfig): Promise<ApiResponse<T>> {
  // FORCE retries to 0 for manual_authors
  if (requestConfig.url?.includes('manual_authors')) {
    requestConfig.retries = 0;
    console.log('🔥 FORCING retries to 0 for manual_authors');
  }
  
  const maxRetries = requestConfig.retries !== undefined ? requestConfig.retries : 3;
  // ... rest of code
}
```

If this works, it means something is modifying `requestConfig.retries` before it reaches this point.

## 📞 Next Steps

1. **Clear cache and test** - See if logs show `maxRetries: 0`
2. **Check Network tab** - Count actual HTTP requests
3. **Share console logs** - Copy all logs from one search attempt
4. **Try Fix 3** - Bypass retry logic entirely

The debug logs will tell us exactly where the retry is coming from!
