# Reviewer Search State Persistence Fix

## Problem
When clicking "Search for Reviewers" button in the Database Search step:
1. Button becomes spinning and unclickable during API call
2. If user navigates away and returns, button stops spinning even though API is still processing
3. When API completes, results don't display - instead shows button for next step
4. When re-running search after previous completion, button doesn't show spinner on navigation
5. This confuses users about the actual search status

## Root Cause
The search loading state and results weren't persisted to localStorage, so navigation caused:
- Loss of loading state indicator
- Loss of results display even after API completion
- No way to track search progress across navigation
- State-based results weren't reading from localStorage on every render
- No way to distinguish between old and new search operations

## Solution
Implemented persistent state management with search ID tracking:

### 1. Persistent Loading State
- Added `isSearchingFromStorage` computed value that reads from localStorage on every render
- Combined with mutation state: `isActuallySearching = isSearching || initiateSearchMutation.isPending || isSearchingFromStorage`
- Set `process_${processId}_isSearching` flag in localStorage when search starts
- Clear flag when search completes or errors

### 2. Search ID Tracking
- Generate unique `searchId` (timestamp) for each search operation
- Store `searchId` in localStorage when search starts
- Include `searchId` in cached results metadata
- Only clear `isSearching` flag if result `searchId` matches current search
- Prevents old results from clearing the loading state of new searches

### 3. Persistent Results Display
- Added `searchResultsFromStorage` computed value that reads from localStorage on every render
- Handles all result format variations (author_email_affiliation_preview, data.preview_reviewers, etc.)
- Created `effectiveSearchResults` that uses state results or falls back to storage
- Created `hasSearchResults` boolean for conditional rendering
- Results now display immediately when navigating back, even if state is empty

### 4. Search Completion Monitoring
- Added useEffect that polls for search completion while user is away
- Checks every 2 seconds if `isSearching` flag is true but results are now available
- Validates that result `searchId` matches current `searchId` before clearing flag
- Automatically loads results and clears searching flag when detected
- Ensures results display even if user navigates during API call

### 5. Results Persistence
- Search results cached to localStorage with metadata (searchId, timestamp)
- Enhanced loading logic to handle all result formats
- Set `searchPerformedInSession` flag to trigger results display
- Results persist across navigation and page refreshes

## Files Modified
- `src/components/search/ReviewerSearch.tsx`
  - Added `isSearchingFromStorage` computed value
  - Added `searchResultsFromStorage` computed value
  - Added `effectiveSearchResults` and `hasSearchResults` computed values
  - Added `isActuallySearching` combined state
  - Modified `handleSearch` to generate and store unique `searchId`
  - Modified `handleSearch` to include `searchId` in cached results
  - Modified search completion monitoring to validate `searchId` match
  - Updated button to use `isActuallySearching` state
  - Updated results rendering to use `effectiveSearchResults` and `hasSearchResults`

## Testing Scenarios
1. ✓ Click "Search for Reviewers" → Button shows spinner
2. ✓ Navigate away during search → Return to see spinner still active
3. ✓ Wait for API completion while on different page → Return to see results displayed
4. ✓ Results persist across navigation and page refreshes
5. ✓ Error handling clears loading state properly
6. ✓ Results display immediately when returning to page after completion
7. ✓ Re-run search after completion → Button shows spinner on navigation
8. ✓ Old results don't clear loading state of new searches

## Technical Details
- Uses localStorage key: `process_${processId}_isSearching`
- Uses localStorage key: `process_${processId}_searchId`
- Uses localStorage key: `process_${processId}_searchResults`
- Search ID is timestamp-based for uniqueness
- Polls every 2 seconds when searching flag is active
- Cleans up interval on component unmount
- Handles all result format variations from API
- Computed values read fresh data on every render (no stale cache)
- Search ID validation prevents race conditions
- Maintains backward compatibility with existing code
