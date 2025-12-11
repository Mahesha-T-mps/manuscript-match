# Requirements Document

## Introduction

The ScholarFinder application's validation step in the workflow process needs to properly integrate with the validate_authors API endpoint. Currently, the "Validate Authors" button in the workflow progress calls the API but has implementation issues with job ID handling and API parameter formatting. The validation step should correctly call the validate_authors endpoint with the job_id as a query parameter and provide proper user feedback during the validation process.

## Glossary

- **Validation Step**: The workflow step where authors are validated against conflict rules and criteria
- **Job ID**: A unique identifier for the manuscript processing job, obtained from the file upload response
- **Validate Authors API**: The `/validate_authors` endpoint that processes author validation with job_id as query parameter
- **Process Workflow**: The main workflow component that manages the manuscript analysis process steps
- **ScholarFinder API Service**: The service class that handles communication with external ScholarFinder APIs

## Requirements

### Requirement 1

**User Story:** As a user, I want to validate authors by clicking the "Validate Authors" button, so that I can ensure reviewers meet the required criteria before proceeding.

#### Acceptance Criteria

1. WHEN a user clicks the "Validate Authors" button THEN the system SHALL call the validate_authors API endpoint
2. WHEN calling the validate_authors API THEN the system SHALL pass the job_id as a query parameter
3. WHEN the validation request is made THEN the system SHALL use the correct job_id associated with the current process
4. WHEN the validation starts THEN the system SHALL display a loading state to indicate processing is in progress
5. WHEN the validation completes successfully THEN the system SHALL display a success message to the user

### Requirement 2

**User Story:** As a user, I want clear feedback during the validation process, so that I understand the current status and can wait appropriately for completion.

#### Acceptance Criteria

1. WHEN validation is initiated THEN the system SHALL disable the "Validate Authors" button to prevent duplicate requests
2. WHEN validation is in progress THEN the system SHALL show a loading indicator with appropriate text
3. WHEN validation fails THEN the system SHALL display a clear error message explaining the failure
4. WHEN validation succeeds THEN the system SHALL re-enable user interactions and show success feedback
5. WHEN validation completes THEN the system SHALL allow the user to proceed to the next workflow step

### Requirement 3

**User Story:** As a developer, I want proper job ID retrieval and API parameter formatting, so that the validation request is sent correctly to the external API.

#### Acceptance Criteria

1. WHEN retrieving the job ID THEN the system SHALL use the job ID from the current process's upload response
2. WHEN making the API request THEN the system SHALL format the job_id as a query parameter in the URL (matching Python API expectation: `job_id: str = Query(...)`)
3. WHEN the API call fails due to missing job ID THEN the system SHALL display an appropriate error message
4. WHEN the API call fails due to network issues THEN the system SHALL provide retry guidance to the user
5. THE validation API call SHALL follow the same error handling patterns as other ScholarFinder API calls

### Requirement 4

**User Story:** As a user, I want the validation step to integrate seamlessly with the workflow, so that I can progress through all steps without confusion.

#### Acceptance Criteria

1. WHEN validation completes successfully THEN the system SHALL allow progression to the next workflow step
2. WHEN validation is in progress THEN the system SHALL prevent navigation away from the validation step
3. WHEN validation fails THEN the system SHALL keep the user on the validation step for retry
4. WHEN the user returns to the validation step THEN the system SHALL show the current validation status
5. THE validation step SHALL maintain consistency with other workflow step behaviors and UI patterns