import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Shield, CheckCircle, XCircle, Loader2, AlertCircle, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";

// User types
const USER_TYPES = ["SPRINGER", "WILEY", "F1000", "DMP", "AJE RQE", "T&F"];

// Available databases
const DATABASES = [
  { id: "PubMed", name: "PubMed", description: "Medical and biomedical literature" },
  { id: "TandFonline", name: "Taylor & Francis Online", description: "Academic journals" },
  { id: "ScienceDirect", name: "ScienceDirect", description: "Scientific research" },
  { id: "WileyLibrary", name: "Wiley Online Library", description: "Scientific journals" },
  { id: "AJE", name: "AJE", description: "American Journal Experts database" },
];

interface DatabasePermission {
  id: string;
  userType: string;
  database: string;
  hasAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserTypePermissions {
  [userType: string]: {
    [database: string]: boolean;
  };
}

export const DatabasePermissionManagement = () => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<DatabasePermission[]>([]);
  const [userTypePermissions, setUserTypePermissions] = useState<UserTypePermissions>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch database permissions
  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/admin/database-permissions");
      const perms = response.data;
      setPermissions(perms);

      // Organize permissions by user type and database
      const organized: UserTypePermissions = {};
      USER_TYPES.forEach(userType => {
        organized[userType] = {};
        DATABASES.forEach(db => {
          const perm = perms.find(
            (p: DatabasePermission) => p.userType === userType && p.database === db.id
          );
          organized[userType][db.id] = perm ? perm.hasAccess : true; // Default to true
        });
      });

      setUserTypePermissions(organized);
      setHasChanges(false);
    } catch (error: any) {
      console.error("Error fetching database permissions:", error);
      toast({
        title: "Error loading permissions",
        description: error.message || "Failed to load database permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Toggle permission for a user type and database
  const togglePermission = (userType: string, database: string) => {
    setUserTypePermissions(prev => ({
      ...prev,
      [userType]: {
        ...prev[userType],
        [database]: !prev[userType][database],
      },
    }));
    setHasChanges(true);
  };

  // Save all changes
  const saveChanges = async () => {
    try {
      setSaving(true);

      // Prepare bulk updates for each user type
      const updatePromises = USER_TYPES.map(userType => {
        const perms = DATABASES.map(db => ({
          database: db.id,
          hasAccess: userTypePermissions[userType][db.id],
        }));

        return apiService.post("/api/admin/database-permissions/bulk", {
          userType,
          permissions: perms,
        });
      });

      await Promise.all(updatePromises);

      toast({
        title: "Permissions updated",
        description: "Database permissions have been saved successfully",
      });

      setHasChanges(false);
      await fetchPermissions();
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Error saving permissions",
        description: error.message || "Failed to save database permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Initialize default permissions
  const initializeDefaults = async () => {
    try {
      setInitializing(true);

      await apiService.post("/api/admin/database-permissions/initialize");

      toast({
        title: "Permissions initialized",
        description: "Default database permissions have been set",
      });

      await fetchPermissions();
    } catch (error: any) {
      console.error("Error initializing permissions:", error);
      toast({
        title: "Error initializing permissions",
        description: error.message || "Failed to initialize database permissions",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  // Get user type badge color
  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType) {
      case "SPRINGER": return "default";
      case "WILEY": return "secondary";
      case "F1000": return "outline";
      case "DMP": return "destructive";
      case "AJE RQE": return "default";
      case "T&F": return "secondary";
      default: return "outline";
    }
  };

  // Calculate statistics
  const stats = {
    totalPermissions: permissions.length,
    totalAccess: permissions.filter(p => p.hasAccess).length,
    totalDenied: permissions.filter(p => !p.hasAccess).length,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Permission Management
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Database Permission Management
              </CardTitle>
              <CardDescription>
                Control which databases are accessible to each customer type
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPermissions}
                disabled={loading || saving}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={initializeDefaults}
                disabled={initializing || saving}
              >
                {initializing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Initialize Defaults
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{stats.totalPermissions}</div>
              <div className="text-sm text-blue-600">Total Permissions</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.totalAccess}</div>
              <div className="text-sm text-green-600">Access Granted</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.totalDenied}</div>
              <div className="text-sm text-red-600">Access Denied</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes Alert */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <Button
              size="sm"
              onClick={saveChanges}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Changes
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Check the boxes to grant database access to each customer type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="p-4 text-left font-semibold bg-muted">Customer Type</th>
                  {DATABASES.map(db => (
                    <th key={db.id} className="p-4 text-center font-semibold bg-muted">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm">{db.name}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {db.description}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USER_TYPES.map(userType => (
                  <tr key={userType} className="border-b hover:bg-muted/30">
                    <td className="p-4 font-medium">
                      <Badge variant={getUserTypeBadgeVariant(userType)}>
                        {userType}
                      </Badge>
                    </td>
                    {DATABASES.map(db => {
                      const hasAccess = userTypePermissions[userType]?.[db.id] ?? true;
                      return (
                        <td key={db.id} className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={hasAccess}
                              onCheckedChange={() => togglePermission(userType, db.id)}
                              aria-label={`${userType} access to ${db.name}`}
                            />
                            {hasAccess ? (
                              <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 ml-2 text-red-600" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Changes will apply immediately to all users of each customer type
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  fetchPermissions();
                  setHasChanges(false);
                }}
                disabled={!hasChanges || saving}
              >
                Cancel Changes
              </Button>
              <Button
                onClick={saveChanges}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
