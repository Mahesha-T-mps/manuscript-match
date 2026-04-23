# Rate Limiting Configuration

This document explains the rate limiting configuration and how to resolve rate limit errors.

## Issue Description

The rate limit error occurs when the frontend makes too many API requests in a short period, exceeding the configured limits in the backend.

## Error Message
```
RATE_LIMIT_ERROR: Rate limit exceeded
```

## Root Cause

The admin dashboard makes multiple simultaneous API calls:
- `/api/admin/permissions`
- `/api/admin/stats`
- `/api/admin/users`
- `/api/auth/profile`
- `/api/auth/verify`

These requests can quickly exceed the rate limit, especially with the restrictive development settings.

## Configuration Files

### Backend Environment (backend/.env)
```properties
# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes window
RATE_LIMIT_MAX_REQUESTS=1000   # 1000 requests per window (increased from 100)
```

### Rate Limiter Middleware (backend/src/middleware/rateLimiter.ts)
- **General API**: 1000 requests per 15 minutes (10,000 in development)
- **Authentication**: 5 attempts per 15 minutes (50 in development)
- **File Upload**: 10 uploads per minute

### Security Middleware (backend/src/middleware/security.ts)
- **Admin API**: 100 requests per 15 minutes (1,000 in development)
- **Sensitive Admin**: 20 operations per hour (200 in development)

## Solutions Applied

### 1. Increased Rate Limits
- Changed from 100 to 1000 requests per 15-minute window
- Added 10x multiplier for development environment

### 2. Environment-Specific Limits
```typescript
max: config.env === 'development' ? config.rateLimit.maxRequests * 10 : config.rateLimit.maxRequests
```

### 3. More Lenient Auth Limits in Development
```typescript
max: config.env === 'development' ? 50 : 5
```

## How to Fix Rate Limit Errors

### Immediate Fix
1. **Restart the backend server** to apply new configuration:
   ```bash
   cd backend
   npm run dev
   ```

2. **Clear browser cache** to reset any cached rate limit state

3. **Wait 15 minutes** for the rate limit window to reset (if needed)

### Long-term Solutions

#### 1. Optimize Frontend API Calls
- Implement request batching
- Add request deduplication
- Use proper caching strategies
- Implement request queuing

#### 2. Adjust Rate Limits for Different Environments
```typescript
// Development: Very lenient
max: config.env === 'development' ? 10000 : 
     config.env === 'staging' ? 5000 : 1000
```

#### 3. Implement Request Optimization
- Combine multiple API calls into single endpoints
- Use GraphQL for efficient data fetching
- Implement proper loading states to prevent duplicate requests

## Environment-Specific Settings

### Development
- **General API**: 10,000 requests per 15 minutes
- **Authentication**: 50 attempts per 15 minutes
- **File Upload**: 10 uploads per minute
- **Admin API**: 1,000 requests per 15 minutes
- **Sensitive Admin**: 200 operations per hour

### Production
- **General API**: 1,000 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **File Upload**: 10 uploads per minute
- **Admin API**: 100 requests per 15 minutes
- **Sensitive Admin**: 20 operations per hour

### Test
- **All rate limiting disabled**

## Monitoring Rate Limits

### Backend Logs
Rate limit violations are logged with:
- Request URL and method
- IP address
- User agent
- Timestamp
- Error details

### Frontend Handling
```typescript
// Handle rate limit errors in API calls
if (error.response?.status === 429) {
  // Show user-friendly message
  // Implement retry with exponential backoff
  // Cache requests to avoid duplicates
}
```

## Best Practices

### For Development
1. Use generous rate limits to avoid blocking development
2. Monitor API call patterns in browser dev tools
3. Implement proper error handling for rate limits

### For Production
1. Set appropriate limits based on expected usage
2. Implement proper monitoring and alerting
3. Use CDN and caching to reduce API calls
4. Consider implementing user-specific rate limits

## Troubleshooting

### If Rate Limits Still Occur
1. Check if backend server restarted with new config
2. Verify environment variables are loaded correctly
3. Check for infinite loops in API calls
4. Monitor network tab for duplicate requests
5. Clear all browser storage and cookies

### Emergency Bypass
For urgent development needs, temporarily disable rate limiting:
```typescript
// In rateLimiter.ts
skip: () => config.env === 'development' || config.env === 'test'
```

## Configuration Verification

To verify current rate limit settings:
```bash
# Check backend environment
cd backend
cat .env | grep RATE_LIMIT

# Check if backend is using correct config
curl http://localhost:3002/api/health
```