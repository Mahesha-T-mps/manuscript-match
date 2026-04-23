import axios from 'axios';

async function testUserTypeAPI() {
  try {
    console.log('🧪 Testing User Type API Implementation...\n');
    
    const baseURL = 'http://localhost:3002/api';
    
    // Test users with different types
    const testUsers = [
      { email: 'springer.test@example.com', password: 'password123', expectedType: 'SPRINGER' },
      { email: 'wiley.test@example.com', password: 'password123', expectedType: 'WILEY' },
      { email: 'f1000.test@example.com', password: 'password123', expectedType: 'F1000' },
      { email: 'dmp.test@example.com', password: 'password123', expectedType: 'DMP' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n📝 Testing ${testUser.expectedType} user: ${testUser.email}`);
      
      try {
        // Login
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
        
        if (loginResponse.data.success) {
          const { user, token } = loginResponse.data.data;
          console.log(`✅ Login successful`);
          console.log(`   User ID: ${user.id}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   User Type: ${user.userType || 'NOT SET'}`);
          
          // Verify userType matches expected
          if (user.userType === testUser.expectedType) {
            console.log(`✅ User type matches expected: ${testUser.expectedType}`);
          } else {
            console.log(`❌ User type mismatch. Expected: ${testUser.expectedType}, Got: ${user.userType}`);
          }
          
          // Test profile endpoint
          const profileResponse = await axios.get(`${baseURL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (profileResponse.data.success) {
            const profile = profileResponse.data.data;
            console.log(`✅ Profile endpoint working`);
            console.log(`   Profile User Type: ${profile.userType || 'NOT SET'}`);
            
            if (profile.userType === testUser.expectedType) {
              console.log(`✅ Profile user type matches expected: ${testUser.expectedType}`);
            } else {
              console.log(`❌ Profile user type mismatch. Expected: ${testUser.expectedType}, Got: ${profile.userType}`);
            }
          } else {
            console.log(`❌ Profile endpoint failed: ${profileResponse.data.message}`);
          }
          
        } else {
          console.log(`❌ Login failed: ${loginResponse.data.message}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${testUser.email}:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n🎉 User Type API testing completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testUserTypeAPI();