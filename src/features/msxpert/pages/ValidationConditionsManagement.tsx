/**
 * Validation Conditions Management Page
 * Admin interface to configure which validation conditions are available for each user type
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ValidationCondition {
  id: string;
  userType: string;
  conditionId: string;
  conditionLabel: string;
  isEnabled: boolean;
}

const USER_TYPES = ['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'];

export const ValidationConditionsManagement: React.FC = () => {
  const { toast } = useToast();
  const [selectedUserType, setSelectedUserType] = useState<string>('SPRINGER');
  const [conditions, setConditions] = useState<ValidationCondition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConditions();
  }, [selectedUserType]);

  const fetchConditions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('scholarfinder_token');
      const response = await fetch(`/api/admin/validation-conditions/${selectedUserType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch validation conditions');
      }

      const data = await response.json();
      setConditions(data.data || []);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching conditions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load validation conditions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (conditionId: string, isEnabled: boolean) => {
    setConditions(prev =>
      prev.map(cond =>
        cond.conditionId === conditionId
          ? { ...cond, isEnabled }
          : cond
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('scholarfinder_token');
      const updates = conditions.map(cond => ({
        conditionId: cond.conditionId,
        isEnabled: cond.isEnabled
      }));

      const response = await fetch('/api/admin/validation-conditions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userType: selectedUserType,
          conditions: updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save validation conditions');
      }

      toast({
        title: 'Success',
        description: `Validation conditions updated for ${selectedUserType}`,
      });
      
      setHasChanges(false);
      fetchConditions(); // Reload to confirm
    } catch (error) {
      console.error('Error saving conditions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save validation conditions',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = conditions.filter(c => c.isEnabled).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Validation Conditions Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure which validation conditions are available for each user type
          </p>
        </div>
        <Button
          onClick={fetchConditions}
          variant="outline"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* User Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select User Type</CardTitle>
          <CardDescription>
            Choose the user type to configure its validation conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {USER_TYPES.map((type) => (
              <Button
                key={type}
                variant={selectedUserType === type ? "default" : "outline"}
                onClick={() => setSelectedUserType(type)}
                disabled={isLoading}
                className="h-16"
              >
                <span className="text-sm font-medium">{type}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conditions Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Validation Conditions for {selectedUserType}</span>
            {!isLoading && (
              <span className="text-sm font-normal text-muted-foreground">
                {enabledCount} of {conditions.length} enabled
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Enable or disable validation conditions that will be available to {selectedUserType} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : conditions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No validation conditions found for this user type. Please ensure the database is properly initialized.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {conditions.map((condition) => (
                <div
                  key={condition.conditionId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {condition.conditionLabel}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      ID: {condition.conditionId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${condition.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {condition.isEnabled ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Enabled
                        </span>
                      ) : (
                        'Disabled'
                      )}
                    </span>
                    <Switch
                      checked={condition.isEnabled}
                      onCheckedChange={(checked) => handleToggle(condition.conditionId, checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Changes */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConditions}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ValidationConditionsManagement;
