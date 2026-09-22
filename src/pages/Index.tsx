import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ProcessDashboard, ProcessWorkflow } from "@/components/process";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import Reports from "./Reports";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Process } from "@/types/api";

type ViewMode = 'dashboard' | 'workflow';

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSelectProcess = (process: Process) => {
    setSelectedProcess(process);
    setViewMode('workflow');
  };

  const handleBackToDashboard = () => {
    setSelectedProcess(null);
    setViewMode('dashboard');
    
    // Invalidate and refetch processes cache to ensure fresh data is loaded
    queryClient.invalidateQueries({ queryKey: queryKeys.processes.list() });
    queryClient.refetchQueries({ queryKey: queryKeys.processes.list() });
    console.log('[Index] Invalidated and refetched processes cache when returning to dashboard');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setViewMode('dashboard');
      setSelectedProcess(null);
      
      // Navigate to login page after logout
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
    <div className="min-h-screen bg-gradient-to-br from-background to-academic-light pt-16">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content with Process Management */}
        <Tabs defaultValue="processes" className="space-y-4">
          <TabsList className={`grid w-full ${user?.role === "ADMIN" ? "grid-cols-3" : "grid-cols-2"} max-w-2xl`}>
            <TabsTrigger value="processes">Processes</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            {user?.role === "ADMIN" && (
              <TabsTrigger value="admin">Admin</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="processes">
            <NotificationPermissionBanner />
            {viewMode === 'dashboard' ? (
              <ProcessDashboard onSelectProcess={handleSelectProcess} />
            ) : selectedProcess ? (
              <ProcessWorkflow 
                processId={selectedProcess.id}
                onBack={handleBackToDashboard}
              />
            ) : (
              <ProcessDashboard onSelectProcess={handleSelectProcess} />
            )}
          </TabsContent>
          
          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          {user?.role === "ADMIN" && (
            <TabsContent value="admin">
              <AdminDashboard 
                currentUser={user}
                permissions={[
                  'user.manage',
                  'permission.manage', 
                  'activity.view',
                  'system.monitor'
                ]}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
