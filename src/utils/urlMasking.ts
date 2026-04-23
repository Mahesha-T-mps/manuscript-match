/**
 * URL Masking and Security Utilities
 * Provides secure URL handling and session validation
 */

// Generate a secure session-based URL token
export const generateSecureToken = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  const sessionId = `${timestamp}-${random}`;
  return btoa(sessionId).replace(/[+/=]/g, ''); // Base64 encode and remove special chars
};

// Store secure session data
export const createSecureSession = (userId: string): string => {
  const token = generateSecureToken();
  const sessionData = {
    userId,
    timestamp: Date.now(),
    token,
    browserFingerprint: getBrowserFingerprint()
  };
  
  // Store in sessionStorage (not localStorage) so it's tab-specific
  sessionStorage.setItem('secure_session', JSON.stringify(sessionData));
  sessionStorage.setItem('session_token', token);
  
  return token;
};

// Validate secure session
export const validateSecureSession = (userId: string): boolean => {
  try {
    const sessionData = sessionStorage.getItem('secure_session');
    const sessionToken = sessionStorage.getItem('session_token');
    
    if (!sessionData || !sessionToken) {
      return false;
    }
    
    const session = JSON.parse(sessionData);
    const currentFingerprint = getBrowserFingerprint();
    
    // Validate session integrity
    if (
      session.userId !== userId ||
      session.token !== sessionToken ||
      session.browserFingerprint !== currentFingerprint ||
      Date.now() - session.timestamp > 24 * 60 * 60 * 1000 // 24 hours
    ) {
      clearSecureSession();
      return false;
    }
    
    return true;
  } catch {
    clearSecureSession();
    return false;
  }
};

// Clear secure session
export const clearSecureSession = (): void => {
  sessionStorage.removeItem('secure_session');
  sessionStorage.removeItem('session_token');
};

// Generate browser fingerprint for additional security
const getBrowserFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');
  
  return btoa(fingerprint).substring(0, 32);
};

// Generate masked URL
export const generateMaskedUrl = (originalPath: string, token: string): string => {
  const maskedPath = btoa(originalPath).replace(/[+/=]/g, '');
  return `/app/${maskedPath}?t=${token}`;
};

// Decode masked URL
export const decodeMaskedUrl = (maskedPath: string): string | null => {
  try {
    return atob(maskedPath);
  } catch {
    return null;
  }
};