# Requirements Document

## Introduction

The ScholarFinder application is experiencing two critical issues with the manual author search functionality:

1. **CORS (Cross-Origin Resource Sharing) errors**: The ScholarFinder API at `192.168.61.60:8000` is not configured to allow requests from the frontend at `http://localhost:8080`, causing all requests to be blocked by the browser's security policy.

2. **Multiple retry attempts**: When the manual author search fails, the frontend is making multiple retry attempts through React Query's default retry mechanism, even though the API service has explicitly disabled retries for this endpoint. This results in unnecessary API calls and poor user experience.

## Glossary

- **CORS (Cross-Origin Resource Sharing)**: A security mechanism that allows or restricts web applications running at one origin to access resources from a different origin
- **React Query**: A data fetching and state management library used in the frontend for managing server state
- **Mutation**: A React Query operation that modifies data on the server (POST, PUT, DELETE requests)
- **Retry Logic**: Automatic re-attempt of failed requests
- **ScholarFinder API**: The external Python API service running at `192.168.61.60:8000`
- **Frontend Origin**: The URL where the frontend application is running (`http://localhost:8080`)

## Requirements

### Requirement 1

**User Story:** As a user, I want manual author searches to work without CORS errors, so that I can add reviewers to my search results.

#### Acceptance Criteria

1. WHEN the frontend makes a request to the ScholarFinder API THEN the API SHALL include appropriate CORS headers in the response
2. WHEN the API receives a preflight OPTIONS request THEN the API SHALL respond with status 200 and appropriate CORS headers
3. WHEN the API responds to requests THEN the API SHALL include `Access-Control-Allow-Origin` header with the frontend origin
4. WHEN the API responds to requests THEN the API SHALL include `Access-Control-Allow-Methods` header with allowed HTTP methods
5. WHEN the API responds to requests THEN the API SHALL include `Access-Control-Allow-Headers` header with allowed request headers

### Requirement 2

**User Story:** As a user, I want manual author searches to fail fast without multiple retries, so that I get immediate feedback and can try a different search term.

#### Acceptance Criteria

1. WHEN a manual author search fails THEN the system SHALL NOT automatically retry the request
2. WHEN a manual author search mutation is created THEN the system SHALL configure retry to false
3. WHEN a manual author search fails THEN the system SHALL display the error message immediately to the user
4. WHEN a manual author search succeeds THEN the system SHALL display the results without delay
5. THE manual author search mutation SHALL NOT use React Query's default retry behavior

### Requirement 3

**User Story:** As a developer, I want clear error messages for CORS issues, so that I can quickly diagnose and fix configuration problems.

#### Acceptance Criteria

1. WHEN a CORS error occurs THEN the system SHALL detect it as a CORS-specific error
2. WHEN a CORS error is displayed THEN the error message SHALL indicate it is a CORS configuration issue
3. WHEN a CORS error occurs THEN the error message SHALL suggest checking the API server configuration
4. WHEN network errors occur THEN the system SHALL distinguish between CORS errors and other network errors
5. THE error handling SHALL provide actionable information for resolving CORS issues
