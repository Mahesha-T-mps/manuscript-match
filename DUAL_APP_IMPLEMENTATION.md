# Dual Application Implementation

This document describes the implementation of the dual-application structure for ScholarFinder and MSXpert.

## Overview

The application now supports two separate applications:
1. **ScholarFinder** - Academic manuscript and scholar matching platform
2. **MSXpert** - Expert management and consultation platform

## Application Structure

### Landing Page (`/`)
- Shows two application cards: ScholarFinder and MSXpert
- Users can select which application they want to access

### ScholarFinder Flow
1. User clicks "ScholarFinder" button
2. Redirects to `/login?app=scholarfinder`
3. After successful login, redirects to `/scholarfinder` (main ScholarFinder dashboard)
4. All existing ScholarFinder functionality remains unchanged

### MSXpert Flow
1. User clicks "MSXpert" button
2. Redirects to `/msxpert/login`
3. After successful login, redirects to external URL: `http://192.168.2.71:8502`
4. MSXpert has its own separate login system

## Key Files Created/Modified

### New Files
- `src/pages/AppSelector.tsx` - Landing page with application selection
- `src/pages/MSXpertLogin.tsx` - MSXpert-specific login page

### Modified Files
- `src/App.tsx` - Updated routing structure
- `src/components/auth/LoginForm.tsx` - Added support for app parameter and back navigation

## Routing Structure

```
/ - AppSelector (landing page)
├── /login?app=scholarfinder - ScholarFinder login
├── /msxpert/login - MSXpert login
├── /scholarfinder - ScholarFinder dashboard (protected)
└── /scholarfinder/* - All existing ScholarFinder routes (protected)
```

## Features

### AppSelector Page
- Clean, modern design with application cards
- Hover effects and responsive layout
- Clear visual distinction between applications

### MSXpert Login
- Separate authentication system
- Redirects to external MSXpert application after login
- Back button to return to app selection

### ScholarFinder Login
- Maintains existing authentication system
- Back button when accessed via app selector
- Proper redirect handling after login

## Security Considerations

- MSXpert and ScholarFinder maintain separate authentication systems
- No shared authentication state between applications
- External redirect to MSXpert network URL after successful login

## Usage

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:8081`
3. Select either ScholarFinder or MSXpert
4. Complete the respective login flow

## Future Enhancements

- Add MSXpert user management if needed
- Implement proper MSXpert authentication integration
- Add application-specific branding and themes