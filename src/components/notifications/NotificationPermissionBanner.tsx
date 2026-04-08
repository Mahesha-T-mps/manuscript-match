/**
 * Notification Permission Banner
 * Shows a banner to request notification permissions from users
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, X } from 'lucide-react';

export const NotificationPermissionBanner: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // Show banner if permission is default (not asked yet)
    // and user hasn't dismissed it recently
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    if (currentPermission === 'default' && dismissedTime < oneDayAgo) {
      setShowBanner(true);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    setIsRequesting(true);
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setShowBanner(false);
        
        // Show a test notification
        new Notification('ScholarFinder Notifications Enabled! 🎉', {
          body: 'You\'ll now receive notifications when your processes complete, even when using other applications.',
          icon: '/favicon.ico',
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('notification-banner-dismissed', Date.now().toString());
  };

  if (!showBanner || permission !== 'default') {
    return null;
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Bell className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1 pr-4">
          <strong>Enable Process Notifications</strong>
          <p className="text-sm text-gray-600 mt-1">
            Get notified when your document processing, searches, and validations complete - 
            even when you're using other applications or websites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={requestPermission}
            disabled={isRequesting}
            size="sm"
            className="whitespace-nowrap"
          >
            {isRequesting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                Requesting...
              </>
            ) : (
              <>
                <Bell className="h-3 w-3 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
          <Button
            onClick={dismissBanner}
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Notification Status Indicator
 * Shows current notification permission status
 */
export const NotificationStatusIndicator: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (!('Notification' in window)) {
    return null;
  }

  const getStatusInfo = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <Bell className="h-4 w-4 text-green-600" />,
          text: 'Notifications enabled',
          color: 'text-green-600'
        };
      case 'denied':
        return {
          icon: <BellOff className="h-4 w-4 text-red-600" />,
          text: 'Notifications blocked',
          color: 'text-red-600'
        };
      default:
        return {
          icon: <Bell className="h-4 w-4 text-gray-400" />,
          text: 'Notifications not enabled',
          color: 'text-gray-400'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="flex items-center gap-2 text-sm">
      {statusInfo.icon}
      <span className={statusInfo.color}>{statusInfo.text}</span>
    </div>
  );
};