import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ProfileButton } from '@/components/profile/ProfileButton';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mpsLogo from '@/assets/mps_logo_transparent1.png';
import scholarFinderLogo from '@/assets/s3 2.png';

export const MPSLogoBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Determine what to show based on the current page
  const isLoginPage = location.pathname === '/' || location.pathname === '/login';
  const isAppSelectorPage = location.pathname === '/apps' || location.pathname === '/select';
  const isAuthenticated = user && !isLoginPage;
  
  // Show different layouts for different pages
  const showScholarFinderBranding = isAuthenticated && !isAppSelectorPage;
  const showApplicationPortalButton = isAuthenticated && !isAppSelectorPage;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-md border-b">
      <div className="flex justify-between items-center h-16 px-6">
        {/* Left side - ScholarFinder Logo (only when inside ScholarFinder/MSXpert apps) */}
        {showScholarFinderBranding && (
          <div className="flex items-center space-x-3">
            <img 
              src={scholarFinderLogo} 
              alt="ScholarFinder Logo" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold">ScholarFinder</h1>
          </div>
        )}
        
        {/* Center spacer */}
        <div className="flex-1" />
        
        {/* Right side - User controls and MPS Logo */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && (
            <>
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <span className="text-xs font-medium text-primary uppercase">
                {user?.role}
              </span>
              {user?.msxpertAccess && (
                <span className="text-xs text-green-600 font-medium">
                  • MSXpert Access
                </span>
              )}
              {showApplicationPortalButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/apps')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Application Portal
                </Button>
              )}
              <ProfileButton variant="minimal" showLabel={false} />
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          )}
          
          {/* MPS Logo - Always visible */}
          <img 
            src={mpsLogo} 
            alt="MPS Logo" 
            className="h-12 w-auto object-contain ml-4"
          />
        </div>
      </div>
    </div>
  );
};
