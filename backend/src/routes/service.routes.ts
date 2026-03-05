import express from 'express';
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createServiceBook, getServiceBooks, createCategory } from "../controllers/service.controller";

const router = express.Router();

router.post('/create-service-book', requireAuth, requireRole('admin'), createServiceBook);
router.post('/service-books', requireAuth, getServiceBooks);
router.post('/create-category', requireAuth, requireRole('admin'), createCategory);

export default router;