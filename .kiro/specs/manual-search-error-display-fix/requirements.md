# Requirements Document

## Introduction

The Manual Search feature in the ScholarFinder workflow allows users to search for specific reviewers by name. When the external API returns a 404 error indicating that an author was not found or is missing required information (email/affiliation), this error message is not being displayed to the user in the UI. The error is being caught and logged, but the user sees no feedback about what went wrong, leading to confusion and a poor user experience.

## Glossary

- **Manual Search**: A feature that allows users to search for specific academic authors by name to add them as potential reviewers
- **ScholarFinder API**: The external AWS Lambda API that provides author search functionality via PubMed
- **404 Error**: An HTTP status code indicating that the requested resource (in this case, author information) was not found
- **Error Message**: User-facing text that explains what went wrong and suggests corrective actions
- **Toast Notification**: A temporary UI notification that appears to inform users of success or error states

## Requirements

### Requirement 1

**User Story:** As a researcher using manual search, I want to see clear error messages when an author is not found, so that I understand why my search failed and can take appropriate action.

#### Acceptance Criteria

1. WHEN the ScholarFinder API returns a 404 error with an error message THEN the system SHALL display that error message to the user
2. WHEN an author is not found due to missing email or affiliation THEN the system SHALL display a message indicating the specific missing information
3. WHEN an author name returns no results THEN the system SHALL suggest trying alternative spellings or different name formats
4. WHEN an error message is displayed THEN it SHALL appear in a toast notification with destructive variant styling
5. WHEN an error occurs THEN the system SHALL clear any previously displayed success messages

### Requirement 2

**User Story:** As a researcher, I want error messages to be informative and actionable, so that I can quickly resolve issues and continue my work.

#### Acceptance Criteria

1. WHEN an error message is displayed THEN it SHALL include the specific reason for failure from the API
2. WHEN the API error contains the author name THEN the system SHALL include it in the displayed message
3. WHEN an error occurs THEN the message SHALL be written in clear, non-technical language
4. WHEN displaying errors THEN the system SHALL maintain consistent formatting across all error types
5. WHEN an error is shown THEN it SHALL remain visible long enough for users to read and understand it

### Requirement 3

**User Story:** As a developer, I want proper error propagation from the API layer to the UI layer, so that all error information reaches the user interface correctly.

#### Acceptance Criteria

1. WHEN the ScholarFinder API throws a 404 error THEN the error object SHALL preserve the original error message from the API response
2. WHEN an error is caught in the service layer THEN it SHALL be re-thrown with the correct error type and message
3. WHEN an error propagates through the hook layer THEN the error message SHALL remain intact and accessible
4. WHEN the component receives an error THEN it SHALL extract and display the error message correctly
5. WHEN error handling occurs THEN the system SHALL log detailed error information for debugging purposes

### Requirement 4

**User Story:** As a researcher, I want the UI to provide visual feedback during all stages of the search process, so that I know the system is working and can see when errors occur.

#### Acceptance Criteria

1. WHEN a search is initiated THEN the system SHALL display a loading indicator
2. WHEN a search is in progress THEN the search button SHALL be disabled to prevent duplicate requests
3. WHEN a search completes successfully THEN the system SHALL display success feedback with author details
4. WHEN a search fails THEN the system SHALL display error feedback and re-enable the search button
5. WHEN transitioning between states THEN the UI SHALL clear previous state indicators before showing new ones
