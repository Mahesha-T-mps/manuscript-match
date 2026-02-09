# ScholarFinder Testing Criteria

## Overview
This document provides comprehensive testing criteria for the ScholarFinder application, covering all workflow steps, features, and edge cases.

## 1. File Upload & Metadata Extraction

### ✅ Basic Upload Functionality
- [ ] Upload .doc files successfully
- [ ] Upload .docx files successfully
- [ ] Reject unsupported file formats (PDF, TXT, etc.)
- [ ] Handle file size limits (max 100MB)
- [ ] Display upload progress indicator
- [ ] Show file name and size after upload

### ✅ Metadata Extraction
- [ ] Extract manuscript title correctly
- [ ] Extract author names and affiliations
- [ ] Extract keywords from document
- [ ] Extract abstract text
- [ ] Handle documents with missing metadata gracefully
- [ ] Display extracted metadata in readable format

### ✅ Error Handling
- [ ] Show error for corrupted files
- [ ] Handle network timeouts during upload
- [ ] Display clear error messages for failed uploads
- [ ] Allow retry after failed upload

## 2. Keyword Enhancement

### ✅ AI Enhancement
- [ ] Generate enhanced keywords from manuscript content
- [ ] Provide MeSH terms suggestions
- [ ] Categorize keywords into primary and secondary
- [ ] Handle manuscripts with minimal keywords
- [ ] Show loading state during enhancement

### ✅ Keyword Management
- [ ] Select/deselect primary keywords
- [ ] Select/deselect secondary keywords
- [ ] Move keywords between primary and secondary lists
- [ ] Add custom primary keywords manually
- [ ] Add custom secondary keywords manually
- [ ] Prevent duplicate keywords across lists

### ✅ Keyword String Generation
- [ ] Generate proper Boolean search string format
- [ ] Update string when keyword selections change
- [ ] Display final keyword string clearly
- [ ] Copy keyword string to clipboard
- [ ] Edit keyword string directly
- [ ] Parse edited string back to keyword selections
- [ ] Validate keyword string format

## 3. Database Search

### ✅ Search Configuration
- [ ] Select/deselect databases (PubMed, ScienceDirect, etc.)
- [ ] Require at least one database selection
- [ ] Display database descriptions clearly
- [ ] Show keyword string from previous step

### ✅ Search Query Editing
- [ ] Edit search query directly in database search step
- [ ] Save edited search query
- [ ] Cancel search query edits
- [ ] Reset to original keyword string
- [ ] Show "Edited" indicator for modified queries
- [ ] Use edited query for database search

### ✅ Search Execution
- [ ] Initiate database search successfully
- [ ] Handle long-running searches (20-30 minutes)
- [ ] Show search progress/status
- [ ] Handle search timeouts gracefully
- [ ] Display search completion notification

### ✅ Results Display
- [ ] Show search results table when available
- [ ] Display reviewer names, emails, affiliations
- [ ] Show city and country information
- [ ] Handle empty search results gracefully
- [ ] Show "No authors data found" message when appropriate
- [ ] Persist results when navigating between steps

### ✅ Navigation Logic
- [ ] Show cached results when coming from later steps
- [ ] Clear results when coming from earlier steps
- [ ] Maintain results during step navigation

## 4. Manual Author Search

### ✅ Author Search Functionality
- [ ] Search for authors by name (minimum 2 characters)
- [ ] Display author information from PubMed
- [ ] Show author affiliation and contact details
- [ ] Handle authors not found in database
- [ ] Display search suggestions for failed searches

### ✅ Duplicate Call Prevention
- [ ] Prevent duplicate API calls on rapid clicking
- [ ] Block form submission during ongoing search
- [ ] Show loading state during search
- [ ] Handle network errors gracefully

### ✅ Search Results Display
- [ ] Show found author information clearly
- [ ] Display email, affiliation, country when available
- [ ] Show "Limited information available" warnings
- [ ] Handle missing author data gracefully

## 5. Author Validation

### ✅ Validation Process
- [ ] Initiate author validation successfully
- [ ] Prevent duplicate validation calls
- [ ] Show validation progress with percentage
- [ ] Display estimated completion time
- [ ] Handle long-running validation (up to 1 hour)

### ✅ Progress Tracking
- [ ] Show number of authors processed
- [ ] Display validation criteria being applied
- [ ] Update progress percentage in real-time
- [ ] Show validation status (in_progress, completed, failed)

### ✅ Validation Results
- [ ] Display validation completion notification
- [ ] Show validation statistics (authors processed, criteria applied)
- [ ] Display validated reviewers with scores
- [ ] Show conditions met for each reviewer
- [ ] Handle validation failures gracefully

### ✅ Duplicate Prevention
- [ ] Prevent multiple validation starts
- [ ] Block validation button during process
- [ ] Handle component re-renders properly
- [ ] Maintain validation state across navigation

## 6. Recommendations & Results

### ✅ Recommendations Display
- [ ] Load recommended reviewers after validation
- [ ] Sort reviewers by conditions met (highest first)
- [ ] Display reviewer details (name, email, affiliation)
- [ ] Show validation scores and criteria met
- [ ] Handle empty recommendations gracefully

### ✅ Results Management
- [ ] Navigate between validation and recommendations
- [ ] Maintain results across step changes
- [ ] Load cached results when returning to steps
- [ ] Handle API errors for recommendations

## 7. Shortlist Management

### ✅ Shortlist Creation
- [ ] Create new shortlists from validated reviewers
- [ ] Add reviewers to existing shortlists
- [ ] Remove reviewers from shortlists
- [ ] Handle empty shortlists appropriately

### ✅ Shortlist Display
- [ ] Show available reviewers for shortlisting
- [ ] Display shortlist contents clearly
- [ ] Allow shortlist modifications
- [ ] Export shortlist data

## 8. Navigation & State Management

### ✅ Step Navigation
- [ ] Navigate forward through workflow steps
- [ ] Navigate backward to previous steps
- [ ] Maintain progress across step changes
- [ ] Show current step clearly in tracker

### ✅ State Persistence
- [ ] Save workflow progress automatically
- [ ] Restore state when returning to steps
- [ ] Handle browser refresh gracefully
- [ ] Clear appropriate data when going backward

### ✅ Progress Tracking
- [ ] Show completed steps in step tracker
- [ ] Indicate current active step
- [ ] Allow clicking on completed steps
- [ ] Prevent skipping required steps

## 9. Error Handling & Edge Cases

### ✅ Network Issues
- [ ] Handle API timeouts gracefully
- [ ] Show appropriate error messages
- [ ] Allow retry for failed operations
- [ ] Maintain user data during errors

### ✅ Data Validation
- [ ] Validate file formats before upload
- [ ] Validate keyword string formats
- [ ] Validate required fields
- [ ] Show clear validation error messages

### ✅ Edge Cases
- [ ] Handle empty search results
- [ ] Manage very large result sets
- [ ] Handle special characters in names/keywords
- [ ] Process documents with minimal content

## 10. User Experience

### ✅ Loading States
- [ ] Show loading indicators for all async operations
- [ ] Display progress bars for long operations
- [ ] Provide estimated completion times
- [ ] Allow cancellation of long operations where appropriate

### ✅ Feedback & Notifications
- [ ] Show success messages for completed actions
- [ ] Display error messages clearly
- [ ] Provide helpful guidance for next steps
- [ ] Show progress saved notifications

### ✅ Accessibility
- [ ] Keyboard navigation works properly
- [ ] Screen reader compatibility
- [ ] Proper ARIA labels and descriptions
- [ ] Color contrast meets standards

## 11. Performance

### ✅ Response Times
- [ ] File upload completes within reasonable time
- [ ] Keyword enhancement responds quickly
- [ ] Search results load efficiently
- [ ] Navigation between steps is smooth

### ✅ Resource Management
- [ ] Handle large files without memory issues
- [ ] Manage API rate limits properly
- [ ] Cache results appropriately
- [ ] Clean up resources when not needed

## 12. Security

### ✅ Data Protection
- [ ] Secure file upload handling
- [ ] Protect sensitive author information
- [ ] Validate all user inputs
- [ ] Prevent injection attacks

### ✅ Authentication
- [ ] Require proper authentication
- [ ] Handle session expiration
- [ ] Protect API endpoints
- [ ] Validate user permissions

## Testing Scenarios

### Happy Path Testing
1. **Complete Workflow**: Upload → Metadata → Keywords → Search → Manual → Validation → Recommendations → Shortlist
2. **Keyword Editing**: Enhance keywords → Edit string → Search with edited query
3. **Result Navigation**: Complete search → Navigate away → Return to see cached results

### Error Path Testing
1. **Upload Failures**: Invalid files, network errors, large files
2. **Search Failures**: No databases selected, invalid queries, API timeouts
3. **Validation Failures**: Network issues, API errors, timeout handling

### Edge Case Testing
1. **Empty Results**: No search results, no validation results
2. **Navigation Edge Cases**: Rapid navigation, browser refresh, back button
3. **Concurrent Operations**: Multiple searches, duplicate validations

### Performance Testing
1. **Large Files**: Test with maximum file sizes
2. **Long Operations**: Test validation with many authors
3. **Heavy Usage**: Multiple concurrent users, rapid operations

## Test Data Requirements

### Sample Documents
- [ ] Small manuscript (.doc, .docx)
- [ ] Large manuscript (near size limit)
- [ ] Document with minimal metadata
- [ ] Document with extensive keywords
- [ ] Corrupted/invalid files for error testing

### Test Keywords
- [ ] Medical/biomedical terms
- [ ] Engineering/technical terms
- [ ] Interdisciplinary keywords
- [ ] Special characters and symbols

### Expected Results
- [ ] Known authors in databases
- [ ] Authors with complete information
- [ ] Authors with limited information
- [ ] Non-existent authors for error testing

## Automation Considerations

### Unit Tests
- [ ] Keyword parsing functions
- [ ] Search string generation
- [ ] Data validation functions
- [ ] State management logic

### Integration Tests
- [ ] API endpoint interactions
- [ ] File upload workflows
- [ ] Database search processes
- [ ] Validation workflows

### End-to-End Tests
- [ ] Complete workflow scenarios
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Performance benchmarks

---

## Notes for Testers

1. **Test Environment**: Ensure proper API endpoints and test data
2. **Browser Testing**: Test on Chrome, Firefox, Safari, Edge
3. **Device Testing**: Desktop, tablet, mobile devices
4. **Network Conditions**: Test on slow/fast connections
5. **Data Cleanup**: Clear cache/localStorage between test runs

This comprehensive testing criteria ensures all aspects of the ScholarFinder application are thoroughly validated before deployment.