# ScholarFinder API - Quick Manual Testing Checklist

## Pre-Test Setup
- [ ] Backend server running
- [ ] Frontend dev server running  
- [ ] Valid .docx file ready
- [ ] Network connectivity verified
- [ ] Browser DevTools open (F12)

---

## 17.1 Upload & Metadata (Requirements 1-8)

### Valid Upload
- [ ] Upload .docx file
- [ ] Progress shows 0% → 100%
- [ ] Status: idle → uploading → processing → completed
- [ ] Success notification appears
- [ ] Metadata displayed (title, authors, affiliations, keywords, abstract)
- [ ] Job ID stored in localStorage

**Verify**: `localStorage.getItem('process_YOUR_PROCESS_ID_jobId')`

### Error Cases
- [ ] Upload .pdf → Error: "Unsupported file format"
- [ ] Upload >100MB file → Error: "File size too large"
- [ ] Metadata matches manuscript content
- [ ] Job ID persists after page refresh

---

## 17.2 Keywords & Search (Requirements 9-11)

### Keyword Enhancement
- [ ] Click "Enhance Keywords"
- [ ] Loading indicator appears
- [ ] Keywords displayed by category:
  - [ ] MeSH Terms
  - [ ] Broader Terms
  - [ ] Primary Focus
  - [ ] Secondary Focus
- [ ] Keywords are selectable

### Search String
- [ ] Select 2-3 primary keywords
- [ ] Select 2-3 secondary keywords
- [ ] Click "Generate Search String"
- [ ] Boolean query displayed: `(primary1 OR primary2) AND (secondary1 OR secondary2)`
- [ ] Used keywords listed

### Database Search
- [ ] Select 2-3 databases (PubMed, TandFonline, ScienceDirect, WileyLibrary)
- [ ] Click "Search Databases"
- [ ] Loading indicator appears
- [ ] Total reviewer count displayed
- [ ] Search status per database shown
- [ ] Preview of reviewers displayed

---

## 17.3 Manual Author & Validation (Requirements 12-13)

### Manual Author
- [ ] Enter author name (≥2 chars)
- [ ] Click "Search Author"
- [ ] Found authors displayed with details
- [ ] Select an author
- [ ] Author added to reviewers list
- [ ] Test invalid name (<2 chars) → Error
- [ ] Test no results → "No authors found"

### Validation
- [ ] Click "Validate Authors"
- [ ] Status: "in_progress"
- [ ] Progress percentage updates
- [ ] Estimated time displayed
- [ ] Authors processed count shown
- [ ] 8 validation criteria listed:
  1. [ ] Publications (last 10 years) ≥ 8
  2. [ ] Relevant Publications (last 5 years) ≥ 3
  3. [ ] Publications (last 2 years) ≥ 1
  4. [ ] English Publications > 50%
  5. [ ] No Coauthorship
  6. [ ] Different Affiliation
  7. [ ] Same Country
  8. [ ] No Retracted Publications
- [ ] Polling every ~5 seconds
- [ ] Status changes to "completed"
- [ ] Progress reaches 100%
- [ ] Polling stops

---

## 17.4 Recommendations & Export (Requirements 14-16)

### Recommendations
- [ ] All reviewers displayed
- [ ] Sorted by conditions_met (highest first)
- [ ] Total count shown
- [ ] Reviewer details complete:
  - [ ] Name, Email, Affiliation
  - [ ] City, Country
  - [ ] Publication metrics
  - [ ] Validation score (0-8)
  - [ ] Conditions satisfied

### Filtering & Search
- [ ] Filter by minimum score (e.g., ≥6)
- [ ] Count updates
- [ ] Search by name
- [ ] Search by affiliation
- [ ] Search by country
- [ ] Search is case-insensitive

### Shortlist
- [ ] Select 3-5 reviewers
- [ ] Selected count displayed
- [ ] Click "Create Shortlist"
- [ ] Confirmation message
- [ ] Shortlist displayed
- [ ] Remove reviewer from shortlist
- [ ] Count updates

### Export
- [ ] Click "Export"
- [ ] Select CSV format
- [ ] File downloads
- [ ] CSV is valid
- [ ] CSV has headers
- [ ] Data matches reviewers
- [ ] Select JSON format
- [ ] File downloads
- [ ] JSON is valid
- [ ] JSON structure correct

---

## 17.5 Error Scenarios (Requirements 5, 17)

### File Errors
- [ ] Upload .pdf → Error message
- [ ] Upload state resets
- [ ] Can retry with valid file

### Network Errors
- [ ] Disconnect network during upload
- [ ] Error: "Network connection failed"
- [ ] Retry logic (up to 3 times)
- [ ] Can retry after reconnecting
- [ ] Disconnect during keyword enhancement
- [ ] Appropriate error shown

### Invalid Job ID
- [ ] Modify localStorage: `localStorage.setItem('process_ID_jobId', 'invalid')`
- [ ] Try next step
- [ ] Error: "Job ID is invalid"
- [ ] Prompted to start over

### Server Unavailable
- [ ] Stop API server
- [ ] Try upload
- [ ] Error: "Failed to connect to API"
- [ ] Retry logic attempts
- [ ] Can retry when server available

### Timeout
- [ ] Large file or slow operation
- [ ] Wait 120 seconds
- [ ] Error: "Operation timed out"
- [ ] Retry available

### Error Recovery
- [ ] Trigger any error
- [ ] Error message displayed
- [ ] State resets to 'idle'
- [ ] Progress cleared
- [ ] Can select new file
- [ ] Retry succeeds

---

## Network Monitoring

Check in DevTools → Network tab:

### Upload
- `POST https://192.168.61.60:8000/upload_extract_metadata`
- Response: `job_id`, `file_name`, `heading`, `authors`, etc.

### Keyword Enhancement
- `POST https://192.168.61.60:8000/keyword_enhancement`
- Response: `mesh_terms`, `broader_terms`, `primary_focus`, etc.

### Search String
- `POST https://192.168.61.60:8000/keyword_string_generator`
- Response: `search_string`, `primary_keywords_used`, etc.

### Database Search
- `POST https://192.168.61.60:8000/database_search`
- Response: `total_reviewers`, `databases_searched`, `search_status`

### Manual Author
- `POST https://192.168.61.60:8000/manual_authors`
- Response: `found_authors`, `search_term`, `total_found`

### Validation
- `POST https://192.168.61.60:8000/validate_authors`
- `GET https://192.168.61.60:8000/validation_status/{job_id}` (polling)
- Response: `validation_status`, `progress_percentage`, etc.

### Recommendations
- `GET https://192.168.61.60:8000/recommended_reviewers?job_id={job_id}`
- Response: `reviewers`, `total_count`, `validation_summary`

---

## Final Checklist

- [ ] All 17.1 tests passed
- [ ] All 17.2 tests passed
- [ ] All 17.3 tests passed
- [ ] All 17.4 tests passed
- [ ] All 17.5 tests passed
- [ ] Issues documented
- [ ] Report created

---

## Quick Commands

```javascript
// Check job ID in console
localStorage.getItem('process_YOUR_PROCESS_ID_jobId')

// Set invalid job ID for testing
localStorage.setItem('process_YOUR_PROCESS_ID_jobId', 'invalid_job_id')

// Clear job ID
localStorage.removeItem('process_YOUR_PROCESS_ID_jobId')

// View all localStorage
console.table(localStorage)
```

---

## Status: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Failed
