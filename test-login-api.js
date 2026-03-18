import fetch from 'node-fetch';

async function testLoginAPI() {
  try {
    console.log('🧪 Testing login API for kshitija.bhosekar@aje.com...');
    
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'kshitija.bhosekar@aje.com',
        password: 'Kshitija@9283'
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Login API test: SUCCESS');
      console.log('🎉 User can now login successfully!');
    } else {
      console.log('❌ Login API test: FAILED');
      console.log('Error details:', data);
    }
    
  } catch (error) {
    console.error('❌ Error testing login API:', error.message);
  }
}

testLoginAPI();