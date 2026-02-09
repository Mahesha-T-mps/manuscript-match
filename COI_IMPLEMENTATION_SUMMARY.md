# COI (Conflict of Interest) Implementation Summary - COMPLETE WITH FASTAPI

## Overview
Successfully implemented **complete clickable COI functionality** with publications modal and **FastAPI backend integration** for each author in the Workflow Progress in Recommendations and Reviewer Recommendations sections. COI displays "Yes" or "No" based on author ID detection, and "Yes" entries are clickable to show detailed COI publications from COI_Report.xlsx via FastAPI endpoint.

## Implementation Details

### 1. Frontend Components

#### ProcessWorkflow Component (`src/components/process/ProcessWorkflow.tsx`)
- **Location**: VALIDATION step, in the "Recommended Reviewers" section
- **Features**:
  - **CLICKABLE COI**: "Conflict of Interest: Yes" is clickable (underlined)
  - **STATIC COI**: "Conflict of Interest: No" is static (not clickable)
  - Individual COI container for each reviewer
  - Visual indicators (green for No COI, red for Yes COI)
  - COI status badge next to reviewer name
  - **COI Publications Modal**: Opens when clicking "Yes" COI

#### ReviewerResults Component (`src/components/results/ReviewerResults.tsx`)
- **Location**: After the validation criteria section for each reviewer
- **Features**:
  - **CLICKABLE COI**: "Conflict of Interest: Yes" is clickable (underlined)
  - **STATIC COI**: "Conflict of Interest: No" is static (not clickable)
  - Visual status indicators with icons (✓ for No COI, ⚠ for Yes COI)
  - Centered, clean display
  - **COI Publications Modal**: Opens when clicking "Yes" COI

#### COI Publications Modal (`src/components/coi/COIPublicationsModal.tsx`)
- **COMPONENT**: Displays COI publication details from FastAPI
- **Features**:
  - Fetches data from FastAPI endpoint
  - Shows title, authors, affiliation, publication date
  - **NEW**: Displays COI source author (searched_author field)
  - Responsive modal with proper error handling
  - Loading states and empty states
  - Professional styling with red theme for COI warnings
  - **COI Source Highlighting**: Special red-themed section showing which author caused the conflict

### 2. FastAPI Backend Integration

#### FastAPI Endpoint (Your Implementation)
```python
@app.get("/coi_author_publications")
def coi_author_publications(
    job_id: str = Query(..., description="Unique job ID"),
    author_id: str = Query(..., description="Author ID from reviewer list")
):
    """Fetch COI publication details for a specific author_id"""
    # Reads COI_Report.xlsx from job directory
    # Filters by author_id
    # Returns publications with title, authors, affiliations, publication_date, searched_author
```

**FastAPI Features**:
- **Real Data**: Reads actual COI_Report.xlsx file from job directory
- **Excel Integration**: Uses pandas to read COI_Publications sheet
- **Data Filtering**: Filters publications by specific author_id
- **COI Source**: Includes `searched_author` field showing which author caused the COI
- **Error Handling**: Proper 404 responses for missing job_id or COI_Report.xlsx
- **JSON Response**: Returns structured JSON with job_id, author_id, coi_count, publications

### 3. API Integration (`src/features/scholarfinder/services/ScholarFinderApiService.ts`)
- **UPDATED METHOD**: `getCOIPublications(processId, authorId)`
- **Integration**: Uses FastAPI endpoint instead of Node.js backend
- **Endpoint**: `GET /coi_author_publications?job_id={jobId}&author_id={authorId}`
- **Data Source**: COI_Report.xlsx → COI_Publications sheet (real data via FastAPI)
- **Data Transformation**: Maps `affiliations` from FastAPI to `affiliation` for frontend
- **COI Source**: Includes `searched_author` field showing which author caused the conflict
- **Error Handling**: Graceful fallback to empty array on 404/errors

### 4. COI Logic Implementation (CLICKABLE WITH FASTAPI)
```typescript
// Author ID detection function
const hasAuthorId = (value: any) => {
  if (typeof value === 'string') {
    return /A\d+/.test(value);
  }
  return false;
};

// COI determination logic
const coiStatus = (reviewer.coi_coauthor === false || reviewer.coi_coauthor === 'FALSE' || reviewer.coi_coauthor === 'False') 
  ? 'No' 
  : hasAuthorId(reviewer.coi_coauthor) 
    ? 'Yes' 
    : 'No';

// FastAPI integration
const response = await this.makeRequest(
  'GET',
  `/coi_author_publications?job_id=${jobId}&author_id=${authorId}`,
  // ... other parameters
);
```

**Logic Rules (COMPLETE WITH FASTAPI)**:
- COI = **"No"** (static) if `coi_coauthor` is `false`, `'FALSE'`, or `'False'`
- COI = **"Yes"** (clickable) ONLY if `coi_coauthor` contains author ID pattern (A+numbers)
- COI = **"No"** (static) for all other values without author ID pattern
- **Clicking "Yes"** extracts author ID and calls FastAPI with job_id and author_id parameters

### 5. Visual Design (CLICKABLE)
- **No COI**: Green container, static text, "Conflict of Interest: No"
- **Yes COI**: Red container, clickable button with underline, "Conflict of Interest: Yes"
- **Hover Effects**: Opacity change on clickable COI entries
- **Modal**: Professional red-themed modal for COI publications from FastAPI
- **Accessibility**: Proper button semantics for clickable elements

## Files Created/Modified

### New Files:
1. `src/components/coi/COIPublicationsModal.tsx` - COI publications modal component

### Modified Files:
1. `src/components/process/ProcessWorkflow.tsx`
   - Added COI modal state and click handler
   - Made "Yes" COI clickable with underline styling
   - Added COIPublicationsModal import and usage

2. `src/components/results/ReviewerResults.tsx`
   - Added COI modal state and click handler
   - Made "Yes" COI clickable with underline styling
   - Added COIPublicationsModal import and usage

3. `src/features/scholarfinder/services/ScholarFinderApiService.ts`
   - **UPDATED**: `getCOIPublications()` method to use FastAPI endpoint
   - Uses `job_id` and `author_id` query parameters
   - Data transformation from FastAPI response format
   - Proper error handling for FastAPI responses

### FastAPI Backend (Your Implementation):
4. **FastAPI Endpoint**: `/coi_author_publications`
   - Reads COI_Report.xlsx from job directory
   - Filters publications by author_id
   - Returns real publication data

## Testing
- ✅ COI clickable logic tested with 8 different test cases - all passed
- ✅ Author ID extraction works correctly for modal display
- ✅ FastAPI endpoint tested and responding correctly
- ✅ Parameter validation working (job_id and author_id)
- ✅ Error handling for missing job_id and COI_Report.xlsx
- ✅ Frontend-FastAPI integration functional

**Logic correctly handles:**
- `false`, `'FALSE'`, `'False'` → "No" (static)
- Author IDs: `'A123'`, `'A456+A789'`, `'Some text A999 more text'` → "Yes" (clickable)
- Non-author ID values: `true`, `'B123'`, etc. → "No" (static)

## Usage
The **complete clickable COI functionality with FastAPI** will automatically appear for each reviewer in:
1. **Workflow Progress → Validation Step**: Clickable "Conflict of Interest: Yes" opens publications modal
2. **Reviewer Recommendations**: Clickable "Conflict of Interest: Yes" opens publications modal

**User Experience**:
- **Static COI**: "Conflict of Interest: No" - not clickable, normal text
- **Clickable COI**: "Conflict of Interest: Yes" - underlined, clickable button
- **Modal**: Shows detailed COI publications from FastAPI (real data from COI_Report.xlsx)
- **Data**: Displays title, authors, affiliation, publication date for each COI publication
- **COI Source**: Highlights which specific author caused the conflict (searched_author field)
- **Real-time**: Data comes directly from COI_Report.xlsx file via FastAPI

## Implementation Requirements Met:
- ✅ Separate container for COI for each author
- ✅ References `coi_coauthor` column from backend API
- ✅ COI displays **"No"** (static) if `coi_coauthor` is FALSE or False
- ✅ COI displays **"Yes"** (clickable) ONLY when `coi_coauthor` contains author ID (A+numbers)
- ✅ **CLICKABLE**: "Yes" COI entries are clickable with underline
- ✅ **STATIC**: "No" COI entries are not clickable
- ✅ **MODAL**: Clicking opens COI publications modal
- ✅ **FASTAPI INTEGRATION**: Complete FastAPI backend endpoint
- ✅ **REAL DATA**: Shows actual publications from COI_Report.xlsx
- ✅ **PARAMETER HANDLING**: Uses job_id and author_id parameters correctly
- ✅ **ERROR HANDLING**: Graceful error handling for missing files/data
- ✅ **COI SOURCE IDENTIFICATION**: Shows which specific author caused the conflict
- ✅ **SEARCHED AUTHOR FIELD**: Displays the searched_author from FastAPI response
- ✅ Implemented in both Workflow Progress and Reviewer Recommendations sections

## FastAPI Integration Details:
- **Endpoint**: `GET /coi_author_publications`
- **Parameters**: `job_id` (from fileService.getJobId) and `author_id` (extracted from coi_coauthor)
- **Data Source**: Reads COI_Report.xlsx from `BASE_DIR / job_id / COI_Report.xlsx`
- **Sheet**: COI_Publications sheet
- **Filtering**: Filters by author_id column
- **Response Format**:
  ```json
  {
    "job_id": "string",
    "author_id": "string", 
    "coi_count": number,
    "publications": [
      {
        "title": "string",
        "authors": "string",
        "affiliations": "string",
        "publication_date": "string",
        "searched_author": "string"
      }
    ]
  }
  ```

## Logic Verification (Complete FastAPI Implementation)
Tested with comprehensive test cases:
- `'A123'` → "Yes" (clickable, calls FastAPI with job_id and author_id=A123) ✅
- `'A456+A789'` → "Yes" (clickable, extracts A456, calls FastAPI) ✅
- `'Some text A999 more text'` → "Yes" (clickable, extracts A999, calls FastAPI) ✅
- `false`, `'FALSE'`, `'False'` → "No" (static, not clickable) ✅
- `true`, `'B123'` → "No" (static, not clickable) ✅
- FastAPI endpoint responds correctly with real COI publication data ✅
- Parameter validation and error handling working properly ✅

**FINAL RESULT**: Complete end-to-end COI functionality with clickable "Yes" entries that open a modal displaying real COI publications from COI_Report.xlsx via FastAPI, ready for production use.