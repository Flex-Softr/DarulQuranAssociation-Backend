import { Router } from 'express';
import { galleryCategoryController } from './gallery-category.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createGalleryCategorySchema, updateGalleryCategorySchema } from './gallery-category.schema';

const router = Router();

// Get all gallery categories (admin)
router.get('/admin', authMiddleware, galleryCategoryController.getAllGalleryCategories);
// Get single gallery category by ID (admin)
router.get('/admin/:id', authMiddleware, galleryCategoryController.getGalleryCategoryById);

// Get all gallery categories with pagination and search (public)
router.get('/', galleryCategoryController.getAllGalleryCategories);
// Get single gallery category by ID (public)
router.get('/:id', galleryCategoryController.getGalleryCategoryById);

router.use(authMiddleware);

// Create new gallery category
router.post(
  '/',
  validate(createGalleryCategorySchema),
  galleryCategoryController.createGalleryCategory
);

// Update gallery category
router.put(
  '/:id',
  validate(updateGalleryCategorySchema),
  galleryCategoryController.updateGalleryCategory
);

// Delete gallery category
router.delete('/:id', galleryCategoryController.deleteGalleryCategory);

export default router;

