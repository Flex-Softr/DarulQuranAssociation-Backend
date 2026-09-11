import { Router } from 'express';
import { noticeController } from './notice.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createNoticeSchema, updateNoticeSchema } from './notice.schema';

const router = Router();

// Get all notices (admin)
router.get('/admin', authMiddleware, noticeController.getAllNotices);

// Get single notice by ID (admin)
router.get('/admin/:id', authMiddleware, noticeController.getNoticeById);

// Get all notices (public)
router.get('/', noticeController.getAllNotices);

// Get single notice (public)
router.get('/:id', noticeController.getNoticeById);

// All mutation routes require authentication
router.use(authMiddleware);

// Create new notice
router.post('/', validate(createNoticeSchema), noticeController.createNotice);

// Update notice
router.put('/:id', validate(updateNoticeSchema), noticeController.updateNotice);

// Delete notice
router.delete('/:id', noticeController.deleteNotice);

export default router;

