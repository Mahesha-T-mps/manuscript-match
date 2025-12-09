# Requirements Document

## Introduction

This document specifies the requirements for integrating the complete ScholarFinder API workflow into the application. The system shall enable users to upload manuscripts, extract and enhance metadata, search academic databases for potential reviewers, validate reviewers against conflict of interest rules, and generate final reviewer recommendations. The workflow consists of 9 steps: Upload & Extract, Metadata Extraction, Keyword Enhancement, Keyword String Generation, Database Search, Manual Author Addition, Author Validation, Recommendations, and Export.

## Glossary

- **Manuscript**: A Word document (.doc or .docx) containing academic research content
- **Metadata**: Structured information extracted from the manuscript including title, authors, affiliations, keywords, and abstract
- **Job ID**: A unique identifier assigned to each upload operation for tracking throughout the entire workflow
- **MeSH Terms**: Medical Subject Headings used for indexing biomedical literature
- **Keyword Enhancement**: AI-powered process to generate additional relevant keywords
- **Search String**: Formatted Boolean query string used for database searches
- **Reviewer**: A potential peer reviewer identified through database searches
- **Validation**: Process of checking reviewers against conflict of interest and publication criteria
- **Conditions Met**: Score from 0-8 indicating how many validation criteria a reviewer satisfies
- **Shortlist**: Final curated list of recommended reviewers
- **API Service**: The service layer that communicates with the external ScholarFinder API
- **Process**: A workflow instance that tracks the manuscript review process from upload to reviewer recommendation

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload a Word document manuscript, so that the system can extract metadata and begin the reviewer search process.

#### Acceptance Criteria

1. WHEN a user selects a Word document file (.doc or .docx) THEN the Upload Component SHALL validate the file format before upload
2. WHEN a user uploads a valid manuscript file THEN the Upload Component SHALL send the file to the API endpoint at https://192.168.61.60:8000/upload_extract_metadata
3. WHEN the file upload completes successfully THEN the Upload Component SHALL receive a response containing job_id, file_name, timestamp, heading, authors, affiliations, keywords, abstract, and author_aff_map
4. WHEN the API returns a successful response THEN the Upload Component SHALL display a success notification to the user
5. WHEN the API returns an error response THEN the Upload Component SHALL display an appropriate error message to the user

### Requirement 2

**User Story:** As a user, I want to see upload progress while my file is being processed, so that I know the system is working and how long I need to wait.

#### Acceptance Criteria

1. WHEN a file upload begins THEN the Upload Component SHALL display a progress indicator showing upload status
2. WHILE the file is uploading THEN the Upload Component SHALL update the progress indicator to reflect current upload percentage
3. WHEN the upload reaches 100% THEN the Upload Component SHALL change the status to "processing" while metadata extraction occurs
4. WHEN metadata extraction completes THEN the Upload Component SHALL change the status to "completed"
5. IF the upload or extraction fails THEN the Upload Component SHALL change the status to "error" and display the error message

### Requirement 3

**User Story:** As a user, I want the extracted metadata to be stored and associated with my process, so that I can review and use it in subsequent workflow steps.

#### Acceptance Criteria

1. WHEN the API returns extracted metadata THEN the API Service SHALL store the job_id associated with the process_id
2. WHEN metadata is received THEN the API Service SHALL transform the API response into the application's internal metadata format
3. WHEN the job_id is stored THEN the API Service SHALL persist it to both memory and localStorage for retrieval
4. WHEN subsequent workflow steps need metadata THEN the API Service SHALL retrieve the job_id using the process_id
5. WHEN the user navigates away and returns THEN the API Service SHALL restore the job_id from localStorage

### Requirement 4

**User Story:** As a user, I want to see the extracted metadata displayed after upload, so that I can verify the information was correctly extracted from my manuscript.

#### Acceptance Criteria

1. WHEN metadata extraction completes successfully THEN the Upload Component SHALL trigger the onFileUpload callback with the extracted metadata
2. WHEN the parent component receives the upload response THEN the parent component SHALL display the extracted title, authors, affiliations, keywords, and abstract
3. WHEN the metadata is displayed THEN the Upload Component SHALL show a summary including file name and file size
4. WHEN the user views the metadata THEN the Upload Component SHALL provide a visual indication that the file was successfully uploaded
5. IF the metadata contains author-affiliation mappings THEN the Upload Component SHALL preserve these relationships for display

### Requirement 5

**User Story:** As a user, I want clear error messages when upload fails, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the file format is invalid THEN the Upload Component SHALL display an error message stating "Please upload a PDF or Word document (.pdf, .doc, .docx)"
2. WHEN the file size exceeds 100MB THEN the Upload Component SHALL display an error message stating the file size limit
3. WHEN a network error occurs THEN the Upload Component SHALL display an error message indicating connection issues
4. WHEN the API returns a server error THEN the Upload Component SHALL display an error message suggesting the user try again later
5. WHEN any error occurs THEN the Upload Component SHALL reset the upload state to allow the user to retry

### Requirement 6

**User Story:** As a developer, I want the upload integration to use the existing API service architecture, so that the code is maintainable and consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN implementing the upload feature THEN the Upload Component SHALL use the existing scholarFinderApiService for API communication
2. WHEN making API calls THEN the API Service SHALL use the configured base URL https://192.168.61.60:8000
3. WHEN handling errors THEN the API Service SHALL use the existing error handling and transformation logic
4. WHEN the upload completes THEN the API Service SHALL invalidate relevant React Query caches to trigger data refetch
5. WHEN storing the job_id THEN the API Service SHALL use the existing fileService.setJobId method

### Requirement 7

**User Story:** As a user, I want to be able to cancel an upload in progress, so that I can stop the operation if I selected the wrong file.

#### Acceptance Criteria

1. WHILE a file is uploading THEN the Upload Component SHALL display a cancel button
2. WHEN the user clicks the cancel button THEN the Upload Component SHALL abort the upload request
3. WHEN an upload is cancelled THEN the Upload Component SHALL reset the upload state to idle
4. WHEN an upload is cancelled THEN the Upload Component SHALL clear the progress indicator
5. WHEN an upload is cancelled THEN the Upload Component SHALL not display an error message

### Requirement 8

**User Story:** As a user, I want to remove an uploaded file and start over, so that I can upload a different manuscript if needed.

#### Acceptance Criteria

1. WHEN a file has been successfully uploaded THEN the Upload Component SHALL display a remove button
2. WHEN the user clicks the remove button THEN the Upload Component SHALL clear the uploaded file from the display
3. WHEN the file is removed THEN the Upload Component SHALL reset to the initial upload state
4. WHEN the file is removed THEN the Upload Component SHALL allow the user to upload a new file
5. WHEN the file is removed THEN the Upload Component SHALL not delete the job_id or metadata from storage

### Requirement 9

**User Story:** As a user, I want to enhance my manuscript keywords with AI-generated suggestions, so that I can find more relevant potential reviewers.

#### Acceptance Criteria

1. WHEN the user requests keyword enhancement THEN the system SHALL send the job_id to the keyword enhancement API endpoint
2. WHEN keyword enhancement completes THEN the system SHALL receive MeSH terms, broader terms, primary focus keywords, and secondary focus keywords
3. WHEN enhanced keywords are received THEN the system SHALL display them organized by category (MeSH, primary, secondary)
4. WHEN the user views enhanced keywords THEN the system SHALL allow selection of keywords for search string generation
5. WHEN keyword enhancement fails THEN the system SHALL display an error message and allow retry

### Requirement 10

**User Story:** As a user, I want to generate a formatted search string from selected keywords, so that I can search academic databases effectively.

#### Acceptance Criteria

1. WHEN the user selects primary and secondary keywords THEN the system SHALL enable the generate search string action
2. WHEN the user generates a search string THEN the system SHALL send selected keywords to the keyword string generator API
3. WHEN the search string is generated THEN the system SHALL receive a formatted Boolean query string
4. WHEN the search string is displayed THEN the system SHALL show which keywords were used (primary and secondary)
5. WHEN search string generation fails THEN the system SHALL display an error message with the reason

### Requirement 11

**User Story:** As a user, I want to search multiple academic databases for potential reviewers, so that I can find experts in my research area.

#### Acceptance Criteria

1. WHEN the user initiates database search THEN the system SHALL allow selection of databases (PubMed, TandFonline, ScienceDirect, WileyLibrary)
2. WHEN databases are selected THEN the system SHALL send the search request with job_id and selected databases
3. WHEN the search completes THEN the system SHALL receive the total count of reviewers found and search status for each database
4. WHEN search results are available THEN the system SHALL display a preview of found reviewers with their details
5. WHILE the search is in progress THEN the system SHALL display a loading indicator with progress information

### Requirement 12

**User Story:** As a user, I want to manually add specific authors as potential reviewers, so that I can include experts I know who may not appear in database searches.

#### Acceptance Criteria

1. WHEN the user enters an author name THEN the system SHALL validate the name is at least 2 characters long
2. WHEN a valid author name is submitted THEN the system SHALL send the name to the manual author addition API
3. WHEN the API finds matching authors THEN the system SHALL display all found authors with their affiliations and publication counts
4. WHEN the user selects an author from results THEN the system SHALL add that author to the potential reviewers list
5. WHEN no authors are found THEN the system SHALL display a message indicating no matches were found

### Requirement 13

**User Story:** As a user, I want to validate potential reviewers against conflict of interest rules, so that I can ensure reviewer recommendations are appropriate.

#### Acceptance Criteria

1. WHEN the user initiates validation THEN the system SHALL send all potential reviewers to the validation API
2. WHILE validation is in progress THEN the system SHALL display progress percentage and estimated completion time
3. WHEN validation completes THEN the system SHALL receive validation scores (conditions_met 0-8) for each reviewer
4. WHEN validation results are displayed THEN the system SHALL show which of the 8 validation criteria each reviewer satisfies
5. IF validation fails THEN the system SHALL display an error message and allow retry

### Requirement 14

**User Story:** As a user, I want to view recommended reviewers sorted by validation score, so that I can identify the most suitable candidates.

#### Acceptance Criteria

1. WHEN validation completes THEN the system SHALL retrieve the complete list of validated reviewers
2. WHEN reviewers are displayed THEN the system SHALL sort them by conditions_met score in descending order
3. WHEN viewing a reviewer THEN the system SHALL display all reviewer details including publications, affiliation, country, and validation score
4. WHEN the user filters reviewers THEN the system SHALL allow filtering by minimum conditions_met score
5. WHEN the user searches reviewers THEN the system SHALL allow searching by name, affiliation, or country

### Requirement 15

**User Story:** As a user, I want to create a shortlist of selected reviewers, so that I can finalize my reviewer recommendations.

#### Acceptance Criteria

1. WHEN viewing recommended reviewers THEN the system SHALL allow selection of multiple reviewers for shortlist
2. WHEN reviewers are selected THEN the system SHALL display the count of selected reviewers
3. WHEN the user creates a shortlist THEN the system SHALL save the selected reviewers to the shortlist
4. WHEN the shortlist is created THEN the system SHALL display a confirmation message
5. WHEN viewing the shortlist THEN the system SHALL allow removal of reviewers from the shortlist

### Requirement 16

**User Story:** As a user, I want to export my final reviewer recommendations, so that I can use them outside the application.

#### Acceptance Criteria

1. WHEN the user requests export THEN the system SHALL allow selection of export format (CSV or JSON)
2. WHEN CSV export is selected THEN the system SHALL generate a CSV file with all reviewer details
3. WHEN JSON export is selected THEN the system SHALL generate a JSON file with structured reviewer data
4. WHEN export is complete THEN the system SHALL trigger a file download
5. WHEN export fails THEN the system SHALL display an error message with the reason

### Requirement 17

**User Story:** As a developer, I want all API endpoints to use consistent error handling, so that errors are handled uniformly across the application.

#### Acceptance Criteria

1. WHEN any API call fails THEN the system SHALL transform the error into a ScholarFinderError with type and message
2. WHEN a network error occurs THEN the system SHALL retry the request up to 3 times with exponential backoff
3. WHEN a server error (5xx) occurs THEN the system SHALL retry the request with exponential backoff
4. WHEN a client error (4xx) occurs THEN the system SHALL not retry and SHALL display the error to the user
5. WHEN an error is displayed THEN the system SHALL provide actionable guidance on how to resolve it

### Requirement 18

**User Story:** As a user, I want the job_id to persist throughout the entire workflow, so that all my data remains associated with my manuscript.

#### Acceptance Criteria

1. WHEN a manuscript is uploaded THEN the system SHALL store the job_id in both memory and localStorage
2. WHEN any subsequent API call is made THEN the system SHALL retrieve the job_id using the process_id
3. WHEN the user refreshes the page THEN the system SHALL restore the job_id from localStorage
4. WHEN the job_id is missing THEN the system SHALL display an error message prompting the user to upload a manuscript
5. WHEN multiple processes exist THEN the system SHALL maintain separate job_id mappings for each process
