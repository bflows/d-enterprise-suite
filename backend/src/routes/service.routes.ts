import express from 'express';
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createServiceBook, getServiceBooks, updatePricebook, createCategory, updateCategory, deleteCategory, createServiceItem, getServiceItemsByCategoryId } from "../controllers/service.controller";

const router = express.Router();

router.post('/create-service-book', requireAuth, requireRole('admin'), createServiceBook);
router.post('/service-books', requireAuth, getServiceBooks);
router.put('/update-pricebook', requireAuth, requireRole('admin'), updatePricebook);
router.post('/create-category', requireAuth, requireRole('admin'), createCategory);
router.put('/update-category', requireAuth, requireRole('admin'), updateCategory);
router.delete('/delete-category', requireAuth, requireRole('admin'), deleteCategory);
router.post('/create-service-item', requireAuth, requireRole('admin'), createServiceItem);
router.get('/service-items', requireAuth, getServiceItemsByCategoryId);

export default router;