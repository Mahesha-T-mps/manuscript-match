/**
 * Notification Settings Component
 * Allows users to manage their notification preferences
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Settings, TestTube } from 'lucide-react';
import { NotificationStatusIndicator } from './NotificationPermissionBanner';

interface NotificationPreferences {
  uploadCompletion: boolean;
  searchCompletion: boolean;
  validationCompletion: boolean;
  errorNotifications: boolean;
  testNotifications: boolean;
}

export const NotificationSettings: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notification-preferences');
    return saved ? JSON.parse(saved) : {
      uploadCompletion: true,
      searchCompletion: true,
      validationCompletion: true,
      errorNotifications: true,
      testNotifications: false,
    };
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notification-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        showTestNotification();
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  };

  const showTestNotification = () => {
    if (permission === 'granted' || Notification.permission === 'granted') {
      new Notification('Test Notification 🧪', {
        body: 'This is how process completion notifications will appear.',
        icon: '/favicon.ico',
        tag: 'test-notification',
      });
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const isNotificationsEnabled = permission === 'granted';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Configure how you want to be notified about process completions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium">Browser Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Enable notifications to receive alerts even when using other applications
            </p>
            <div className="mt-2">
              <NotificationStatusIndicator />
            </div>
          </div>
          <div className="flex gap-2">
            {permission !== 'granted' && (
              <Button onClick={requestPermission} size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Enable
              </Button>
            )}
            {isNotificationsEnabled && (
              <Button onClick={showTestNotification} variant="outline" size="sm">
                <TestTube className="h-4 w-4 mr-2" />
                Test
              </Button>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Types</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="upload-completion">Upload Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when document upload and metadata extraction completes
                </p>
              </div>
              <Switch
                id="upload-completion"
                checked={preferences.uploadCompletion}
                onCheckedChange={(checked) => updatePreference('uploadCompletion', checked)}
                disabled={!isNotificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="search-completion">Search Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when database searches and keyword enhancement completes
                </p>
              </div>
              <Switch
                id="search-completion"
                checked={preferences.searchCompletion}
                onCheckedChange={(checked) => updatePreference('searchCompletion', checked)}
                disabled={!isNotificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="validation-completion">Validation Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when reviewer validation and recommendations are ready
                </p>
              </div>
              <Switch
                id="validation-completion"
                checked={preferences.validationCompletion}
                onCheckedChange={(checked) => updatePreference('validationCompletion', checked)}
                disabled={!isNotificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="error-notifications">Error Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when processes encounter errors or failures
                </p>
              </div>
              <Switch
                id="error-notifications"
                checked={preferences.errorNotifications}
                onCheckedChange={(checked) => updatePreference('errorNotifications', checked)}
                disabled={!isNotificationsEnabled}
              />
            </div>
          </div>
        </div>

        {!('Notification' in window) && (
          <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <BellOff className="h-4 w-4" />
              <span className="font-medium">Notifications Not Supported</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        )}

        {permission === 'denied' && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <BellOff className="h-4 w-4" />
              <span className="font-medium">Notifications Blocked</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Notifications are blocked for this site. To enable them, click the notification icon in your browser's address bar and allow notifications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Export preferences getter for use in notification service
export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem('notification-preferences');
  return saved ? JSON.parse(saved) : {
    uploadCompletion: true,
    searchCompletion: true,
    validationCompletion: true,
    errorNotifications: true,
    testNotifications: false,
  };
};