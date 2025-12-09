# ScholarFinder API Integration Workflow

This document provides a comprehensive overview of the complete ScholarFinder API integration workflow, from manuscript upload to reviewer recommendation export.

## Table of Contents

1. [Overview](#overview)
2. [Workflow Steps](#workflow-steps)
3. [Architecture](#architecture)
4. [Components](#components)
5. [API Integration](#api-integration)
6. [Data Flow](#data-flow)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Configuration](#configuration)

## Overview

The ScholarFinder workflow is a 9-step process that helps researchers find suitable peer reviewers for their manuscripts. The system integrates with an external ScholarFinder API hosted at `https://192.168.61.60:8000` to provide AI-powered keyword enhancement, multi-database search, and automated reviewer validation.

### Key Features

- **Automated Metadata Extraction**: Extracts title, authors, affiliations, keywords, and abstract from Word documents
- **AI-Powered Keyword Enhancement**: Generates MeSH terms, broader terms, and focused keywords
- **Multi-Database Search**: Searches PubMed, TandFonline, ScienceDirect, and WileyLibrary
- **Manual Author Addition**: Allows adding specific reviewers by name
- **Automated Validation**: Validates reviewers against conflict of interest rules
- **Smart Recommendations**: Sorts reviewers by validation score (0-8 conditions met)
- **Flexible Export**: Export recommendations in CSV or JSON format

### Workflow Duration

- **Upload & Extraction**: 10-30 seconds
- **Keyword Enhancement**: 15-45 seconds
- **Database Search**: 2-5 minutes
- **Author Validation**: 3-10 minutes
- **Total Time**: Approximately 10-20 minutes for complete workflow

## Workflow Steps

### Step 1: Upload & Extract Metadata

**Component**: `FileUpload`

Users upload a Word document (.doc or .docx) containing their manuscript. The system:
- Validates file format and size (max 100MB)
- Uploads file to external API
- Extracts metadata (title, authors, affiliations, keywords, abstract)
- Generates unique job_id for tracking

**API Endpoint**: `POST /upload_extract_metadata`

**User Actions**:
- Select or drag-and-drop Word document
- Wait for upload and extraction to complete
- Review extracted metadata

**Success Criteria**:
- File uploaded successfully
- Metadata extracted and displayed
- job_id stored for subsequent steps

### Step 2: Review Metadata

**Component**: `DataExtraction`

Users review and optionally edit the extracted metadata:
- Title and abstract
- Author names and affiliations
- Initial keywords
- Author-affiliation mappings

**API Endpoint**: `GET /metadata_extraction?job_id={jobId}`

**User Actions**:
- Review extracted information
- Edit any incorrect data
- Confirm metadata accuracy

**Success Criteria**:
- All metadata fields populated
- Author-affiliation mappings preserved
- Ready for keyword enhancement

### Step 3: Enhance Keywords

**Component**: `KeywordEnhancement`

The system uses AI to enhance the initial keywords:
- **MeSH Terms**: Medical Subject Headings for biomedical literature
- **Broader Terms**: General terms encompassing the research area
- **Primary Focus**: Core keywords directly related to main topic
- **Secondary Focus**: Supporting keywords for context

**API Endpoint**: `POST /keyword_enhancement?job_id={jobId}`

**User Actions**:
- Trigger keyword enhancement
- Review enhanced keywords by category
- Select primary and secondary keywords for search

**Success Criteria**:
- Enhanced keywords generated
- Keywords organized by category
- User selects relevant keywords

### Step 4: Generate Search String

**Component**: `KeywordEnhancement`

The system generates a formatted Boolean query string from selected keywords:
- Combines primary keywords with OR operator
- Combines secondary keywords with OR operator
- Joins primary and secondary groups with AND operator
- Optimizes for database-specific syntax

**API Endpoint**: `POST /keyword_string_generator?job_id={jobId}`

**Example Output**:
```
(climate change OR global warming OR temperature rise) AND (biodiversity OR species diversity OR habitat loss)
```

**User Actions**:
- Review generated search string
- Verify keywords used
- Proceed to database search

**Success Criteria**:
- Search string generated successfully
- Boolean operators properly placed
- Ready for database search

### Step 5: Search Databases

**Component**: `ReviewerSearch`

The system searches multiple academic databases for potential reviewers:
- **PubMed**: Biomedical and life sciences literature
- **TandFonline**: Taylor & Francis journals
- **ScienceDirect**: Elsevier journals
- **WileyLibrary**: Wiley journals

**API Endpoint**: `POST /database_search?job_id={jobId}`

**User Actions**:
- Select databases to search
- Initiate search
- Monitor search progress
- View search results summary

**Success Criteria**:
- At least one database searched successfully
- Reviewers found and counted
- Search status tracked per database

### Step 6: Add Manual Authors (Optional)

**Component**: `AuthorValidation`

Users can manually add specific authors as potential reviewers:
- Search by author name (minimum 2 characters)
- View found authors with details
- Select authors to add to reviewer pool

**API Endpoint**: `POST /manual_authors?job_id={jobId}`

**User Actions**:
- Enter author name
- Review search results
- Select authors to add
- Confirm additions

**Success Criteria**:
- Authors found by name
- Selected authors added to pool
- Ready for validation

### Step 7: Validate Authors

**Component**: `AuthorValidation`

The system validates all potential reviewers against 8 conflict of interest criteria:

1. **Publications (last 10 years) ≥ 8**: Ensures reviewer has recent publication record
2. **Relevant Publications (last 5 years) ≥ 3**: Confirms expertise in relevant area
3. **Publications (last 2 years) ≥ 1**: Verifies current research activity
4. **English Publications > 50%**: Ensures language compatibility
5. **No Coauthorship**: Checks for co-authorship with manuscript authors
6. **Different Affiliation**: Verifies no institutional conflicts
7. **Same Country**: Optionally matches reviewer country with manuscript
8. **No Retracted Publications**: Ensures research integrity

**API Endpoints**:
- `POST /validate_authors?job_id={jobId}` - Initiate validation
- `GET /validation_status/{jobId}` - Poll validation progress

**User Actions**:
- Initiate validation
- Monitor progress (percentage and estimated time)
- Wait for completion
- Review validation summary

**Success Criteria**:
- All reviewers validated
- Validation scores assigned (0-8 conditions met)
- Validation criteria satisfied tracked

### Step 8: View Recommendations

**Component**: `ReviewerResults`

The system displays validated reviewers sorted by conditions_met score:
- Reviewers with score 8 (all criteria met) appear first
- Detailed reviewer information displayed
- Filtering and search capabilities
- Selection for shortlist

**API Endpoint**: `GET /recommended_reviewers?job_id={jobId}`

**Reviewer Information Displayed**:
- Name, email, affiliation, city, country
- Total publications and English publications
- Publication counts by time period
- Clinical trials, studies, case reports
- Retracted publications count
- Validation score (conditions_met)
- Criteria satisfied breakdown

**User Actions**:
- Review recommended reviewers
- Filter by minimum score
- Search by name, affiliation, or country
- Select reviewers for shortlist
- View detailed validation results

**Success Criteria**:
- Reviewers sorted by score (descending)
- All reviewer details displayed
- Filtering and search functional

### Step 9: Create Shortlist & Export

**Components**: `ReviewerResults`, `ExportReviewersDialog`

Users create a final shortlist and export recommendations:
- Select reviewers from recommendations
- Create shortlist with selected reviewers
- Export in CSV or JSON format
- Download exported file

**Export Formats**:

**CSV Format**:
```csv
Name,Email,Affiliation,Country,Total Publications,Conditions Met,Conditions Satisfied
Dr. Jane Smith,j.smith@university.edu,Example University,USA,120,8,8 of 8
```

**JSON Format**:
```json
{
  "reviewers": [
    {
      "reviewer": "Dr. Jane Smith",
      "email": "j.smith@university.edu",
      "aff": "Example University",
      "country": "USA",
      "Total_Publications": 120,
      "conditions_met": 8,
      "conditions_satisfied": "8 of 8"
    }
  ],
  "exported_at": "2025-01-15T14:30:00Z",
  "total_count": 1
}
```

**User Actions**:
- Select reviewers for export
- Choose export format (CSV or JSON)
- Download exported file
- Use recommendations for peer review

**Success Criteria**:
- Shortlist created successfully
- Export file generated
- File downloaded to user's device

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  FileUpload  │→ │ DataExtract  │→ │   Keyword    │     │
│  │  Component   │  │  Component   │  │ Enhancement  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                  ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Reviewer   │→ │    Author    │→ │   Reviewer   │     │
│  │    Search    │  │  Validation  │  │   Results    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                  ↓             │
│  ┌─────────────────────────────────────────────────┐       │
│  │         React Query (State Management)          │       │
│  └─────────────────────────────────────────────────┘       │
│         ↓                  ↓                  ↓             │
│  ┌─────────────────────────────────────────────────┐       │
│  │          Service Layer (API Calls)              │       │
│  │  - fileService                                  │       │
│  │  - keywordService                               │       │
│  │  - searchService                                │       │
│  │  - validationService                            │       │
│  └─────────────────────────────────────────────────┘       │
│         ↓                  ↓                  ↓             │
│  ┌─────────────────────────────────────────────────┐       │
│  │      ScholarFinderApiService (HTTP Client)      │       │
│  └─────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│         External ScholarFinder API (AWS Lambda)              │
│              https://192.168.61.60:8000                      │
└──────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
ProcessWorkflow
├── FileUpload
│   ├── File validation
│   ├── Drag & drop handling
│   ├── Progress indicator
│   └── Success/error display
├── DataExtraction
│   ├── Metadata display
│   ├── Edit functionality
│   └── Author-affiliation mapping
├── KeywordEnhancement
│   ├── Keyword categories display
│   ├── Keyword selection
│   └── Search string generation
├── ReviewerSearch
│   ├── Database selection
│   ├── Search initiation
│   └── Progress monitoring
├── AuthorValidation
│   ├── Manual author addition
│   ├── Validation initiation
│   └── Progress tracking
└── ReviewerResults
    ├── Recommendations display
    ├── Filtering and sorting
    ├── Shortlist creation
    └── Export functionality
```

## Components

### Core Workflow Components

| Component | Location | Purpose | Key Features |
|-----------|----------|---------|--------------|
| `FileUpload` | `src/components/upload/` | File upload and metadata extraction | Drag-and-drop, validation, progress tracking |
| `DataExtraction` | `src/components/extraction/` | Metadata review and editing | Display, edit, author-affiliation mapping |
| `KeywordEnhancement` | `src/components/keywords/` | Keyword enhancement and search string generation | AI enhancement, selection, Boolean query |
| `ReviewerSearch` | `src/components/search/` | Database search initiation | Multi-database, progress monitoring |
| `AuthorValidation` | `src/components/validation/` | Manual addition and validation | Name search, validation tracking |
| `ReviewerResults` | `src/components/results/` | Recommendations display | Sorting, filtering, selection |
| `ExportReviewersDialog` | `src/components/results/` | Export functionality | CSV/JSON export, download |

### Service Layer

| Service | Location | Purpose |
|---------|----------|---------|
| `ScholarFinderApiService` | `src/features/scholarfinder/services/` | HTTP client for external API |
| `fileService` | `src/services/` | File upload and job ID management |
| `keywordService` | `src/services/` | Keyword enhancement operations |
| `searchService` | `src/services/` | Database search operations |
| `validationService` | `src/services/` | Author validation operations |

### React Query Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useFileUpload` | `src/hooks/useFiles.ts` | File upload mutation |
| `useMetadata` | `src/hooks/useFiles.ts` | Metadata query |
| `useEnhanceKeywords` | `src/hooks/useKeywords.ts` | Keyword enhancement mutation |
| `useGenerateKeywordString` | `src/hooks/useKeywords.ts` | Search string generation mutation |
| `useSearchDatabases` | `src/hooks/useSearch.ts` | Database search mutation |
| `useAddManualAuthor` | `src/hooks/useValidation.ts` | Manual author addition mutation |
| `useValidateAuthors` | `src/hooks/useValidation.ts` | Author validation mutation |
| `useValidationStatus` | `src/hooks/useValidation.ts` | Validation status query with polling |
| `useRecommendations` | `src/hooks/useRecommendations.ts` | Recommendations query |

## API Integration

### Base Configuration

```typescript
const config = {
  baseURL: 'https://192.168.61.60:8000',
  timeout: 120000, // 2 minutes
  retries: 3,
  retryDelay: 2000 // 2 seconds initial delay
};
```

### API Endpoints

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/upload_extract_metadata` | Upload file and extract metadata |
| 2 | GET | `/metadata_extraction?job_id={jobId}` | Retrieve metadata |
| 3 | POST | `/keyword_enhancement?job_id={jobId}` | Enhance keywords |
| 4 | POST | `/keyword_string_generator?job_id={jobId}` | Generate search string |
| 5 | POST | `/database_search?job_id={jobId}` | Search databases |
| 6 | POST | `/manual_authors?job_id={jobId}` | Add manual author |
| 7a | POST | `/validate_authors?job_id={jobId}` | Initiate validation |
| 7b | GET | `/validation_status/{jobId}` | Get validation status |
| 8 | GET | `/recommended_reviewers?job_id={jobId}` | Get recommendations |

### Error Handling

All API calls include comprehensive error handling:

**Error Types**:
- `FILE_FORMAT_ERROR`: Invalid file type or size
- `NETWORK_ERROR`: Connection issues
- `TIMEOUT_ERROR`: Request timeout
- `EXTERNAL_API_ERROR`: Server errors (5xx)
- `AUTHENTICATION_ERROR`: Auth failures (401, 403)
- `METADATA_ERROR`: Metadata retrieval failures
- `KEYWORD_ERROR`: Keyword operation failures
- `SEARCH_ERROR`: Database search failures
- `VALIDATION_ERROR`: Author validation failures

**Retry Logic**:
- Network errors: Retry up to 3 times with exponential backoff
- Server errors (5xx): Retry up to 3 times
- Client errors (4xx): No retry (except 429 rate limit)
- Timeout errors: Retry with increased timeout

## Data Flow

### Job ID Persistence

The job_id is the key identifier that persists throughout the entire workflow:

```typescript
// Step 1: Upload generates job_id
const uploadResponse = await uploadManuscript(file);
const jobId = uploadResponse.data.job_id;

// Store job_id with process_id
fileService.setJobId(processId, jobId);

// Stored in two locations:
// 1. Memory: Map<processId, jobId>
// 2. localStorage: key = `process_${processId}_jobId`

// All subsequent steps retrieve job_id
const jobId = fileService.getJobId(processId);

// Steps 2-9 use job_id for all API calls
await enhanceKeywords(jobId);
await generateKeywordString(jobId, keywords);
await searchDatabases(jobId, databases);
await validateAuthors(jobId);
await getRecommendations(jobId);
```

### Data Transformation

Data flows through the system with transformations at each layer:

```
External API Response
        ↓
ScholarFinderApiService (validation, error handling)
        ↓
Service Layer (business logic, caching)
        ↓
React Query (state management, cache)
        ↓
React Hooks (component integration)
        ↓
React Components (UI rendering)
```

### Cache Management

React Query manages caching with automatic invalidation:

```typescript
// After upload, invalidate metadata cache
queryClient.invalidateQueries({ 
  queryKey: ['metadata', processId] 
});

// After keyword enhancement, invalidate keywords cache
queryClient.invalidateQueries({ 
  queryKey: ['keywords', processId] 
});

// After validation, invalidate recommendations cache
queryClient.invalidateQueries({ 
  queryKey: ['recommendations', processId] 
});
```

## Error Handling

### User-Friendly Error Messages

All errors are transformed into user-friendly messages:

```typescript
// Network error
"Network connection failed. Please check your internet connection and try again."

// File format error
"Unsupported file format: .txt. Please upload a .doc or .docx file."

// Timeout error
"The upload operation timed out. This may be due to large file processing or high server load."

// Server error
"ScholarFinder API is temporarily unavailable. Please try again in a few minutes."

// Validation error
"Job ID is required for author validation"
```

### Error Recovery

Each component implements error recovery:

1. **Display Error**: Show user-friendly error message
2. **Provide Guidance**: Suggest corrective actions
3. **Enable Retry**: Allow user to retry operation
4. **Reset State**: Clear error state on retry
5. **Log Error**: Log to console for debugging

### Error Boundaries

React Error Boundaries catch component errors:

```tsx
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, errorInfo) => {
    console.error('Component error:', error, errorInfo);
  }}
>
  <ProcessWorkflow processId={processId} />
</ErrorBoundary>
```

## Testing

### Test Coverage

The workflow includes comprehensive testing:

**Unit Tests**:
- Component rendering and interaction
- Service layer API calls
- Hook functionality
- Utility functions

**Property-Based Tests**:
- File validation across random inputs
- Job ID persistence and retrieval
- Metadata transformation
- Reviewer sorting
- Export format generation

**Integration Tests**:
- Steps 1-3: Upload to Keywords
- Steps 4-5: Search String to Database Search
- Steps 6-7: Manual Addition to Validation
- Steps 8-9: Recommendations to Export
- End-to-end: Complete workflow

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test upload
npm test keywords
npm test validation
npm test integration

# Run with coverage
npm test -- --coverage

# Run property-based tests
npm test -- property.test
```

### Test Configuration

Property-based tests use fast-check library:

```typescript
import fc from 'fast-check';

// Example property test
test('Property 1: File format validation', () => {
  fc.assert(
    fc.property(
      fc.string(), // Generate random file extensions
      (extension) => {
        const isValid = validateFileExtension(extension);
        const expected = ['.doc', '.docx'].includes(extension.toLowerCase());
        expect(isValid).toBe(expected);
      }
    ),
    { numRuns: 100 } // Run 100 iterations
  );
});
```

## Configuration

### Environment Variables

```env
# ScholarFinder API Configuration
VITE_SCHOLARFINDER_API_URL=https://192.168.61.60:8000
VITE_SCHOLARFINDER_API_TIMEOUT=120000
VITE_SCHOLARFINDER_API_RETRIES=3

# File Upload Configuration
VITE_MAX_FILE_SIZE=104857600  # 100MB
VITE_SUPPORTED_FILE_TYPES=doc,docx

# Keyword Configuration
VITE_MAX_PRIMARY_KEYWORDS=10
VITE_MAX_SECONDARY_KEYWORDS=15

# Validation Configuration
VITE_VALIDATION_POLL_INTERVAL=5000  # 5 seconds
VITE_VALIDATION_MAX_POLLS=120  # 10 minutes max

# Cache Configuration
VITE_METADATA_CACHE_TIME=600000  # 10 minutes
VITE_KEYWORD_CACHE_TIME=3600000  # 1 hour
VITE_RECOMMENDATIONS_CACHE_TIME=1800000  # 30 minutes

# Debug Configuration
VITE_ENABLE_DEBUG_LOGGING=false
```

### React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

## Best Practices

### For Developers

1. **Always use job_id**: Retrieve job_id from fileService for all API calls
2. **Handle errors gracefully**: Provide user-friendly error messages
3. **Implement loading states**: Show progress indicators for async operations
4. **Cache aggressively**: Use React Query caching to minimize API calls
5. **Validate inputs**: Validate on client before sending to API
6. **Test thoroughly**: Write unit, property, and integration tests
7. **Log appropriately**: Use debug logging for troubleshooting

### For Users

1. **Use supported file formats**: Only .doc and .docx files are supported
2. **Review metadata carefully**: Verify extracted information before proceeding
3. **Select relevant keywords**: Choose keywords that best represent your research
4. **Be patient during search**: Database searches can take several minutes
5. **Review validation criteria**: Understand the 8 validation conditions
6. **Filter recommendations**: Use filters to find most suitable reviewers
7. **Export early**: Export recommendations to avoid losing data

## Troubleshooting

### Common Issues

**Upload Fails**:
- Check file format (.doc or .docx)
- Verify file size (< 100MB)
- Check internet connection
- Try again with smaller file

**Keyword Enhancement Fails**:
- Verify job_id exists
- Check API connectivity
- Review initial keywords quality
- Retry enhancement

**Database Search Timeout**:
- Normal for large searches
- Wait for completion
- Check search progress
- Reduce number of databases

**Validation Takes Too Long**:
- Normal for large reviewer pools
- Monitor progress percentage
- Check estimated completion time
- Be patient (can take 10+ minutes)

**No Recommendations Found**:
- Review validation criteria
- Check if criteria too strict
- Add manual authors
- Adjust keyword selection

### Debug Mode

Enable debug logging:

```typescript
// In environment variables
VITE_ENABLE_DEBUG_LOGGING=true

// Or in code
config.enableDebugLogging = true;
```

Debug logs include:
- API request/response details
- Retry attempts and delays
- Cache hits and misses
- State transitions
- Error stack traces

## Related Documentation

- [FileUpload Component](../src/components/upload/README.md)
- [DataExtraction Component](../src/components/extraction/README.md)
- [KeywordEnhancement Component](../src/components/keywords/README.md)
- [ReviewerSearch Component](../src/components/search/README.md)
- [AuthorValidation Component](../src/components/validation/README.md)
- [ReviewerResults Component](../src/components/results/README.md)
- [ScholarFinder API Service](../src/features/scholarfinder/services/README.md)
- [Integration Tests](../src/test/integration/README-SCHOLARFINDER-INTEGRATION-TESTS.md)

## Support

For issues or questions:
- Check this documentation first
- Review component-specific README files
- Check integration test examples
- Enable debug logging for troubleshooting
- Contact development team with debug logs
