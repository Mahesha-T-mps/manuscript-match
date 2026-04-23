# Backend Restart Instructions

To apply the rate limiting fixes, you need to restart the backend server.

## Quick Restart

### Option 1: Using Terminal
```bash
# Navigate to backend directory
cd backend

# Stop current server (Ctrl+C if running in terminal)
# Then start again
npm run dev
```

### Option 2: Using Task Manager (Windows)
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Node.js JavaScript Runtime" processes
3. End all Node.js processes
4. Navigate to backend folder in terminal
5. Run `npm run dev`

### Option 3: Using Command Line
```cmd
# Kill all Node.js processes (Windows)
taskkill /f /im node.exe

# Navigate to backend and restart
cd backend
npm run dev
```

## Verify the Fix

After restarting, the rate limits should be:

### Development Environment
- **Admin API**: 1,000 requests per 15 minutes (was 100)
- **General API**: 10,000 requests per 15 minutes
- **Authentication**: 50 attempts per 15 minutes

### Check if Backend is Running
```bash
# Test if backend is responding
curl http://localhost:3002/api/health

# Or open in browser
http://localhost:3002/api/health
```

## Troubleshooting

### If Rate Limits Still Occur
1. **Verify Environment**: Check that `NODE_ENV=development` in `backend/.env`
2. **Clear Cache**: Clear browser cache and localStorage
3. **Wait**: Wait 15 minutes for rate limit window to reset
4. **Check Logs**: Look for "Rate limit exceeded" messages in backend console

### If Backend Won't Start
1. **Check Port**: Ensure port 3002 is not in use
2. **Check Dependencies**: Run `npm install` in backend directory
3. **Check Environment**: Verify all required environment variables are set
4. **Check Database**: Ensure database file exists and is accessible

## Expected Behavior After Fix

✅ **Should Work**: Admin dashboard loads without rate limit errors
✅ **Should Work**: Multiple API calls complete successfully
✅ **Should Work**: Normal application usage without interruption

❌ **Still Protected**: Actual abuse attempts are still blocked
❌ **Still Secure**: Production limits remain strict for security