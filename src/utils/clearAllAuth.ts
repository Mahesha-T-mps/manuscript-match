/**
 * Utility to completely clear all authentication data from localStorage
 * Use this to ensure clean authentication state
 */

export const clearAllAuthenticationData = (): void => {
  // Clear ScholarFinder auth data
  localStorage.removeItem('scholarfinder_auth_token');
  localStorage.removeItem('scholarfinder_user');
  localStorage.removeItem('scholarfinder_refresh_token');
  localStorage.removeItem('scholarfinder_session');
  
  // Clear any generic auth tokens
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('session');
  
  // Clear secure session data
  sessionStorage.removeItem('secure_session');
  sessionStorage.removeItem('session_token');
  
  // Clear any other potential auth-related keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('user') || key.includes('session')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('All authentication data cleared from localStorage');
};

export const clearScholarFinderAuth = (): void => {
  localStorage.removeItem('scholarfinder_auth_token');
  localStorage.removeItem('scholarfinder_user');
  localStorage.removeItem('scholarfinder_refresh_token');
  localStorage.removeItem('scholarfinder_session');
  console.log('ScholarFinder authentication data cleared');
};