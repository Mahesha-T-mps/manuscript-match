# Implementation Plan

## Phase 1: Core API Service Verification and Enhancement

- [x] 1. Verify and update ScholarFinderApiService configuration





  - Ensure base URL is set to https://192.168.61.60:8000
  - Verify all 9 API endpoints are implemented correctly
  - Confirm error handling covers all error types
  - Test retry logic with exponential backoff
  - _Requirements: 1.2, 6.2, 17.1, 17.2, 17.3_

- [x] 2. Add missing API endpoint if needed




  - [x] 2.1 Verify /recommended_reviewers endpoint


    - Check if current /recommendations/{jobId} matches API documentation
    - Add /recommended_reviewers endpoint if different from current implementation
    - Ensure response format matches RecommendationsResponse interface
    - _Requirements: 14.1_

  - [x] 2.2 Write property test for recommendations endpoint


    - **Property 27: Reviewer sorting by score**
    - **Validates: Requirements 14.2**

- [x] 3. Enhance fileService with all workflow methods





  - [x] 3.1 Verify all API wrapper methods exist


    - Confirm uploadFile, getMetadata, enhanceKeywords methods
    - Confirm generateKeywordString, searchDatabases methods
    - Confirm addManualAuthor, validateAuthors, getValidationStatus methods
    - Confirm getRecommendations method
    - _Requirements: 9.1, 10.1, 11.1, 12.1, 13.1, 14.1_

  - [x] 3.2 Write property test for job ID persistence


    - **Property 30: Job ID persistence across workflow**
    - **Validates: Requirements 18.2**

## Phase 2: Upload and Metadata Extraction (Steps 1-2)

- [x] 4. Update FileUpload component for success notification




  - [x] 4.1 Implement success toast notification on upload completion


    - Add toast notification call in handleFile after successful upload
    - Include file name and size in success message
    - Display "Metadata extracted successfully" message
    - _Requirements: 1.4, 4.3_

  - [x] 4.2 Write property test for success notification


    - **Property 4: Success notification on upload**
    - **Validates: Requirements 1.4**

  - [x] 4.3 Implement metadata display after upload


    - Update uploadedFile state to show file details
    - Display extracted metadata summary (title, authors, keywords)
    - Show visual success indicator (CheckCircle icon)
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 4.4 Write property test for callback invocation



    - **Property 14: Callback invocation on success**
    - **Validates: Requirements 4.1**

- [x] 5. Enhance error handling and user feedback





  - [x] 5.1 Update error messages for specific error types


    - Map FILE_FORMAT_ERROR to "Please upload a Word document (.doc, .docx)"
    - Map NETWORK_ERROR to "Network error. Please check your connection and try again."
    - Map TIMEOUT_ERROR to timeout-specific message
    - Map EXTERNAL_API_ERROR to server error message
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Write property test for error message display


    - **Property 5: Error message on failure**
    - **Validates: Requirements 1.5**

  - [x] 5.3 Implement error state reset for retry


    - Ensure upload state resets to 'idle' after error
    - Clear progress indicator after error
    - Allow user to select new file after error
    - _Requirements: 5.5_

  - [x] 5.4 Write property test for error state reset


    - **Property 17: Error state reset**
    - **Validates: Requirements 5.5**

- [x] 6. Verify DataExtraction component





  - [x] 6.1 Ensure metadata display is complete


    - Display title, authors, affiliations, keywords, abstract
    - Show author-affiliation mappings
    - Allow metadata editing if needed
    - _Requirements: 4.2, 4.5_

  - [x] 6.2 Write property test for metadata transformation


    - **Property 10: Metadata transformation**
    - **Validates: Requirements 3.2**

  - [x] 6.3 Write property test for author-affiliation preservation


    - **Property 16: Author-affiliation mapping preservation**
    - **Validates: Requirements 4.5**

## Phase 3: Keyword Enhancement (Step 3)

- [x] 7. Implement KeywordEnhancement component functionality





  - [x] 7.1 Add keyword enhancement API call


    - Create useEnhanceKeywords hook if not exists
    - Call scholarFinderApiService.enhanceKeywords with job_id
    - Handle loading, success, and error states
    - _Requirements: 9.1, 9.2_

  - [x] 7.2 Write property test for keyword enhancement


    - **Property 21: Keyword enhancement API call**
    - **Validates: Requirements 9.2**

  - [x] 7.3 Display enhanced keywords by category

    - Show MeSH terms section
    - Show broader terms section
    - Show primary focus keywords section
    - Show secondary focus keywords section
    - Show additional AI-generated keywords
    - _Requirements: 9.3_

  - [x] 7.4 Implement keyword selection UI

    - Allow multi-select for primary keywords
    - Allow multi-select for secondary keywords
    - Display selected count
    - Enable/disable generate search string button based on selection
    - _Requirements: 9.4, 10.1_

  - [x] 7.5 Write unit tests for keyword selection


    - Test keyword selection state management
    - Test enable/disable logic for generate button
    - Test selected keywords display
    - _Requirements: 9.4_

## Phase 4: Keyword String Generation (Step 4)

- [x] 8. Implement keyword string generation





  - [x] 8.1 Add generate keyword string functionality


    - Call generateKeywordString API with selected keywords
    - Display generated Boolean query string
    - Show which keywords were used (primary and secondary)
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 8.2 Write property test for search string generation


    - **Property 22: Search string generation**
    - **Validates: Requirements 10.3**

  - [x] 8.3 Handle keyword string generation errors


    - Display error message if generation fails
    - Allow retry with different keyword selection
    - _Requirements: 10.5_

  - [x] 8.4 Write unit tests for keyword string display


    - Test search string formatting
    - Test keyword usage display
    - Test error handling
    - _Requirements: 10.3, 10.4, 10.5_

## Phase 5: Database Search (Step 5)

- [x] 9. Implement ReviewerSearch component functionality





  - [x] 9.1 Add database selection UI


    - Display checkboxes for PubMed, TandFonline, ScienceDirect, WileyLibrary
    - Allow multi-select
    - Require at least one database selection
    - _Requirements: 11.1_

  - [x] 9.2 Implement database search initiation

    - Call searchDatabases API with selected databases
    - Display loading indicator during search
    - Show progress information if available
    - _Requirements: 11.2, 11.5_

  - [x] 9.3 Write property test for database search


    - **Property 23: Database search initiation**
    - **Validates: Requirements 11.3**

  - [x] 9.4 Display search results

    - Show total count of reviewers found
    - Display search status for each database (success/failed/in_progress)
    - Show preview of found reviewers
    - _Requirements: 11.3, 11.4_

  - [x] 9.5 Write unit tests for database search UI


    - Test database selection logic
    - Test search initiation
    - Test results display
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

## Phase 6: Manual Author Addition (Step 6)

- [x] 10. Implement manual author addition in AuthorValidation component





  - [x] 10.1 Add manual author search UI


    - Create input field for author name
    - Validate name is at least 2 characters
    - Add search button
    - _Requirements: 12.1_

  - [x] 10.2 Implement manual author search


    - Call addManualAuthor API with author name
    - Display loading state during search
    - Show found authors with details
    - _Requirements: 12.2, 12.3_

  - [x] 10.3 Write property test for manual author search


    - **Property 24: Manual author search**
    - **Validates: Requirements 12.3**

  - [x] 10.4 Handle author selection


    - Allow user to select author from results
    - Add selected author to potential reviewers list
    - Display confirmation message
    - _Requirements: 12.4_

  - [x] 10.5 Handle no results case


    - Display "No authors found" message
    - Suggest alternative search terms
    - _Requirements: 12.5_

  - [x] 10.6 Write unit tests for manual author addition


    - Test input validation
    - Test search functionality
    - Test author selection
    - Test no results handling
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

## Phase 7: Author Validation (Step 7)

- [x] 11. Implement author validation functionality





  - [x] 11.1 Add validation initiation


    - Create button to start validation
    - Call validateAuthors API
    - Handle validation start response
    - _Requirements: 13.1_

  - [x] 11.2 Implement validation progress polling

    - Use useValidationStatus hook with polling
    - Poll every 5 seconds while validation is in_progress
    - Stop polling when validation is completed or failed
    - _Requirements: 13.2_

  - [x] 11.3 Write property test for validation progress


    - **Property 25: Validation progress tracking**
    - **Validates: Requirements 13.2**

  - [x] 11.4 Display validation progress

    - Show progress percentage
    - Display estimated completion time
    - Show number of authors processed
    - Display validation criteria being applied
    - _Requirements: 13.2, 13.4_

  - [x] 11.5 Write property test for validation scores

    - **Property 26: Validation score assignment**
    - **Validates: Requirements 13.3**

  - [x] 11.6 Handle validation completion

    - Stop polling when completed
    - Display completion message
    - Transition to recommendations view
    - _Requirements: 13.3_

  - [x] 11.7 Handle validation errors

    - Display error message if validation fails
    - Allow retry
    - _Requirements: 13.5_

  - [x] 11.8 Write unit tests for validation workflow


    - Test validation initiation
    - Test progress polling
    - Test progress display
    - Test completion handling
    - Test error handling
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

## Phase 8: Recommendations and Shortlist (Steps 8-9)

- [x] 12. Implement ReviewerResults component functionality




  - [x] 12.1 Fetch and display recommended reviewers


    - Call getRecommendations API
    - Display all reviewers sorted by conditions_met (descending)
    - Show detailed reviewer information
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 12.2 Write property test for reviewer sorting


    - **Property 27: Reviewer sorting by score**
    - **Validates: Requirements 14.2**

  - [x] 12.3 Implement reviewer filtering

    - Add filter by minimum conditions_met score
    - Add search by name, affiliation, country
    - Update displayed reviewers based on filters
    - _Requirements: 14.4, 14.5_

  - [x] 12.4 Display reviewer details

    - Show all publication metrics
    - Display validation score (conditions_met and conditions_satisfied)
    - Show which validation criteria are satisfied
    - Display email, affiliation, city, country
    - _Requirements: 14.3_

  - [x] 12.5 Implement reviewer selection for shortlist

    - Add checkbox for each reviewer
    - Track selected reviewers
    - Display selected count
    - _Requirements: 15.1, 15.2_

  - [x] 12.6 Write property test for shortlist selection


    - **Property 28: Shortlist selection**
    - **Validates: Requirements 15.3**

  - [x] 12.7 Write unit tests for reviewer display and filtering


    - Test reviewer sorting
    - Test filtering by score
    - Test search functionality
    - Test reviewer selection
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 15.1, 15.2_

- [x] 13. Implement shortlist management





  - [x] 13.1 Create shortlist from selected reviewers


    - Save selected reviewers to shortlist
    - Display confirmation message
    - _Requirements: 15.3, 15.4_

  - [x] 13.2 Display shortlist


    - Show all shortlisted reviewers
    - Allow removal from shortlist
    - Update shortlist count
    - _Requirements: 15.5_

  - [x] 13.3 Write unit tests for shortlist management


    - Test shortlist creation
    - Test reviewer removal
    - Test shortlist display
    - _Requirements: 15.3, 15.4, 15.5_

## Phase 9: Export Functionality (Step 9)

- [x] 14. Implement export functionality




  - [x] 14.1 Add export UI


    - Create export button
    - Add format selection (CSV, JSON)
    - Display export options
    - _Requirements: 16.1_

  - [x] 14.2 Implement CSV export


    - Generate CSV file from reviewer data
    - Include all reviewer fields
    - Trigger file download
    - _Requirements: 16.2_

  - [x] 14.3 Implement JSON export


    - Generate JSON file from reviewer data
    - Include structured reviewer data
    - Trigger file download
    - _Requirements: 16.3_

  - [x] 14.4 Write property test for export generation


    - **Property 29: Export format generation**
    - **Validates: Requirements 16.2, 16.3**

  - [x] 14.5 Handle export completion


    - Display success message
    - Confirm file download
    - _Requirements: 16.4_

  - [x] 14.6 Handle export errors


    - Display error message if export fails
    - Show reason for failure
    - Allow retry
    - _Requirements: 16.5_

  - [x] 14.7 Write unit tests for export functionality


    - Test CSV generation
    - Test JSON generation
    - Test file download trigger
    - Test error handling
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

## Phase 10: Integration and End-to-End Testing

- [x] 15. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Integration testing for complete workflow





  - [x] 16.1 Write integration test for Steps 1-3 (Upload to Keywords)


    - Test upload → metadata extraction → keyword enhancement
    - Verify job_id persistence
    - Verify data flow between steps
    - _Requirements: 1-10_

  - [x] 16.2 Write integration test for Steps 4-5 (Search)

    - Test keyword string generation → database search
    - Verify search results
    - Verify database status tracking
    - _Requirements: 10-11_

  - [x] 16.3 Write integration test for Steps 6-7 (Validation)

    - Test manual author addition → validation
    - Verify validation progress polling
    - Verify validation scores
    - _Requirements: 12-13_

  - [x] 16.4 Write integration test for Steps 8-9 (Recommendations & Export)

    - Test recommendations retrieval → shortlist → export
    - Verify reviewer sorting
    - Verify export file generation
    - _Requirements: 14-16_

  - [x] 16.5 Write end-to-end workflow test

    - Test complete workflow from upload to export
    - Verify job_id persistence throughout
    - Verify all data transformations
    - Verify workflow progression
    - _Requirements: All_

- [x] 17. Manual testing with real API




  - [x] 17.1 Test upload and metadata extraction

    - Upload real .docx file
    - Verify metadata extraction
    - Verify job_id storage
    - _Requirements: 1-8_

  - [x] 17.2 Test keyword enhancement and search

    - Enhance keywords
    - Generate search string
    - Search databases
    - Verify results
    - _Requirements: 9-11_

  - [x] 17.3 Test manual author and validation

    - Add manual author
    - Initiate validation
    - Monitor validation progress
    - Verify validation completion
    - _Requirements: 12-13_

  - [x] 17.4 Test recommendations and export

    - View recommendations
    - Filter and search reviewers
    - Create shortlist
    - Export to CSV and JSON
    - _Requirements: 14-16_

  - [x] 17.5 Test error scenarios

    - Test with invalid file
    - Test with network disconnected
    - Test with invalid job_id
    - Verify error messages and recovery
    - _Requirements: 5, 17_

- [x] 18. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 11: Documentation and Cleanup

- [x] 19. Update component documentation





  - Document all workflow components
  - Add JSDoc comments to API service methods
  - Update README with workflow overview
  - _Requirements: All_

- [x] 20. Performance optimization





  - Review and optimize API calls
  - Implement proper caching strategies
  - Optimize re-renders in workflow components
  - _Requirements: All_

- [x] 21. Accessibility review





  - Ensure all components are keyboard accessible
  - Add proper ARIA labels
  - Test with screen readers
  - _Requirements: All_

## Phase 12: Manual Author Search Fix

- [x] 22. Fix ManualSearch component to use correct API endpoint









  - [x] 22.1 Add searchManualAuthor method to ScholarFinderApiService




    - Implement POST request to `/manual_authors` endpoint
    - Accept job_id as query parameter and author_name as form data
    - Use application/x-www-form-urlencoded content type
    - Handle response containing author_data with name, email, aff, city, country
    - Implement proper error handling for 404 (author not found) responses
    - Add timeout of 60 seconds for PubMed search
    - _Requirements: 12.2, 12.3_

  - [x] 22.2 Add searchManualAuthor method to fileService




    - Retrieve job_id using getJobId(processId)
    - Call scholarFinderApiService.searchManualAuthor with job_id and author_name
    - Throw error if job_id is not found
    - Return author data from API response
    - _Requirements: 12.2_

  - [x] 22.3 Create useAddManualAuthor hook




    - Create React Query mutation hook
    - Accept processId and authorName as parameters
    - Call fileService.searchManualAuthor
    - Invalidate relevant caches on success
    - Handle loading, success, and error states
    - _Requirements: 12.2_

  - [x] 22.4 Update ManualSearch component to use new API




    - Replace useSearchByName and useSearchByEmail with useAddManualAuthor
    - Update UI to have single search input for author name
    - Validate author name is at least 2 characters
    - Display loading state during search
    - Show found author details (name, email, affiliation, city, country)
    - Handle 404 error with "Author not found" message
    - Display success message when author is added
    - Clear input field after successful search
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 22.5 Add TypeScript interfaces for manual author




    - Create ManualAuthorResponse interface matching API response
    - Create ManualAuthorData interface for author_data object
    - Add interfaces to types file
    - _Requirements: 12.3_

  - [ ]* 22.6 Write property test for manual author API


    - **Property 24: Manual author search**
    - **Validates: Requirements 12.3**
    - Test that for any author name with at least 2 characters, the API returns author data
    - Test that author_data contains required fields: author, email, aff, city, country
    - Test that 404 errors are properly handled for non-existent authors

  - [ ]* 22.7 Write unit tests for ManualSearch component


    - Test input validation (minimum 2 characters)
    - Test loading state during search
    - Test success message display
    - Test error handling for author not found
    - Test input clearing after successful search
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 23. Remove obsolete search hooks and update imports







  - [x] 23.1 Remove useSearchByName and useSearchByEmail hooks




    - Delete or deprecate unused hooks from useSearch.ts
    - Ensure no other components are using these hooks
    - _Requirements: 12.2_

  - [x] 23.2 Update component imports



    - Remove imports of useSearchByName and useSearchByEmail from ManualSearch
    - Add import for useAddManualAuthor
    - Update any other affected imports
    - _Requirements: 12.2_

- [x] 24. Test manual author search with real API








  - [x] 24.1 Test successful author search



    - Search for a known author name
    - Verify author details are returned
    - Verify author is added to author_email_df_before_val.csv
    - Confirm success message is displayed
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 24.2 Test author not found scenario



    - Search for a non-existent author name
    - Verify 404 error is handled gracefully
    - Verify "Author not found" message is displayed
    - Verify user can retry with different name
    - _Requirements: 12.5_

  - [x] 24.3 Test input validation



    - Test with empty input
    - Test with 1 character input
    - Test with valid 2+ character input
    - Verify validation messages are appropriate
    - _Requirements: 12.1_

  - [x] 24.4 Test integration with validation workflow



    - Add manual author
    - Proceed to validation step
    - Verify manual author is included in validation
    - Verify manual author appears in recommendations
    - _Requirements: 12.2, 12.3, 12.4_
