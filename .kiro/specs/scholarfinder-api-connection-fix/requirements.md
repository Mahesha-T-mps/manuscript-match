# Requirements Document

## Introduction

The ScholarFinder application is experiencing connection failures when users attempt to upload manuscript files. The root cause is that the ScholarFinderApiService is using a hardcoded URL (`https://192.168.61.60:8000`) with HTTPS protocol, but the environment configuration specifies `http://192.168.61.60:8000` with HTTP protocol. Additionally, the service is not reading from the VITE_SCHOLARFINDER_API_URL environment variable. This protocol mismatch and lack of configuration integration causes connection failures and "Connection Issue" errors for users.

## Glossary

- **ScholarFinderApiService**: The service class responsible for making HTTP requests to the ScholarFinder external API endpoints
- **API Base URL**: The configurable base URL for the backend API server, stored in environment variables
- **Connection Error**: A network error that occurs when the frontend cannot establish a connection to the backend server
- **Environment Configuration**: Application settings loaded from environment variables that vary by deployment environment

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload manuscript files successfully, so that I can proceed with the reviewer search workflow.

#### Acceptance Criteria

1. WHEN a user uploads a manuscript file THEN the system SHALL use the configured API base URL from environment variables
2. WHEN the ScholarFinderApiService is initialized THEN the system SHALL default to the standard API base URL if no custom configuration is provided
3. WHEN the application is deployed to different environments THEN the system SHALL connect to the appropriate backend server based on environment configuration
4. WHEN a connection error occurs THEN the system SHALL provide clear error messages indicating the connection issue
5. WHEN the API base URL is invalid or unreachable THEN the system SHALL handle the error gracefully and inform the user

### Requirement 2

**User Story:** As a developer, I want the API service to use consistent configuration, so that the application behaves predictably across different environments.

#### Acceptance Criteria

1. WHEN the ScholarFinderApiService is created THEN the system SHALL use the same configuration pattern as the main ApiService
2. WHEN no custom API configuration is provided THEN the system SHALL use the default API base URL from the application config
3. WHEN custom API configuration is provided THEN the system SHALL merge it with default configuration values
4. WHEN the API base URL is changed THEN the system SHALL apply the change to all subsequent API requests
5. THE ScholarFinderApiService SHALL NOT contain hardcoded IP addresses or URLs

### Requirement 3

**User Story:** As a system administrator, I want to configure the API endpoints through environment variables, so that I can deploy the application to different environments without code changes.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL load the ScholarFinder API base URL from the VITE_SCHOLARFINDER_API_URL environment variable
2. WHEN the VITE_SCHOLARFINDER_API_URL is not set THEN the system SHALL use a sensible default value for local development
3. WHEN the API configuration is loaded THEN the system SHALL validate that the URL is properly formatted
4. WHEN the API base URL is configured THEN the system SHALL use it for all ScholarFinder API requests
5. THE system SHALL support both HTTP and HTTPS protocols based on the configured URL
