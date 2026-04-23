import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Lock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/s3 2.png";

const AuthenticatedAppSelector = () => {
  const navigate = useNavigate();
  const { user, logout, navigateSecurely } = useAuth();
  const { toast } = useToast();

  const handleScholarFinderClick = () => {
    navigateSecurely('/scholarfinder');
  };

  const handleMSXpertClick = () => {
    if (!user?.msxpertAccess && user?.role !== 'ADMIN') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access MSXpert. Please contact an administrator.',
        variant: 'destructive',
      });
      return;
    }
    
    navigateSecurely('/msxpert/app');
  };

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

  const canAccessMSXpert = user?.msxpertAccess || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-academic-light flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center space-x-3 flex-1">
              <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
              <h1 className="text-4xl font-bold text-foreground">Application Portal</h1>
            </div>
            
            {/* User Info and Logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role} • {user?.userType}
                  {canAccessMSXpert && <span className="ml-1 text-green-600">• MSXpert Access</span>}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">Choose your application to continue</p>
        </div>

        {/* Application Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* ScholarFinder Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleScholarFinderClick}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">ScholarFinder</CardTitle>
              <CardDescription className="text-base">
                Academic manuscript and scholar matching platform
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full">
                Access ScholarFinder
              </Button>
            </CardContent>
          </Card>

          {/* MSXpert Card */}
          <Card className={`hover:shadow-lg transition-shadow ${canAccessMSXpert ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`} 
                onClick={handleMSXpertClick}>
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${
                canAccessMSXpert ? 'bg-secondary/10' : 'bg-gray-100'
              }`}>
                {canAccessMSXpert ? (
                  <Users className="w-8 h-8 text-secondary" />
                ) : (
                  <Lock className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                <span>MSXpert</span>
                {!canAccessMSXpert && <Lock className="w-5 h-5 text-gray-400" />}
              </CardTitle>
              <CardDescription className="text-base">
                {canAccessMSXpert 
                  ? 'Expert management and consultation platform'
                  : 'Access restricted - Contact administrator'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                className="w-full" 
                disabled={!canAccessMSXpert}
                variant={canAccessMSXpert ? "default" : "secondary"}
              >
                {canAccessMSXpert ? 'Access MSXpert' : 'Access Restricted'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Access Info */}
        <div className="text-center mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Access Information</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• ScholarFinder: Available to all authenticated users</p>
              <p>• MSXpert: {canAccessMSXpert 
                ? 'You have access to MSXpert' 
                : 'Restricted access - Contact your administrator to request MSXpert access'
              }</p>
              {user?.role === 'ADMIN' && (
                <p className="text-green-700 font-medium">• Admin: You have access to all applications</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatedAppSelector;