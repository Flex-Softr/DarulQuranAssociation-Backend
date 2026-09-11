import { Router } from 'express';
import { blogController } from './blog.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { createBlogSchema, updateBlogSchema } from './blog.schema';
import { upload } from '../uploads/upload.middleware';

const router = Router();

// Get all blogs (admin) - requires authentication
router.get('/admin', authMiddleware, blogController.getAllBlogs);
router.get('/admin/:id', authMiddleware, blogController.getBlogById);

// Get all blogs (public)
router.get('/', blogController.getAllBlogs);

// Get single blog (public)
router.get('/:id', blogController.getBlogById);


// All mutation routes require authentication
router.use(authMiddleware);



// Get single blog (admin) - requires authentication


// Create new blog (admin) - handle thumbnail (single) and images (multiple) file uploads
router.post(
  '/admin',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 20 },
    // Accept alias 'image' in case frontend sends singular field name
    { name: 'image', maxCount: 20 },
  ]),
  validate(createBlogSchema),
  blogController.createBlog
);

// Update blog - handle thumbnail (single) and images (multiple) file uploads
router.put(
  '/:id',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 20 },
    // Accept alias 'image' in case frontend sends singular field name
    { name: 'image', maxCount: 20 },
  ]),
  validate(updateBlogSchema),
  blogController.updateBlog
);

// Delete blog
router.delete('/:id', blogController.deleteBlog);

export default router;

