/**
 * Network Connectivity Test Script
 * Tests connectivity to both backend APIs from network
 */

const testConnectivity = async () => {
  const endpoints = [
    {
      name: 'Main Backend API',
      url: 'http://10.1.0.103:3002/api/health', // Adjust this to your actual health endpoint
      fallback: 'http://10.1.0.103:3002'
    },
    {
      name: 'ScholarFinder API',
      url: 'http://10.1.0.103:8000/health', // Adjust this to your actual health endpoint
      fallback: 'http://10.1.0.103:8000'
    }
  ];

  console.log('🔍 Testing network connectivity...\n');

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}:`);
    console.log(`URL: ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name} is accessible`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
      } else {
        console.log(`⚠️  ${endpoint.name} responded with error`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} is not accessible`);
      console.log(`   Error: ${error.message}`);
      
      // Try fallback URL
      try {
        console.log(`   Trying fallback: ${endpoint.fallback}`);
        const fallbackResponse = await fetch(endpoint.fallback, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        console.log(`   Fallback status: ${fallbackResponse.status}`);
      } catch (fallbackError) {
        console.log(`   Fallback also failed: ${fallbackError.message}`);
      }
    }
    console.log('');
  }

  // Test CORS
  console.log('🌐 Testing CORS...');
  try {
    const corsResponse = await fetch('http://10.1.0.103:3002', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log(`CORS preflight status: ${corsResponse.status}`);
    console.log('CORS headers:', Object.fromEntries(corsResponse.headers.entries()));
  } catch (corsError) {
    console.log(`CORS test failed: ${corsError.message}`);
  }
};

// Run the test
testConnectivity().catch(console.error);