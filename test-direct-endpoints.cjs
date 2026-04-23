const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testDirectEndpoints() {
  console.log('🧪 Testing Customer Type Endpoints Directly');
  console.log('=============================================');
  
  try {
    // Test admin users endpoint directly
    console.log('🔍 Testing admin users endpoint...');
    const usersResponse = await axios.get(`${BASE_URL}/api/admin/users?limit=5`);
    console.log('✅ Admin users endpoint works!');
    console.log(`📊 Found ${usersResponse.data.data?.length || 0} users`);
    
    if (usersResponse.data.data && usersResponse.data.data.length > 0) {
      const testUser = usersResponse.data.data[0];
      console.log(`🧪 Testing with user: ${testUser.email} (ID: ${testUser.id})`);
      
      // Test customer type update
      console.log('🔍 Testing customer type update...');
      const customerTypeResponse = await axios.put(
        `${BASE_URL}/api/admin/users/${testUser.id}/customer-type`,
        { customerType: 'SPRINGER' }
      );
      console.log('✅ Customer type update works!');
      console.log('📝 Response:', customerTypeResponse.data);
      
      // Test MSXpert access update
      console.log('🔍 Testing MSXpert access update...');
      const msxpertResponse = await axios.put(
        `${BASE_URL}/api/admin/users/${testUser.id}/msxpert-access`,
        { msxpertAccess: true }
      );
      console.log('✅ MSXpert access update works!');
      console.log('📝 Response:', msxpertResponse.data);
      
      console.log('');
      console.log('🎉 SUCCESS: All customer type endpoints are working!');
      console.log('✅ Customer type management is fully functional');
      console.log('✅ MSXpert access management is fully functional');
      
    } else {
      console.log('⚠️ No users found in database');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.log('🔐 Authentication required - this is expected for admin endpoints');
    }
  }
}

testDirectEndpoints().catch(console.error);