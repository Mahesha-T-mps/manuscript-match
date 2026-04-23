/**
 * Test script for Customer Type and MSXpert Access API endpoints
 * Run this script to test the new API functionality
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER_EMAIL = 'admin@test.com'; // Change this to a real user email
const TEST_PASSWORD = 'password123'; // Change this to the real password

let authToken = '';
let testUserId = '';

// Helper function to make authenticated requests
const apiRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const login = async () => {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
};

const getUsers = async () => {
  console.log('\n👥 Getting users...');
  try {
    const response = await apiRequest('GET', '/api/admin/users');
    const users = response.data.data;
    
    if (users && users.length > 0) {
      testUserId = users[0].id;
      console.log(`✅ Found ${users.length} users`);
      console.log(`📝 Test user: ${users[0].email} (ID: ${testUserId})`);
      console.log(`📊 Current customer type: ${users[0].userType || 'Not set'}`);
      console.log(`🔐 Current MSXpert access: ${users[0].msxpertAccess || false}`);
      return users[0];
    } else {
      console.log('⚠️ No users found');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get users');
    return null;
  }
};

const testUpdateCustomerType = async () => {
  console.log('\n🏢 Testing customer type update...');
  try {
    // Test updating to WILEY
    const response = await apiRequest('PUT', `/api/admin/users/${testUserId}/customer-type`, {
      customerType: 'WILEY'
    });
    
    console.log('✅ Customer type updated successfully');
    console.log('📊 Response:', response);
    
    // Test updating to SPRINGER
    const response2 = await apiRequest('PUT', `/api/admin/users/${testUserId}/customer-type`, {
      customerType: 'SPRINGER'
    });
    
    console.log('✅ Customer type updated back to SPRINGER');
    console.log('📊 Response:', response2);
    
    return true;
  } catch (error) {
    console.error('❌ Customer type update failed');
    return false;
  }
};

const testUpdateMSXpertAccess = async () => {
  console.log('\n🔐 Testing MSXpert access update...');
  try {
    // Test granting access
    const response = await apiRequest('PUT', `/api/admin/users/${testUserId}/msxpert-access`, {
      msxpertAccess: true
    });
    
    console.log('✅ MSXpert access granted successfully');
    console.log('📊 Response:', response);
    
    // Test revoking access
    const response2 = await apiRequest('PUT', `/api/admin/users/${testUserId}/msxpert-access`, {
      msxpertAccess: false
    });
    
    console.log('✅ MSXpert access revoked successfully');
    console.log('📊 Response:', response2);
    
    return true;
  } catch (error) {
    console.error('❌ MSXpert access update failed');
    return false;
  }
};

const testInvalidRequests = async () => {
  console.log('\n⚠️ Testing invalid requests...');
  
  // Test invalid customer type
  try {
    await apiRequest('PUT', `/api/admin/users/${testUserId}/customer-type`, {
      customerType: 'INVALID_TYPE'
    });
    console.log('❌ Should have failed with invalid customer type');
  } catch (error) {
    console.log('✅ Correctly rejected invalid customer type');
  }
  
  // Test invalid MSXpert access value
  try {
    await apiRequest('PUT', `/api/admin/users/${testUserId}/msxpert-access`, {
      msxpertAccess: 'not_a_boolean'
    });
    console.log('❌ Should have failed with invalid MSXpert access value');
  } catch (error) {
    console.log('✅ Correctly rejected invalid MSXpert access value');
  }
  
  // Test non-existent user
  try {
    await apiRequest('PUT', '/api/admin/users/non-existent-id/customer-type', {
      customerType: 'SPRINGER'
    });
    console.log('❌ Should have failed with non-existent user');
  } catch (error) {
    console.log('✅ Correctly rejected non-existent user');
  }
};

// Main test function
const runTests = async () => {
  console.log('🧪 Starting Customer Type & MSXpert Access API Tests');
  console.log('=' .repeat(60));
  
  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot continue without authentication');
    return;
  }
  
  // Get users
  const testUser = await getUsers();
  if (!testUser) {
    console.log('❌ Cannot continue without test user');
    return;
  }
  
  // Test customer type updates
  const customerTypeSuccess = await testUpdateCustomerType();
  
  // Test MSXpert access updates
  const msxpertAccessSuccess = await testUpdateMSXpertAccess();
  
  // Test invalid requests
  await testInvalidRequests();
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`🔐 Login: ${loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`👥 Get Users: ${testUser ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🏢 Customer Type Update: ${customerTypeSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔐 MSXpert Access Update: ${msxpertAccessSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (loginSuccess && testUser && customerTypeSuccess && msxpertAccessSuccess) {
    console.log('\n🎉 All tests passed! The API endpoints are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the backend server and database.');
  }
};

// Run the tests
runTests().catch(console.error);