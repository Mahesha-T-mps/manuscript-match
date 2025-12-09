# ScholarFinder Workflow Integration Tests

## Overview

This directory contains comprehensive integration tests for the complete ScholarFinder API workflow. The tests verify the end-to-end functionality of all 9 workflow steps, from manuscript upload to reviewer export.

## Test Files

### 1. `scholarfinder-workflow-steps1-3.integration.test.ts`
**Coverage**: Upload → Metadata Extraction → Keyword Enhancement

**Tests**:
- File upload and metadata extraction
- Job ID persistence in memory and localStorage
- Metadata retrieval using stored job_id
- Keyword enhancement workflow
- Data flow between steps 1-3
- Error handling for invalid files and job IDs

**Requirements Validated**: 1-10

### 2. `scholarfinder-workflow-steps4-5.integration.test.ts`
**Coverage**: Keyword String Generation → Database Search

**Tests**:
- Keyword string generation from selected keywords
- Database search with multiple databases
- Search results and status tracking
- Database selection validation
- Error handling for missing keywords or databases

**Requirements Validated**: 10-11

### 3. `scholarfinder-workflow-steps6-7.integration.test.ts`
**Coverage**: Manual Author Addition → Validation

**Tests**:
- Manual author search by name
- Author validation initiation
- Validation progress polling
- Validation criteria verification (8 conditions)
- Validation completion with summary
- Error handling for invalid inputs

**Requirements Validated**: 12-13

### 4. `scholarfinder-workflow-steps8-9.integration.test.ts`
**Coverage**: Recommendations Retrieval → Shortlist → Export

**Tests**:
- Recommendations retrieval with sorting by conditions_met
- Reviewer filtering by score, name, affiliation, country
- Shortlist creation and management
- CSV and JSON export generation
- Complete reviewer details verification

**Requirements Validated**: 14-16

### 5. `scholarfinder-workflow-e2e.integration.test.ts`
**Coverage**: Complete End-to-End Workflow

**Tests**:
- Full workflow from upload to export
- Job ID persistence throughout all steps
- Data consistency across transformations
- Workflow state progression
- Page refresh recovery using localStorage
- Complete workflow with filtering and export

**Requirements Validated**: All (1-18)

## Test Architecture

### Mock Server Setup
All tests use MSW (Mock Service Worker) to mock the external ScholarFinder API at `https://192.168.61.60:8000`. This allows testing without requiring the actual external API to be available.

### Key Testing Patterns

1. **Job ID Persistence Testing**
   - Verifies job_id is stored in both memory and localStorage
   - Tests retrieval after memory clear (simulating page refresh)
   - Validates job_id consistency across all workflow steps

2. **Data Flow Testing**
   - Verifies data transformations between steps
   - Ensures metadata consistency throughout workflow
   - Validates response structure at each step

3. **Error Handling Testing**
   - Tests invalid file formats and sizes
   - Validates error messages for missing required parameters
   - Verifies proper error types and retryability flags

4. **Sorting and Filtering Testing**
   - Validates reviewer sorting by conditions_met (descending)
   - Tests filtering by minimum score
   - Verifies search functionality by name, affiliation, country

## Running the Tests

### Run All Integration Tests
```bash
npm test src/test/integration/scholarfinder-workflow
```

### Run Individual Test Files
```bash
npm test src/test/integration/scholarfinder-workflow-steps1-3.integration.test.ts
npm test src/test/integration/scholarfinder-workflow-steps4-5.integration.test.ts
npm test src/test/integration/scholarfinder-workflow-steps6-7.integration.test.ts
npm test src/test/integration/scholarfinder-workflow-steps8-9.integration.test.ts
npm test src/test/integration/scholarfinder-workflow-e2e.integration.test.ts
```

## Known Issues

### Memory Constraints
When running all integration tests together, Node.js may encounter memory limitations due to:
- Multiple MSW server instances
- Large mock data sets
- Complex dependency chains in ApiService

**Workaround**: Run test files individually or increase Node.js heap size:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm test src/test/integration/scholarfinder-workflow
```

### Configuration Mocking
All test files include a mock for `../../lib/config` to avoid dependency issues:
```typescript
vi.mock('../../lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 30000,
    enableDebugLogging: false
  }
}));
```

## Test Coverage

### Workflow Steps Covered
- ✅ Step 1: Upload & Extract Metadata
- ✅ Step 2: View Metadata
- ✅ Step 3: Keyword Enhancement
- ✅ Step 4: Keyword String Generation
- ✅ Step 5: Database Search
- ✅ Step 6: Manual Author Addition
- ✅ Step 7: Author Validation
- ✅ Step 8: Get Recommendations
- ✅ Step 9: Export (CSV & JSON)

### Requirements Coverage
All 18 requirements from the requirements document are covered by these integration tests.

### Key Properties Tested
- Property 9: Job ID storage
- Property 11: Dual storage persistence
- Property 12: Job ID round-trip
- Property 13: localStorage persistence across sessions
- Property 21: Keyword enhancement API call
- Property 22: Search string generation
- Property 23: Database search initiation
- Property 24: Manual author search
- Property 25: Validation progress tracking
- Property 26: Validation score assignment
- Property 27: Reviewer sorting by score
- Property 28: Shortlist selection
- Property 29: Export format generation
- Property 30: Job ID persistence across workflow

## Maintenance

### Adding New Tests
When adding new integration tests:
1. Follow the existing file naming convention
2. Include the config mock at the top of the file
3. Use MSW for API mocking
4. Clean up localStorage and memory in `beforeEach`
5. Document which requirements are being tested

### Updating Mock Data
Mock data is defined at the top of each test file. When the API response format changes:
1. Update the corresponding mock response objects
2. Verify all tests still pass
3. Update test assertions if needed

## Related Documentation
- [Requirements Document](../../../.kiro/specs/scholarfinder-api-integration/requirements.md)
- [Design Document](../../../.kiro/specs/scholarfinder-api-integration/design.md)
- [Tasks Document](../../../.kiro/specs/scholarfinder-api-integration/tasks.md)
- [ScholarFinder API Service](../../features/scholarfinder/services/ScholarFinderApiService.ts)
