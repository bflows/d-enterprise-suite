import express from 'express';
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  createCustomer,
  customerDetails,
  listCustomers,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} from "../controllers/customer.controllers";

const router = express.Router();

router.get('/details', requireAuth, requireRole('admin', 'dispatcher', 'technician'), customerDetails);
router.get('/', requireAuth, requireRole('admin', 'dispatcher', 'technician'), listCustomers);
router.get('/search', requireAuth, requireRole('admin', 'dispatcher', 'technician'), searchCustomers);
router.post('/create', requireAuth, requireRole('admin', 'dispatcher', 'technician'), createCustomer);
router.put('/update', requireAuth, requireRole('admin', 'dispatcher', 'technician'), updateCustomer);
router.delete('/delete', requireAuth, requireRole('admin', 'dispatcher', 'technician'), deleteCustomer);

export default router;