# ScholarFinder API Integration - Manual Testing Report

**Test Date**: _________________  
**Tester Name**: _________________  
**Environment**: Development / Staging / Production  
**API Base URL**: https://192.168.61.60:8000  
**Browser**: _________________  
**Browser Version**: _________________  

---

## Executive Summary

**Total Test Cases**: 39  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___  
**Not Executed**: ___  

**Overall Status**: ⬜ Pass | ⬜ Pass with Issues | ⬜ Fail

---

## 17.1 Upload and Metadata Extraction

### Test Case 1.1: Valid File Upload
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **File Used**: _________________
- **File Size**: _________________
- **Job ID Received**: _________________
- **Notes**: 
  
  

### Test Case 1.2: Invalid File Format
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **File Used**: _________________
- **Error Message**: _________________
- **Notes**: 
  
  

### Test Case 1.3: File Too Large
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked | ⬜ Not Tested
- **File Size**: _________________
- **Error Message**: _________________
- **Notes**: 
  
  

### Test Case 1.4: Metadata Display
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Metadata Accuracy**: ⬜ Accurate | ⬜ Partial | ⬜ Inaccurate
- **Issues Found**: 
  
  

### Test Case 1.5: Job ID Persistence
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Job ID**: _________________
- **Persisted After Refresh**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

---

## 17.2 Keyword Enhancement and Search

### Test Case 2.1: Keyword Enhancement
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **MeSH Terms Count**: _________________
- **Primary Keywords Count**: _________________
- **Secondary Keywords Count**: _________________
- **Notes**: 
  
  

### Test Case 2.2: Keyword Selection
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Primary Selected**: _________________
- **Secondary Selected**: _________________
- **Notes**: 
  
  

### Test Case 2.3: Search String Generation
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Search String**: _________________
- **Format Correct**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 2.4: Database Selection
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Databases Available**: ⬜ All 4 | ⬜ Partial
- **Notes**: 
  
  

### Test Case 2.5: Database Search Execution
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Databases Searched**: _________________
- **Total Reviewers Found**: _________________
- **Search Duration**: _________________
- **Notes**: 
  
  

### Test Case 2.6: Search Results Display
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Results Displayed**: ⬜ Yes | ⬜ No
- **Details Complete**: ⬜ Yes | ⬜ Partial | ⬜ No
- **Notes**: 
  
  

---

## 17.3 Manual Author and Validation

### Test Case 3.1: Manual Author Search - Valid Name
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Author Name Searched**: _________________
- **Results Found**: _________________
- **Notes**: 
  
  

### Test Case 3.2: Manual Author Search - Invalid Name
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Input Used**: _________________
- **Error Message**: _________________
- **Notes**: 
  
  

### Test Case 3.3: Manual Author Search - No Results
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Search Term**: _________________
- **Message Displayed**: _________________
- **Notes**: 
  
  

### Test Case 3.4: Author Selection
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Author Selected**: _________________
- **Added to List**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 3.5: Validation Initiation
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Total Authors to Validate**: _________________
- **Validation Started**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 3.6: Validation Progress Monitoring
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Polling Interval**: _________________
- **Progress Updates**: ⬜ Regular | ⬜ Irregular | ⬜ None
- **Criteria Displayed**: ⬜ All 8 | ⬜ Partial | ⬜ None
- **Notes**: 
  
  

### Test Case 3.7: Validation Completion
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Completion Time**: _________________
- **Final Status**: _________________
- **Notes**: 
  
  

### Test Case 3.8: Validation Scores
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Score Range**: _________________
- **Scores Accurate**: ⬜ Yes | ⬜ No | ⬜ Unknown
- **Notes**: 
  
  

---

## 17.4 Recommendations and Export

### Test Case 4.1: Recommendations Retrieval
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Total Reviewers**: _________________
- **Sorted Correctly**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 4.2: Reviewer Details Display
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **All Fields Present**: ⬜ Yes | ⬜ No
- **Missing Fields**: _________________
- **Notes**: 
  
  

### Test Case 4.3: Reviewer Sorting
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Highest Score First**: ⬜ Yes | ⬜ No
- **Order Verified**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 4.4: Reviewer Filtering
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Filter Value Used**: _________________
- **Results Filtered**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 4.5: Reviewer Search
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Search Terms Tested**: _________________
- **Search Works**: ⬜ Yes | ⬜ Partial | ⬜ No
- **Notes**: 
  
  

### Test Case 4.6: Shortlist Selection
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Reviewers Selected**: _________________
- **Shortlist Created**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 4.7: Shortlist Display
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **All Selected Shown**: ⬜ Yes | ⬜ No
- **Details Complete**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 4.8: Shortlist Management
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Removal Works**: ⬜ Yes | ⬜ No
- **Count Updates**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 4.9: CSV Export
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **File Downloaded**: ⬜ Yes | ⬜ No
- **CSV Valid**: ⬜ Yes | ⬜ No
- **Data Accurate**: ⬜ Yes | ⬜ No
- **File Name**: _________________
- **Notes**: 
  
  

### Test Case 4.10: JSON Export
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **File Downloaded**: ⬜ Yes | ⬜ No
- **JSON Valid**: ⬜ Yes | ⬜ No
- **Structure Correct**: ⬜ Yes | ⬜ No
- **File Name**: _________________
- **Notes**: 
  
  

### Test Case 4.11: Export Error Handling
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked | ⬜ Not Tested
- **Error Scenario**: _________________
- **Error Handled**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

---

## 17.5 Error Scenarios

### Test Case 5.1: Invalid File Upload
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **File Type**: _________________
- **Error Message**: _________________
- **Recovery Works**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 5.2: Network Disconnection During Upload
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Error Detected**: ⬜ Yes | ⬜ No
- **Retry Attempts**: _________________
- **Recovery Works**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 5.3: Network Disconnection During Keyword Enhancement
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Error Detected**: ⬜ Yes | ⬜ No
- **Error Message**: _________________
- **Recovery Works**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 5.4: Invalid Job ID
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Invalid ID Used**: _________________
- **Error Message**: _________________
- **Prompted to Restart**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 5.5: API Server Unavailable
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Error Detected**: ⬜ Yes | ⬜ No
- **Retry Attempts**: _________________
- **Error Message**: _________________
- **Notes**: 
  
  

### Test Case 5.6: Timeout During Long Operation
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked | ⬜ Not Tested
- **Operation**: _________________
- **Timeout Detected**: ⬜ Yes | ⬜ No
- **Error Message**: _________________
- **Notes**: 
  
  

### Test Case 5.7: Error State Reset
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked
- **Error Triggered**: _________________
- **State Reset**: ⬜ Yes | ⬜ No
- **Retry Successful**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

### Test Case 5.8: Validation Failure
- **Status**: ⬜ Pass | ⬜ Fail | ⬜ Blocked | ⬜ Not Tested
- **Failure Reason**: _________________
- **Error Handled**: ⬜ Yes | ⬜ No
- **Retry Available**: ⬜ Yes | ⬜ No
- **Notes**: 
  
  

---

## Issues and Bugs Found

| # | Test Case | Severity | Description | Steps to Reproduce | Expected | Actual | Status |
|---|-----------|----------|-------------|-------------------|----------|--------|--------|
| 1 | | ⬜ Critical ⬜ High ⬜ Medium ⬜ Low | | | | | ⬜ Open ⬜ Fixed |
| 2 | | ⬜ Critical ⬜ High ⬜ Medium ⬜ Low | | | | | ⬜ Open ⬜ Fixed |
| 3 | | ⬜ Critical ⬜ High ⬜ Medium ⬜ Low | | | | | ⬜ Open ⬜ Fixed |
| 4 | | ⬜ Critical ⬜ High ⬜ Medium ⬜ Low | | | | | ⬜ Open ⬜ Fixed |
| 5 | | ⬜ Critical ⬜ High ⬜ Medium ⬜ Low | | | | | ⬜ Open ⬜ Fixed |

---

## Performance Observations

### Upload Performance
- **File Size**: _________________
- **Upload Time**: _________________
- **Processing Time**: _________________
- **Total Time**: _________________

### Keyword Enhancement
- **Processing Time**: _________________
- **Keywords Generated**: _________________

### Database Search
- **Databases**: _________________
- **Search Time**: _________________
- **Results Count**: _________________

### Validation
- **Authors Count**: _________________
- **Validation Time**: _________________
- **Average Time per Author**: _________________

### Export
- **CSV Export Time**: _________________
- **JSON Export Time**: _________________
- **File Sizes**: _________________

---

## Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | | ⬜ Pass ⬜ Fail | |
| Firefox | | ⬜ Pass ⬜ Fail | |
| Safari | | ⬜ Pass ⬜ Fail | |
| Edge | | ⬜ Pass ⬜ Fail | |

---

## Network Monitoring Summary

### API Endpoints Tested
- [ ] POST /upload_extract_metadata
- [ ] GET /metadata_extraction
- [ ] POST /keyword_enhancement
- [ ] POST /keyword_string_generator
- [ ] POST /database_search
- [ ] POST /manual_authors
- [ ] POST /validate_authors
- [ ] GET /validation_status/{job_id}
- [ ] GET /recommended_reviewers

### Response Times
- **Average Response Time**: _________________
- **Slowest Endpoint**: _________________
- **Fastest Endpoint**: _________________

### Error Rates
- **Total Requests**: _________________
- **Successful Requests**: _________________
- **Failed Requests**: _________________
- **Error Rate**: _________________

---

## Recommendations

### Critical Issues
1. 
2. 
3. 

### Improvements Suggested
1. 
2. 
3. 

### Follow-up Actions
1. 
2. 
3. 

---

## Sign-off

**Tester Signature**: _________________  
**Date**: _________________  

**Reviewer Signature**: _________________  
**Date**: _________________  

**Approval Status**: ⬜ Approved | ⬜ Approved with Conditions | ⬜ Rejected

**Conditions (if any)**:


---

## Attachments

- [ ] Screenshots of successful workflows
- [ ] Screenshots of errors
- [ ] Network logs
- [ ] Console logs
- [ ] Exported CSV sample
- [ ] Exported JSON sample
- [ ] Video recording (if applicable)
