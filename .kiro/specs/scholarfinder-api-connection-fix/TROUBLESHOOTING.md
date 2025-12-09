# Troubleshooting: "Failed to connect to ScholarFinder API"

## Issue
You're seeing the error: **"Failed to connect to ScholarFinder API during manuscript upload"**

## Root Cause Analysis

This error occurs when the frontend cannot reach the ScholarFinder API backend at the configured URL. The fix we implemented is working correctly (it's now using the configured URL from `.env`), but the backend server itself is not reachable.

## Diagnostic Steps

### 1. Check if the Backend is Running

The ScholarFinder API needs to be running at `http://192.168.61.60:8000`. 

**Check if the server is accessible:**

```bash
# Test if the server is reachable (Windows)
curl http://192.168.61.60:8000

# Or use PowerShell
Invoke-WebRequest -Uri "http://192.168.61.60:8000" -Method GET
```

**Expected Response:**
- If the server is running: You should get a response (even if it's an error, it means the server is reachable)
- If the server is NOT running: You'll get a connection timeout or "Unable to connect" error

### 2. Verify Network Connectivity

The IP address `192.168.61.60` suggests this is a local network server. Check:

```bash
# Ping the server
ping 192.168.61.60
```

**Possible Issues:**
- ❌ Server is not running
- ❌ Wrong IP address
- ❌ Firewall blocking the connection
- ❌ Network configuration changed

## Solutions

### Solution 1: Start the ScholarFinder Backend

If you have the ScholarFinder backend code, start it:

```bash
# Navigate to the backend directory
cd path/to/scholarfinder-backend

# Start the server (example commands, adjust based on your setup)
python app.py
# or
npm start
# or
docker-compose up
```

### Solution 2: Update the URL to Correct Backend

If the backend is running on a different address, update your `.env` file:

```env
# If running on localhost
VITE_SCHOLARFINDER_API_URL="http://localhost:8000"

# If running on a different IP
VITE_SCHOLARFINDER_API_URL="http://192.168.x.x:8000"

# If using a domain name
VITE_SCHOLARFINDER_API_URL="https://api.scholarfinder.com"
```

**After changing `.env`, you MUST restart the dev server:**

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Solution 3: Use Mock Data for Testing (Temporary)

If you don't have access to the backend right now, you can enable API mocking for testing:

1. Update `.env`:
```env
VITE_ENABLE_API_MOCKING="true"
```

2. Restart the dev server

**Note:** This is only for testing the frontend. You'll need the real backend for actual functionality.

### Solution 4: Check Firewall Settings

If the backend is running but you still can't connect:

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Ensure your backend application is allowed
4. Check both "Private" and "Public" networks

**Backend Server Firewall:**
- Ensure port 8000 is open on the backend server
- Check if the backend is configured to accept connections from your IP

### Solution 5: Verify Backend Configuration

Check if the backend is configured to accept requests from your frontend:

**CORS Configuration:**
The backend needs to allow requests from your frontend origin (e.g., `http://localhost:5173`).

**Backend should have CORS headers like:**
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Is the backend server running?
- [ ] Can you ping `192.168.61.60`?
- [ ] Can you access `http://192.168.61.60:8000` in your browser?
- [ ] Did you restart the frontend dev server after changing `.env`?
- [ ] Is the firewall blocking port 8000?
- [ ] Does the backend have CORS configured correctly?
- [ ] Is the IP address correct?

## Testing the Fix

Once you've resolved the connectivity issue, test the upload:

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Attempt file upload**
4. **Check the request:**
   - URL should be: `http://192.168.61.60:8000/upload_extract_metadata` (or your configured URL)
   - Status should be: 200 OK (if successful)
   - If it fails, check the error details in the Response tab

## Common Error Messages and Solutions

### "ERR_CONNECTION_REFUSED"
**Cause:** Backend server is not running or not listening on port 8000
**Solution:** Start the backend server

### "ERR_CONNECTION_TIMED_OUT"
**Cause:** Network issue or firewall blocking the connection
**Solution:** Check firewall settings and network connectivity

### "ERR_NAME_NOT_RESOLVED"
**Cause:** Invalid hostname or DNS issue
**Solution:** Use IP address instead of hostname, or fix DNS

### "CORS Error"
**Cause:** Backend not configured to accept requests from your frontend
**Solution:** Configure CORS on the backend

## Verifying the Configuration is Working

To confirm our fix is working correctly (using the configured URL):

1. Open Browser Console (F12 → Console)
2. Type:
```javascript
console.log('Configured URL:', import.meta.env.VITE_SCHOLARFINDER_API_URL);
```
3. You should see: `http://192.168.61.60:8000`

This confirms the configuration is being read correctly. The issue is purely connectivity to the backend.

## Next Steps

1. **Identify which solution applies to your situation**
2. **Apply the solution**
3. **Restart the frontend dev server** (if you changed `.env`)
4. **Test the file upload again**
5. **Check the Network tab** to verify the request is going to the correct URL

## Need More Help?

If you're still having issues, please provide:
- Is the backend server running? Where?
- What's the actual URL of the backend?
- Can you access the backend URL in your browser?
- What error do you see in the Network tab?

This will help diagnose the specific issue you're facing.
