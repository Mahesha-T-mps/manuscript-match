/**
 * Secure Route Component with URL Masking
 * Provides enhanced security for protected routes
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { validateSecureSession, clearSecureSession, decodeMaskedUrl } from '@/utils/urlMasking';

interface SecureRouteProps {
  children: React.ReactNode;
  originalPath: string;
}

export const SecureRoute: React.FC<SecureRouteProps> = ({ children, originalPath }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateAccess = async () => {
      setIsValidating(true);

      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        console.log('User not authenticated, redirecting to login');
        navigate('/', { replace: true });
        return;
      }

      // Validate secure session
      const hasValidSession = validateSecureSession(user.id);
      if (!hasValidSession) {
        console.log('Invalid secure session, redirecting to login');
        clearSecureSession();
        navigate('/', { replace: true });
        return;
      }

      // Validate session token from URL
      const urlToken = searchParams.get('t');
      const sessionToken = sessionStorage.getItem('session_token');
      
      if (!urlToken || urlToken !== sessionToken) {
        console.log('Invalid session token in URL, redirecting to login');
        clearSecureSession();
        navigate('/', { replace: true });
        return;
      }

      // All validations passed
      setIsAuthorized(true);
      setIsValidating(false);
    };

    if (!isLoading) {
      validateAccess();
    }
  }, [isAuthenticated, user, isLoading, navigate, searchParams]);

  // Show loading while validating
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Validating access...</span>
        </div>
      </div>
    );
  }

  // Show content only if authorized
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
};

/**
 * Masked Route Handler Component
 * Handles masked URLs and redirects to secure routes
 */
export const MaskedRouteHandler: React.FC = () => {
  const navigate = useNavigate();
  const { maskedPath } = useParams<{ maskedPath: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication first
    if (!isAuthenticated || !user) {
      navigate('/', { replace: true });
      return;
    }

    // Decode the masked path
    if (!maskedPath) {
      navigate('/', { replace: true });
      return;
    }

    const originalPath = decodeMaskedUrl(maskedPath);
    if (!originalPath) {
      navigate('/', { replace: true });
      return;
    }

    // Validate session
    const hasValidSession = validateSecureSession(user.id);
    if (!hasValidSession) {
      clearSecureSession();
      navigate('/', { replace: true });
      return;
    }

    // Validate token
    const urlToken = searchParams.get('t');
    const sessionToken = sessionStorage.getItem('session_token');
    
    if (!urlToken || urlToken !== sessionToken) {
      clearSecureSession();
      navigate('/', { replace: true });
      return;
    }

    // Redirect to the actual secure route with token
    navigate(`${originalPath}?t=${urlToken}`, { replace: true });
  }, [maskedPath, searchParams, navigate, isAuthenticated, user, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-gray-600">Redirecting...</span>
      </div>
    </div>
  );
};