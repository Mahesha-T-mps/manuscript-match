# Design Document

## Overview

This design document outlines the complete integration of the ScholarFinder API workflow into the application. The system implements all 9 workflow steps: Upload & Extract, Metadata Extraction, Keyword Enhancement, Keyword String Generation, Database Search, Manual Author Addition, Author Validation, Recommendations, and Export. The integration leverages the existing `ScholarFinderApiService`, `fileService`, and React Query hooks to provide a seamless end-to-end experience.

The workflow begins when a user uploads a Word document to `https://192.168.61.60:8000/upload_extract_metadata`. The system receives a job_id that persists throughout all subsequent operations. Users then enhance keywords, generate search strings, search academic databases, optionally add manual authors, validate all potential reviewers against conflict of interest rules, review recommendations sorted by validation scores, create a shortlist, and export final recommendations.

The design follows the existing architecture patterns in the application, using React Query for state management, the service layer for API communication, and React hooks for component logic. Each workflow step is represented by a dedicated component that integrates with the API service layer.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  FileUpload     │
│  Component      │
└────────┬────────┘
         │
         ├─ useFileUpload hook
         │  (React Query mutation)
         │
         ├─ fileService
         │  (Business logic layer)
         │
         ├─ scholarFinderApiService
         │  (API communication layer)
         │
         └─ External API
            https://192.168.61.60:8000/upload_extract_metadata
```

### Component Hierarchy

```
ProcessWorkflow
  └─ FileUpload
       ├─ File validation
       ├─ Drag & drop handling
       ├─ Progress indicator
       ├─ Success display
       └─ Error handling
```

### Data Flow

1. **User Action**: User selects or drags a Word document
2. **Validation**: FileUpload validates file format and size
3. **Upload**: useFileUpload hook triggers mutation
4. **API Call**: fileService.uploadFile calls scholarFinderApiService.uploadManuscript
5. **HTTP Request**: scholarFinderApiService sends FormData to external API
6. **Response**: API returns job_id and extracted metadata
7. **Storage**: fileService stores job_id with process_id mapping
8. **Cache Update**: React Query invalidates metadata and process caches
9. **UI Update**: FileUpload displays success and triggers onFileUpload callback
10. **Workflow Progression**: ProcessWorkflow moves to next step

## Components and Interfaces

### FileUpload Component

**Location**: `src/components/upload/FileUpload.tsx`

**Props Interface**:
```typescript
interface FileUploadProps {
  processId: string;           // Process ID for associating upload
  onFileUpload: (uploadResponse: UploadResponse) => void;  // Callback on success
  uploadedFile?: File | null;  // Currently uploaded file (for display)
}
```

**State**:
```typescript
const [isDragOver, setIsDragOver] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
const [currentFileName, setCurrentFileName] = useState<string>('');
```

**Key Methods**:
- `validateFileForUpload(file: File)`: Validates file format and size
- `handleFile(file: File)`: Orchestrates upload process
- `handleDrop(e: DragEvent)`: Handles drag-and-drop
- `handleFileInput(e: ChangeEvent)`: Handles file input selection
- `removeFile()`: Clears uploaded file
- `handleCancelUpload()`: Cancels in-progress upload

### ScholarFinderApiService

**Location**: `src/features/scholarfinder/services/ScholarFinderApiService.ts`

**All API Methods**:

```typescript
// Step 1: Upload & Extract
async uploadManuscript(file: File, processId?: string): Promise<UploadResponse>

// Step 2: View Metadata
async getMetadata(jobId: string): Promise<MetadataResponse>

// Step 3: Keyword Enhancement
async enhanceKeywords(jobId: string): Promise<KeywordEnhancementResponse>

// Step 4: Generate Keyword String
async generateKeywordString(jobId: string, keywords: KeywordSelection): Promise<KeywordStringResponse>

// Step 5: Database Search
async searchDatabases(jobId: string, databases: DatabaseSelection): Promise<DatabaseSearchResponse>

// Step 6: Manual Author Addition
async addManualAuthor(jobId: string, authorName: string): Promise<ManualAuthorResponse>

// Step 7: Validate Authors
async validateAuthors(jobId: string): Promise<ValidationResponse>

// Step 7b: Get Validation Status (for polling)
async getValidationStatus(jobId: string): Promise<ValidationResponse>

// Step 8 & 9: Get Recommendations
async getRecommendations(jobId: string): Promise<RecommendationsResponse>

// Utility: Check Job Status
async checkJobStatus(jobId: string): Promise<{ exists: boolean; status: string }>
```

**Implementation Details**:
- All methods validate required parameters before making requests
- All methods use retry logic with exponential backoff for network/server errors
- All methods transform errors into ScholarFinderError format
- All methods use the configured base URL (http://192.168.61.60:8000)
- Timeout set to 120 seconds for long-running operations
- Maximum 3 retry attempts with 2-second initial delay

**Error Handling**:
- `FILE_FORMAT_ERROR`: Invalid file type or size
- `NETWORK_ERROR`: Connection issues
- `TIMEOUT_ERROR`: Request timeout
- `EXTERNAL_API_ERROR`: API server errors
- `METADATA_ERROR`: Metadata retrieval failures
- `KEYWORD_ERROR`: Keyword enhancement/generation failures
- `SEARCH_ERROR`: Database search failures
- `VALIDATION_ERROR`: Author validation failures
- `AUTHENTICATION_ERROR`: Auth failures (401, 403)

### FileService

**Location**: `src/services/fileService.ts`

**Key Methods**:
```typescript
setJobId(processId: string, jobId: string): void
getJobId(processId: string): string | null
async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse>
```

**Job ID Management**:
- Stores job_id in memory Map
- Persists job_id to localStorage with key `process_${processId}_jobId`
- Retrieves job_id from memory first, falls back to localStorage
- Ensures job_id survives page refreshes

### useFileUpload Hook

**Location**: `src/hooks/useFiles.ts`

**Implementation**:
```typescript
export const useFileUpload = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, file, onProgress }) => 
      fileService.uploadFile(processId, file, onProgress),
    onSuccess: (_, { processId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.metadata.all(processId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('File upload failed:', error);
    },
  });
};
```

**Cache Invalidation**:
- Invalidates metadata cache to trigger refetch
- Invalidates process cache to update status
- Ensures UI reflects latest data

## Data Models

### UploadResponse

```typescript
interface UploadResponse {
  fileId: string;              // job_id from API
  fileName: string;            // Original file name
  fileSize: number;            // File size in bytes
  uploadedAt: string;          // Timestamp
  metadata: ExtractedMetadata; // Extracted metadata
}
```

### ExtractedMetadata

```typescript
interface ExtractedMetadata {
  title: string;               // Manuscript heading
  authors: Author[];           // List of authors
  affiliations: Affiliation[]; // List of affiliations
  keywords: string[];          // Keywords array
  abstract: string;            // Abstract text
}
```

### Author

```typescript
interface Author {
  id: string;
  name: string;
  affiliation: string;
  country: string;
  publicationCount: number;
  recentPublications: string[];
  expertise: string[];
  database: string;
  matchScore: number;
}
```

### Affiliation

```typescript
interface Affiliation {
  id: string;
  name: string;
  country: string;
  type: string;
}
```

### API Response Formats

#### 1. Upload & Extract Metadata
**Request**:
```
POST https://192.168.61.60:8000/upload_extract_metadata
Content-Type: multipart/form-data

file: <binary data>
```

**Response**:
```json
{
  "message": "Metadata extracted successfully.",
  "data": {
    "job_id": "job_20250115_1430_a1b2c3",
    "file_name": "manuscript.docx",
    "timestamp": "2025-01-15 14:30:00",
    "heading": "Impact of Climate Change on Biodiversity",
    "authors": ["John Smith", "Jane Doe"],
    "affiliations": ["Department of Biology, University of Example"],
    "keywords": "climate change, biodiversity, ecosystem",
    "abstract": "This study examines...",
    "author_aff_map": {
      "John Smith": "Department of Biology, University of Example"
    }
  }
}
```

#### 2. View Current Metadata
**Request**:
```
GET https://192.168.61.60:8000/metadata_extraction?job_id=job_20250115_1430_a1b2c3
```

**Response**: Same structure as upload response data

#### 3. Keyword Enhancement
**Request**:
```
POST https://192.168.61.60:8000/keyword_enhancement?job_id=job_20250115_1430_a1b2c3
```

**Response**:
```json
{
  "message": "Keywords enhanced successfully",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "mesh_terms": ["Climate Change", "Biodiversity"],
    "broader_terms": ["Environmental Science", "Ecology"],
    "primary_focus": ["climate change", "global warming"],
    "secondary_focus": ["biodiversity", "species diversity"],
    "additional_primary_keywords": ["temperature rise", "carbon emissions"],
    "additional_secondary_keywords": ["habitat loss", "extinction"],
    "all_primary_focus_list": ["climate change", "global warming", "temperature rise"],
    "all_secondary_focus_list": ["biodiversity", "species diversity", "habitat loss"]
  }
}
```

#### 4. Keyword String Generator
**Request**:
```
POST https://192.168.61.60:8000/keyword_string_generator?job_id=job_20250115_1430_a1b2c3
Content-Type: application/x-www-form-urlencoded

primary_keywords_input=climate change, global warming
secondary_keywords_input=biodiversity, species diversity
```

**Response**:
```json
{
  "message": "Search string generated successfully",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "search_string": "(climate change OR global warming) AND (biodiversity OR species diversity)",
    "primary_keywords_used": ["climate change", "global warming"],
    "secondary_keywords_used": ["biodiversity", "species diversity"]
  }
}
```

#### 5. Database Search
**Request**:
```
POST https://192.168.61.60:8000/database_search?job_id=job_20250115_1430_a1b2c3
Content-Type: application/x-www-form-urlencoded

selected_websites=PubMed,ScienceDirect
```

**Response**:
```json
{
  "message": "Database search completed",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "total_reviewers": 150,
    "databases_searched": ["PubMed", "ScienceDirect"],
    "search_status": {
      "PubMed": "success",
      "ScienceDirect": "success"
    },
    "preview_reviewers": [...]
  }
}
```

#### 6. Manual Author Addition
**Request**:
```
POST https://192.168.61.60:8000/manual_authors?job_id=job_20250115_1430_a1b2c3
Content-Type: application/x-www-form-urlencoded

author_name=Dr. Michael Chen
```

**Response**:
```json
{
  "message": "Authors found",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "found_authors": [
      {
        "name": "Michael Chen",
        "email": "m.chen@university.edu",
        "affiliation": "Department of Biology, Example University",
        "country": "USA",
        "publications": 45
      }
    ],
    "search_term": "Dr. Michael Chen",
    "total_found": 1
  }
}
```

#### 7. Validate Authors
**Request**:
```
POST https://192.168.61.60:8000/validate_authors?job_id=job_20250115_1430_a1b2c3
```

**Response**:
```json
{
  "message": "Validation in progress",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "validation_status": "in_progress",
    "progress_percentage": 45,
    "estimated_completion_time": "2 minutes",
    "total_authors_processed": 68,
    "validation_criteria": [
      "Publications (last 10 years) ≥ 8",
      "Relevant Publications (last 5 years) ≥ 3",
      "Publications (last 2 years) ≥ 1",
      "English Publications > 50%",
      "No Coauthorship",
      "Different Affiliation",
      "Same Country",
      "No Retracted Publications"
    ]
  }
}
```

#### 8. Get Recommended Reviewers
**Request**:
```
GET https://192.168.61.60:8000/recommended_reviewers?job_id=job_20250115_1430_a1b2c3
```

**Response**:
```json
{
  "message": "Recommendations retrieved",
  "job_id": "job_20250115_1430_a1b2c3",
  "data": {
    "reviewers": [
      {
        "reviewer": "Dr. Jane Smith",
        "email": "j.smith@university.edu",
        "aff": "Department of Environmental Science, Example University",
        "city": "Boston",
        "country": "USA",
        "Total_Publications": 120,
        "English_Pubs": 115,
        "Publications (last 10 years)": 45,
        "Relevant Publications (last 5 years)": 12,
        "Publications (last 2 years)": 5,
        "Publications (last year)": 2,
        "Clinical_Trials_no": 0,
        "Clinical_study_no": 0,
        "Case_reports_no": 0,
        "Retracted_Pubs_no": 0,
        "TF_Publications_last_year": 2,
        "coauthor": false,
        "country_match": "yes",
        "aff_match": "no",
        "conditions_met": 8,
        "conditions_satisfied": "8 of 8"
      }
    ],
    "total_count": 150,
    "validation_summary": {
      "total_authors": 150,
      "authors_validated": 150,
      "conditions_applied": ["Publications (last 10 years) ≥ 8", ...],
      "average_conditions_met": 6.2
    }
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File format validation

*For any* file with an extension, the validation function should return `isValid: true` only if the extension is .doc or .docx (case-insensitive), and `isValid: false` for all other extensions.

**Validates: Requirements 1.1**

### Property 2: API endpoint correctness

*For any* valid file upload, the API service should send the request to the endpoint `/upload_extract_metadata` at the configured base URL.

**Validates: Requirements 1.2**

### Property 3: Response structure completeness

*For any* successful API response, the response object should contain all required fields: job_id, file_name, timestamp, heading, authors, affiliations, keywords, abstract, and author_aff_map.

**Validates: Requirements 1.3**

### Property 4: Success notification on upload

*For any* successful upload completion, a success notification should be triggered and displayed to the user.

**Validates: Requirements 1.4**

### Property 5: Error message on failure

*For any* error response from the API, an error message should be displayed to the user, and the message should be appropriate for the error type.

**Validates: Requirements 1.5**

### Property 6: Progress indicator visibility

*For any* file upload that begins, the upload status should change from 'idle' to 'uploading' and a progress indicator should be visible.

**Validates: Requirements 2.1**

### Property 7: Progress value reflection

*For any* progress value between 0 and 100, the progress indicator should display that exact value.

**Validates: Requirements 2.2**

### Property 8: Error status on failure

*For any* error that occurs during upload or extraction, the upload status should change to 'error' and an error message should be displayed.

**Validates: Requirements 2.5**

### Property 9: Job ID storage

*For any* successful API response containing a job_id, the fileService should store that job_id associated with the process_id.

**Validates: Requirements 3.1**

### Property 10: Metadata transformation

*For any* API response, the transformed metadata should conform to the internal ExtractedMetadata interface structure with all required fields present.

**Validates: Requirements 3.2**

### Property 11: Dual storage persistence

*For any* job_id that is stored using setJobId, the job_id should be retrievable from both memory (Map) and localStorage.

**Validates: Requirements 3.3**

### Property 12: Job ID round-trip

*For any* process_id and job_id pair, if setJobId(process_id, job_id) is called, then getJobId(process_id) should return the same job_id.

**Validates: Requirements 3.4**

### Property 13: localStorage persistence across sessions

*For any* job_id stored in localStorage, after clearing the memory Map but keeping localStorage intact, getJobId should still retrieve the correct job_id from localStorage.

**Validates: Requirements 3.5**

### Property 14: Callback invocation on success

*For any* successful upload, the onFileUpload callback should be invoked with the upload response containing the extracted metadata.

**Validates: Requirements 4.1**

### Property 15: File summary display

*For any* uploaded file, the displayed summary should include both the file name and file size.

**Validates: Requirements 4.3**

### Property 16: Author-affiliation mapping preservation

*For any* metadata containing author-affiliation mappings, the mappings should remain intact and unchanged after transformation and storage.

**Validates: Requirements 4.5**

### Property 17: Error state reset

*For any* error that occurs, after the error is handled, the upload component should return to a state where the user can attempt another upload.

**Validates: Requirements 5.5**

### Property 18: Cache invalidation on upload

*For any* successful upload completion, the React Query caches for metadata and process details should be invalidated.

**Validates: Requirements 6.4**

### Property 19: Cancel button visibility during upload

*For any* upload in progress (status is 'uploading'), a cancel button should be visible to the user.

**Validates: Requirements 7.1**

### Property 20: Data persistence after UI removal

*For any* file that is removed from the UI display, the job_id and metadata should remain in storage (localStorage and memory).

**Validates: Requirements 8.5**

### Property 21: Keyword enhancement API call

*For any* valid job_id, calling the keyword enhancement API should return enhanced keywords including MeSH terms, broader terms, primary focus, and secondary focus keywords.

**Validates: Requirements 9.2**

### Property 22: Search string generation

*For any* set of selected primary and secondary keywords, the keyword string generator should return a formatted Boolean query string.

**Validates: Requirements 10.3**

### Property 23: Database search initiation

*For any* valid job_id and selected databases, the database search API should return a total count of reviewers found and search status for each database.

**Validates: Requirements 11.3**

### Property 24: Manual author search

*For any* author name with at least 2 characters, the manual author API should return a list of found authors with their details.

**Validates: Requirements 12.3**

### Property 25: Validation progress tracking

*For any* validation in progress, the validation status API should return progress percentage and estimated completion time.

**Validates: Requirements 13.2**

### Property 26: Validation score assignment

*For any* validated reviewer, the conditions_met score should be between 0 and 8 inclusive, representing the number of validation criteria satisfied.

**Validates: Requirements 13.3**

### Property 27: Reviewer sorting by score

*For any* list of recommended reviewers, the reviewers should be sorted by conditions_met score in descending order (highest scores first).

**Validates: Requirements 14.2**

### Property 28: Shortlist selection

*For any* set of selected reviewers, the shortlist should contain exactly those reviewers and no others.

**Validates: Requirements 15.3**

### Property 29: Export format generation

*For any* export request with format specification (CSV or JSON), the system should generate a file in the requested format containing all reviewer details.

**Validates: Requirements 16.2, 16.3**

### Property 30: Job ID persistence across workflow

*For any* process_id, the job_id stored after upload should be retrievable and usable for all subsequent API calls throughout the workflow.

**Validates: Requirements 18.2**

## Error Handling

### Error Types

The system handles the following error types:

1. **FILE_FORMAT_ERROR**: Invalid file type or size
   - Trigger: File extension not .doc/.docx or file size > 100MB
   - User Message: "Please upload a PDF or Word document (.pdf, .doc, .docx)" or "File size must be less than 100MB"
   - Recovery: User can select a different file

2. **NETWORK_ERROR**: Connection issues
   - Trigger: Network unavailable or request fails to reach server
   - User Message: "Network error. Please check your connection and try again."
   - Recovery: Automatic retry with exponential backoff (up to 3 attempts)

3. **TIMEOUT_ERROR**: Request timeout
   - Trigger: Request takes longer than configured timeout (120 seconds)
   - User Message: "The upload operation timed out. This may be due to large file processing or high server load."
   - Recovery: Automatic retry with exponential backoff

4. **EXTERNAL_API_ERROR**: API server errors (5xx)
   - Trigger: Server returns 500, 502, 503, 504
   - User Message: "ScholarFinder API is temporarily unavailable. Please try again in a few minutes."
   - Recovery: Automatic retry with exponential backoff

5. **AUTHENTICATION_ERROR**: Auth failures (401, 403)
   - Trigger: Invalid or expired authentication
   - User Message: "Authentication failed. Please log in again to continue."
   - Recovery: User must re-authenticate

### Error Handling Strategy

**Validation Errors** (FILE_FORMAT_ERROR):
- Caught before API call
- No retry attempted
- User must correct the issue

**Network Errors** (NETWORK_ERROR, TIMEOUT_ERROR):
- Automatic retry with exponential backoff
- Max 3 retry attempts
- Delay: 2s, 4s, 8s (capped at 30s)
- User sees loading state during retries

**Server Errors** (EXTERNAL_API_ERROR):
- Automatic retry for 5xx errors
- No retry for 4xx errors (except 429 rate limit)
- Rate limit errors respect Retry-After header

**State Management**:
- All errors reset upload state to 'error'
- Error message displayed in toast notification
- Upload progress reset to 0
- User can retry by selecting file again

### Error Recovery Flow

```
Upload Attempt
     │
     ├─ Validation Error ──> Display Error ──> Allow Retry
     │
     ├─ Network Error ──> Retry (3x) ──> Success or Display Error
     │
     ├─ Timeout Error ──> Retry (3x) ──> Success or Display Error
     │
     ├─ Server Error (5xx) ──> Retry (3x) ──> Success or Display Error
     │
     ├─ Client Error (4xx) ──> Display Error ──> Allow Retry
     │
     └─ Success ──> Store Job ID ──> Display Success ──> Next Step
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

**File Validation Tests**:
- Valid .doc file passes validation
- Valid .docx file passes validation
- Invalid file extensions (.pdf, .txt, .jpg) fail validation
- Files over 100MB fail validation
- Empty files (0 bytes) fail validation
- Case-insensitive extension matching (.DOC, .DOCX)

**Job ID Storage Tests**:
- setJobId stores in memory Map
- setJobId stores in localStorage with correct key format
- getJobId retrieves from memory when available
- getJobId falls back to localStorage when memory is empty
- Multiple process IDs can have different job IDs

**Error Handling Tests**:
- Network errors trigger retry logic
- Timeout errors trigger retry logic
- Server errors (5xx) trigger retry logic
- Client errors (4xx) do not trigger retry
- Error messages match error types

**State Management Tests**:
- Upload status transitions: idle → uploading → processing → completed
- Upload status transitions: idle → uploading → error
- Progress updates from 0 to 100
- Cancel resets state to idle
- Remove does not delete stored data

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using a PBT library (fast-check for TypeScript):

**Configuration**:
- Library: fast-check
- Minimum iterations per property: 100
- Each test tagged with property number and requirement

**Property Test Implementations**:

Each property test will:
1. Generate random valid inputs
2. Execute the operation
3. Verify the property holds
4. Report any counterexamples

**Test Organization**:
- Property tests in `__tests__/upload.property.test.ts`
- Unit tests in `__tests__/upload.test.ts`
- Integration tests in `__tests__/upload.integration.test.ts`

**Coverage Goals**:
- Unit tests: Specific examples and edge cases
- Property tests: Universal behaviors across all inputs
- Integration tests: End-to-end upload workflow

### Integration Testing

Integration tests will verify the complete upload workflow:

**Upload Flow Test**:
1. User selects file
2. File is validated
3. API request is sent
4. Response is received
5. Job ID is stored
6. Metadata is transformed
7. Caches are invalidated
8. Success notification is displayed
9. Callback is invoked
10. Workflow progresses to next step

**Error Recovery Test**:
1. Simulate network error
2. Verify retry attempts
3. Verify error message
4. Verify state reset
5. Verify user can retry

**Persistence Test**:
1. Upload file and store job ID
2. Simulate page refresh (clear memory)
3. Verify job ID retrieved from localStorage
4. Verify metadata can be fetched using retrieved job ID


### Workflow Components

The application uses dedicated components for each workflow step:

**1. FileUpload Component** (`src/components/upload/FileUpload.tsx`)
- Handles file selection and upload
- Displays progress and success/error states
- Triggers workflow progression to metadata extraction

**2. DataExtraction Component** (`src/components/extraction/DataExtraction.tsx`)
- Displays extracted metadata
- Allows metadata review and editing
- Shows title, authors, affiliations, keywords, abstract

**3. KeywordEnhancement Component** (`src/components/keywords/KeywordEnhancement.tsx`)
- Triggers keyword enhancement API call
- Displays MeSH terms, broader terms, primary/secondary keywords
- Allows keyword selection for search string generation
- Generates keyword search string

**4. ReviewerSearch Component** (`src/components/search/ReviewerSearch.tsx`)
- Displays generated search string
- Allows database selection (PubMed, TandFonline, ScienceDirect, WileyLibrary)
- Initiates database search
- Shows search progress and results count

**5. AuthorValidation Component** (`src/components/validation/AuthorValidation.tsx`)
- Allows manual author addition
- Initiates author validation
- Displays validation progress with percentage and estimated time
- Shows validation criteria and results

**6. ReviewerResults Component** (`src/components/results/ReviewerResults.tsx`)
- Displays validated reviewers sorted by conditions_met score
- Shows detailed reviewer information and validation scores
- Allows filtering by minimum score
- Allows searching by name, affiliation, country
- Enables reviewer selection for shortlist

**7. ShortlistExport Component** (`src/components/export/ShortlistExport.tsx`)
- Displays selected reviewers in shortlist
- Allows removal from shortlist
- Provides export options (CSV, JSON)
- Triggers file download

### React Query Hooks

**Location**: `src/hooks/useFiles.ts`

All hooks follow React Query patterns for data fetching and mutations:

```typescript
// Upload hook (mutation)
export const useFileUpload = () => useMutation({
  mutationFn: ({ processId, file, onProgress }) => 
    fileService.uploadFile(processId, file, onProgress),
  onSuccess: (_, { processId }) => {
    // Invalidate caches
  }
});

// Metadata hook (query)
export const useMetadata = (processId: string) => useQuery({
  queryKey: queryKeys.metadata.detail(processId),
  queryFn: () => fileService.getMetadata(processId),
  enabled: !!processId
});

// Keyword enhancement hook (mutation)
export const useEnhanceKeywords = () => useMutation({
  mutationFn: ({ processId }) => fileService.enhanceKeywords(processId),
  onSuccess: (_, { processId }) => {
    // Invalidate caches
  }
});

// Generate keyword string hook (mutation)
export const useGenerateKeywordString = () => useMutation({
  mutationFn: ({ processId, keywords }) => 
    fileService.generateKeywordString(processId, keywords),
  onSuccess: (_, { processId }) => {
    // Invalidate caches
  }
});

// Database search hook (mutation)
export const useSearchDatabases = () => useMutation({
  mutationFn: ({ processId, databases }) => 
    fileService.searchDatabases(processId, databases),
  onSuccess: (_, { processId }) => {
    // Invalidate caches
  }
});

// Manual author hook (mutation)
export const useAddManualAuthor = () => useMutation({
  mutationFn: ({ processId, authorName }) => 
    fileService.addManualAuthor(processId, authorName),
  onSuccess: (_, { processId }) => {
    // Invalidate caches
  }
});

// Validate authors hook (mutation)
export const useValidateAuthors = () => useMutation({
  mutationFn: ({ processId }) => fileService.validateAuthors(processId),
  onSuccess: (_, { processId }) => {
    // Invalidate caches
  }
});

// Validation status hook (query with polling)
export const useValidationStatus = (processId: string, enabled: boolean = true) => useQuery({
  queryKey: ['validation', processId],
  queryFn: () => fileService.getValidationStatus(processId),
  enabled: enabled && !!processId,
  refetchInterval: (query) => {
    // Poll every 5 seconds if validation is in progress
    const data = query.state.data;
    if (data?.validation_status === 'in_progress') {
      return 5000;
    }
    return false;
  }
});

// Recommendations hook (query)
export const useRecommendations = (processId: string, enabled: boolean = true) => useQuery({
  queryKey: ['recommendations', processId],
  queryFn: () => fileService.getRecommendations(processId),
  enabled: enabled && !!processId,
  staleTime: 5 * 60 * 1000
});
```

### Additional Data Models

#### KeywordEnhancementResponse

```typescript
interface KeywordEnhancementResponse {
  message: string;
  job_id: string;
  data: {
    mesh_terms: string[];
    broader_terms: string[];
    primary_focus: string[];
    secondary_focus: string[];
    additional_primary_keywords: string[];
    additional_secondary_keywords: string[];
    all_primary_focus_list: string[];
    all_secondary_focus_list: string[];
  };
}
```

#### KeywordStringResponse

```typescript
interface KeywordStringResponse {
  message: string;
  job_id: string;
  data: {
    search_string: string;
    primary_keywords_used: string[];
    secondary_keywords_used: string[];
  };
}
```

#### DatabaseSearchResponse

```typescript
interface DatabaseSearchResponse {
  message: string;
  job_id: string;
  data: {
    total_reviewers: number;
    databases_searched: string[];
    search_status: Record<string, 'success' | 'failed' | 'in_progress'>;
    preview_reviewers?: Reviewer[];
  };
}
```

#### ManualAuthorResponse

```typescript
interface ManualAuthorResponse {
  message: string;
  job_id: string;
  data: {
    found_authors: ManualAuthor[];
    search_term: string;
    total_found: number;
  };
}

interface ManualAuthor {
  name: string;
  email?: string;
  affiliation: string;
  country?: string;
  publications?: number;
}
```

#### ValidationResponse

```typescript
interface ValidationResponse {
  message: string;
  job_id: string;
  data: {
    validation_status: 'in_progress' | 'completed' | 'failed';
    progress_percentage: number;
    estimated_completion_time?: string;
    total_authors_processed: number;
    validation_criteria: string[];
    summary?: ValidationSummary;
  };
}

interface ValidationSummary {
  total_authors: number;
  authors_validated: number;
  conditions_applied: string[];
  average_conditions_met: number;
}
```

#### RecommendationsResponse

```typescript
interface RecommendationsResponse {
  message: string;
  job_id: string;
  data: {
    reviewers: Reviewer[];
    total_count: number;
    validation_summary: ValidationSummary;
  };
}
```

#### Reviewer (Complete Model)

```typescript
interface Reviewer {
  reviewer: string;
  email: string;
  aff: string;
  city: string;
  country: string;
  Total_Publications: number;
  English_Pubs: number;
  'Publications (last 10 years)': number;
  'Relevant Publications (last 5 years)': number;
  'Publications (last 2 years)': number;
  'Publications (last year)': number;
  Clinical_Trials_no: number;
  Clinical_study_no: number;
  Case_reports_no: number;
  Retracted_Pubs_no: number;
  TF_Publications_last_year: number;
  coauthor: boolean;
  country_match: string;
  aff_match: string;
  conditions_met: number;
  conditions_satisfied: string;
}
```

### Validation Criteria (8 Conditions)

The system validates reviewers against 8 criteria:

1. **Publications (last 10 years) ≥ 8**: Substantial recent research output
2. **Relevant Publications (last 5 years) ≥ 3**: Recent work in the field
3. **Publications (last 2 years) ≥ 1**: Currently active researcher
4. **English Publications > 50%**: Publishes primarily in English
5. **No Coauthorship**: Not coauthored with manuscript authors
6. **Different Affiliation**: Not from same institution
7. **Same Country**: From same country (geographic diversity)
8. **No Retracted Publications**: ≤ 1 retracted publication

Each reviewer receives a `conditions_met` score from 0-8 indicating how many criteria they satisfy.
