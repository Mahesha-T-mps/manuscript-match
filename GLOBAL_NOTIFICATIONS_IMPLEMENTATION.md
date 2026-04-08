# Global Process Notifications Implementation

## Overview

I've implemented a comprehensive global notification system that shows process completion notifications even when users navigate away from the workflow page or switch to other applications. This includes both in-browser toast notifications and native browser notifications.

## Key Features

### 🌐 Cross-Application Notifications
- **Native browser notifications**: Shows system-level notifications when tab is not active
- **Cross-page notifications**: Shows notifications regardless of which page the user is on
- **Multi-tab support**: Works across multiple browser tabs
- **Application switching**: Shows notifications even when user switches to other applications

### 🔧 User Control
- **Permission management**: Users can enable/disable browser notifications
- **Notification preferences**: Granular control over notification types
- **Smart fallbacks**: Falls back to toast notifications if native notifications are disabled

### 🎯 Intelligent Behavior
- **Context-aware**: Uses native notifications when tab is hidden, toast when active
- **User preferences**: Respects user settings for different notification types
- **Automatic cleanup**: Removes old notifications and prevents duplicates

## How It Works

### 1. Global Notification Service (`src/services/globalNotificationService.ts`)

- **Dual notification system**: Supports both toast and native browser notifications
- **Permission handling**: Automatically requests and manages notification permissions
- **Smart detection**: Uses native notifications when tab is not focused
- **User preferences**: Respects user settings for different notification types
- **Persistent monitoring**: Runs continuously in the background

### 2. React Hooks (`src/hooks/useGlobalNotifications.ts`)

- **Easy integration**: Simple functions to add notifications from any component
- **Workflow-specific helpers**: Pre-configured notification functions for common workflow steps
- **Type-safe**: Full TypeScript support with proper interfaces

### 3. User Interface Components

#### Notification Permission Banner (`src/components/notifications/NotificationPermissionBanner.tsx`)
- **Smart prompting**: Shows permission request banner when appropriate
- **One-click enable**: Easy button to enable notifications
- **Status indicator**: Shows current notification permission status

#### Notification Settings (`src/components/notifications/NotificationSettings.tsx`)
- **Granular control**: Individual toggles for different notification types
- **Test functionality**: Users can test notifications before enabling
- **Clear status**: Shows permission status and troubleshooting info

### 4. Global Provider (`src/components/notifications/GlobalNotificationProvider.tsx`)

- **App-wide initialization**: Starts the notification service when the app loads
- **Automatic startup**: No manual initialization required

## Integration Points

### App Level
- Added `GlobalNotificationProvider` to `src/App.tsx` to initialize the service globally
- Added `NotificationPermissionBanner` to main dashboard for easy access

### Upload Step
- Native notifications for upload completion and errors
- Works even if user navigates away during upload

### Process Workflow
- Native notifications for validation, keyword enhancement, and search completion
- All major workflow steps now have cross-application notifications

## Usage Examples

### Basic Usage
```typescript
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';

const { addCompletion, addError } = useGlobalNotifications();

// Notify completion - will show native notification if tab is not active
addCompletion('process-123', 'My Process', 'UPLOAD', 'Upload completed successfully');

// Notify error - will show native notification if tab is not active
addError('process-123', 'My Process', 'VALIDATION', 'Validation failed due to network error');
```

### Workflow-Specific Usage
```typescript
import { useWorkflowNotifications } from '@/hooks/useGlobalNotifications';

const { 
  notifyUploadComplete, 
  notifyValidationComplete, 
  notifyStepError 
} = useWorkflowNotifications(processId, processTitle);

// These will automatically show native notifications when appropriate
notifyUploadComplete();
notifyValidationComplete(reviewerCount);
notifyStepError('SEARCH', 'Database connection failed');
```

## Native Notification Features

### Permission Management
- **Automatic request**: Prompts users to enable notifications when appropriate
- **Graceful handling**: Falls back to toast notifications if permission denied
- **Status tracking**: Monitors and displays current permission status

### Smart Behavior
- **Focus detection**: Uses native notifications only when tab is not active
- **Click handling**: Clicking notification focuses the tab and navigates to process
- **Auto-dismiss**: Automatically closes notifications after appropriate duration
- **Error persistence**: Error notifications stay visible until user interacts

### User Experience
- **Rich notifications**: Includes app icon, process title, and detailed descriptions
- **Contextual messages**: Different messages and icons for different workflow steps
- **Non-intrusive**: Only shows when user is not actively using the app

## Configuration Options

### Notification Types (User Configurable)
- **Upload Completion**: Document upload and metadata extraction
- **Search Completion**: Database searches and keyword enhancement
- **Validation Completion**: Reviewer validation and recommendations
- **Error Notifications**: Process failures and errors

### Technical Settings
- **Check interval**: 2 seconds (configurable in service)
- **Notification lifetime**: 5 minutes maximum
- **Cleanup interval**: 24 hours for old notifications
- **Permission retry**: Respects user's previous permission decisions

## Browser Compatibility

### Supported Browsers
- **Chrome/Chromium**: Full support for native notifications
- **Firefox**: Full support for native notifications
- **Safari**: Full support for native notifications
- **Edge**: Full support for native notifications

### Fallback Behavior
- **Unsupported browsers**: Falls back to toast notifications only
- **Permission denied**: Uses toast notifications as fallback
- **Notification API unavailable**: Graceful degradation to toast-only mode

## Benefits

1. **Never Miss Completions**: Users get notified even when multitasking
2. **Improved Productivity**: Can work on other tasks while processes run
3. **Better User Experience**: Clear, timely notifications with rich context
4. **User Control**: Granular settings for notification preferences
5. **Cross-Platform**: Works consistently across different operating systems

## Testing the System

### Basic Test
1. Enable notifications when prompted (or in settings)
2. Start a workflow process (e.g., upload a document)
3. Switch to another application or browser tab
4. Wait for the process to complete
5. Observe native notification appears outside the browser

### Advanced Test
1. Configure notification preferences in settings
2. Test different notification types (upload, search, validation)
3. Test with tab active vs. inactive
4. Test notification clicking behavior

## Future Enhancements

Potential improvements that could be added:

1. **Sound Alerts**: Optional audio notifications for important completions
2. **Email Notifications**: Server-side email notifications for long-running processes
3. **Mobile Push**: Push notifications for mobile users
4. **Notification History**: UI to view past notifications
5. **Advanced Scheduling**: Quiet hours and do-not-disturb modes
6. **Integration APIs**: Webhook notifications for external systems

## Troubleshooting

### Common Issues

**Notifications not appearing:**
- Check if browser notifications are enabled in browser settings
- Verify notification permissions for the site
- Check if notification preferences are enabled in app settings

**Only toast notifications showing:**
- Browser may not support native notifications
- Notification permission may be denied
- Tab may be active (native notifications only show when tab is inactive)

**Notifications appearing twice:**
- This is expected behavior: toast when tab is active, native when inactive
- User preferences can be adjusted to disable specific notification types