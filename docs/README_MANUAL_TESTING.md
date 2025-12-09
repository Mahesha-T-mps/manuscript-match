# Manual Testing Documentation

This folder contains comprehensive documentation for manually testing the ScholarFinder API integration.

## Documents Overview

### 1. MANUAL_TESTING_GUIDE.md
**Purpose**: Comprehensive step-by-step testing guide  
**Use When**: Performing detailed manual testing of the complete workflow  
**Contains**:
- Detailed test cases for all 5 subtasks (17.1 - 17.5)
- Expected results for each test case
- Network request verification steps
- Browser console commands for debugging
- Test results summary template

### 2. MANUAL_TESTING_CHECKLIST.md
**Purpose**: Quick reference checklist for manual testing  
**Use When**: Need a fast overview or quick testing session  
**Contains**:
- Condensed checklist format
- All test cases in checkbox format
- Quick verification steps
- Network monitoring endpoints
- Console commands reference

### 3. MANUAL_TESTING_REPORT_TEMPLATE.md
**Purpose**: Template for documenting test results  
**Use When**: Recording and reporting manual test results  
**Contains**:
- Test case result fields
- Issue tracking table
- Performance observations
- Browser compatibility matrix
- Sign-off section

## Testing Workflow

```
1. Review Prerequisites
   ↓
2. Follow MANUAL_TESTING_GUIDE.md
   ↓
3. Use MANUAL_TESTING_CHECKLIST.md for tracking
   ↓
4. Document results in MANUAL_TESTING_REPORT_TEMPLATE.md
   ↓
5. Review and sign-off
```

## Quick Start

### For First-Time Testers

1. **Read**: Start with `MANUAL_TESTING_GUIDE.md` to understand the complete testing process
2. **Prepare**: Ensure all prerequisites are met (servers running, test files ready)
3. **Test**: Follow the guide step-by-step for each subtask
4. **Track**: Use `MANUAL_TESTING_CHECKLIST.md` to mark completed tests
5. **Document**: Fill out `MANUAL_TESTING_REPORT_TEMPLATE.md` with your findings

### For Experienced Testers

1. **Quick Reference**: Use `MANUAL_TESTING_CHECKLIST.md` for rapid testing
2. **Verify**: Check network requests in browser DevTools
3. **Document**: Record any issues in the report template

## Test Coverage

### 17.1 Upload and Metadata Extraction (Requirements 1-8)
- Valid file upload
- Invalid file format handling
- File size validation
- Metadata display
- Job ID persistence

### 17.2 Keyword Enhancement and Search (Requirements 9-11)
- Keyword enhancement
- Keyword selection
- Search string generation
- Database selection
- Database search execution
- Search results display

### 17.3 Manual Author and Validation (Requirements 12-13)
- Manual author search (valid/invalid/no results)
- Author selection
- Validation initiation
- Validation progress monitoring
- Validation completion
- Validation scores

### 17.4 Recommendations and Export (Requirements 14-16)
- Recommendations retrieval
- Reviewer details display
- Reviewer sorting
- Reviewer filtering
- Reviewer search
- Shortlist selection and management
- CSV export
- JSON export

### 17.5 Error Scenarios (Requirements 5, 17)
- Invalid file upload
- Network disconnection
- Invalid job ID
- API server unavailable
- Timeout handling
- Error state reset
- Validation failure

## API Endpoints Tested

All endpoints use base URL: `https://192.168.61.60:8000`

1. `POST /upload_extract_metadata` - Upload and extract metadata
2. `GET /metadata_extraction?job_id={id}` - Retrieve metadata
3. `POST /keyword_enhancement` - Enhance keywords
4. `POST /keyword_string_generator` - Generate search string
5. `POST /database_search` - Search databases
6. `POST /manual_authors` - Add manual author
7. `POST /validate_authors` - Initiate validation
8. `GET /validation_status/{job_id}` - Check validation status
9. `GET /recommended_reviewers?job_id={id}` - Get recommendations

## Tools Required

- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **DevTools**: For network monitoring and console debugging
- **Test File**: Valid .docx manuscript file
- **Network Access**: Connection to API endpoint
- **Servers**: Backend and frontend development servers running

## Common Issues and Solutions

### Issue: Job ID not persisting
**Solution**: Check localStorage in DevTools → Application tab → Local Storage

### Issue: Network errors during testing
**Solution**: Verify API server is running and accessible at https://192.168.61.60:8000

### Issue: Upload fails with format error
**Solution**: Ensure file is .doc or .docx format and under 100MB

### Issue: Validation never completes
**Solution**: Check network tab for polling requests to /validation_status endpoint

### Issue: Export downloads empty file
**Solution**: Verify reviewers are selected and shortlist is created before export

## Browser Console Commands

```javascript
// Check job ID
localStorage.getItem('process_YOUR_PROCESS_ID_jobId')

// View all localStorage
console.table(localStorage)

// Set invalid job ID for testing
localStorage.setItem('process_YOUR_PROCESS_ID_jobId', 'invalid_job_id')

// Clear job ID
localStorage.removeItem('process_YOUR_PROCESS_ID_jobId')

// Monitor network requests
// Open DevTools → Network tab → Filter by "192.168.61.60"
```

## Reporting Issues

When documenting issues in the report template, include:

1. **Test Case ID**: Which test case failed
2. **Severity**: Critical / High / Medium / Low
3. **Description**: Clear description of the issue
4. **Steps to Reproduce**: Exact steps to recreate the issue
5. **Expected Result**: What should happen
6. **Actual Result**: What actually happened
7. **Screenshots**: If applicable
8. **Network Logs**: From DevTools if relevant
9. **Console Errors**: Any JavaScript errors

## Success Criteria

Manual testing is considered successful when:

- ✅ All 39 test cases pass
- ✅ No critical or high severity issues found
- ✅ All API endpoints respond correctly
- ✅ Error handling works as expected
- ✅ Data persists correctly throughout workflow
- ✅ Export functionality produces valid files
- ✅ User experience is smooth and intuitive

## Next Steps After Testing

1. **Review Results**: Analyze all test results and issues found
2. **Prioritize Issues**: Categorize by severity and impact
3. **Create Bug Reports**: Document issues in issue tracking system
4. **Retest Fixes**: Verify fixes for any issues found
5. **Sign-off**: Complete sign-off section in report template
6. **Archive**: Save completed report for records

## Contact

For questions about manual testing:
- Review the design document: `.kiro/specs/scholarfinder-api-integration/design.md`
- Review the requirements: `.kiro/specs/scholarfinder-api-integration/requirements.md`
- Check the implementation plan: `.kiro/specs/scholarfinder-api-integration/tasks.md`

## Version History

- **v1.0** - Initial manual testing documentation created
- Covers all 9 workflow steps
- Includes 39 test cases across 5 subtasks
- Comprehensive error scenario testing
