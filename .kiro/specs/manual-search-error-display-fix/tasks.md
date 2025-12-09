# Implementation Plan

- [x] 1. Fix error throwing in ScholarFinderApiService





  - Update the `searchManualAuthor` method to throw proper Error instances instead of plain objects
  - Ensure the Error instance has a `message` property that React Query can access
  - Preserve the error type and details as additional properties on the Error object
  - _Requirements: 3.1_

- [ ]* 1.1 Write property test for error message preservation
  - **Property 4: Error message preservation**
  - **Validates: Requirements 3.1**

- [x] 2. Improve error handling in ManualSearch component





  - Update the catch block to handle both Error instances and plain objects
  - Extract error messages from multiple possible locations (error.message, error.error)
  - Ensure foundAuthor state is cleared when errors occur
  - Add better error message detection for "not found" and "missing" cases
  - _Requirements: 1.1, 1.5, 2.1_

- [ ]* 2.1 Write property test for API error message display
  - **Property 1: API error message display**
  - **Validates: Requirements 1.1, 2.1**

- [ ]* 2.2 Write property test for error state clearing
  - **Property 3: Error state clearing**
  - **Validates: Requirements 1.5**

- [ ]* 2.3 Write unit tests for error handling scenarios
  - Test 404 errors with various error messages are displayed
  - Test that success state is cleared when errors occur
  - Test that error messages containing "not found" or "missing" are handled correctly
  - _Requirements: 1.1, 1.5, 2.1_
-

- [x] 3. Verify toast notification styling



  - Confirm that error toasts use the destructive variant
  - Ensure toast notifications display the full error message
  - _Requirements: 1.4_

- [ ]* 3.1 Write property test for error toast styling
  - **Property 2: Error toast styling**
  - **Validates: Requirements 1.4**

- [x] 4. Test UI state management during search operations




  - Verify loading indicator appears during search
  - Verify button is disabled during search
  - Verify success feedback appears on completion
  - Verify error feedback appears and button re-enables on failure
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 4.1 Write property tests for UI state consistency
  - **Property 5: Loading indicator display**
  - **Validates: Requirements 4.1**
  - **Property 6: Button disabled during search**
  - **Validates: Requirements 4.2**
  - **Property 7: Success feedback display**
  - **Validates: Requirements 4.3**
  - **Property 8: Error feedback and button re-enable**
  - **Validates: Requirements 4.4**
-

- [x] 5. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
