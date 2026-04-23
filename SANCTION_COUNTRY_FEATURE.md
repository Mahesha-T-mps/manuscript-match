# Sanction Country Management Feature

## Overview
This feature allows admin users to manage sanctioned countries for different user types (Springer, Wiley, F1000, DMP) through the admin dashboard.

## How to Access
1. Log in as an admin user
2. Navigate to the home page
3. Click on the "Admin" tab
4. Select "Sanction Countries" from the sidebar navigation

## Features

### User Type Selection
- Four user types are available: Springer, Wiley, F1000, DMP
- Click on any user type button to view its sanctioned countries
- Each user type maintains its own separate list of sanctioned countries

### Add Sanctioned Countries
1. Select a user type first
2. Click the "Add Country" button
3. Enter the country name in the dialog
4. Click "Add Country" to save
5. The system will prevent duplicate entries

### View Sanctioned Countries
- After selecting a user type, all sanctioned countries for that type are displayed
- Each country shows the user type it belongs to
- A counter shows the total number of sanctioned countries

### Delete Sanctioned Countries
- Click the trash icon next to any country to remove it
- Deletion is immediate and will refresh the list automatically

## Backend Integration
The feature integrates with your FastAPI backend endpoints running on `scholarFinderApiUrl`:
- `GET /countries/{user_type}` - Fetch countries for a user type
- `POST /add-country` - Add a new sanctioned country
- `DELETE /delete-country` - Remove a sanctioned country

**Important**: These endpoints use the `scholarFinderApiUrl` configuration (typically `http://192.168.61.60:8000`) rather than the main `apiBaseUrl` (typically `http://localhost:3002`).

## Technical Implementation

### Frontend Components
- **SanctionCountryManagement.tsx** - Main component for the feature
- **AdminDashboard.tsx** - Updated to include the new navigation item
- **adminService.ts** - Updated with API methods for sanction country operations

### API Service Methods
- `getSanctionedCountries(userType: string)` - Fetch countries
- `addSanctionedCountry(userType: string, country: string)` - Add country
- `deleteSanctionedCountry(userType: string, country: string)` - Delete country

### Error Handling
- Network errors are handled gracefully with user-friendly toast notifications
- Duplicate country additions are detected and reported
- Loading states are shown during API operations

## User Experience
- Clean, intuitive interface with clear visual feedback
- Responsive design that works on different screen sizes
- Toast notifications for all operations (success, error, info)
- Loading indicators during API calls
- Confirmation through visual feedback

## Security
- Only admin users can access this feature
- All operations require admin authentication
- Input validation prevents malicious data entry
- Proper error handling prevents information leakage