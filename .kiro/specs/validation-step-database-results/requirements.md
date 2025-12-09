# Requirements Document

## Introduction

The Author Validation step currently starts validation immediately without showing users the results from the database search. Users need to see which authors were found from the database search before running validation, and have explicit control over when to start the validation process.

## Glossary

- **Author Validation Step**: The workflow step where authors are validated against conflict of interest rules and quality criteria
- **Database Search Results**: The list of potential reviewers found from searching academic databases (PubMed, ScienceDirect, etc.)
- **Run Validation Button**: A UI control that triggers the author validation API call
- **Validation API**: The `/validate_authors` endpoint that processes authors and applies validation rules

## Requirements

### Requirement 1

**User Story:** As a researcher, I want to see the database search results before running validation, so that I know which authors will be validated.

#### Acceptance Criteria

1. WHEN the validation step loads THEN the system SHALL display the list of authors from the database search
2. WHEN displaying authors THEN the system SHALL show author name, email, affiliation, and country
3. WHEN the author list is displayed THEN it SHALL be clearly labeled as "Database Search Results"
4. WHEN no authors are found THEN the system SHALL display an appropriate message
5. WHEN the author list is long THEN the system SHALL provide scrolling or pagination

### Requirement 2

**User Story:** As a researcher, I want to manually trigger the validation process, so that I have control over when validation starts.

#### Acceptance Criteria

1. WHEN the validation step loads THEN the system SHALL display a "Run Validation" button
2. WHEN the "Run Validation" button is clicked THEN the system SHALL call the validate_authors API with the job_id
3. WHEN validation is triggered THEN the button SHALL be disabled to prevent duplicate requests
4. WHEN validation starts THEN the system SHALL display a loading indicator
5. WHEN validation completes THEN the system SHALL display the validation results

### Requirement 3

**User Story:** As a researcher, I want to see validation progress and results, so that I understand what happened during validation.

#### Acceptance Criteria

1. WHEN validation is in progress THEN the system SHALL show a progress indicator
2. WHEN validation completes successfully THEN the system SHALL display the validation summary
3. WHEN validation fails THEN the system SHALL display an error message with details
4. WHEN validation results are available THEN the system SHALL show the number of authors validated
5. WHEN validation is complete THEN the system SHALL enable navigation to the next step
