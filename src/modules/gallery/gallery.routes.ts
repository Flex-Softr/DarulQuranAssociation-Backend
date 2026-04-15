import { Router } from 'express';
import { galleryController } from './gallery.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createGalleryItemSchema, updateGalleryItemSchema } from './gallery.schema';
import { upload } from '../uploads/upload.middleware';
import { tokenMiddleware } from '../common/middleware/token.middleware';

const router = Router();

// Get all gallery items (admin)
router.get('/admin',  galleryController.getAllGalleryItems);
// Get single gallery item by ID (admin)
router.get('/admin/:id', galleryController.getGalleryItemById);

// Get all gallery items (public)
router.get('/', tokenMiddleware, galleryController.getAllGalleryItems);

// Get single gallery item (public)
router.get('/:id', tokenMiddleware, galleryController.getGalleryItemById);

// All mutation routes require authentication
router.use(authMiddleware);

// Create new gallery item
router.post(
  '/',
  upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  validate(createGalleryItemSchema),
  galleryController.createGalleryItem
);

// Update gallery item
router.put(
  '/:id',
  upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  validate(updateGalleryItemSchema),
  galleryController.updateGalleryItem
);

// Delete gallery item
router.delete('/:id', galleryController.deleteGalleryItem);

export default router;

