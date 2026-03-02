import express from 'express';
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createCustomer, listCustomers, updateCustomer } from "../controllers/customer.controllers";

const router = express.Router();

router.get('/', requireAuth, requireRole('admin', 'dispatcher', 'technician'), listCustomers);
router.post('/create', requireAuth, requireRole('admin', 'dispatcher', 'technician'), createCustomer);
router.put('/update', requireAuth, requireRole('admin', 'dispatcher', 'technician'), updateCustomer);

export default router;