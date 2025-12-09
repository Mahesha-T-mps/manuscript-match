# Design Document

## Overview

This design addresses the issue where 404 error messages from the ScholarFinder API's manual author search endpoint are not being displayed to users in the UI. The error flow currently captures the error correctly at the API service layer but fails to properly propagate the specific error message through the service chain to the React component, resulting in users seeing no feedback when their search fails.

The fix involves ensuring proper error message extraction and propagation through three layers:
1. **ScholarFinderApiService** - Catches 404 errors and creates ScholarFinderError objects with the API's error message
2. **FileService** - Passes through the error without modification
3. **ManualSearch Component** - Extracts and displays the error message in a toast notification

## Architecture

### Current Error Flow

```
API (404 with error message)
  ↓
ScholarFinderApiService.searchManualAuthor()
  - Catches error
  - Creates ScholarFinderError with message from error.response.data.error
  - Throws ScholarFinderError
  ↓
FileService.searchManualAuthor()
  - Calls ScholarFinderApiService
  - Returns response.author_data on success
  - Lets errors propagate
  ↓
useAddManualAuthor hook (React Query mutation)
  - Calls fileService.searchManualAuthor()
  - Stores error in mutation.error
  ↓
ManualSearch Component
  - Accesses error via addManualAuthorMutation.error
  - Currently checks error.message?.includes('not found')
  - Issue: ScholarFinderError structure not being read correctly
```

### Proposed Error Flow

The error flow remains the same, but we need to ensure proper error message extraction at each layer:

```
API (404 with error message)
  ↓
ScholarFinderApiService.searchManualAuthor()
  - Catches 404 specifically
  - Extracts error.response.data.error
  - Throws Error with message property set correctly
  ↓
FileService.searchManualAuthor()
  - No changes needed (passes through errors)
  ↓
useAddManualAuthor hook
  - No changes needed (stores error)
  ↓
ManualSearch Component
  - Reads error.message directly
  - Displays in toast notification
```

## Components and Interfaces

### 1. ScholarFinderApiService

**Current Implementation:**
- Catches 404 errors in `searchManualAuthor()` method
- Creates ScholarFinderError object with message from `error.response?.data?.error`
- Throws the ScholarFinderError

**Required Changes:**
- Ensure the thrown error has a `message` property that React Query can access
- The current implementation creates a ScholarFinderError object, but we need to ensure it's thrown as an Error instance with the message property

### 2. FileService

**Current Implementation:**
- Calls `scholarFinderApiService.searchManualAuthor()`
- Returns `response.author_data` on success
- Lets errors propagate naturally

**Required Changes:**
- None - the service correctly propagates errors

### 3. ManualSearch Component

**Current Implementation:**
```typescript
catch (error: any) {
  if (error.message?.includes('not found')) {
    toast({
      title: "Author not found",
      description: error.message || "No author found...",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Search failed",
      description: error.message || "There was an error...",
      variant: "destructive",
    });
  }
}
```

**Required Changes:**
- Update error handling to properly extract message from ScholarFinderError structure
- Check for both `error.message` and `error.response?.data?.error` patterns
- Ensure all error paths display appropriate messages

## Data Models

### ScholarFinderError Interface

```typescript
interface ScholarFinderError {
  type: ScholarFinderErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  retryAfter?: number;
}
```

### Error Response from API

```typescript
{
  error: string;  // e.g., "Author 'John Doe' not found or missing email/affiliation."
  status_code: 404
}
```

### React Query Error Object

When React Query catches an error, it stores it in the mutation's error property. The error object structure depends on what was thrown:

```typescript
// If ScholarFinderError is thrown directly
mutation.error = {
  type: 'SEARCH_ERROR',
  message: 'Author not found...',
  details: {...},
  retryable: false
}

// If Error is thrown
mutation.error = Error {
  message: 'Author not found...',
  // ... other Error properties
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API error message display
*For any* 404 error response from the ScholarFinder API containing an error message, the system should display that exact error message to the user in a toast notification.
**Validates: Requirements 1.1, 2.1**

### Property 2: Error toast styling
*For any* error that occurs during manual search, the toast notification should use the destructive variant styling.
**Validates: Requirements 1.4**

### Property 3: Error state clearing
*For any* error that occurs, if there was previously displayed success state (foundAuthor), it should be cleared when the error is shown.
**Validates: Requirements 1.5**

### Property 4: Error message preservation
*For any* 404 error from the API, the error message from `error.response.data.error` should be preserved through the ScholarFinderApiService, FileService, and React Query layers, and be accessible in the component as `error.message`.
**Validates: Requirements 3.1**

### Property 5: Loading indicator display
*For any* manual search operation in progress, the system should display a loading indicator to the user.
**Validates: Requirements 4.1**

### Property 6: Button disabled during search
*For any* manual search operation in progress, the search button should be disabled to prevent duplicate requests.
**Validates: Requirements 4.2**

### Property 7: Success feedback display
*For any* successful manual search completion, the system should display success feedback with the author details.
**Validates: Requirements 4.3**

### Property 8: Error feedback and button re-enable
*For any* failed manual search, the system should display error feedback and re-enable the search button.
**Validates: Requirements 4.4**

## Error Handling

### Error Types

The system handles several types of errors during manual author search:

1. **404 Not Found** - Author not found or missing required information (email/affiliation)
2. **400 Bad Request** - Invalid author name (too short, empty)
3. **Timeout** - Search takes longer than 60 seconds
4. **Network Error** - Connection issues
5. **500 Server Error** - API internal errors

### Error Message Extraction

The key issue is ensuring proper error message extraction at each layer:

**ScholarFinderApiService Layer:**
```typescript
// Current implementation (lines 1089-1098)
if (error.response?.status === 404) {
  const errorMessage = error.response?.data?.error || 
    `Author '${authorName}' not found. Please try a different name or check the spelling.`;
  throw {
    type: ScholarFinderErrorType.SEARCH_ERROR,
    message: errorMessage,
    details: error.response?.data,
    retryable: false
  } as ScholarFinderError;
}
```

**Issue:** The thrown object is a plain object, not an Error instance. React Query expects Error instances.

**Solution:** Throw a proper Error instance:
```typescript
if (error.response?.status === 404) {
  const errorMessage = error.response?.data?.error || 
    `Author '${authorName}' not found. Please try a different name or check the spelling.`;
  const err = new Error(errorMessage);
  (err as any).type = ScholarFinderErrorType.SEARCH_ERROR;
  (err as any).details = error.response?.data;
  (err as any).retryable = false;
  throw err;
}
```

**Component Layer:**
```typescript
// Current implementation
catch (error: any) {
  if (error.message?.includes('not found')) {
    toast({
      title: "Author not found",
      description: error.message || "No author found...",
      variant: "destructive",
    });
  }
}
```

**Issue:** The error handling is correct, but it relies on `error.message` being set properly.

**Solution:** Ensure we handle both Error instances and plain objects:
```typescript
catch (error: any) {
  const errorMessage = error.message || error.error || "An error occurred";
  
  if (errorMessage.includes('not found') || errorMessage.includes('missing')) {
    toast({
      title: "Author not found",
      description: errorMessage,
      variant: "destructive",
    });
  } else {
    toast({
      title: "Search failed",
      description: errorMessage,
      variant: "destructive",
    });
  }
  setFoundAuthor(null);
}
```

### Error Recovery

Users can recover from errors by:
1. **Trying a different name** - If author not found, try alternative spellings
2. **Checking spelling** - Verify the author name is correct
3. **Waiting and retrying** - For timeout or network errors
4. **Contacting support** - For persistent server errors

## Testing Strategy

### Unit Tests

Unit tests will verify specific error handling scenarios:

1. **404 Error Handling**
   - Test that 404 errors with error messages are displayed correctly
   - Test that 404 errors without error messages show default message
   - Test that error messages containing author names are displayed

2. **Error State Management**
   - Test that success state is cleared when errors occur
   - Test that loading state is cleared when errors occur
   - Test that button is re-enabled after errors

3. **Toast Notifications**
   - Test that error toasts use destructive variant
   - Test that error toasts contain the correct message
   - Test that success toasts are cleared when errors occur

### Property-Based Tests

Property-based tests will verify universal behaviors across all inputs:

1. **Error Message Preservation** (Property 4)
   - Generate random error messages
   - Mock API to return 404 with those messages
   - Verify the exact message appears in the UI

2. **UI State Consistency** (Properties 5, 6, 7, 8)
   - Generate random search states (pending, success, error)
   - Verify UI elements (loading indicator, button state, feedback) match the state

3. **Error Display** (Properties 1, 2, 3)
   - Generate random error scenarios
   - Verify toast notifications appear with correct styling
   - Verify previous success state is cleared

### Integration Tests

Integration tests will verify the complete error flow:

1. **End-to-End Error Flow**
   - Mock API to return 404 with specific error message
   - Trigger manual search
   - Verify error message appears in toast
   - Verify button is re-enabled
   - Verify success state is cleared

2. **Multiple Error Scenarios**
   - Test sequence: success → error → success
   - Verify state transitions are clean
   - Verify no stale state remains

### Testing Framework

- **Unit Tests**: Vitest with React Testing Library
- **Property-Based Tests**: fast-check library for TypeScript
- **Mocking**: MSW (Mock Service Worker) for API mocking
- **Assertions**: expect from Vitest, @testing-library/jest-dom for DOM assertions

