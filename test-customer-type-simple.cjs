const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testCustomerTypeEndpoints() {
  console.log('🧪 Testing Customer Type API Endpoints');
  console.log('============================================');
  
  try {
    // Test health endpoint first
    console.log('🔍 Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint accessible');
    
    // Test admin users endpoint (should work without auth for testing)
    console.log('🔍 Testing admin users endpoint...');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/api/admin/users?limit=5`);
      console.log('✅ Admin users endpoint accessible');
      console.log(`📊 Found ${usersResponse.data.data?.length || 0} users`);
      
      if (usersResponse.data.data && usersResponse.data.data.length > 0) {
        const testUser = usersResponse.data.data[0];
        console.log(`🧪 Testing with user: ${testUser.email} (ID: ${testUser.id})`);
        
        // Test customer type update
        console.log('🔍 Testing customer type update...');
        try {
          const customerTypeResponse = await axios.put(
            `${BASE_URL}/api/admin/users/${testUser.id}/customer-type`,
            { customerType: 'SPRINGER' }
          );
          console.log('✅ Customer type update endpoint works!');
          console.log('📝 Response:', customerTypeResponse.data);
        } catch (error) {
          console.log('⚠️ Customer type update failed:', error.response?.data?.message || error.message);
        }
        
        // Test MSXpert access update
        console.log('🔍 Testing MSXpert access update...');
        try {
          const msxpertResponse = await axios.put(
            `${BASE_URL}/api/admin/users/${testUser.id}/msxpert-access`,
            { msxpertAccess: true }
          );
          console.log('✅ MSXpert access update endpoint works!');
          console.log('📝 Response:', msxpertResponse.data);
        } catch (error) {
          console.log('⚠️ MSXpert access update failed:', error.response?.data?.message || error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Admin users endpoint failed:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    console.log('🔍 Make sure backend is running on port 3002');
  }
}

testCustomerTypeEndpoints().catch(console.error);