import { Router } from 'express';
import { UserReportController } from '../controllers/UserReportController';
import { authenticate } from '../middleware/auth';

const router = Router();
const reportController = new UserReportController();

// Apply authentication middleware to all routes
router.use(authenticate);

// User report routes
router.get('/my-reports', reportController.getUserReports);
router.get('/all', reportController.getAllReports); // Admin only
router.post('/generate/:id', reportController.generateReport);
router.get('/date-range', reportController.getReportsByDateRange);
router.delete('/:id', reportController.deleteReport);

export default router;
