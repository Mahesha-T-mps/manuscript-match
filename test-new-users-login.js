import fetch from 'node-fetch';

async function testNewUsersLogin() {
  try {
    console.log('🧪 Testing login for newly created MPS users...');
    
    // Test a few sample users
    const testUsers = [
      { email: 'sakshi.jha@mpslimited.com', password: 'Sakshi7819' },
      { email: 'sulekha.rani@mpslimited.com', password: 'Sulekha3948' },
      { email: 'nandhini.k@mpslimited.com', password: 'Nandhini4260' },
      { email: 'deepika.sukumaran@mpslimited.com', password: 'Deepika1800' }
    ];
    
    for (const user of testUsers) {
      console.log(`\n🔍 Testing login for: ${user.email}`);
      
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Login successful for ${user.email}`);
        console.log(`   User ID: ${data.data.user.id}`);
        console.log(`   Role: ${data.data.user.role}`);
      } else {
        console.log(`❌ Login failed for ${user.email}`);
        console.log(`   Error: ${data.message || 'Unknown error'}`);
      }
    }
    
    console.log('\n🎉 All new users should be able to login with their generated credentials!');
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testNewUsersLogin();