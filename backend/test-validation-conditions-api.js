/**
 * Test script to verify validation conditions API endpoints
 * Run with: node test-validation-conditions-api.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test credentials - replace with actual admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function testAPIs() {
  console.log('🔍 Testing Validation Conditions API Endpoints...\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      console.error('   ❌ Login failed:', loginResponse.status, loginResponse.statusText);
      console.log('   💡 Make sure backend is running: cd backend && npm run dev');
      console.log('   💡 Update ADMIN_EMAIL and ADMIN_PASSWORD in this script');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    if (!token) {
      console.error('   ❌ No token in response');
      return;
    }

    console.log('   ✓ Login successful\n');

    // Step 2: Test user endpoint
    console.log('2. Testing GET /api/user/me/validation-conditions...');
    const userResponse = await fetch(`${BASE_URL}/api/user/me/validation-conditions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      console.error('   ❌ User endpoint failed:', userResponse.status, userResponse.statusText);
      const text = await userResponse.text();
      console.error('   Response:', text.substring(0, 200));
      return;
    }

    const userData = await userResponse.json();
    console.log('   ✓ User endpoint working');
    console.log('   User Type:', userData.data?.userType);
    console.log('   Conditions:', userData.data?.conditions?.length || 0);
    console.log();

    // Step 3: Test admin endpoint - get all
    console.log('3. Testing GET /api/admin/validation-conditions...');
    const adminAllResponse = await fetch(`${BASE_URL}/api/admin/validation-conditions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!adminAllResponse.ok) {
      console.error('   ❌ Admin all endpoint failed:', adminAllResponse.status);
      return;
    }

    const adminAllData = await adminAllResponse.json();
    console.log('   ✓ Admin all endpoint working');
    console.log('   Total conditions:', adminAllData.data?.length || 0);
    console.log();

    // Step 4: Test admin endpoint - specific user type
    console.log('4. Testing GET /api/admin/validation-conditions/SPRINGER...');
    const adminSpringerResponse = await fetch(`${BASE_URL}/api/admin/validation-conditions/SPRINGER`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!adminSpringerResponse.ok) {
      console.error('   ❌ Admin SPRINGER endpoint failed:', adminSpringerResponse.status);
      return;
    }

    const adminSpringerData = await adminSpringerResponse.json();
    console.log('   ✓ Admin SPRINGER endpoint working');
    console.log('   SPRINGER conditions:', adminSpringerData.data?.length || 0);
    
    if (adminSpringerData.data && adminSpringerData.data.length > 0) {
      const enabled = adminSpringerData.data.filter(c => c.isEnabled).length;
      console.log('   Enabled:', enabled);
      console.log('   Disabled:', adminSpringerData.data.length - enabled);
    }
    console.log();

    // Success
    console.log('✅ All API endpoints are working correctly!\n');
    console.log('📝 Summary:');
    console.log('   - User endpoint: ✓ Working');
    console.log('   - Admin all endpoint: ✓ Working');
    console.log('   - Admin user type endpoint: ✓ Working');
    console.log('\n🎉 APIs are ready for frontend to use!');

  } catch (error) {
    console.error('\n❌ Error testing APIs:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure backend is running: cd backend && npm run dev');
    console.log('   2. Check backend is on port 3000');
    console.log('   3. Update ADMIN_EMAIL and ADMIN_PASSWORD in this script');
    console.log('   4. Check backend logs for errors');
  }
}

// Run tests
testAPIs();
