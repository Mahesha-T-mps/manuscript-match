# Manual Search API Multiple Calls - Debug Guide

## 🔥 ROOT CAUSE IDENTIFIED

**The Problem:** `useCallback` dependency array included `addManualAuthorMutation` which changes on every mutation state update, causing the function to be recreated and potentially re-executed.

## ✅ FINAL FIX APPLIED

**Changed:** Removed `useCallback` entirely and made `handleSearch` a regular async function.

**Why this works:**
- No dependency tracking issues
- Function is stable within render cycle
- Lock mechanism (`isSearchingRef`) prevents duplicate calls
- Simpler and more predictable behavior

## 🔍 How to Debug Multiple API Calls

### Step 1: Check Browser Console

When you click search, you should see logs with unique call IDs:

```
[ManualSearch][abc123] handleSearch called
[ManualSearch][abc123] ✅ LOCK ACQUIRED
[ManualSearch][abc123] Starting search for: Dr. John Smith
[ManualSearch][abc123] ✅ Search successful, result: {...}
[ManualSearch][abc123] 🔓 LOCK RELEASED
```

**If you see multiple call IDs for one click, the issue is still present!**

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "manual_authors"
3. Click search button ONCE
4. **You should see EXACTLY ONE request**

If you see multiple requests, note:
- How many requests?
- What's the time gap between them?
- Are they identical or different?

### Step 3: Check Backend Logs

In your Python backend logs, you should see:

```
manual_authors started for job_id: xxx, author: Dr. John Smith
```

**Count how many times this appears for ONE search.**

## 🛡️ All Protection Layers

| Layer | Protection | Status |
|-------|-----------|--------|
| **Component** | `useRef` locking | ✅ |
| **Component** | `isPending` check | ✅ |
| **Component** | No `useCallback` dependencies | ✅ |
| **Component** | Enhanced debug logging | ✅ |
| **React Query** | `retry: 0` | ✅ |
| **React Query** | `mutationKey` | ✅ |
| **HTTP Service** | `retries: 0` | ✅ |

## 🐛 Common Causes of Multiple Calls

### 1. **useCallback Dependencies** ❌ FIXED
```typescript
// ❌ BAD - mutation object changes frequently
useCallback(() => {...}, [addManualAuthorMutation])

// ✅ GOOD - no useCallback needed
const handleSearch = async () => {...}
```

### 2. **Parent Component Re-renders** ✅ PROTECTED
- Lock mechanism prevents re-execution
- `isPending` check prevents duplicate calls

### 3. **Query Invalidation** ✅ NOT AN ISSUE
- No query invalidation in `useAddManualAuthor`

### 4. **Event Handler Issues** ✅ PROTECTED
- Button `onClick` directly calls `handleSearch`
- Enter key handler checks `isPending` before calling

## 📊 Expected Behavior

### Single Click → Single API Call

```
User clicks button
    ↓
handleSearch() called [abc123]
    ↓
Lock acquired ✅
    ↓
API request sent (ONE TIME)
    ↓
Response received
    ↓
Lock released 🔓
    ↓
DONE
```

### Multiple Clicks → Only First Succeeds

```
User clicks button (1st time)
    ↓
handleSearch() called [abc123]
    ↓
Lock acquired ✅
    ↓
User clicks button (2nd time) - WHILE FIRST IS RUNNING
    ↓
handleSearch() called [def456]
    ↓
❌ BLOCKED - lock is held
    ↓
First request completes
    ↓
Lock released 🔓
```

## 🧪 Test Cases

### Test 1: Single Click
1. Enter author name
2. Click search button ONCE
3. **Expected:** ONE API call, ONE set of logs with same call ID

### Test 2: Rapid Clicks
1. Enter author name
2. Click search button 5 times rapidly
3. **Expected:** ONE API call (others blocked), multiple log entries showing blocks

### Test 3: Enter Key
1. Enter author name
2. Press Enter
3. **Expected:** ONE API call, ONE set of logs

### Test 4: Component Re-render
1. Start a search
2. While searching, try to trigger a re-render (e.g., resize window)
3. **Expected:** Search continues, no duplicate calls

## 🔧 If Still Seeing Multiple Calls

### Check 1: Are they truly duplicates?
- Same author name?
- Same timestamp (within milliseconds)?
- Same call ID in logs?

### Check 2: Is it a retry?
- Check if HTTP service is retrying despite `retries: 0`
- Look for "Retrying" messages in logs

### Check 3: Is parent component calling it?
- Check `ManualStep.tsx` for any `useEffect` calling search
- Check if `onSearchComplete` callback triggers another search

### Check 4: Browser extensions?
- Disable all browser extensions
- Try in incognito mode

## 📝 Debugging Checklist

- [ ] Console shows unique call IDs for each attempt
- [ ] Only ONE call ID per user action
- [ ] Network tab shows ONE request per search
- [ ] Backend logs show ONE entry per search
- [ ] Lock is acquired and released properly
- [ ] Blocked attempts show in console
- [ ] No errors in console
- [ ] `isPending` state updates correctly

## 🎯 Success Criteria

✅ **ONE click = ONE API call**
✅ **Rapid clicks = ONE API call (others blocked)**
✅ **Enter key = ONE API call**
✅ **Component re-renders = NO additional calls**
✅ **Clear console logs showing lock mechanism working**

## 📞 Still Having Issues?

If you're still seeing multiple calls after all these fixes:

1. **Share the console logs** - Include the call IDs
2. **Share the network tab** - Screenshot showing multiple requests
3. **Share the backend logs** - Show how many times the endpoint is hit
4. **Share the timing** - Are calls simultaneous or sequential?

This will help identify if it's:
- A React issue (component re-rendering)
- A network issue (retries)
- A backend issue (endpoint being called multiple times)
- A browser issue (extensions, caching)
