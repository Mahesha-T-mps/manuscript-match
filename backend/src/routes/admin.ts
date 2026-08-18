import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permissions';
import { requestLogger, logActivity } from '@/middleware/requestLogger';
import { 
  adminRateLimiter, 
  sensitiveAdminRateLimiter, 
  adminSecurityMiddleware,
  securityMonitoring,
  ipAccessControl
} from '@/middleware/security';

const router = Router();
const adminController = new AdminController();

// Apply security monitoring to all admin routes
router.use(securityMonitoring());

// Apply rate limiting to all admin routes
router.use(adminRateLimiter);

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(requireAdmin);

// Apply admin-specific security middleware
router.use(adminSecurityMiddleware());

// Apply request logging to all admin routes
router.use(requestLogger({
  logAllRequests: true,
  excludePaths: ['/api/admin/stats'], // Don't log frequent stats requests
  includeBody: true,
  includeHeaders: true,
  maxBodySize: 2000
}));



/**
 * @route   GET /api/admin/logs
 * @desc    Get comprehensive user activity logs for administrators
 * @access  Admin only
 * @query   page, limit, userId, processId, action, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/logs', 
  logActivity('ADMIN_VIEW_ALL_LOGS'),
  adminController.getAllLogs
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', 
  logActivity('ADMIN_VIEW_STATS'),
  adminController.getAdminStats
);

/**
 * @route   GET /api/admin/processes
 * @desc    Get all processes across all users for admin dashboard
 * @access  Admin only
 * @query   page, limit, sortBy, sortOrder, status, userId, dateFrom, dateTo, search
 */
router.get('/processes', 
  logActivity('ADMIN_VIEW_ALL_PROCESSES'),
  adminController.getAllProcesses
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin dashboard
 * @access  Admin only
 * @query   page, limit, sortBy, sortOrder, role, search, dateFrom, dateTo
 */
router.get('/users', 
  logActivity('ADMIN_VIEW_ALL_USERS'),
  adminController.getAllUsers
);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get detailed user information with processes and activity
 * @access  Admin only
 */
router.get('/users/:userId', 
  logActivity('ADMIN_VIEW_USER_DETAILS'),
  adminController.getUserDetails
);

/**
 * @route   GET /api/admin/export/:type
 * @desc    Export admin data in various formats (CSV, XLSX)
 * @access  Admin only
 * @params  type: processes | logs | users
 * @query   format: csv | xlsx, startDate, endDate
 */
router.get('/export/:type', 
  logActivity('ADMIN_EXPORT_DATA'),
  adminController.exportAdminData
);

// Audit Management Routes

/**
 * @route   GET /api/admin/audit/verify
 * @desc    Verify audit trail integrity
 * @access  Admin only
 */
router.get('/audit/verify',
  requirePermission('system.monitor'),
  logActivity('ADMIN_VERIFY_AUDIT_TRAIL'),
  adminController.verifyAuditTrail
);

/**
 * @route   GET /api/admin/audit/stats
 * @desc    Get audit trail statistics
 * @access  Admin only
 */
router.get('/audit/stats',
  requirePermission('system.monitor'),
  logActivity('ADMIN_VIEW_AUDIT_STATS'),
  adminController.getAuditStatistics
);

/**
 * @route   POST /api/admin/audit/rotate
 * @desc    Manually trigger audit log rotation
 * @access  Admin only
 */
router.post('/audit/rotate',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_ROTATE_AUDIT_LOGS'),
  adminController.rotateAuditLogs
);

/**
 * @route   POST /api/admin/audit/cleanup
 * @desc    Clean up old audit archive files
 * @access  Admin only
 */
router.post('/audit/cleanup',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_CLEANUP_AUDIT_ARCHIVES'),
  adminController.cleanupAuditArchives
);

/**
 * @route   GET /api/admin/audit/health
 * @desc    Run comprehensive audit health check
 * @access  Admin only
 */
router.get('/audit/health',
  requirePermission('system.monitor'),
  logActivity('ADMIN_AUDIT_HEALTH_CHECK'),
  adminController.auditHealthCheck
);

// User Management Routes

/**
 * @route   POST /api/admin/users/invite
 * @desc    Invite a new user to the system
 * @access  Admin only
 * @body    { email: string, role: UserRole }
 */
router.post('/users/invite',
  sensitiveAdminRateLimiter,
  requirePermission('users.invite'),
  logActivity('ADMIN_INVITE_USER', { includeBody: true }),
  adminController.inviteUser
);

/**
 * @route   PUT /api/admin/users/:id/promote
 * @desc    Promote a user to admin status
 * @access  Admin only
 */
router.put('/users/:id/promote',
  sensitiveAdminRateLimiter,
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.manage'),
  logActivity('ADMIN_PROMOTE_USER', { includeParams: true }),
  adminController.promoteUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user from the system
 * @access  Admin only
 */
router.delete('/users/:id',
  sensitiveAdminRateLimiter,
  ipAccessControl({ blockSuspiciousIPs: true }),
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.delete'),
  logActivity('ADMIN_DELETE_USER', { includeParams: true }),
  adminController.deleteUser
);

/**
 * @route   PUT /api/admin/users/:id/customer-type
 * @desc    Update user customer type
 * @access  Admin only
 * @body    { customerType: UserType }
 */
router.put('/users/:id/customer-type',
  sensitiveAdminRateLimiter,
  requirePermission('users.update'),
  logActivity('ADMIN_UPDATE_USER_CUSTOMER_TYPE', { includeParams: true, includeBody: true }),
  adminController.updateUserCustomerType
);

/**
 * @route   PUT /api/admin/users/:id/msxpert-access
 * @desc    Update user MSXpert access
 * @access  Admin only
 * @body    { msxpertAccess: boolean }
 */
router.put('/users/:id/msxpert-access',
  sensitiveAdminRateLimiter,
  requirePermission('users.update'),
  logActivity('ADMIN_UPDATE_USER_MSXPERT_ACCESS', { includeParams: true, includeBody: true }),
  adminController.updateUserMSXpertAccess
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information
 * @access  Admin only
 * @body    { email?: string, role?: UserRole, status?: UserStatus }
 */
router.put('/users/:id',
  requirePermission('users.update'),
  logActivity('ADMIN_UPDATE_USER'),
  adminController.updateUser
);

/**
 * @route   PUT /api/admin/users/:id/block
 * @desc    Block a user temporarily
 * @access  Admin only
 * @body    { reason?: string }
 */
router.put('/users/:id/block',
  sensitiveAdminRateLimiter,
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.block'),
  logActivity('ADMIN_BLOCK_USER', { includeParams: true, includeBody: true }),
  adminController.blockUser
);

/**
 * @route   PUT /api/admin/users/:id/unblock
 * @desc    Unblock a previously blocked user
 * @access  Admin only
 */
router.put('/users/:id/unblock',
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.manage'),
  logActivity('ADMIN_UNBLOCK_USER'),
  adminController.unblockUser
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 * @query   page, limit, role, status, search, sortBy, sortOrder
 */
router.get('/users',
  requirePermission('users.read'),
  logActivity('ADMIN_VIEW_USERS'),
  adminController.getAllUsers
);

// Permission Management Routes

/**
 * @route   PUT /api/admin/users/:id/permissions
 * @desc    Assign custom permissions to a user
 * @access  Admin only
 * @body    { permissions: string[] }
 */
router.put('/users/:id/permissions',
  sensitiveAdminRateLimiter,
  requirePermission('permissions.assign'),
  logActivity('ADMIN_ASSIGN_USER_PERMISSIONS', { includeParams: true, includeBody: true }),
  adminController.assignUserPermissions
);

/**
 * @route   PUT /api/admin/roles/:role/permissions
 * @desc    Update permissions for a role
 * @access  Admin only
 * @body    { permissions: string[] }
 */
router.put('/roles/:role/permissions',
  sensitiveAdminRateLimiter,
  requirePermission('permissions.manage'),
  logActivity('ADMIN_UPDATE_ROLE_PERMISSIONS', { includeParams: true, includeBody: true }),
  adminController.updateRolePermissions
);

/**
 * @route   GET /api/admin/permissions
 * @desc    Get all available permissions
 * @access  Admin only
 */
router.get('/permissions',
  requirePermission('permissions.read'),
  logActivity('ADMIN_VIEW_PERMISSIONS'),
  adminController.getAllPermissions
);



// Activity Log Management Routes

/**
 * @route   GET /api/admin/activity-logs
 * @desc    Get activity logs with advanced filtering and pagination
 * @access  Admin only
 * @query   page, limit, userId, processId, action, resourceType, resourceId, ipAddress, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/activity-logs',
  logActivity('ADMIN_VIEW_ACTIVITY_LOGS'),
  adminController.getActivityLogs
);

/**
 * @route   GET /api/admin/activity-logs/export
 * @desc    Export activity logs in various formats (JSON, CSV, PDF)
 * @access  Admin only
 * @query   format, userId, processId, action, resourceType, resourceId, startDate, endDate, search
 */
router.get('/activity-logs/export',
  sensitiveAdminRateLimiter,
  logActivity('ADMIN_EXPORT_ACTIVITY_LOGS'),
  adminController.exportActivityLogs
);

/**
 * @route   GET /api/admin/users/:id/activity
 * @desc    Get user-specific activity logs with filtering and pagination
 * @access  Admin only
 * @query   page, limit, processId, action, resourceType, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/users/:id/activity',
  logActivity('ADMIN_VIEW_USER_ACTIVITY'),
  adminController.getUserActivityLogs
);

// Database Permission Management Routes

/**
 * @route   GET /api/admin/database-permissions
 * @desc    Get all database permissions
 * @access  Admin only
 */
router.get('/database-permissions',
  requirePermission('system.admin'),
  logActivity('ADMIN_VIEW_DATABASE_PERMISSIONS'),
  adminController.getDatabasePermissions
);

/**
 * @route   GET /api/admin/database-permissions/:userType
 * @desc    Get database permissions for a specific user type
 * @access  Admin only
 */
router.get('/database-permissions/:userType',
  requirePermission('system.admin'),
  logActivity('ADMIN_VIEW_USER_TYPE_DATABASE_PERMISSIONS'),
  adminController.getUserTypeDatabasePermissions
);

/**
 * @route   PUT /api/admin/database-permissions
 * @desc    Update a database permission for a user type
 * @access  Admin only
 * @body    { userType: string, database: string, hasAccess: boolean }
 */
router.put('/database-permissions',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_UPDATE_DATABASE_PERMISSION', { includeBody: true }),
  adminController.updateDatabasePermission
);

/**
 * @route   POST /api/admin/database-permissions/bulk
 * @desc    Bulk update database permissions for a user type
 * @access  Admin only
 * @body    { userType: string, permissions: Array<{ database: string, hasAccess: boolean }> }
 */
router.post('/database-permissions/bulk',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_BULK_UPDATE_DATABASE_PERMISSIONS', { includeBody: true }),
  adminController.bulkUpdateDatabasePermissions
);

/**
 * @route   POST /api/admin/database-permissions/initialize
 * @desc    Initialize default database permissions
 * @access  Admin only
 */
router.post('/database-permissions/initialize',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_INITIALIZE_DATABASE_PERMISSIONS'),
  adminController.initializeDatabasePermissions
);

// Validation Conditions Management Routes

/**
 * @route   GET /api/admin/validation-conditions
 * @desc    Get all validation conditions for all user types
 * @access  Admin only
 */
router.get('/validation-conditions',
  requirePermission('system.admin'),
  logActivity('ADMIN_VIEW_VALIDATION_CONDITIONS'),
  adminController.getAllValidationConditions
);

/**
 * @route   GET /api/admin/validation-conditions/:userType
 * @desc    Get validation conditions for a specific user type
 * @access  Admin only
 */
router.get('/validation-conditions/:userType',
  requirePermission('system.admin'),
  logActivity('ADMIN_VIEW_USER_TYPE_VALIDATION_CONDITIONS'),
  adminController.getUserTypeValidationConditions
);

/**
 * @route   PUT /api/admin/validation-conditions
 * @desc    Update a validation condition for a user type
 * @access  Admin only
 * @body    { userType: string, conditionId: string, isEnabled: boolean }
 */
router.put('/validation-conditions',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_UPDATE_VALIDATION_CONDITION', { includeBody: true }),
  adminController.updateValidationCondition
);

/**
 * @route   POST /api/admin/validation-conditions/batch
 * @desc    Batch update validation conditions for a user type
 * @access  Admin only
 * @body    { userType: string, conditions: Array<{ conditionId: string, isEnabled: boolean }> }
 */
router.post('/validation-conditions/batch',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_BATCH_UPDATE_VALIDATION_CONDITIONS', { includeBody: true }),
  adminController.batchUpdateValidationConditions
);

export default router;