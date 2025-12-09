# Manual Author Search Debugging Guide

## Implementation Summary

The Manual Author Search feature has been implemented to use the `/manual_authors` API endpoint correctly.

### API Endpoint Details

**Endpoint**: `POST /manual_authors`

**Request Format**:
- Method: POST
- URL: `https://192.168.61.60:8000/manual_authors?job_id={jobId}`
- Content-Type: `application/x-www-form-urlencoded`
- Body: `author_name={authorName}`

**Success Response** (200):
```json
{
  "message": "Author 'name' added successfully.",
  "job_id": "job_id",
  "author_data": {
    "author": "name",
    "email": "email@example.com",
    "aff": "University Name",
    "city": "City",
    "country": "Country"
  }
}
```

**Error Response** (404):
```json
{
  "error": "Author 'name' not found or missing email/affiliation."
}
```

## Debugging Steps

### 1. Check Browser Console

Open the browser developer tools (F12) and check the Console tab for these log messages:

```
[fileService] searchManualAuthor called: { processId: "...", authorName: "..." }
[fileService] Retrieved jobId: "job_..."
[ScholarFinderAPI] Manual author search request: { jobId: "...", authorName: "...", url: "...", formData: "..." }
[ScholarFinderAPI] Manual author search response: { ... }
```

### 2. Check Network Tab

In the Network tab, look for the request to `/manual_authors`:

**Check Request**:
- URL should be: `https://192.168.61.60:8000/manual_authors?job_id=job_...`
- Method: POST
- Request Headers should include: `Content-Type: application/x-www-form-urlencoded`
- Request Body should be: `author_name=John+Smith` (URL encoded)

**Check Response**:
- Status: 200 (success) or 404 (not found)
- Response body should match the format above

### 3. Common Issues and Solutions

#### Issue 1: "No job ID found for this process"
**Cause**: The process doesn't have a job_id stored
**Solution**: 
1. Make sure you've uploaded a file first in the Upload step
2. Check localStorage for `process_{processId}_jobId`
3. Verify the upload step completed successfully

#### Issue 2: Network Error / CORS Error
**Cause**: Cannot connect to the API server
**Solution**:
1. Verify the API server is running at `https://192.168.61.60:8000`
2. Check if CORS is properly configured on the server
3. Try accessing `https://192.168.61.60:8000/docs` in your browser

#### Issue 3: 404 - Author Not Found
**Cause**: PubMed search didn't find the author or missing email/affiliation
**Solution**:
1. Try a different author name
2. Use full names (e.g., "John Smith" instead of "J. Smith")
3. Try well-known researchers in your field
4. Check the Python API logs to see what PubMed returned

#### Issue 4: Timeout Error
**Cause**: PubMed search is taking longer than 60 seconds
**Solution**:
1. This is expected for some searches
2. Try again with a different name
3. Check if PubMed is accessible from the server

#### Issue 5: Response Format Error
**Cause**: API response doesn't match expected format
**Solution**:
1. Check the actual response in Network tab
2. Verify the Python API is returning `author_data` field
3. Check if the response structure matches the interface

### 4. Test with Known Author

Try searching for a well-known researcher to test the functionality:
- "Anthony Fauci"
- "Francis Collins"
- "Jennifer Doudna"

### 5. Check API Server Logs

On the server running the Python API, check the logs for:
```
manual_authors started for job_id: ..., author: ...
PubMed search result - email: ..., affiliation: ...
Added author '...' to author_email_df_before_val.csv
```

## Code Flow

1. User enters author name in `ManualSearch` component
2. Component calls `useAddManualAuthor` hook
3. Hook calls `fileService.searchManualAuthor(processId, authorName)`
4. fileService retrieves `jobId` from storage
5. fileService calls `scholarFinderApiService.searchManualAuthor(jobId, authorName)`
6. API service makes POST request to `/manual_authors?job_id={jobId}`
7. Python API searches PubMed for author
8. Python API returns author data
9. Response flows back through the chain
10. Component displays author details

## Quick Test

To quickly test if the API is working, you can use curl:

```bash
curl -X POST "https://192.168.61.60:8000/manual_authors?job_id=YOUR_JOB_ID" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "author_name=Anthony Fauci"
```

Replace `YOUR_JOB_ID` with an actual job ID from a previous upload.

## What to Report

If the issue persists, please provide:
1. Console logs (all messages starting with `[fileService]` or `[ScholarFinderAPI]`)
2. Network request details (URL, headers, body)
3. Network response details (status, headers, body)
4. Any error messages shown in the UI
5. The author name you're searching for
6. The processId being used
