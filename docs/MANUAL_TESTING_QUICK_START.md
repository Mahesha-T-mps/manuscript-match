# Manual Testing Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will get you started with manual testing of the ScholarFinder API integration immediately.

## Prerequisites Checklist

Before you begin, ensure:

- [ ] Backend server is running on its configured port
- [ ] Frontend dev server is running (usually `npm run dev` or `yarn dev`)
- [ ] You have a valid Word document (.docx) ready for testing
- [ ] Network connectivity to `https://192.168.61.60:8000` is available
- [ ] Browser DevTools is open (press F12)

## Quick Test Path (30 minutes)

### Step 1: Upload Test (5 min)
1. Navigate to the application
2. Create or select a process
3. Upload your .docx file
4. ✅ Verify: Success notification appears
5. ✅ Verify: Metadata is displayed
6. ✅ Verify: Check localStorage for job_id:
   ```javascript
   localStorage.getItem('process_YOUR_PROCESS_ID_jobId')
   ```

### Step 2: Keywords Test (5 min)
1. Click "Enhance Keywords"
2. ✅ Verify: Keywords appear in categories
3. Select 2-3 primary and secondary keywords
4. Click "Generate Search String"
5. ✅ Verify: Boolean query is displayed

### Step 3: Search Test (5 min)
1. Select 2 databases (e.g., PubMed, ScienceDirect)
2. Click "Search Databases"
3. ✅ Verify: Loading indicator appears
4. ✅ Verify: Results count is displayed
5. ✅ Verify: Preview of reviewers shown

### Step 4: Validation Test (10 min)
1. Optionally add a manual author
2. Click "Validate Authors"
3. ✅ Verify: Progress percentage updates
4. ✅ Verify: 8 validation criteria are listed
5. Wait for completion
6. ✅ Verify: Status changes to "completed"

### Step 5: Export Test (5 min)
1. View recommended reviewers
2. ✅ Verify: Sorted by score (highest first)
3. Select 3-5 reviewers
4. Create shortlist
5. Export as CSV
6. ✅ Verify: File downloads
7. ✅ Verify: CSV is valid

## Critical Checks

### Network Monitoring
Open DevTools → Network tab and verify these requests succeed:

1. ✅ `POST /upload_extract_metadata` → Returns job_id
2. ✅ `POST /keyword_enhancement` → Returns keywords
3. ✅ `POST /keyword_string_generator` → Returns search string
4. ✅ `POST /database_search` → Returns reviewer count
5. ✅ `POST /validate_authors` → Starts validation
6. ✅ `GET /validation_status/{job_id}` → Polls progress
7. ✅ `GET /recommended_reviewers` → Returns reviewers

### Console Monitoring
Check Console tab for:
- ❌ No JavaScript errors
- ❌ No network errors
- ✅ Successful API responses

## Quick Error Tests (10 minutes)

### Test 1: Invalid File
1. Try to upload a .pdf file
2. ✅ Verify: Error message appears
3. ✅ Verify: Can retry with valid file

### Test 2: Network Error
1. Disconnect network
2. Try any operation
3. ✅ Verify: Error message appears
4. ✅ Verify: Retry logic attempts reconnection
5. Reconnect and retry
6. ✅ Verify: Operation succeeds

### Test 3: Invalid Job ID
1. In console: `localStorage.setItem('process_YOUR_PROCESS_ID_jobId', 'invalid')`
2. Try to enhance keywords
3. ✅ Verify: Error message about invalid job_id
4. ✅ Verify: Prompted to start over

## Success Indicators

You've successfully tested the integration if:

- ✅ File uploads and metadata extracts
- ✅ Keywords enhance and search string generates
- ✅ Database search returns results
- ✅ Validation completes with scores
- ✅ Reviewers display sorted by score
- ✅ Export produces valid CSV/JSON files
- ✅ Errors are handled gracefully
- ✅ Job ID persists throughout workflow

## If Something Fails

### Upload Fails
- Check file format (.docx only)
- Check file size (<100MB)
- Check API server is running
- Check network connectivity

### Keywords Don't Enhance
- Verify job_id exists in localStorage
- Check network tab for API errors
- Verify API endpoint is accessible

### Validation Stuck
- Check network tab for polling requests
- Verify validation_status endpoint is responding
- Wait at least 2-3 minutes for completion

### Export Fails
- Verify reviewers are selected
- Check browser console for errors
- Try different export format

## Next Steps

### For Quick Testing
✅ You're done! Document any issues found.

### For Comprehensive Testing
📖 Continue with `MANUAL_TESTING_GUIDE.md` for detailed test cases.

### For Formal Testing
📋 Use `MANUAL_TESTING_REPORT_TEMPLATE.md` to document results.

## Useful Commands

```javascript
// Check job ID
localStorage.getItem('process_YOUR_PROCESS_ID_jobId')

// View all localStorage
console.table(localStorage)

// Clear job ID (for retesting)
localStorage.removeItem('process_YOUR_PROCESS_ID_jobId')

// Monitor API calls
// DevTools → Network → Filter: "192.168.61.60"
```

## Documentation Reference

- **Detailed Guide**: `MANUAL_TESTING_GUIDE.md`
- **Checklist**: `MANUAL_TESTING_CHECKLIST.md`
- **Report Template**: `MANUAL_TESTING_REPORT_TEMPLATE.md`
- **Documentation Overview**: `README_MANUAL_TESTING.md`

## Time Estimates

- **Quick Test**: 30 minutes (basic workflow)
- **Quick + Errors**: 40 minutes (includes error scenarios)
- **Comprehensive Test**: 2-3 hours (all 39 test cases)
- **Formal Test + Report**: 4-5 hours (includes documentation)

## Support

If you encounter issues:
1. Check the troubleshooting section in `MANUAL_TESTING_GUIDE.md`
2. Review the design document for expected behavior
3. Check the requirements document for acceptance criteria
4. Review network logs and console errors

## Ready to Start?

1. ✅ Prerequisites checked
2. ✅ Servers running
3. ✅ Test file ready
4. ✅ DevTools open

**Let's go!** Start with Step 1: Upload Test above. 🚀

---

**Estimated Time**: 30-40 minutes for quick testing  
**Difficulty**: Easy - just follow the steps  
**Requirements**: Basic browser usage, no coding needed
