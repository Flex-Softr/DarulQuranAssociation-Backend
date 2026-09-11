import { Router } from 'express';
import { heroImageController } from './hero-image.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createHeroImageSchema, updateHeroImageSchema } from './hero-image.schema';
import { upload } from '../uploads/upload.middleware';

const router = Router();

// Get all hero images (admin)
router.get('/admin', authMiddleware, heroImageController.getAllHeroImages);
// Get single hero image by ID (admin)
router.get('/admin/:id', authMiddleware, heroImageController.getHeroImageById);

// Get all hero images (public, but can filter by isActive)
router.get('/', heroImageController.getAllHeroImages);

// Get single hero image (public)
router.get('/:id', heroImageController.getHeroImageById);

// All mutation routes require authentication
router.use(authMiddleware);

// Create new hero image
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'media', maxCount: 1 },
  ]),
  validate(createHeroImageSchema),
  heroImageController.createHeroImage
);

// Update hero image
router.put(
  '/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'media', maxCount: 1 },
  ]),
  validate(updateHeroImageSchema),
  heroImageController.updateHeroImage
);

// Delete hero image
router.delete('/:id', heroImageController.deleteHeroImage);

export default router;

