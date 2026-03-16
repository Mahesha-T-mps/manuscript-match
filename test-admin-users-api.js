// Test script to verify admin users API endpoint
import axios from 'axios';

async function testAdminUsersAPI() {
  try {
    console.log('Testing /api/admin/users endpoint...\n');
    
    // First, login as admin to get a token
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@test.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token\n');
    
    // Now fetch users with the admin token
    console.log('Step 2: Fetching users list...');
    const usersResponse = await axios.get('http://localhost:3002/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 1000
      }
    });
    
    console.log('✅ Users API response:');
    console.log('Success:', usersResponse.data.success);
    console.log('Total users:', usersResponse.data.pagination.total);
    console.log('Users count in data array:', usersResponse.data.data.length);
    console.log('\nFirst 5 users:');
    usersResponse.data.data.slice(0, 5).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role})`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAdminUsersAPI();
