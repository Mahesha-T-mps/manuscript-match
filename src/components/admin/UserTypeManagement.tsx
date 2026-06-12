import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Crown,
  Briefcase,
  User,
  Shield,
  Building,
  Globe,
  Lock,
  Unlock,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAdminUsers } from "@/hooks/useAdmin";
import type { AdminUserDetails } from "@/services/adminService";
import { apiService } from "@/services/apiService";

// Types
type UserRole = "USER" | "QC" | "MANAGER" | "ADMIN";
type UserType = "SPRINGER" | "WILEY" | "F1000" | "DMP" | "AJE RQE" | "T&F";

// Extended interface that includes customer type and MSXpert access
interface ExtendedUserData extends AdminUserDetails {
  userType?: UserType;
  msxpertAccess?: boolean;
  name?: string;
}

interface UserTypeManagementProps {
  className?: string;
}

// Helper functions moved outside component to avoid initialization issues
const getUserTypeFromEmail = (email: string): UserType => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain?.includes('springer')) return 'SPRINGER';
  if (domain?.includes('wiley')) return 'WILEY';
  if (domain?.includes('f1000')) return 'F1000';
  if (domain?.includes('dmp')) return 'DMP';
  if (domain?.includes('aje')) return 'AJE RQE';
  if (domain?.includes('tandf') || domain?.includes('taylorandfrancis')) return 'T&F';
  return 'SPRINGER'; // Default
};

const extractNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0];
  return localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const UserTypeManagement: React.FC<UserTypeManagementProps> = ({ className }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedUserType, setSelectedUserType] = useState<UserType | "all">("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real users from the API
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useAdminUsers({ limit: 500 }); // Get up to 500 users to show all users

  // Transform API data to include customer type and MSXpert access
  const users: ExtendedUserData[] = useMemo(() => {
    if (!usersData?.data) return [];
    
    return usersData.data.map(user => ({
      ...user,
      // Use actual database values, fallback to derived values only if not present
      userType: user.userType || getUserTypeFromEmail(user.email) as UserType,
      // Use actual database value, fallback to role-based logic if not present
      msxpertAccess: user.msxpertAccess !== undefined ? user.msxpertAccess : (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'QC'),
      // Extract name from email if not provided
      name: user.name || extractNameFromEmail(user.email)
    }));
  }, [usersData]);

  // Filtered users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesRole = selectedRole === "all" || user.role === selectedRole;
      const matchesUserType = selectedUserType === "all" || user.userType === selectedUserType;
      
      return matchesSearch && matchesRole && matchesUserType;
    });
  }, [users, searchTerm, selectedRole, selectedUserType]);

  // Statistics
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const msxpertUsers = users.filter(u => u.msxpertAccess).length;
    const userTypeStats = users.reduce((acc, user) => {
      acc[user.userType] = (acc[user.userType] || 0) + 1;
      return acc;
    }, {} as Record<UserType, number>);

    return {
      totalUsers,
      msxpertUsers,
      userTypeStats
    };
  }, [users]);

  const getUserTypeIcon = (userType: UserType) => {
    switch (userType) {
      case 'SPRINGER': return Building;
      case 'WILEY': return Globe;
      case 'F1000': return Crown;
      case 'DMP': return Shield;
      case 'AJE RQE': return Briefcase;
      case 'T&F': return Building;
      default: return Building;
    }
  };

  const getUserTypeBadgeVariant = (userType: UserType) => {
    switch (userType) {
      case 'SPRINGER': return 'default';
      case 'WILEY': return 'secondary';
      case 'F1000': return 'outline';
      case 'DMP': return 'destructive';
      case 'AJE RQE': return 'default';
      case 'T&F': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return Crown;
      case 'MANAGER': return Briefcase;
      case 'QC': return Shield;
      default: return User;
    }
  };

  const handleEditUser = (user: ExtendedUserData) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const promises = [];
      
      // Update customer type if changed
      if (editingUser.userType) {
        promises.push(
          apiService.put(`/api/admin/users/${editingUser.id}/customer-type`, {
            customerType: editingUser.userType
          })
        );
      }
      
      // Update MSXpert access if changed
      if (typeof editingUser.msxpertAccess === 'boolean') {
        promises.push(
          apiService.put(`/api/admin/users/${editingUser.id}/msxpert-access`, {
            msxpertAccess: editingUser.msxpertAccess
          })
        );
      }
      
      // Update role if changed (only send supported fields)
      if (editingUser.role) {
        promises.push(
          apiService.put(`/api/admin/users/${editingUser.id}`, {
            role: editingUser.role
          })
        );
      }
      
      // Execute all updates in parallel
      await Promise.all(promises);
      
      toast({
        title: 'User Updated Successfully',
        description: `Successfully updated ${editingUser.email} with new settings.`,
        variant: 'default',
      });
      
      // Refetch users to get latest data
      refetchUsers();
      
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast({
        title: 'Update Failed',
        description: error?.response?.data?.message || 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMSXpertAccess = async (userId: string, currentAccess: boolean) => {
    try {
      // Update MSXpert access via API
      await apiService.put(`/api/admin/users/${userId}/msxpert-access`, {
        msxpertAccess: !currentAccess
      });
      
      toast({
        title: 'MSXpert Access Updated',
        description: `MSXpert access ${!currentAccess ? 'granted' : 'revoked'} successfully`,
        variant: 'default',
      });
      
      // Refetch users to get latest data
      refetchUsers();
    } catch (error: any) {
      console.error('Failed to update MSXpert access:', error);
      toast({
        title: 'Update Failed',
        description: error?.response?.data?.message || 'Failed to update MSXpert access. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRefreshData = () => {
    // Refetch real user data from the API
    refetchUsers();
    
    toast({
      title: 'Data Refreshed',
      description: 'User data has been refreshed from the database',
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Loading State */}
      {usersLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading real users from database...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {usersError && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load users from database. Please try refreshing the page or contact support.
          </AlertDescription>
        </Alert>
      )}

      {/* Show content only when not loading */}
      {!usersLoading && (
        <>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Type & MSXpert Access Management
              </CardTitle>
              <CardDescription>
                This is where you can change user customer types (SPRINGER, WILEY, F1000, DMP) and manage MSXpert access permissions. 
                Use the tabs below to manage user types and access controls.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="QC">QC</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedUserType} onValueChange={(value) => setSelectedUserType(value as UserType | "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="User Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SPRINGER">Springer</SelectItem>
                  <SelectItem value="WILEY">Wiley</SelectItem>
                  <SelectItem value="F1000">F1000</SelectItem>
                  <SelectItem value="DMP">DMP</SelectItem>
                  <SelectItem value="AJE RQE">AJE RQE</SelectItem>
                  <SelectItem value="T&F">T&F</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="msxpert">MSXpert Access</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MSXpert Access</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.msxpertUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((stats.msxpertUsers / stats.totalUsers) * 100)}% of users
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Types</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(stats.userTypeStats).length}</div>
                <p className="text-xs text-muted-foreground">Different customer types</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Common</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.entries(stats.userTypeStats).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Most used user type</p>
              </CardContent>
            </Card>
          </div>

          {/* User Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Type Distribution</CardTitle>
              <CardDescription>Breakdown of users by customer type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                {(['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'] as UserType[]).map((userType) => {
                  const Icon = getUserTypeIcon(userType);
                  const count = stats.userTypeStats[userType] || 0;
                  const percentage = Math.round((count / stats.totalUsers) * 100);
                  
                  return (
                    <div key={userType} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Icon className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-medium">{userType}</div>
                        <div className="text-sm text-gray-500">{count} users ({percentage}%)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user types and basic information ({filteredUsers.length} users)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <ScrollArea className="h-[400px] w-full">
                  <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">User</TableHead>
                      <TableHead className="min-w-[100px]">Role</TableHead>
                      <TableHead className="min-w-[120px]">Customer Type</TableHead>
                      <TableHead className="min-w-[120px]">MSXpert Access</TableHead>
                      <TableHead className="min-w-[100px]">Last Updated</TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const RoleIcon = getRoleIcon(user.role);
                      const UserTypeIcon = getUserTypeIcon(user.userType);
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="min-w-[250px]">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {user.name || 'No Name Available'}
                              </div>
                              <div className="text-sm text-blue-600 font-mono break-all">
                                {user.email}
                              </div>
                              {/* Debug info - remove in production */}
                              {process.env.NODE_ENV === 'development' && (
                                <div className="text-xs text-gray-400">
                                  ID: {user.id} | Name: "{user.name}"
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <RoleIcon className="h-4 w-4" />
                              <Badge variant="outline">{user.role}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserTypeIcon className="h-4 w-4" />
                              <Badge variant={getUserTypeBadgeVariant(user.userType)}>
                                {user.userType}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.msxpertAccess ? (
                                <>
                                  <Unlock className="h-4 w-4 text-green-600" />
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    Enabled
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 text-gray-400" />
                                  <Badge variant="secondary">Disabled</Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {format(new Date(user.updatedAt), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MSXpert Access Tab */}
        <TabsContent value="msxpert" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                MSXpert Access Management
              </CardTitle>
              <CardDescription>
                Control which users can access the MSXpert application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Admin users automatically have MSXpert access. Regular users need explicit permission.
                  </AlertDescription>
                </Alert>

                <div className="w-full overflow-x-auto">
                  <ScrollArea className="h-[400px] w-full">
                    <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">User</TableHead>
                        <TableHead className="min-w-[100px]">Role</TableHead>
                        <TableHead className="min-w-[120px]">Customer Type</TableHead>
                        <TableHead className="min-w-[120px]">MSXpert Access</TableHead>
                        <TableHead className="min-w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const isAdmin = user.role === 'ADMIN';
                        const hasAccess = user.msxpertAccess || isAdmin;
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="min-w-[250px]">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">
                                  {user.name || 'No Name Available'}
                                </div>
                                <div className="text-sm text-blue-600 font-mono break-all">
                                  {user.email}
                                </div>
                                {/* Debug info - remove in production */}
                                {process.env.NODE_ENV === 'development' && (
                                  <div className="text-xs text-gray-400">
                                    ID: {user.id} | Name: "{user.name}"
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getUserTypeBadgeVariant(user.userType)}>
                                {user.userType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {hasAccess ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600 font-medium">
                                      {isAdmin ? 'Admin Access' : 'Granted'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-500">Denied</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={hasAccess}
                                  disabled={isAdmin}
                                  onCheckedChange={() => handleToggleMSXpertAccess(user.id, user.msxpertAccess)}
                                />
                                {isAdmin && (
                                  <span className="text-xs text-gray-500">Auto-granted</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>User Email</Label>
                <Input
                  value={editingUser.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Name is automatically derived from email.
                </p>
              </div>
              
              <div>
                <Label htmlFor="user-role">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser({...editingUser, role: value as UserRole})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="QC">QC</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="user-type">Customer Type</Label>
                <Select 
                  value={editingUser.userType} 
                  onValueChange={(value) => setEditingUser({...editingUser, userType: value as UserType})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPRINGER">Springer</SelectItem>
                    <SelectItem value="WILEY">Wiley</SelectItem>
                    <SelectItem value="F1000">F1000</SelectItem>
                    <SelectItem value="DMP">DMP</SelectItem>
                    <SelectItem value="AJE RQE">AJE RQE</SelectItem>
                    <SelectItem value="T&F">T&F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="msxpert-access"
                  checked={editingUser.msxpertAccess}
                  onCheckedChange={(checked) => setEditingUser({...editingUser, msxpertAccess: checked})}
                  disabled={editingUser.role === 'ADMIN'}
                />
                <Label htmlFor="msxpert-access">MSXpert Access</Label>
                {editingUser.role === 'ADMIN' && (
                  <span className="text-xs text-gray-500">(Auto-granted for admins)</span>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveUser} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const MemoizedUserTypeManagement = memo(UserTypeManagement);