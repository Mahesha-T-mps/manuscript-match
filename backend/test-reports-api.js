/**
 * Test script for Reports API
 * Tests the custom reports endpoints
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE';

async function testReportsAPI() {
  console.log('Testing Custom Reports API...\n');
  console.log('API URL:', API_URL);
  console.log('---\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Test 1: Get user reports
    console.log('Test 1: GET /api/reports/my-reports');
    try {
      const response = await axios.get(`${API_URL}/api/reports/my-reports`, { headers });
      console.log('✓ Success!');
      console.log('  Status:', response.status);
      console.log('  Total Processes:', response.data.data?.totalProcesses || 0);
      console.log('  Total Recommendations:', response.data.data?.totalRecommendations || 0);
      console.log('  Total Shortlisted:', response.data.data?.totalShortlisted || 0);
      console.log('  Reports Count:', response.data.data?.reports?.length || 0);
      console.log('');
    } catch (error) {
      console.log('✗ Failed:', error.response?.data?.error?.message || error.message);
      console.log('');
    }

    // Test 2: Get reports with date range
    console.log('Test 2: GET /api/reports/my-reports with date filter');
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30); // Last 30 days
      const dateTo = new Date();

      const response = await axios.get(`${API_URL}/api/reports/my-reports`, {
        headers,
        params: {
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        },
      });
      console.log('✓ Success!');
      console.log('  Status:', response.status);
      console.log('  Reports in last 30 days:', response.data.data?.reports?.length || 0);
      console.log('');
    } catch (error) {
      console.log('✗ Failed:', error.response?.data?.error?.message || error.message);
      console.log('');
    }

    // Test 3: Generate report for a process (needs valid processId)
    console.log('Test 3: POST /api/reports/generate/:id');
    console.log('  Note: Skipping - requires valid processId');
    console.log('  Usage: POST /api/reports/generate/{processId}');
    console.log('');

    // Test 4: Get date range reports
    console.log('Test 4: GET /api/reports/date-range');
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7); // Last 7 days
      const dateTo = new Date();

      const response = await axios.get(`${API_URL}/api/reports/date-range`, {
        headers,
        params: {
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        },
      });
      console.log('✓ Success!');
      console.log('  Status:', response.status);
      console.log('  Date groups:', response.data.data?.length || 0);
      console.log('');
    } catch (error) {
      console.log('✗ Failed:', error.response?.data?.error?.message || error.message);
      console.log('');
    }

    console.log('---');
    console.log('✓ Testing completed!');
    console.log('\nNote: To fully test, replace TEST_TOKEN with a valid JWT token');
    console.log('Get token by logging in through the frontend or API');

  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run tests
testReportsAPI();
