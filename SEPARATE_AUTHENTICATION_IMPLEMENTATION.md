# Separate Authentication Implementation

This document explains how ScholarFinder and MSXpert maintain completely separate authentication systems with different user bases.

## Overview

The application now implements two completely isolated authentication systems:

1. **ScholarFinder Authentication** - For academic users
2. **MSXpert Authentication** - For expert consultants

## Key Features

### Separate User Databases
- ScholarFinder users are stored and managed separately from MSXpert users
- No shared user accounts between systems
- Different authentication endpoints and validation logic

### Isolated Storage
- ScholarFinder auth data uses `scholarfinder_*` prefixed localStorage keys
- MSXpert auth data uses `msxpert_*` prefixed localStorage keys
- No cross-contamination of authentication tokens or user data

### Independent Authentication Contexts
- `AuthContext` - Handles ScholarFinder authentication
- `MSXpertAuthContext` - Handles MSXpert authentication
- Each context manages its own state, tokens, and user sessions

## Implementation Details

### Storage Separation

```typescript
// ScholarFinder storage keys
scholarfinder_auth_token
scholarfinder_user
scholarfinder_refresh_token
scholarfinder_session

// MSXpert storage keys
msxpert_auth_token
msxpert_user
msxpert_session
```

### Authentication Flow

#### ScholarFinder Flow
1. User selects ScholarFinder from app selector
2. Redirected to `/login?app=scholarfinder`
3. Uses existing ScholarFinder authentication system
4. Tokens stored with `scholarfinder_` prefix
5. Access to ScholarFinder dashboard and features

#### MSXpert Flow
1. User selects MSXpert from app selector
2. Redirected to `/msxpert/login`
3. Uses separate MSXpert authentication system
4. Tokens stored with `msxpert_` prefix
5. Redirected to external MSXpert application at `http://192.168.2.71:8502`

### Route-Level Authentication Providers

```typescript
// ScholarFinder routes wrapped with ScholarFinder auth
<Route path="/scholarfinder" element={
  <AuthProviderWithErrorBoundary>
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  </AuthProviderWithErrorBoundary>
} />

// MSXpert routes wrapped with MSXpert auth
<Route path="/msxpert/login" element={
  <MSXpertAppWrapper>
    <MSXpertLogin />
  </MSXpertAppWrapper>
} />
```

## Security Benefits

### Complete Isolation
- No shared authentication state between applications
- Separate token validation and refresh mechanisms
- Independent session management

### Customer Separation
- ScholarFinder customers cannot access MSXpert features
- MSXpert experts cannot access ScholarFinder data
- Clear separation of concerns and user roles

### Storage Security
- Each app's authentication data is isolated
- Easy to clear specific app data without affecting the other
- Prevents accidental cross-app authentication

## File Structure

```
src/
├── contexts/
│   ├── AuthContext.tsx           # ScholarFinder authentication
│   └── MSXpertAuthContext.tsx    # MSXpert authentication
├── components/
│   ├── auth/                     # ScholarFinder auth components
│   └── msxpert/                  # MSXpert auth components
├── utils/
│   └── authStorage.ts            # Separate storage utilities
└── pages/
    ├── AppSelector.tsx           # Application selection
    ├── MSXpertLogin.tsx          # MSXpert login page
    └── ...                       # ScholarFinder pages
```

## Usage Examples

### Checking Authentication Status

```typescript
// For ScholarFinder
const { isAuthenticated, user } = useAuth();

// For MSXpert
const { isAuthenticated, user } = useMSXpertAuth();
```

### Storage Management

```typescript
import { scholarFinderStorage, msxpertStorage } from '@/utils/authStorage';

// Clear only ScholarFinder auth
scholarFinderStorage.clear();

// Clear only MSXpert auth
msxpertStorage.clear();

// Get specific app auth data
const sfAuth = scholarFinderStorage.getUser();
const msAuth = msxpertStorage.getUser();
```

## Testing Separation

To verify the authentication systems are properly separated:

1. Login to ScholarFinder
2. Check localStorage - should see `scholarfinder_*` keys
3. Navigate to MSXpert login
4. Login to MSXpert
5. Check localStorage - should see both `scholarfinder_*` and `msxpert_*` keys
6. Logout from one app - only that app's keys should be cleared

## Future Enhancements

- Add MSXpert user management interface
- Implement proper MSXpert backend authentication
- Add role-based access control within each system
- Consider adding SSO integration while maintaining separation