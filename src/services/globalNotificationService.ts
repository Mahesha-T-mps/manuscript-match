/**
 * Global Notification Service
 * Provides cross-page notifications for process completions
 * Shows notifications even when user navigates away from the workflow page
 */

import { toast } from '@/hooks/use-toast';

// Import preferences getter
const getNotificationPreferences = () => {
  const saved = localStorage.getItem('notification-preferences');
  return saved ? JSON.parse(saved) : {
    uploadCompletion: true,
    searchCompletion: true,
    validationCompletion: true,
    errorNotifications: true,
    testNotifications: false,
  };
};

export interface ProcessNotification {
  processId: string;
  processTitle: string;
  step: string;
  type: 'completion' | 'error' | 'progress';
  message: string;
  description?: string;
  timestamp: number;
  shown: boolean;
}

class GlobalNotificationService {
  private storageKey = 'global_process_notifications';
  private checkInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private notificationPermission: NotificationPermission = 'default';

  /**
   * Start monitoring for process notifications
   */
  async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('[GlobalNotificationService] Starting notification monitoring');
    
    // Request notification permission
    await this.requestNotificationPermission();
    
    // Check for pending notifications immediately
    this.checkPendingNotifications();
    
    // Set up periodic checking every 2 seconds
    this.checkInterval = setInterval(() => {
      this.checkPendingNotifications();
    }, 2000);

    // Listen for storage events from other tabs/components
    window.addEventListener('storage', this.handleStorageChange);
    
    // Listen for visibility changes to show native notifications when tab is not active
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Stop monitoring for process notifications
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('[GlobalNotificationService] Stopping notification monitoring');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('storage', this.handleStorageChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Request notification permission from the user
   */
  private async requestNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('[GlobalNotificationService] Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        this.notificationPermission = await Notification.requestPermission();
        console.log('[GlobalNotificationService] Notification permission:', this.notificationPermission);
      } catch (error) {
        console.warn('[GlobalNotificationService] Failed to request notification permission:', error);
        this.notificationPermission = 'denied';
      }
    } else {
      this.notificationPermission = Notification.permission;
    }
  }

  /**
   * Handle visibility change to show native notifications when tab is not active
   */
  private handleVisibilityChange = () => {
    // When tab becomes hidden, we'll rely on native notifications
    // When tab becomes visible, we'll use toast notifications
    console.log('[GlobalNotificationService] Tab visibility changed:', document.hidden ? 'hidden' : 'visible');
  };

  /**
   * Add a notification to the queue
   */
  addNotification(notification: Omit<ProcessNotification, 'timestamp' | 'shown'>) {
    const notifications = this.getStoredNotifications();
    
    const newNotification: ProcessNotification = {
      ...notification,
      timestamp: Date.now(),
      shown: false
    };

    // Avoid duplicate notifications for the same process step
    const existingIndex = notifications.findIndex(
      n => n.processId === notification.processId && 
           n.step === notification.step && 
           n.type === notification.type
    );

    if (existingIndex >= 0) {
      // Update existing notification
      notifications[existingIndex] = newNotification;
    } else {
      // Add new notification
      notifications.push(newNotification);
    }

    // Keep only last 50 notifications to prevent storage bloat
    const trimmedNotifications = notifications.slice(-50);
    
    localStorage.setItem(this.storageKey, JSON.stringify(trimmedNotifications));
    console.log('[GlobalNotificationService] Added notification:', newNotification);
    
    // Show the notification immediately instead of waiting for periodic check
    this.showNotification(newNotification);
    this.markAsShown(newNotification.processId, newNotification.step, newNotification.type);
  }

  /**
   * Mark notification as shown
   */
  private markAsShown(processId: string, step: string, type: string) {
    const notifications = this.getStoredNotifications();
    const notification = notifications.find(
      n => n.processId === processId && n.step === step && n.type === type
    );
    
    if (notification) {
      notification.shown = true;
      localStorage.setItem(this.storageKey, JSON.stringify(notifications));
    }
  }

  /**
   * Get stored notifications
   */
  private getStoredNotifications(): ProcessNotification[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('[GlobalNotificationService] Failed to parse stored notifications:', error);
      return [];
    }
  }

  /**
   * Check for pending notifications and show them
   */
  private checkPendingNotifications = () => {
    const notifications = this.getStoredNotifications();
    const pendingNotifications = notifications.filter(n => !n.shown);

    pendingNotifications.forEach(notification => {
      // Only show notifications that are less than 5 minutes old
      const age = Date.now() - notification.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (age < maxAge) {
        this.showNotification(notification);
        this.markAsShown(notification.processId, notification.step, notification.type);
      }
    });
  };

  /**
   * Handle storage changes from other tabs/components
   */
  private handleStorageChange = (event: StorageEvent) => {
    if (event.key === this.storageKey && event.newValue) {
      // New notification added, check immediately
      setTimeout(() => this.checkPendingNotifications(), 100);
    }
  };

  /**
   * Show notification using toast or native notification
   */
  private showNotification(notification: ProcessNotification) {
    const { processTitle, step, type, message, description } = notification;
    
    // Check user preferences
    const preferences = getNotificationPreferences();
    
    // Determine if this notification type is enabled
    let shouldShow = true;
    if (type === 'completion') {
      switch (step.toLowerCase()) {
        case 'upload':
        case 'metadata_extraction':
          shouldShow = preferences.uploadCompletion;
          break;
        case 'keyword_enhancement':
        case 'database_search':
          shouldShow = preferences.searchCompletion;
          break;
        case 'validation':
        case 'recommendations':
          shouldShow = preferences.validationCompletion;
          break;
      }
    } else if (type === 'error') {
      shouldShow = preferences.errorNotifications;
    }
    
    if (!shouldShow) {
      console.log('[GlobalNotificationService] Notification skipped due to user preferences:', { step, type });
      return;
    }
    
    let title = message;
    let desc = description;
    let duration = 8000;

    // Customize notification based on type and step
    if (type === 'completion') {
      switch (step.toLowerCase()) {
        case 'upload':
        case 'metadata_extraction':
          title = `${processTitle} - Upload Completed! 📄`;
          desc = 'Document uploaded and metadata extracted successfully.';
          break;
        case 'keyword_enhancement':
          title = `${processTitle} - Keywords Enhanced! 🔍`;
          desc = 'AI-powered keyword enhancement completed.';
          break;
        case 'database_search':
          title = `${processTitle} - Database Search Completed! 🔎`;
          desc = 'Automated database search finished successfully.';
          break;
        case 'validation':
          title = `${processTitle} - Validation Completed! ✅`;
          desc = 'Reviewer validation process completed successfully.';
          break;
        case 'recommendations':
          title = `${processTitle} - Recommendations Ready! 🎯`;
          desc = 'Reviewer recommendations are now available.';
          break;
        default:
          title = `${processTitle} - ${step} Completed! ✅`;
      }
      duration = 10000; // Longer duration for completion notifications
    } else if (type === 'error') {
      title = `${processTitle} - Error in ${step} ❌`;
      duration = 12000; // Even longer for errors
    }

    console.log('[GlobalNotificationService] Showing notification:', { title, desc });
    
    // Always prefer native notifications for better cross-page/app visibility
    if (this.canShowNativeNotifications()) {
      this.showNativeNotification(title, desc, notification);
    } else {
      // Fallback to toast notification if native notifications not available
      console.log('[GlobalNotificationService] Native notifications not available, using toast');
      toast({
        title,
        description: desc,
        duration,
      });
    }
  }

  /**
   * Check if we can show native notifications
   */
  private canShowNativeNotifications(): boolean {
    return (
      'Notification' in window &&
      (Notification.permission === 'granted' || this.notificationPermission === 'granted')
    );
  }

  /**
   * Show native browser notification
   */
  private showNativeNotification(title: string, body: string, notification: ProcessNotification) {
    if (!this.canShowNativeNotifications()) {
      console.warn('[GlobalNotificationService] Cannot show native notification - permission denied');
      return;
    }

    try {
      const nativeNotification = new Notification(title, {
        body,
        icon: '/favicon.ico', // Use your app's icon
        badge: '/favicon.ico',
        tag: `process-${notification.processId}-${notification.step}`, // Prevent duplicates
        requireInteraction: notification.type === 'error', // Keep error notifications until user interacts
        silent: false,
        timestamp: Date.now(),
        data: {
          processId: notification.processId,
          step: notification.step,
          type: notification.type
        }
      });

      // Handle notification click - focus the tab and navigate to process
      nativeNotification.onclick = () => {
        window.focus();
        
        // Try to navigate to the process if possible
        if (window.location.pathname !== '/') {
          window.location.href = `/?process=${notification.processId}`;
        }
        
        nativeNotification.close();
      };

      // Auto-close after duration (except for errors)
      if (notification.type !== 'error') {
        setTimeout(() => {
          nativeNotification.close();
        }, 8000);
      }

      console.log('[GlobalNotificationService] Native notification shown:', title);
    } catch (error) {
      console.error('[GlobalNotificationService] Failed to show native notification:', error);
      
      // Fallback to toast notification
      toast({
        title,
        description: body,
        duration: 8000,
      });
    }
  }

  /**
   * Clear old notifications (older than 24 hours)
   */
  clearOldNotifications() {
    const notifications = this.getStoredNotifications();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentNotifications = notifications.filter(n => n.timestamp > oneDayAgo);
    
    if (recentNotifications.length !== notifications.length) {
      localStorage.setItem(this.storageKey, JSON.stringify(recentNotifications));
      console.log('[GlobalNotificationService] Cleared old notifications');
    }
  }

  /**
   * Get notification history for a specific process
   */
  getProcessNotifications(processId: string): ProcessNotification[] {
    return this.getStoredNotifications().filter(n => n.processId === processId);
  }

  /**
   * Clear all notifications for a specific process
   */
  clearProcessNotifications(processId: string) {
    const notifications = this.getStoredNotifications();
    const filteredNotifications = notifications.filter(n => n.processId !== processId);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredNotifications));
  }
}

// Create singleton instance
export const globalNotificationService = new GlobalNotificationService();

// Helper functions for common notification types
export const notifyStepCompletion = (
  processId: string, 
  processTitle: string, 
  step: string, 
  customMessage?: string
) => {
  globalNotificationService.addNotification({
    processId,
    processTitle,
    step,
    type: 'completion',
    message: customMessage || `${step} completed successfully`,
    description: `Process "${processTitle}" has completed the ${step} step.`
  });
};

export const notifyStepError = (
  processId: string, 
  processTitle: string, 
  step: string, 
  error: string
) => {
  globalNotificationService.addNotification({
    processId,
    processTitle,
    step,
    type: 'error',
    message: `Error in ${step}`,
    description: error
  });
};

export const notifyStepProgress = (
  processId: string, 
  processTitle: string, 
  step: string, 
  progress: string
) => {
  globalNotificationService.addNotification({
    processId,
    processTitle,
    step,
    type: 'progress',
    message: `${step} in progress`,
    description: progress
  });
};