# Design Document

## Overview

This design addresses the connection failure issue in the ScholarFinder application by removing the hardcoded API base URL from the ScholarFinderApiService and implementing proper configuration management. The fix ensures that the service uses the same configuration pattern as the main ApiService, allowing for environment-specific API endpoints through environment variables.

The solution is minimal and focused: update the ScholarFinderApiService constructor to use the application's config module instead of a hardcoded URL, ensuring consistency across the application.

## Architecture

### Current Architecture Issue

The ScholarFinderApiService currently has a hardcoded base URL with HTTPS protocol:

```typescript
const defaultConfig: ScholarFinderApiConfig = {
  baseURL: 'https://192.168.61.60:8000', // Hardcoded with HTTPS
  timeout: 120000,
  retries: 3,
  retryDelay: 2000
};
```

However, the environment configuration specifies:
```env
VITE_SCHOLARFINDER_API_URL="http://192.168.61.60:8000"
```

This causes connection failures because:
1. Protocol mismatch: hardcoded HTTPS vs configured HTTP
2. The service doesn't read from VITE_SCHOLARFINDER_API_URL environment variable
3. It bypasses the application's configuration system
4. It prevents deployment to different environments without code changes

### Proposed Architecture

First, add VITE_SCHOLARFINDER_API_URL to the config module:

```typescript
// In src/lib/config.ts
export interface AppConfig {
  // ... existing fields
  scholarFinderApiUrl: string; // Add this field
}

// In loadConfig function
const scholarFinderApiUrl = getEnvVar('VITE_SCHOLARFINDER_API_URL', 'http://192.168.61.60:8000');
```

Then update ScholarFinderApiService to use it:

```typescript
import { config } from '../../../lib/config';

const defaultConfig: ScholarFinderApiConfig = {
  baseURL: config.scholarFinderApiUrl, // Use configured URL from env
  timeout: 120000,
  retries: 3,
  retryDelay: 2000
};
```

This ensures:
- Correct protocol (HTTP vs HTTPS) based on environment configuration
- Consistent configuration across all API services
- Environment-specific URLs through VITE_SCHOLARFINDER_API_URL
- No hardcoded values in the codebase

## Components and Interfaces

### ScholarFinderApiService

**Current Interface:**
```typescript
constructor(apiConfig?: Partial<ScholarFinderApiConfig>)
```

**Updated Implementation:**
- Import the config module from `@/lib/config`
- Use `config.apiBaseUrl` as the default baseURL
- Maintain backward compatibility for custom configurations
- Keep all other configuration defaults unchanged

### Configuration Module

**Changes required:**
- Add `scholarFinderApiUrl` field to AppConfig interface
- Load from VITE_SCHOLARFINDER_API_URL environment variable
- Default value of 'http://192.168.61.60:8000' for local development
- Export the new configuration value
- Existing URL validation will apply to the new field

## Data Models

No data model changes are required. The existing `ScholarFinderApiConfig` interface remains unchanged:

```typescript
interface ScholarFinderApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Configuration consistency

*For any* ScholarFinderApiService instance created without custom configuration, the baseURL should equal the application's configured ScholarFinder API URL (config.scholarFinderApiUrl) from the config module.

**Validates: Requirements 1.1, 1.2, 2.2, 3.1**

### Property 2: Configuration override preservation

*For any* custom ScholarFinderApiConfig provided to the constructor, the custom baseURL should be used instead of the default, while other unspecified properties should use default values.

**Validates: Requirements 2.3**

### Property 3: No hardcoded URLs

*For any* code path in ScholarFinderApiService, there should be no hardcoded IP addresses or URLs in the source code.

**Validates: Requirements 2.5**

## Error Handling

The existing error handling in ScholarFinderApiService is comprehensive and does not require changes. The service already handles:

- Network connection errors (NETWORK_ERROR)
- Timeout errors (TIMEOUT_ERROR)
- External API errors (EXTERNAL_API_ERROR)
- Authentication errors (AUTHENTICATION_ERROR)

These error handlers will continue to work correctly with the configuration change. If the configured API base URL is invalid or unreachable, the existing error handling will catch and report it appropriately.

## Testing Strategy

### Unit Tests

1. **Test default configuration loading**
   - Verify ScholarFinderApiService uses config.apiBaseUrl when no custom config provided
   - Verify the service can be instantiated successfully

2. **Test custom configuration override**
   - Verify custom baseURL overrides the default
   - Verify other config properties merge correctly

3. **Test configuration validation**
   - Verify the service handles invalid URLs gracefully
   - Verify error messages are clear and actionable

### Property-Based Tests

Property-based testing will use **fast-check** library for TypeScript. Each property-based test should run a minimum of 100 iterations.

1. **Property 1 test: Configuration consistency**
   - Generate random valid API base URLs
   - Set config.apiBaseUrl to each generated URL
   - Create ScholarFinderApiService without custom config
   - Verify the service's baseURL matches config.apiBaseUrl
   - **Tag: Feature: scholarfinder-api-connection-fix, Property 1: Configuration consistency**

2. **Property 2 test: Configuration override preservation**
   - Generate random valid custom configurations
   - Create ScholarFinderApiService with custom config
   - Verify custom baseURL is used
   - Verify unspecified properties use defaults
   - **Tag: Feature: scholarfinder-api-connection-fix, Property 2: Configuration override preservation**

### Integration Tests

1. **Test file upload with configured URL**
   - Mock the configured API base URL
   - Attempt file upload
   - Verify request goes to correct endpoint

2. **Test all API methods use configured URL**
   - Verify uploadManuscript, getMetadata, enhanceKeywords, etc. all use the configured base URL
   - Verify no requests go to hardcoded IP address

## Implementation Notes

### Minimal Change Approach

This fix requires:

**1. Update config module (src/lib/config.ts):**
- Add `scholarFinderApiUrl: string` to AppConfig interface
- Load it from VITE_SCHOLARFINDER_API_URL with default 'http://192.168.61.60:8000'
- Export the new field

**2. Update ScholarFinderApiService:**
```typescript
// Add import:
import { config } from '../../../lib/config';

// Change one line:
// Before:
baseURL: 'https://192.168.61.60:8000',

// After:
baseURL: config.scholarFinderApiUrl,
```

### Backward Compatibility

The change maintains full backward compatibility:
- Existing code that creates ScholarFinderApiService without parameters will work
- Existing code that provides custom configuration will continue to work
- All API methods remain unchanged
- All error handling remains unchanged

### Environment Configuration

The ScholarFinder API endpoint is already configured in the `.env` file:

```env
VITE_SCHOLARFINDER_API_URL="http://192.168.61.60:8000"
```

Developers and administrators can change this for different environments:

For local development with HTTP:
```env
VITE_SCHOLARFINDER_API_URL="http://192.168.61.60:8000"
```

For production with HTTPS:
```env
VITE_SCHOLARFINDER_API_URL="https://api.scholarfinder.com"
```

### Testing the Fix

After implementing the fix, verify:
1. File upload works in local development
2. API requests go to the configured URL (check browser network tab)
3. Error messages are clear if the backend is unreachable
4. The application works in different environments with different URLs
