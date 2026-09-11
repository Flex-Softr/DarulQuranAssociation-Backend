import { Router } from 'express';
import { activityController } from './activity.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createActivitySchema, updateActivitySchema } from './activity.schema';

const router = Router();

// Get all activities (public)
router.get('/', activityController.getAllActivities);

// Get single activity (public)
router.get('/:id', activityController.getActivityById);

// All mutation routes require authentication
router.use(authMiddleware);

// Create new activity
router.post('/', validate(createActivitySchema), activityController.createActivity);

// Update activity
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);

// Delete activity
router.delete('/:id', activityController.deleteActivity);

export default router;

