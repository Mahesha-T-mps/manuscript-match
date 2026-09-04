/**
 * Test API with actual JWT token from browser
 * This will show us exactly what the backend sees
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://192.168.2.187:3002';

// PASTE YOUR TOKEN HERE (from browser localStorage)
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyYjNiNmI1Yy00YjZiLTRlZDEtYWY2NS1mNzBjY2E2MzU2YTciLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tMyIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTczMjUyMjA3NSwiZXhwIjoxNzMyNjA4NDc1fQ.ogW_cgqiuBN4oBzgef5xTb-_Rx7CtOAGKhYQ2PFlCjM';

async function testAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('JWT TOKEN TEST');
  console.log('='.repeat(60));
  
  // Decode token to see what's in it
  try {
    const decoded = jwt.decode(TOKEN);
    console.log('\n1. Decoded JWT Token:');
    console.log('   User ID (sub):', decoded.sub);
    console.log('   Email:', decoded.email);
    console.log('   Role:', decoded.role);
    console.log('   Issued At:', new Date(decoded.iat * 1000).toISOString());
    console.log('   Expires At:', new Date(decoded.exp * 1000).toISOString());
    
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      console.log('\n   ⚠️  WARNING: Token is EXPIRED!');
      console.log('   You need to login again to get a fresh token');
    }
  } catch (err) {
    console.error('Error decoding token:', err);
  }
  
  console.log('\n2. Testing API with this token...');
  
  try {
    const response = await axios.get(`${API_URL}/api/reports/my-reports`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    
    console.log('\n✅ API Response Success!');
    console.log('   Total Processes:', response.data.data.totalProcesses);
    console.log('   Total Recommendations:', response.data.data.totalRecommendations);
    console.log('   Total Shortlisted:', response.data.data.totalShortlisted);
    console.log('   Reports Count:', response.data.data.reports.length);
    
    if (response.data.data.reports.length > 0) {
      console.log('\n   First Report:');
      console.log('   - Process:', response.data.data.reports[0].processTitle);
      console.log('   - Recommendations:', response.data.data.reports[0].recommendationsCount);
      console.log('   - Shortlisted:', response.data.data.reports[0].shortlistedCount);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RESULT:');
    console.log('='.repeat(60));
    
    if (response.data.data.totalProcesses === 0) {
      console.log('❌ API is returning 0 values');
      console.log('\nPossible reasons:');
      console.log('1. Backend auth middleware is extracting wrong user ID');
      console.log('2. Token is expired or invalid');
      console.log('3. Backend is using different JWT_SECRET');
      console.log('\nNext step: Add console.log to backend auth middleware');
      console.log('to see what user ID it extracts from the token');
    } else {
      console.log('✅ API is working correctly!');
      console.log('The issue must be in the frontend');
    }
    
  } catch (error) {
    console.error('\n❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Token authentication failed!');
      console.log('   - Token might be expired');
      console.log('   - Backend JWT_SECRET might be different');
      console.log('   - Try logging in again');
    }
  }
}

testAPI();
