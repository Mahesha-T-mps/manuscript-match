# ScholarFinder API Service

This directory contains the service layer for integrating with the external ScholarFinder API. The service provides a comprehensive interface for all 9 workflow steps with proper error handling, retry logic, and response validation.

## Overview

The `ScholarFinderApiService` class is the primary interface for communicating with the external ScholarFinder API hosted at `https://192.168.61.60:8000`. It handles:

- HTTP requests with retry logic
- Error transformation and handling
- Response validation using Zod schemas
- Timeout management
- Rate limiting
- Authentication errors

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         ScholarFinderApiService                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Public API Methods (9 workflow steps)          │  │
│  │  - uploadManuscript()                           │  │
│  │  - getMetadata()                                │  │
│  │  - enhanceKeywords()                            │  │
│  │  - generateKeywordString()                      │  │
│  │  - searchDatabases()                            │  │
│  │  - addManualAuthor()                            │  │
│  │  - validateAuthors()                            │  │
│  │  - getValidationStatus()                        │  │
│  │  - getRecommendations()                         │  │
│  └─────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Private Helper Methods                          │  │
│  │  - makeRequest() - HTTP with retry              │  │
│  │  - handleApiError() - Error transformation      │  │
│  │  - validateResponse() - Zod validation          │  │
│  └─────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ApiService (HTTP Client)                       │  │
│  │  - get(), post(), put(), delete()               │  │
│  │  - uploadFile()                                 │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│     External ScholarFinder API (AWS Lambda)             │
│          https://192.168.61.60:8000                     │
└─────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import { scholarFinderApiService } from '@/features/scholarfinder/services/ScholarFinderApiService';

// Step 1: Upload manuscript
const uploadResponse = await scholarFinderApiService.uploadManuscript(file, processId);
const jobId = uploadResponse.data.job_id;

// Step 2: Get metadata
const metadata = await scholarFinderApiService.getMetadata(jobId);

// Step 3: Enhance keywords
const enhancedKeywords = await scholarFinderApiService.enhanceKeywords(jobId);

// Step 4: Generate search string
const searchString = await scholarFinderApiService.generateKeywordString(jobId, {
  primary_keywords_input: 'climate change, global warming',
  secondary_keywords_input: 'biodiversity, species diversity'
});

// Step 5: Search databases
const searchResults = await scholarFinderApiService.searchDatabases(jobId, {
  selected_websites: 'PubMed,ScienceDirect'
});

// Step 6: Add manual author
const manualAuthor = await scholarFinderApiService.addManualAuthor(jobId, 'Dr. John Smith');

// Step 7: Validate authors
const validation = await scholarFinderApiService.validateAuthors(jobId);

// Step 7b: Poll validation status
const status = await scholarFinderApiService.getValidationStatus(jobId);

// Step 8: Get recommendations
const recommendations = await scholarFinderApiService.getRecommendations(jobId);
```

### Custom Configuration

```typescript
import { ScholarFinderApiService } from '@/features/scholarfinder/services/ScholarFinderApiService';

// Create custom instance with different configuration
const customService = new ScholarFinderApiService({
  baseURL: 'https://custom-api.example.com',
  timeout: 180000, // 3 minutes
  retries: 5,
  retryDelay: 3000
});

// Use custom instance
const response = await customService.uploadManuscript(file);
```

### Error Handling

```typescript
import { 
  scholarFinderApiService, 
  ScholarFinderErrorType 
} from '@/features/scholarfinder/services/ScholarFinderApiService';

try {
  const response = await scholarFinderApiService.uploadManuscript(file);
  console.log('Upload successful:', response);
} catch (error) {
  // Error is transformed to ScholarFinderError
  switch (error.type) {
    case ScholarFinderErrorType.FILE_FORMAT_ERROR:
      console.error('Invalid file format:', error.message);
      // Don't retry - user needs to select different file
      break;
      
    case ScholarFinderErrorType.NETWORK_ERROR:
      console.error('Network error:', error.message);
      // Retry automatically handled by service
      break;
      
    case ScholarFinderErrorType.TIMEOUT_ERROR:
      console.error('Request timeout:', error.message);
      // Retry automatically handled by service
      break;
      
    case ScholarFinderErrorType.EXTERNAL_API_ERROR:
      console.error('API error:', error.message);
      if (error.retryable) {
        // Retry automatically handled by service
      } else {
        // Show error to user
      }
      break;
      
    default:
      console.error('Unknown error:', error);
  }
}
```

## API Methods

### uploadManuscript(file, processId?)

Uploads a Word document and extracts metadata.

**Parameters**:
- `file: File` - Word document (.doc or .docx)
- `processId?: string` - Optional process ID for tracking

**Returns**: `Promise<UploadResponse>`

**Throws**:
- `FILE_FORMAT_ERROR` - Invalid file type or size
- `NETWORK_ERROR` - Connection issues
- `TIMEOUT_ERROR` - Request timeout
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const file = new File(['content'], 'manuscript.docx', { 
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
});

const response = await scholarFinderApiService.uploadManuscript(file, 'process-123');
console.log('Job ID:', response.data.job_id);
console.log('Title:', response.data.heading);
console.log('Authors:', response.data.authors);
```

### getMetadata(jobId)

Retrieves extracted metadata for review.

**Parameters**:
- `jobId: string` - Job ID from upload response

**Returns**: `Promise<MetadataResponse>`

**Throws**:
- `METADATA_ERROR` - Invalid job ID or metadata not found
- `NETWORK_ERROR` - Connection issues
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const metadata = await scholarFinderApiService.getMetadata('job_20250115_1430_a1b2c3');
console.log('Title:', metadata.data.heading);
console.log('Abstract:', metadata.data.abstract);
```

### enhanceKeywords(jobId)

Enhances keywords using AI.

**Parameters**:
- `jobId: string` - Job ID from upload response

**Returns**: `Promise<KeywordEnhancementResponse>`

**Throws**:
- `KEYWORD_ERROR` - Invalid job ID or enhancement failed
- `NETWORK_ERROR` - Connection issues
- `TIMEOUT_ERROR` - Enhancement timeout
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const enhanced = await scholarFinderApiService.enhanceKeywords('job_20250115_1430_a1b2c3');
console.log('MeSH Terms:', enhanced.data.mesh_terms);
console.log('Primary Focus:', enhanced.data.all_primary_focus_list);
console.log('Secondary Focus:', enhanced.data.all_secondary_focus_list);
```

### generateKeywordString(jobId, keywords)

Generates a Boolean search string from selected keywords.

**Parameters**:
- `jobId: string` - Job ID from upload response
- `keywords: KeywordSelection` - Selected primary and secondary keywords

**Returns**: `Promise<KeywordStringResponse>`

**Throws**:
- `KEYWORD_ERROR` - Invalid job ID or no keywords selected
- `NETWORK_ERROR` - Connection issues
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const searchString = await scholarFinderApiService.generateKeywordString(
  'job_20250115_1430_a1b2c3',
  {
    primary_keywords_input: 'climate change, global warming, temperature rise',
    secondary_keywords_input: 'biodiversity, species diversity, habitat loss'
  }
);

console.log('Search String:', searchString.data.search_string);
// Output: "(climate change OR global warming OR temperature rise) AND (biodiversity OR species diversity OR habitat loss)"
```

### searchDatabases(jobId, databases)

Searches academic databases for potential reviewers.

**Parameters**:
- `jobId: string` - Job ID from upload response
- `databases: DatabaseSelection` - Selected databases to search

**Returns**: `Promise<DatabaseSearchResponse>`

**Throws**:
- `SEARCH_ERROR` - Invalid job ID or no databases selected
- `NETWORK_ERROR` - Connection issues
- `TIMEOUT_ERROR` - Search timeout
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const results = await scholarFinderApiService.searchDatabases(
  'job_20250115_1430_a1b2c3',
  {
    selected_websites: 'PubMed,ScienceDirect,WileyLibrary'
  }
);

console.log('Total Reviewers:', results.data.total_reviewers);
console.log('Search Status:', results.data.search_status);
// Output: { PubMed: 'success', ScienceDirect: 'success', WileyLibrary: 'in_progress' }
```

### addManualAuthor(jobId, authorName)

Adds a manual author by name search.

**Parameters**:
- `jobId: string` - Job ID from upload response
- `authorName: string` - Author name to search (minimum 2 characters)

**Returns**: `Promise<ManualAuthorResponse>`

**Throws**:
- `SEARCH_ERROR` - Invalid job ID or author name too short
- `NETWORK_ERROR` - Connection issues
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const authors = await scholarFinderApiService.addManualAuthor(
  'job_20250115_1430_a1b2c3',
  'Dr. Michael Chen'
);

console.log('Found Authors:', authors.data.found_authors);
console.log('Total Found:', authors.data.total_found);
```

### validateAuthors(jobId)

Initiates author validation against conflict of interest rules.

**Parameters**:
- `jobId: string` - Job ID from upload response

**Returns**: `Promise<ValidationResponse>`

**Throws**:
- `VALIDATION_ERROR` - Invalid job ID or validation failed
- `NETWORK_ERROR` - Connection issues
- `TIMEOUT_ERROR` - Validation timeout
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const validation = await scholarFinderApiService.validateAuthors('job_20250115_1430_a1b2c3');
console.log('Status:', validation.data.validation_status);
console.log('Progress:', validation.data.progress_percentage);
console.log('Estimated Time:', validation.data.estimated_completion_time);
```

### getValidationStatus(jobId)

Polls validation status during long-running validation.

**Parameters**:
- `jobId: string` - Job ID from upload response

**Returns**: `Promise<ValidationResponse>`

**Throws**:
- `VALIDATION_ERROR` - Invalid job ID
- `NETWORK_ERROR` - Connection issues
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
// Poll every 5 seconds until completed
const pollValidation = async (jobId) => {
  while (true) {
    const status = await scholarFinderApiService.getValidationStatus(jobId);
    
    console.log('Progress:', status.data.progress_percentage + '%');
    
    if (status.data.validation_status === 'completed') {
      console.log('Validation complete!');
      break;
    }
    
    if (status.data.validation_status === 'failed') {
      console.error('Validation failed');
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

await pollValidation('job_20250115_1430_a1b2c3');
```

### getRecommendations(jobId)

Retrieves validated reviewer recommendations sorted by score.

**Parameters**:
- `jobId: string` - Job ID from upload response

**Returns**: `Promise<RecommendationsResponse>`

**Throws**:
- `EXTERNAL_API_ERROR` - Invalid job ID or recommendations not found
- `NETWORK_ERROR` - Connection issues
- `EXTERNAL_API_ERROR` - Server errors

**Example**:
```typescript
const recommendations = await scholarFinderApiService.getRecommendations('job_20250115_1430_a1b2c3');

// Reviewers are automatically sorted by conditions_met (descending)
recommendations.data.reviewers.forEach(reviewer => {
  console.log(`${reviewer.reviewer}: ${reviewer.conditions_met}/8 conditions met`);
  console.log(`  Email: ${reviewer.email}`);
  console.log(`  Affiliation: ${reviewer.aff}`);
  console.log(`  Publications: ${reviewer.Total_Publications}`);
});
```

### checkJobStatus(jobId)

Utility method to check if a job exists and is valid.

**Parameters**:
- `jobId: string` - Job ID to check

**Returns**: `Promise<{ exists: boolean; status: string }>`

**Example**:
```typescript
const status = await scholarFinderApiService.checkJobStatus('job_20250115_1430_a1b2c3');
if (status.exists) {
  console.log('Job status:', status.status);
} else {
  console.log('Job not found');
}
```

## Error Types

### ScholarFinderErrorType Enum

```typescript
enum ScholarFinderErrorType {
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  METADATA_ERROR = 'METADATA_ERROR',
  KEYWORD_ERROR = 'KEYWORD_ERROR',
  SEARCH_ERROR = 'SEARCH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  FILE_FORMAT_ERROR = 'FILE_FORMAT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}
```

### ScholarFinderError Interface

```typescript
interface ScholarFinderError {
  type: ScholarFinderErrorType;
  message: string;        // User-friendly error message
  details?: any;          // Technical details for debugging
  retryable: boolean;     // Whether error can be retried
  retryAfter?: number;    // Milliseconds to wait before retry
}
```

## Retry Logic

The service implements exponential backoff retry logic:

### Retry Configuration

```typescript
{
  retries: 3,              // Maximum retry attempts
  retryDelay: 2000,        // Initial delay (2 seconds)
  maxDelay: 30000          // Maximum delay (30 seconds)
}
```

### Retry Behavior

- **Network Errors**: Retry up to 3 times with exponential backoff
- **Timeout Errors**: Retry up to 3 times with exponential backoff
- **Server Errors (5xx)**: Retry up to 3 times with exponential backoff
- **Client Errors (4xx)**: No retry (except 429 rate limit)
- **Rate Limit (429)**: Retry after delay specified in Retry-After header

### Backoff Calculation

```typescript
delay = Math.min(retryDelay * Math.pow(2, attemptIndex), maxDelay)

// Attempt 0: 2000ms (2 seconds)
// Attempt 1: 4000ms (4 seconds)
// Attempt 2: 8000ms (8 seconds)
// Attempt 3: 16000ms (16 seconds)
// Attempt 4+: 30000ms (30 seconds max)
```

## Response Validation

All API responses are validated using Zod schemas to ensure type safety and data integrity.

### Validation Process

1. API returns response
2. Response passed to Zod schema
3. Schema validates structure and types
4. If valid, response returned with proper typing
5. If invalid, ScholarFinderError thrown

### Example Schema

```typescript
const UploadResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    job_id: z.string(),
    file_name: z.string(),
    timestamp: z.string(),
    heading: z.string(),
    authors: z.array(z.string()),
    affiliations: z.array(z.string()),
    keywords: z.string(),
    abstract: z.string(),
    author_aff_map: z.record(z.string())
  })
});
```

## Configuration Management

### Get Current Configuration

```typescript
const config = scholarFinderApiService.getConfig();
console.log('Base URL:', config.baseURL);
console.log('Timeout:', config.timeout);
console.log('Retries:', config.retries);
```

### Update Configuration

```typescript
scholarFinderApiService.updateConfig({
  timeout: 180000,  // Increase timeout to 3 minutes
  retries: 5        // Increase retry attempts to 5
});
```

## Testing

### Unit Tests

Test individual methods with mocked API responses:

```typescript
import { ScholarFinderApiService } from './ScholarFinderApiService';
import { vi } from 'vitest';

describe('ScholarFinderApiService', () => {
  let service: ScholarFinderApiService;
  
  beforeEach(() => {
    service = new ScholarFinderApiService();
  });
  
  test('uploadManuscript validates file format', async () => {
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    await expect(service.uploadManuscript(invalidFile)).rejects.toMatchObject({
      type: 'FILE_FORMAT_ERROR',
      message: expect.stringContaining('Unsupported file format')
    });
  });
  
  test('enhanceKeywords requires job ID', async () => {
    await expect(service.enhanceKeywords('')).rejects.toMatchObject({
      type: 'KEYWORD_ERROR',
      message: expect.stringContaining('Job ID is required')
    });
  });
});
```

### Property-Based Tests

Test properties across random inputs:

```typescript
import fc from 'fast-check';

test('Property: File validation rejects invalid extensions', () => {
  fc.assert(
    fc.property(
      fc.string(),
      async (extension) => {
        const file = new File(['content'], `test${extension}`, { type: 'text/plain' });
        const validExtensions = ['.doc', '.docx'];
        
        if (!validExtensions.includes(extension.toLowerCase())) {
          await expect(service.uploadManuscript(file)).rejects.toMatchObject({
            type: 'FILE_FORMAT_ERROR'
          });
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

Test complete workflow with real API:

```typescript
test('Complete workflow integration', async () => {
  // Step 1: Upload
  const file = new File(['content'], 'test.docx', { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  const upload = await service.uploadManuscript(file);
  const jobId = upload.data.job_id;
  
  // Step 2: Get metadata
  const metadata = await service.getMetadata(jobId);
  expect(metadata.job_id).toBe(jobId);
  
  // Step 3: Enhance keywords
  const keywords = await service.enhanceKeywords(jobId);
  expect(keywords.data.mesh_terms).toBeDefined();
  
  // Continue through all steps...
});
```

## Performance Considerations

### Timeout Management

- Default timeout: 120 seconds (2 minutes)
- Configurable per instance
- Appropriate for long-running operations (validation, search)

### Caching

The service itself doesn't implement caching. Caching is handled by:
- React Query at the hook level
- Browser HTTP cache for GET requests

### Connection Pooling

The underlying ApiService manages connection pooling automatically.

## Security Considerations

### HTTPS

All requests use HTTPS for secure communication.

### Authentication

Currently, the API doesn't require authentication. If authentication is added:

```typescript
scholarFinderApiService.updateConfig({
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Input Validation

All inputs are validated before sending to API:
- File format and size validation
- Job ID format validation
- Keyword length validation
- Author name length validation

## Troubleshooting

### Enable Debug Logging

```typescript
import { config } from '@/lib/config';

config.enableDebugLogging = true;
```

Debug logs include:
- Request URLs and parameters
- Response status and data
- Retry attempts and delays
- Error details and stack traces

### Common Issues

**"Job ID is required" error**:
- Ensure job_id is stored after upload
- Check fileService.getJobId(processId) returns valid ID
- Verify localStorage contains job_id

**Timeout errors**:
- Increase timeout in configuration
- Check network connectivity
- Verify API is responding

**Validation never completes**:
- Check validation status polling
- Verify API is processing validation
- Check for API errors in logs

**Recommendations not sorted**:
- Service automatically sorts by conditions_met
- Check response data structure
- Verify sorting logic in getRecommendations

## Related Documentation

- [Complete Workflow Guide](../../../../docs/SCHOLARFINDER_WORKFLOW.md)
- [FileUpload Component](../../../components/upload/README.md)
- [Integration Tests](../../../test/integration/README-SCHOLARFINDER-INTEGRATION-TESTS.md)
- [API Types](../types/api.ts)

## Support

For issues or questions:
- Check JSDoc comments in source code
- Review integration test examples
- Enable debug logging
- Check API endpoint documentation
- Contact development team with logs
