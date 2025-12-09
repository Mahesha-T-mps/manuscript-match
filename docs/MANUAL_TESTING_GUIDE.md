# ScholarFinder API Integration - Manual Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the complete ScholarFinder API integration workflow. The workflow consists of 9 steps from manuscript upload to reviewer export.

**API Base URL**: `https://192.168.61.60:8000`

## Prerequisites

Before starting manual testing:

1. ✅ Ensure the backend server is running
2. ✅ Ensure the frontend development server is running
3. ✅ Have a valid Word document (.docx) ready for upload (preferably a real manuscript)
4. ✅ Ensure network connectivity to the API endpoint
5. ✅ Open browser developer tools (F12) to monitor network requests and console logs

## Test Execution Checklist

### 17.1 Test Upload and Metadata Extraction

**Requirements Tested**: 1-8

#### Test Case 1.1: Valid File Upload

**Steps**:
1. Navigate to the Process Workflow page
2. Click "Create New Process" or select an existing process
3. In the Upload step, select or drag a valid .docx file
4. Observe the upload progress indicator

**Expected Results**:
- ✅ File validation passes (no error before upload starts)
- ✅ Progress indicator shows 0% → 100%
- ✅ Status changes: idle → uploading → processing → completed
- ✅ Success notification appears with file name
- ✅ Metadata is displayed (title, authors, affiliations, keywords, abstract)
- ✅ Job ID is stored (check localStorage: `process_${processId}_jobId`)

**Verification**:
```javascript
// In browser console:
localStorage.getItem('process_YOUR_PROCESS_ID_jobId')
// Should return a job_id like: "job_20250115_1430_a1b2c3"
```

**Network Request Check**:
- Endpoint: `POST https://192.168.61.60:8000/upload_extract_metadata`
- Content-Type: `multipart/form-data`
- Response should contain: `job_id`, `file_name`, `heading`, `authors`, `affiliations`, `keywords`, `abstract`, `author_aff_map`

#### Test Case 1.2: Invalid File Format

**Steps**:
1. Attempt to upload a .pdf or .txt file
2. Observe the error message

**Expected Results**:
- ✅ Error message: "Unsupported file format. Please upload a .doc or .docx file."
- ✅ Upload does not proceed
- ✅ User can select a different file

#### Test Case 1.3: File Too Large

**Steps**:
1. Attempt to upload a file larger than 100MB
2. Observe the error message

**Expected Results**:
- ✅ Error message indicates file size limit exceeded
- ✅ Upload does not proceed

#### Test Case 1.4: Metadata Display

**Steps**:
1. After successful upload, review the displayed metadata
2. Compare with the actual manuscript content

**Expected Results**:
- ✅ Title matches manuscript heading
- ✅ All authors are listed
- ✅ Affiliations are displayed
- ✅ Keywords are shown
- ✅ Abstract is visible
- ✅ Author-affiliation mappings are preserved

#### Test Case 1.5: Job ID Persistence

**Steps**:
1. After successful upload, note the job_id
2. Refresh the browser page
3. Check if job_id is still available

**Expected Results**:
- ✅ Job ID persists in localStorage after refresh
- ✅ Metadata can be retrieved using the persisted job_id

---

### 17.2 Test Keyword Enhancement and Search

**Requirements Tested**: 9-11

#### Test Case 2.1: Keyword Enhancement

**Steps**:
1. After successful upload, navigate to the Keyword Enhancement step
2. Click "Enhance Keywords" button
3. Wait for the enhancement to complete

**Expected Results**:
- ✅ Loading indicator appears during processing
- ✅ Enhanced keywords are displayed in categories:
  - MeSH Terms
  - Broader Terms
  - Primary Focus Keywords
  - Secondary Focus Keywords
  - Additional AI-generated keywords
- ✅ Keywords are selectable (checkboxes or multi-select)

**Network Request Check**:
- Endpoint: `POST https://192.168.61.60:8000/keyword_enhancement`
- Request body: `{ "job_id": "job_..." }`
- Response contains: `mesh_terms`, `broader_terms`, `primary_focus`, `secondary_focus`, etc.

#### Test Case 2.2: Keyword Selection

**Steps**:
1. Select 2-3 primary keywords
2. Select 2-3 secondary keywords
3. Observe the selected count

**Expected Results**:
- ✅ Selected keywords are highlighted
- ✅ Selected count is displayed
- ✅ "Generate Search String" button becomes enabled

#### Test Case 2.3: Search String Generation

**Steps**:
1. With keywords selected, click "Generate Search String"
2. Wait for generation to complete

**Expected Results**:
- ✅ Boolean query string is displayed
- ✅ Format: `(primary1 OR primary2) AND (secondary1 OR secondary2)`
- ✅ Used keywords are listed
- ✅ Search string is properly formatted

**Network Request Check**:
- Endpoint: `POST https://192.168.61.60:8000/keyword_string_generator`
- Request body: `{ "job_id": "job_...", "primary_keywords_input": "...", "secondary_keywords_input": "..." }`
- Response contains: `search_string`, `primary_keywords_used`, `secondary_keywords_used`

#### Test Case 2.4: Database Selection

**Steps**:
1. Navigate to the Database Search step
2. View available databases (PubMed, TandFonline, ScienceDirect, WileyLibrary)
3. Select 2-3 databases

**Expected Results**:
- ✅ All 4 databases are available for selection
- ✅ At least one database must be selected
- ✅ "Search Databases" button is enabled when databases are selected

#### Test Case 2.5: Database Search Execution

**Steps**:
1. With databases selected, click "Search Databases"
2. Monitor the search progress
3. Wait for search completion

**Expected Results**:
- ✅ Loading indicator appears
- ✅ Progress information is displayed (if available)
- ✅ Search completes successfully
- ✅ Total reviewer count is displayed
- ✅ Search status for each database is shown (success/failed/in_progress)
- ✅ Preview of found reviewers is displayed

**Network Request Check**:
- Endpoint: `POST https://192.168.61.60:8000/database_search`
- Request body: `{ "job_id": "job_...", "selected_websites": "PubMed,ScienceDirect" }`
- Response contains: `total_reviewers`, `databases_searched`, `search_status`, `preview_reviewers`

#### Test Case 2.6: Search Results Display

**Steps**:
1. Review the search results
2. Check reviewer details in preview

**Expected Results**:
- ✅ Reviewer names are displayed
- ✅ Affiliations are shown
- ✅ Publication counts are visible
- ✅ Total count matches the number of reviewers found

---

### 17.3 Test Manual Author and Validation

**Requirements Tested**: 12-13

#### Test Case 3.1: Manual Author Search - Valid Name

**Steps**:
1. Navigate to the Author Validation step
2. Enter a valid author name (at least 2 characters)
3. Click "Search Author"
4. Wait for results

**Expected Results**:
- ✅ Input validation passes
- ✅ Loading indicator appears
- ✅ Found authors are displayed with:
  - Name
  - Email (if available)
  - Affiliation
  - Country
  - Publication count
- ✅ User can select an author from results

**Network Request Check**:
- Endpoint: `POST https://192.168.61.60:8000/manual_authors`
- Request body: `{ "job_id": "job_...", "author_name": "Dr. John Smith" }`
- Response contains: `found_authors`, `search_term`, `total_found`

#### Test Case 3.2: Manual Author Search - Invalid Name

**Steps**:
1. Enter a single character or empty string
2. Attempt to search

**Expected Results**:
- ✅ Error message: "Author name must be at least 2 characters long"
- ✅ Search does not proceed

#### Test Case 3.3: Manual Author Search - No Results

**Steps**:
1. Enter a name that won't match any authors (e.g., "XYZ123ABC")
2. Click "Search Author"

**Expected Results**:
- ✅ Message: "No authors found"
- ✅ Suggestion to try alternative search terms
- ✅ User can search again

#### Test Case 3.4: Author Selection

**Steps**:
1. From search results, select an author
2. Confirm the selection

**Expected Results**:
- ✅ Author is added to potential reviewers list
- ✅ Confirmation message appears
- ✅ Author appears in the reviewers list

#### Test Case 3.5: Validation Initiation

**Steps**:
1. With reviewers from database search and/or manual addition, click "Validate Authors"
2. Observe the validation start

**Expected Results**:
- ✅ Validation begins
- ✅ Status changes to "in_progress"
- ✅ Progress indicator appears

**Network Request Check**:
- Endpoint: `POST https://192.168.61.60:8000/validate_authors`
- Request body: `{ "job_id": "job_..." }`
- Response contains: `validation_status`, `progress_percentage`, `estimated_completion_time`

#### Test Case 3.6: Validation Progress Monitoring

**Steps**:
1. While validation is in progress, monitor the progress
2. Observe the polling behavior (should poll every 5 seconds)

**Expected Results**:
- ✅ Progress percentage updates regularly
- ✅ Estimated completion time is displayed
- ✅ Number of authors processed is shown
- ✅ Validation criteria are listed (8 criteria):
  1. Publications (last 10 years) ≥ 8
  2. Relevant Publications (last 5 years) ≥ 3
  3. Publications (last 2 years) ≥ 1
  4. English Publications > 50%
  5. No Coauthorship
  6. Different Affiliation
  7. Same Country
  8. No Retracted Publications

**Network Request Check** (Polling):
- Endpoint: `GET https://192.168.61.60:8000/validation_status/{job_id}`
- Polling interval: ~5 seconds
- Response updates: `progress_percentage`, `total_authors_processed`

#### Test Case 3.7: Validation Completion

**Steps**:
1. Wait for validation to complete
2. Observe the completion state

**Expected Results**:
- ✅ Status changes to "completed"
- ✅ Progress reaches 100%
- ✅ Polling stops
- ✅ Completion message is displayed
- ✅ Workflow progresses to recommendations view

#### Test Case 3.8: Validation Scores

**Steps**:
1. After validation completes, review the validation scores
2. Check the conditions_met values

**Expected Results**:
- ✅ Each reviewer has a conditions_met score (0-8)
- ✅ Conditions satisfied are listed (e.g., "6 of 8")
- ✅ Specific criteria satisfied are indicated

---

### 17.4 Test Recommendations and Export

**Requirements Tested**: 14-16

#### Test Case 4.1: Recommendations Retrieval

**Steps**:
1. After validation completes, navigate to Recommendations step
2. View the recommended reviewers list

**Expected Results**:
- ✅ All validated reviewers are displayed
- ✅ Reviewers are sorted by conditions_met score (highest first)
- ✅ Total count is displayed

**Network Request Check**:
- Endpoint: `GET https://192.168.61.60:8000/recommended_reviewers?job_id={job_id}`
- Response contains: `reviewers` array, `total_count`, `validation_summary`

#### Test Case 4.2: Reviewer Details Display

**Steps**:
1. Review the details for each reviewer
2. Verify all information is present

**Expected Results**:
- ✅ Reviewer name
- ✅ Email address
- ✅ Affiliation
- ✅ City and Country
- ✅ Publication metrics:
  - Total Publications
  - English Publications
  - Publications (last 10 years)
  - Relevant Publications (last 5 years)
  - Publications (last 2 years)
  - Publications (last year)
  - Clinical Trials, Studies, Case Reports
  - Retracted Publications
- ✅ Validation score (conditions_met)
- ✅ Conditions satisfied indicator
- ✅ Coauthor status
- ✅ Country match
- ✅ Affiliation match

#### Test Case 4.3: Reviewer Sorting

**Steps**:
1. Verify the order of reviewers
2. Check that highest scores appear first

**Expected Results**:
- ✅ Reviewers with conditions_met = 8 appear first
- ✅ Reviewers with conditions_met = 7 appear next
- ✅ Order is descending by score
- ✅ Sorting is consistent

#### Test Case 4.4: Reviewer Filtering

**Steps**:
1. Use the filter to set minimum conditions_met score (e.g., 6)
2. Observe the filtered results

**Expected Results**:
- ✅ Only reviewers with score ≥ 6 are displayed
- ✅ Count updates to reflect filtered results
- ✅ Filter can be adjusted or cleared

#### Test Case 4.5: Reviewer Search

**Steps**:
1. Use the search box to search by:
   - Name
   - Affiliation
   - Country
2. Observe the search results

**Expected Results**:
- ✅ Search filters reviewers in real-time
- ✅ Matching reviewers are displayed
- ✅ Search is case-insensitive
- ✅ Search can be cleared

#### Test Case 4.6: Shortlist Selection

**Steps**:
1. Select 3-5 reviewers using checkboxes
2. Observe the selected count
3. Click "Create Shortlist"

**Expected Results**:
- ✅ Checkboxes allow multi-select
- ✅ Selected count is displayed
- ✅ "Create Shortlist" button is enabled
- ✅ Shortlist is created successfully
- ✅ Confirmation message appears

#### Test Case 4.7: Shortlist Display

**Steps**:
1. View the created shortlist
2. Verify the selected reviewers

**Expected Results**:
- ✅ All selected reviewers appear in shortlist
- ✅ Shortlist count matches selection
- ✅ Reviewer details are complete

#### Test Case 4.8: Shortlist Management

**Steps**:
1. Remove a reviewer from the shortlist
2. Observe the update

**Expected Results**:
- ✅ Reviewer is removed
- ✅ Shortlist count updates
- ✅ Remaining reviewers are still displayed

#### Test Case 4.9: CSV Export

**Steps**:
1. Click "Export" button
2. Select "CSV" format
3. Wait for export to complete

**Expected Results**:
- ✅ Export dialog appears
- ✅ CSV format is selectable
- ✅ File download is triggered
- ✅ Downloaded file is a valid CSV
- ✅ CSV contains all reviewer details
- ✅ CSV has proper headers
- ✅ Data is properly formatted

**CSV Verification**:
- Open the downloaded CSV file
- Verify columns include: Name, Email, Affiliation, City, Country, Publications, Validation Score, etc.
- Verify data matches the displayed reviewers

#### Test Case 4.10: JSON Export

**Steps**:
1. Click "Export" button
2. Select "JSON" format
3. Wait for export to complete

**Expected Results**:
- ✅ Export dialog appears
- ✅ JSON format is selectable
- ✅ File download is triggered
- ✅ Downloaded file is valid JSON
- ✅ JSON contains structured reviewer data
- ✅ All fields are present

**JSON Verification**:
```javascript
// Open the downloaded JSON file and verify structure:
{
  "reviewers": [
    {
      "reviewer": "Dr. Jane Smith",
      "email": "j.smith@university.edu",
      "aff": "Department of Biology",
      "city": "Boston",
      "country": "USA",
      "Total_Publications": 120,
      "conditions_met": 8,
      // ... all other fields
    }
  ],
  "total_count": 5,
  "exported_at": "2025-01-15T14:30:00Z"
}
```

#### Test Case 4.11: Export Error Handling

**Steps**:
1. Attempt to export with no reviewers selected (if applicable)
2. Observe the error handling

**Expected Results**:
- ✅ Appropriate error message is displayed
- ✅ User can correct the issue and retry

---

### 17.5 Test Error Scenarios

**Requirements Tested**: 5, 17

#### Test Case 5.1: Invalid File Upload

**Steps**:
1. Attempt to upload a .pdf file
2. Observe the error

**Expected Results**:
- ✅ Error message: "Unsupported file format. Please upload a .doc or .docx file."
- ✅ Upload state resets
- ✅ User can select a different file

#### Test Case 5.2: Network Disconnection During Upload

**Steps**:
1. Start uploading a file
2. Disconnect network (disable WiFi or unplug ethernet)
3. Observe the error handling

**Expected Results**:
- ✅ Network error is detected
- ✅ Error message: "Network connection failed. Please check your internet connection and try again."
- ✅ Retry logic attempts reconnection (up to 3 times)
- ✅ If all retries fail, error is displayed
- ✅ User can retry after reconnecting

#### Test Case 5.3: Network Disconnection During Keyword Enhancement

**Steps**:
1. Start keyword enhancement
2. Disconnect network
3. Observe the error handling

**Expected Results**:
- ✅ Network error is detected
- ✅ Appropriate error message is displayed
- ✅ Retry logic attempts reconnection
- ✅ User can retry after reconnecting

#### Test Case 5.4: Invalid Job ID

**Steps**:
1. Manually modify localStorage to use an invalid job_id
2. Attempt to continue the workflow

**Expected Results**:
- ✅ Error message: "Job ID is invalid or expired. Please upload a manuscript again."
- ✅ User is prompted to start over
- ✅ Workflow resets appropriately

**Manual Job ID Modification**:
```javascript
// In browser console:
localStorage.setItem('process_YOUR_PROCESS_ID_jobId', 'invalid_job_id_123');
// Then try to enhance keywords or perform any subsequent step
```

#### Test Case 5.5: API Server Unavailable

**Steps**:
1. Ensure API server is stopped or unreachable
2. Attempt to upload a file
3. Observe the error handling

**Expected Results**:
- ✅ Connection error is detected
- ✅ Error message: "Failed to connect to ScholarFinder API. Please check your internet connection and try again."
- ✅ Retry logic attempts reconnection (up to 3 times)
- ✅ If all retries fail, error is displayed
- ✅ User can retry when server is available

#### Test Case 5.6: Timeout During Long Operation

**Steps**:
1. Upload a very large file or perform an operation that might timeout
2. Wait for timeout (120 seconds)
3. Observe the error handling

**Expected Results**:
- ✅ Timeout is detected
- ✅ Error message: "The operation timed out. This may be due to large file processing or high server load."
- ✅ Retry logic attempts the operation again
- ✅ User can retry

#### Test Case 5.7: Error State Reset

**Steps**:
1. Trigger any error (e.g., invalid file)
2. Observe the error state
3. Select a valid file and retry

**Expected Results**:
- ✅ Error message is displayed
- ✅ Upload state resets to 'idle'
- ✅ Progress indicator is cleared
- ✅ User can select a new file
- ✅ Retry succeeds with valid input

#### Test Case 5.8: Validation Failure

**Steps**:
1. Initiate validation
2. If validation fails (API returns error), observe the handling

**Expected Results**:
- ✅ Error message is displayed
- ✅ Reason for failure is shown
- ✅ User can retry validation
- ✅ Workflow state is preserved

---

## Test Results Summary

After completing all test cases, fill out this summary:

### 17.1 Upload and Metadata Extraction
- [ ] Test Case 1.1: Valid File Upload - PASS/FAIL
- [ ] Test Case 1.2: Invalid File Format - PASS/FAIL
- [ ] Test Case 1.3: File Too Large - PASS/FAIL
- [ ] Test Case 1.4: Metadata Display - PASS/FAIL
- [ ] Test Case 1.5: Job ID Persistence - PASS/FAIL

### 17.2 Keyword Enhancement and Search
- [ ] Test Case 2.1: Keyword Enhancement - PASS/FAIL
- [ ] Test Case 2.2: Keyword Selection - PASS/FAIL
- [ ] Test Case 2.3: Search String Generation - PASS/FAIL
- [ ] Test Case 2.4: Database Selection - PASS/FAIL
- [ ] Test Case 2.5: Database Search Execution - PASS/FAIL
- [ ] Test Case 2.6: Search Results Display - PASS/FAIL

### 17.3 Manual Author and Validation
- [ ] Test Case 3.1: Manual Author Search - Valid Name - PASS/FAIL
- [ ] Test Case 3.2: Manual Author Search - Invalid Name - PASS/FAIL
- [ ] Test Case 3.3: Manual Author Search - No Results - PASS/FAIL
- [ ] Test Case 3.4: Author Selection - PASS/FAIL
- [ ] Test Case 3.5: Validation Initiation - PASS/FAIL
- [ ] Test Case 3.6: Validation Progress Monitoring - PASS/FAIL
- [ ] Test Case 3.7: Validation Completion - PASS/FAIL
- [ ] Test Case 3.8: Validation Scores - PASS/FAIL

### 17.4 Recommendations and Export
- [ ] Test Case 4.1: Recommendations Retrieval - PASS/FAIL
- [ ] Test Case 4.2: Reviewer Details Display - PASS/FAIL
- [ ] Test Case 4.3: Reviewer Sorting - PASS/FAIL
- [ ] Test Case 4.4: Reviewer Filtering - PASS/FAIL
- [ ] Test Case 4.5: Reviewer Search - PASS/FAIL
- [ ] Test Case 4.6: Shortlist Selection - PASS/FAIL
- [ ] Test Case 4.7: Shortlist Display - PASS/FAIL
- [ ] Test Case 4.8: Shortlist Management - PASS/FAIL
- [ ] Test Case 4.9: CSV Export - PASS/FAIL
- [ ] Test Case 4.10: JSON Export - PASS/FAIL
- [ ] Test Case 4.11: Export Error Handling - PASS/FAIL

### 17.5 Error Scenarios
- [ ] Test Case 5.1: Invalid File Upload - PASS/FAIL
- [ ] Test Case 5.2: Network Disconnection During Upload - PASS/FAIL
- [ ] Test Case 5.3: Network Disconnection During Keyword Enhancement - PASS/FAIL
- [ ] Test Case 5.4: Invalid Job ID - PASS/FAIL
- [ ] Test Case 5.5: API Server Unavailable - PASS/FAIL
- [ ] Test Case 5.6: Timeout During Long Operation - PASS/FAIL
- [ ] Test Case 5.7: Error State Reset - PASS/FAIL
- [ ] Test Case 5.8: Validation Failure - PASS/FAIL

---

## Issues Found

Document any issues discovered during testing:

| Test Case | Issue Description | Severity | Steps to Reproduce |
|-----------|------------------|----------|-------------------|
| | | | |

---

## Notes

- All network requests can be monitored in browser DevTools (Network tab)
- Console logs can be viewed in browser DevTools (Console tab)
- localStorage can be inspected in browser DevTools (Application tab → Local Storage)
- API responses should be validated against the expected formats in the design document

---

## Completion Checklist

- [ ] All test cases in 17.1 completed
- [ ] All test cases in 17.2 completed
- [ ] All test cases in 17.3 completed
- [ ] All test cases in 17.4 completed
- [ ] All test cases in 17.5 completed
- [ ] Test results summary filled out
- [ ] Issues documented (if any)
- [ ] Manual testing report created

---

## Next Steps

After completing manual testing:

1. Review all test results
2. Document any bugs or issues found
3. Create bug reports for failures
4. Verify fixes for any issues
5. Re-test failed scenarios
6. Sign off on the integration when all tests pass
