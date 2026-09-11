import { Router } from 'express';
import { programController } from './program.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createProgramSchema, updateProgramSchema } from './program.schema';
import { upload } from '../uploads/upload.middleware';

const router = Router();

// Get all programs (admin)
router.get('/admin', authMiddleware, programController.getAllPrograms);
// Get program by slug (admin)
router.get('/admin/slug/:slug', authMiddleware, programController.getProgramBySlug);
// Get single program by ID (admin)
router.get('/admin/:id', authMiddleware, programController.getProgramById);

// Get all programs (public)
router.get('/', programController.getAllPrograms);

// Get program by slug (public)
router.get('/slug/:slug', programController.getProgramBySlug);

// Get single program by ID (public)
router.get('/:id', programController.getProgramById);

// All mutation routes require authentication
router.use(authMiddleware);

// Create new program - handle thumbnail (single) and media (multiple) file uploads
router.post(
  '/',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media', maxCount: 20 },
    // Accept alias 'image' similar to blogs for flexibility
    { name: 'image', maxCount: 20 },
  ]),
  validate(createProgramSchema),
  programController.createProgram
);

// Update program - handle thumbnail (single) and media (multiple) file uploads
router.put(
  '/:id',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'media', maxCount: 20 },
    // Accept alias 'image' similar to blogs for flexibility
    { name: 'image', maxCount: 20 },
  ]),
  validate(updateProgramSchema),
  programController.updateProgram
);

// Delete program
router.delete('/:id', programController.deleteProgram);

export default router;

