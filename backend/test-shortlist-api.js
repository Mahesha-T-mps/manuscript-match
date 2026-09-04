/**
 * Test the shortlist API endpoint directly
 * This will verify if the backend shortlist creation works
 */

const axios = require('axios');

const API_URL = 'http://192.168.2.187:3002';

async function testShortlistAPI() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING SHORTLIST API ENDPOINT');
  console.log('='.repeat(80));

  try {
    // Step 1: Login to get a fresh token
    console.log('\n1. Logging in to get fresh token...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@test.com3',
      password: 'Asha@123'  // Update this with the actual password
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('   User:', loginResponse.data.data.user.email);
    console.log('   User ID:', loginResponse.data.data.user.id);

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // Step 2: Get user's processes
    console.log('\n2. Getting user processes...');
    const processesResponse = await axios.get(`${API_URL}/api/processes`, { headers });
    const processes = processesResponse.data.data;

    if (!processes || processes.length === 0) {
      console.log('❌ No processes found. Create a process first.');
      return;
    }

    console.log(`✅ Found ${processes.length} processes`);
    const testProcess = processes[0];
    console.log('   Using process:', testProcess.title);
    console.log('   Process ID:', testProcess.id);

    // Step 3: Get authors for this process
    console.log('\n3. Getting authors...');
    const authorsResponse = await axios.get(
      `${API_URL}/api/processes/${testProcess.id}/authors`,
      { headers }
    );
    const authors = authorsResponse.data.data;

    if (!authors || authors.length === 0) {
      console.log('❌ No authors found for this process.');
      console.log('   You need to add authors to the process first.');
      return;
    }

    console.log(`✅ Found ${authors.length} authors`);
    
    // Take first 3 authors for shortlist
    const authorIds = authors.slice(0, Math.min(3, authors.length)).map(a => a.id);
    console.log(`   Using ${authorIds.length} authors for shortlist`);
    authorIds.forEach((id, i) => {
      const author = authors.find(a => a.id === id);
      console.log(`   ${i + 1}. ${author.name} (${id})`);
    });

    // Step 4: Create shortlist
    console.log('\n4. Creating shortlist via API...');
    const shortlistData = {
      name: `Test Shortlist ${Date.now()}`,
      authorIds: authorIds
    };

    const shortlistResponse = await axios.post(
      `${API_URL}/api/processes/${testProcess.id}/shortlist`,
      shortlistData,
      { headers }
    );

    console.log('✅ Shortlist created successfully!');
    console.log('   Shortlist ID:', shortlistResponse.data.data.id);
    console.log('   Name:', shortlistResponse.data.data.name);
    console.log('   Process ID:', shortlistResponse.data.data.processId);
    console.log('   Created At:', shortlistResponse.data.data.createdAt);

    // Step 5: Verify in database
    console.log('\n5. Verifying shortlist in database...');
    console.log('   Run: node check-shortlist-data.js');
    console.log('   You should now see 1 shortlist in the database');

    console.log('\n' + '='.repeat(80));
    console.log('SUCCESS! The backend API works correctly!');
    console.log('='.repeat(80));
    console.log('\nThe problem is: The frontend is NOT calling this API.');
    console.log('Frontend only saves to localStorage, never to the backend database.');
    console.log('\nFix needed: Update frontend shortlistService to call backend API');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Login failed - check password');
    } else if (error.response?.status === 404) {
      console.log('\n📁 Process or authors not found');
    }
  }
}

testShortlistAPI();
