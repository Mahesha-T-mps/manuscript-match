# Implementation Plan

- [x] 1. Add scholarFinderApiUrl to config module




  - Add scholarFinderApiUrl field to AppConfig interface
  - Load from VITE_SCHOLARFINDER_API_URL environment variable with default 'http://192.168.61.60:8000'
  - Validate the URL format
  - Export the new configuration value
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Update ScholarFinderApiService to use config





  - Import config module
  - Replace hardcoded baseURL with config.scholarFinderApiUrl
  - Remove hardcoded URL
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 3.4_

- [x] 2.1 Write property test for configuration consistency


  - **Property 1: Configuration consistency**
  - **Validates: Requirements 1.1, 1.2, 2.2, 3.1**

- [x] 2.2 Write property test for configuration override preservation


  - **Property 2: Configuration override preservation**
  - **Validates: Requirements 2.3**

- [x] 2.3 Write unit tests for ScholarFinderApiService configuration


  - Test default configuration uses config.scholarFinderApiUrl
  - Test custom configuration overrides default
  - Test service instantiation succeeds
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 3. Verify the fix





  - Test file upload functionality manually
  - Verify API requests use configured URL in browser network tab
  - Confirm error messages are clear when backend is unreachable
  - _Requirements: 1.1, 1.3, 1.4, 1.5_
