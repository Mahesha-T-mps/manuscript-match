/**
 * Configuration Verification Script
 * Run this to verify environment variables are loaded correctly
 */

console.log('🔍 Verifying Environment Configuration...\n');

console.log('Environment Variables:');
console.log('=====================');
console.log(`VITE_API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL || 'NOT SET'}`);
console.log(`VITE_SCHOLARFINDER_API_URL: ${import.meta.env.VITE_SCHOLARFINDER_API_URL || 'NOT SET'}`);
console.log(`MODE: ${import.meta.env.MODE}`);
console.log(`DEV: ${import.meta.env.DEV}`);
console.log('\n');

// Check if using localhost (wrong for network testing)
if (import.meta.env.VITE_API_BASE_URL?.includes('localhost')) {
  console.log('⚠️  WARNING: API Base URL is set to localhost!');
  console.log('   This will not work for network testing.');
  console.log('   Expected: http://10.1.0.103:3002');
  console.log('   Actual: ' + import.meta.env.VITE_API_BASE_URL);
  console.log('\n   Please:');
  console.log('   1. Update .env.development');
  console.log('   2. Restart the dev server');
  console.log('   3. Clear browser cache\n');
} else {
  console.log('✅ API Base URL is configured for network access');
  console.log('   URL: ' + import.meta.env.VITE_API_BASE_URL);
}

console.log('\n');
console.log('Next Steps:');
console.log('===========');
console.log('1. Ensure backend is running on 0.0.0.0:3002');
console.log('2. Test backend: http://10.1.0.103:3002/health');
console.log('3. Clear browser cache and reload');
console.log('4. Try logging in again');
