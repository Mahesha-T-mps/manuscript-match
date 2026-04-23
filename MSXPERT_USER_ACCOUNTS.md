# MSXpert User Accounts

This document contains the predefined MSXpert user accounts for testing and access. These accounts are completely separate from ScholarFinder users.

## User Accounts

### Administrator Account
- **Email:** `admin@mstest.com`
- **Password:** `adminpassword123`
- **Name:** MSXpert Administrator
- **Role:** Admin
- **Department:** Administration
- **Permissions:** 
  - user.manage
  - system.admin
  - reports.view
  - settings.modify

### User Account 1
- **Email:** `user@mstest.com`
- **Password:** `testpassword123`
- **Name:** MSXpert User 1
- **Role:** User
- **Department:** Consulting
- **Permissions:**
  - reports.view
  - profile.edit

### User Account 2
- **Email:** `user2@mstest.com`
- **Password:** `testpassword456`
- **Name:** MSXpert User 2
- **Role:** User
- **Department:** Expert Services
- **Permissions:**
  - reports.view
  - profile.edit

## Authentication Features

### Secure Validation
- Email addresses are case-insensitive
- Passwords are case-sensitive and must match exactly
- Invalid credentials show appropriate error messages

### Separate Storage
- MSXpert authentication data is stored with `msxpert_*` prefixes
- Completely isolated from ScholarFinder authentication
- No cross-contamination between systems

### Role-Based Access
- **Admin Role:** Full system access and user management
- **User Role:** Standard access with limited permissions

## Testing the Accounts

### Login Process
1. Navigate to the application selector
2. Click "MSXpert" button
3. Use any of the credentials above
4. Successful login redirects to `http://192.168.2.71:8502`

### Verification
- Check browser localStorage for `msxpert_*` keys after login
- Verify user data is stored separately from ScholarFinder
- Test logout functionality clears only MSXpert data

## Security Notes

### Production Considerations
- These are test credentials for development/demo purposes
- In production, implement proper password hashing
- Add password complexity requirements
- Implement account lockout after failed attempts
- Add two-factor authentication for admin accounts

### Data Isolation
- MSXpert users cannot access ScholarFinder features
- ScholarFinder users cannot access MSXpert features
- Each system maintains its own user database and sessions

## File Locations

- **User Database:** `src/data/msxpertUsers.ts`
- **Authentication Context:** `src/contexts/MSXpertAuthContext.tsx`
- **Login Page:** `src/pages/MSXpertLogin.tsx`
- **Storage Utilities:** `src/utils/authStorage.ts`

## Adding New Users

To add new MSXpert users, update the `MSXPERT_USERS` array in `src/data/msxpertUsers.ts`:

```typescript
{
  id: 'msxpert_user_003',
  email: 'newuser@mstest.com',
  password: 'newpassword123',
  name: 'New MSXpert User',
  role: 'user',
  department: 'New Department',
  permissions: ['reports.view', 'profile.edit']
}
```

## Error Handling

The system provides clear error messages for:
- Invalid email/password combinations
- Non-existent user accounts
- Network connectivity issues
- Session timeout scenarios